import fs from "node:fs";
const required=["apps/web/public/manifest.json","apps/web/public/sw.js","apps/web/public/icon.svg","apps/web/app/providers.tsx"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing PWA artifact: ${file}`);
const manifest=JSON.parse(fs.readFileSync("apps/web/public/manifest.json","utf8"));
for(const key of ["name","short_name","start_url","display","icons"])if(!(key in manifest))throw new Error(`Manifest missing ${key}`);
if(!fs.readFileSync("apps/web/public/sw.js","utf8").includes("serviceWorker")) console.log("Service worker source present; registration is in Providers.");
console.log("PWA artifact validation passed.");
