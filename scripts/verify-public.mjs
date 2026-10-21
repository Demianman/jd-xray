import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root=new URL("../",import.meta.url).pathname;
const required=["README.md","PRIVACY.md",".openai/hosting.json","dist/index.html","dist/styles.css","dist/app.js","dist/engine.js","dist/data.json","dist/extension/jd-xray-extension.zip","extension/manifest.json","extension/sidepanel.html","extension/sidepanel.js","extension/content.js","scripts/test-engine.mjs"];
const forbidden=[
  /yiman/i,/wuyiman/i,/nelly/i,/demianman/i,/carnegie/i,/beone/i,/pittsburgh/i,
  /south-central university/i,/andrew\.cmu\.edu/i,/linkedin\.com\/in/i,
  /\/Users\//,/\/home\//,/AKIA[0-9A-Z]{16}/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:api|access|auth|secret|private)[_-]?key\s*[:=]/i,
];
async function files(dir){const out=[];for(const name of await readdir(dir)){if(name===".git")continue;const path=join(dir,name);(await stat(path)).isDirectory()?out.push(...await files(path)):out.push(path);}return out;}
const all=await files(root);
const errors=[];
for(const item of required){if(!all.some(path=>relative(root,path)===item))errors.push(`Missing ${item}`);}
for(const path of all){const rel=relative(root,path);if(rel==="scripts/verify-public.mjs"||/\.(png|jpg|jpeg|gif|woff2?|zip)$/i.test(path))continue;const text=await readFile(path,"utf8");for(const pattern of forbidden){if(pattern.test(text))errors.push(`${rel}: forbidden marker ${pattern}`);}}
const data=JSON.parse(await readFile(join(root,"dist/data.json"),"utf8"));
if(!/synthetic/i.test(data.notice||""))errors.push("data.json must label data as synthetic");
if(!Array.isArray(data.opportunities)||data.opportunities.length!==0)errors.push("deployed runtime data must start empty");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Public-safety verification passed: ${all.length} files, empty shipped runtime data.`);
