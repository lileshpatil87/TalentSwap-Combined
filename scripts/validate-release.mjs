import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'README.md', 'INTEGRATION-NOTES.md', '.env.example', 'docker-compose.yml',
  'apps/api/prisma/schema.prisma', 'apps/api/Dockerfile', 'apps/web/Dockerfile',
  'apps/worker/Dockerfile', 'infrastructure/phase4/openapi-public-v1.yaml',
  'PHASE5-FINALIZATION-AND-RELEASE.md', 'scripts/smoke-test.mjs',
];
let failed = false;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) { console.error(`FAIL missing ${rel}`); failed = true; }
  else console.log(`PASS ${rel}`);
}
for (const rel of ['package.json', 'apps/api/package.json', 'apps/web/package.json', 'apps/worker/package.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); console.log(`PASS valid JSON ${rel}`); }
  catch { console.error(`FAIL invalid JSON ${rel}`); failed = true; }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const name of ['validate:phase1','validate:phase2','validate:phase3','validate:phase4','smoke']) {
  if (!pkg.scripts?.[name]) { console.error(`FAIL root script ${name}`); failed = true; }
}
const scripts = ['validate-phase1.mjs','validate-phase2.mjs','validate-phase3.mjs','validate-phase4.mjs','validate-frontend.mjs','validate-pwa.mjs','validate-acceptance.mjs'];
for (const rel of scripts) {
  const r = spawnSync(process.execPath, [path.join(root,'scripts',rel)], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) { console.error(`FAIL ${rel}\n${r.stdout}\n${r.stderr}`); failed = true; }
  else console.log(`PASS ${rel}`);
}
if (failed) process.exit(1);
console.log('\nRelease source gate passed. This is not a substitute for dependency-based builds, live service tests, or cloud deployment validation.');
