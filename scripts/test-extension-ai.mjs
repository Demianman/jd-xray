import assert from "node:assert/strict";
import {PROVIDERS,SYSTEM_PROMPT,requestFor,parseAIResponse} from "../extension/ai-provider.js";

assert.deepEqual(Object.keys(PROVIDERS),["openai","openrouter","groq"]);
assert.match(SYSTEM_PROMPT,/untrusted data/i);
assert.match(SYSTEM_PROMPT,/never as instructions/i);

const request=requestFor({provider:"openai",model:"test-model",key:"test-session-key",jd:"Build production AI systems and evaluate model behavior. ".repeat(4),url:"https://example.test/job"});
assert.equal(request.endpoint,"https://api.openai.com/v1/chat/completions");
assert.equal(request.options.headers.authorization,"Bearer test-session-key");
const body=JSON.parse(request.options.body);
assert.equal(body.model,"test-model");
assert.equal(body.messages[0].role,"system");
assert.match(body.messages[1].content,/JOB DESCRIPTION/);
assert.throws(()=>requestFor({provider:"unknown",key:"x",jd:"a".repeat(200)}),/Unsupported/);
assert.throws(()=>requestFor({provider:"openai",key:"",jd:"a".repeat(200)}),/Connect/);

const parsed=parseAIResponse({choices:[{message:{content:JSON.stringify({bottom_line:"Customer-facing deployment role.",actual_employer:null,posting_type:"intermediary_search",findings:[{topic:"Role shape",claim:"Delivery dominates.",severity:"medium",evidence:["Work directly with customers."]}],missing_info:["Salary"],questions:["Who is the legal employer?"]})}}]});
assert.equal(parsed.posting_type,"intermediary_search");
assert.equal(parsed.findings.length,1);
assert.equal(parsed.questions[0],"Who is the legal employer?");
assert.throws(()=>parseAIResponse({choices:[{message:{content:"not json"}}]}),/structured JSON/);
console.log("JD X-ray extension AI contract tests passed.");
