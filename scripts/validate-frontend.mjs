import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require(path.join(process.cwd(), 'node_modules', 'typescript'));
}
const root=process.cwd();
const roots=['apps/web','packages/types','packages/validation','packages/utils','packages/ui-tokens'];
let files=[];
for(const r of roots){const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','.swc'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts'))files.push(p)}};walk(path.join(root,r));}
let failed=0;
for(const f of files){const src=fs.readFileSync(f,'utf8');let out; try { out=ts.transpileModule(src,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},fileName:f,reportDiagnostics:true}); } catch (e) { failed++; console.error("TRANSPILE CRASH", f, e.message); continue; } const errors=(out.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);if(errors.length){failed++;for(const e of errors)console.error(f,ts.flattenDiagnosticMessageText(e.messageText,' '));}}
const routes=[];const appRoot=path.join(root,'apps/web/app');const walkRoutes=(d,parts=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walkRoutes(p,[...parts,e.name]);else if(e.name==='page.tsx')routes.push([...parts].join('/'));}};walkRoutes(appRoot);
const required=['(public)','(public)/explore','(public)/users/[id]','(auth)/login','(auth)/register','(auth)/forgot-password','(auth)/reset-password','(dashboard)/dashboard','(dashboard)/profile','(dashboard)/skills','(dashboard)/discover','(dashboard)/wallet','(dashboard)/exchanges','(dashboard)/messages','(dashboard)/calling','(dashboard)/notifications','(dashboard)/documents','(dashboard)/gamification','(dashboard)/community','(dashboard)/ratings','(dashboard)/settings','(admin)/admin','(admin)/admin/users','(admin)/admin/documents','(admin)/admin/transactions','(admin)/admin/analytics'];
for(const r of required)if(!routes.includes(r)){failed++;console.error('Missing route:',r)}
const badSecrets=[];for(const f of files){const s=fs.readFileSync(f,'utf8');if(/NEXT_PUBLIC_.*(SECRET|PASSWORD|TOKEN|PRIVATE)/i.test(s))badSecrets.push(f)}
if(badSecrets.length){failed++;console.error('Potential public secret env usage:',badSecrets)}
console.log(`Transpiled ${files.length} TS/TSX files; discovered ${routes.length} page routes.`);
console.log(`Required route coverage: ${required.length}/${required.length-badSecrets.length}`);
process.exit(failed?1:0);
