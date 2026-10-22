import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root=new URL("../",import.meta.url).pathname;
const required=["README.md","PRIVACY.md",".openai/hosting.json","public/index.html","public/styles.css","public/app.js","public/engine.js","public/data.json","public/extension/jd-xray-extension.zip","dist/server/index.js","dist/.openai/hosting.json","extension/manifest.json","extension/sidepanel.html","extension/sidepanel.js","extension/content.js","scripts/test-engine.mjs","scripts/test-worker.mjs"];
const forbidden=[
  /yiman/i,/wuyiman/i,/nelly/i,/demianman/i,/carnegie/i,/beone/i,/pittsburgh/i,
  /south-central university/i,/andrew\.cmu\.edu/i,/linkedin\.com\/in/i,
  /\/Users\//,/\/home\//,/AKIA[0-9A-Z]{16}/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:api|access|auth|secret|private)[_-]?key\s*[:=]/i,
];
const allowedPublicDemoOrigin="https://career-os-public-demo.demianman.chatgpt.site";
async function files(dir){const out=[];for(const name of await readdir(dir)){if(name===".git")continue;const path=join(dir,name);(await stat(path)).isDirectory()?out.push(...await files(path)):out.push(path);}return out;}
const all=await files(root);
const errors=[];
for(const item of required){if(!all.some(path=>relative(root,path)===item))errors.push(`Missing ${item}`);}
for(const path of all){
  const rel=relative(root,path);
  if(rel==="scripts/verify-public.mjs"||/\.(png|jpg|jpeg|gif|woff2?|zip)$/i.test(path))continue;
  let text=await readFile(path,"utf8");
  // The README may link to the deployed public product. Keep the exception exact and local to
  // that document so the account marker remains forbidden in source, data, and generated assets.
  if(rel==="README.md")text=text.replaceAll(allowedPublicDemoOrigin,"PUBLIC_DEMO_ORIGIN");
  for(const pattern of forbidden){if(pattern.test(text))errors.push(`${rel}: forbidden marker ${pattern}`);}
}
const data=JSON.parse(await readFile(join(root,"public/data.json"),"utf8"));
if(!/synthetic/i.test(data.notice||""))errors.push("data.json must label data as synthetic");
if(!Array.isArray(data.opportunities)||data.opportunities.length!==0)errors.push("deployed runtime data must start empty");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Public-safety verification passed: ${all.length} files, empty shipped runtime data.`);
