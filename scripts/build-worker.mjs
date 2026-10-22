import {readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync} from "node:fs";
import {join, relative, extname} from "node:path";

const root = new URL("../", import.meta.url).pathname;
const publicRoot = join(root, "public");
const distRoot = join(root, "dist");
const types = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".zip":"application/zip"};
const assets = {};

function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) collect(path);
    else {
      const key = `/${relative(publicRoot, path).replaceAll("\\", "/")}`;
      assets[key] = {type: types[extname(path)] || "application/octet-stream", base64: readFileSync(path).toString("base64")};
    }
  }
}

collect(publicRoot);
rmSync(distRoot, {recursive: true, force: true});
mkdirSync(join(distRoot, "server"), {recursive: true});
mkdirSync(join(distRoot, ".openai"), {recursive: true});
const worker = readFileSync(join(root, "worker/index.js"), "utf8").replace("__ASSETS__", JSON.stringify(assets));
writeFileSync(join(distRoot, "server/index.js"), worker);
copyFileSync(join(root, ".openai/hosting.json"), join(distRoot, ".openai/hosting.json"));
console.log(`Built Worker with ${Object.keys(assets).length} public assets.`);
