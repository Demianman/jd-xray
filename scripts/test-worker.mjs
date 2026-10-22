import assert from "node:assert/strict";
import worker from "../dist/server/index.js";

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

const missing = await worker.fetch(new Request("https://example.test/missing"), {}, {});
assert.equal(missing.status, 404);
console.log("JD X-ray Worker tests passed.");
