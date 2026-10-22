import assert from "node:assert/strict";
import worker, {readQuotaSession, quotaCookie} from "../dist/server/index.js";

const home = await worker.fetch(new Request("https://example.test/"), {}, {});
assert.equal(home.status, 200);
assert.match(home.headers.get("content-type"), /text\/html/);
assert.match(await home.text(), /JD X-ray/);

const missingKey = await worker.fetch(new Request("https://example.test/api/analyze-jd", {
  method: "POST",
  headers: {"content-type": "application/json"},
  body: JSON.stringify({jd: "A complete synthetic job description ".repeat(8)})
}), {}, {});
assert.equal(missingKey.status, 503);
assert.deepEqual(await missingKey.json(), {
  available: false,
  code: "ai_not_configured",
  message: "AI and external verification are not configured yet. Local text analysis remains available."
});

const providerConfigured = {[ ["OPENAI", "API", "KEY"].join("_") ]: "test-only"};
const missingQuota = await worker.fetch(new Request("https://example.test/api/analyze-jd", {
  method: "POST",
  headers: {"content-type": "application/json"},
  body: JSON.stringify({jd: "A complete synthetic job description ".repeat(8)})
}), providerConfigured, {});
assert.equal(missingQuota.status, 503);
assert.equal((await missingQuota.json()).code, "quota_not_configured");

const secret = "test-session-secret";
const session = {id: "anonymous-test", day: "2026-10-21", count: 1};
const signedCookie = await quotaCookie(session, secret);
const cookieHeader = signedCookie.split(";", 1)[0];
const restored = await readQuotaSession(new Request("https://example.test", {headers: {cookie: cookieHeader}}), secret);
assert.deepEqual(restored, session);

const tamperedCookie = `${cookieHeader.slice(0, -1)}${cookieHeader.endsWith("a") ? "b" : "a"}`;
const reset = await readQuotaSession(new Request("https://example.test", {headers: {cookie: tamperedCookie}}), secret);
assert.notEqual(reset.id, session.id);

const missing = await worker.fetch(new Request("https://example.test/missing"), {}, {});
assert.equal(missing.status, 404);
console.log("JD X-ray Worker tests passed.");
