import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['developer API module', 'apps/api/src/modules/developer-api/developer-api.module.ts'],
  ['API key guard', 'apps/api/src/modules/developer-api/developer-api-key.guard.ts'],
  ['governance module', 'apps/api/src/modules/governance/governance.module.ts'],
  ['governance dashboard', 'apps/web/app/(dashboard)/governance/page.tsx'],
  ['OpenSearch worker indexing', 'apps/worker/src/main.ts'],
  ['Kong gateway config', 'infrastructure/phase4/kong/kong.yml'],
  ['multi-region database blueprint', 'infrastructure/phase4/terraform-multiregion/main.tf'],
  ['blue-green release runbook', 'infrastructure/phase4/deployment/blue-green-runbook.md'],
  ['mediasoup SFU service', 'infrastructure/mediasoup-sfu/src/server.ts'],
  ['PostHog feature flag adapter', 'apps/web/lib/analytics/feature-flags.ts'],
  ['Phase 4 Prisma migration', 'apps/api/prisma/migrations/20261012000300_phase4_developer_api_governance/migration.sql'],
  ['public OpenAPI contract', 'infrastructure/phase4/openapi-public-v1.yaml'],
  ['regional read replica service', 'apps/api/src/database/read-replica.service.ts'],
  ['developer API key management UI', 'apps/web/app/(dashboard)/developer/page.tsx'],
  ['API container', 'apps/api/Dockerfile'],
  ['worker container', 'apps/worker/Dockerfile'],
  ['Phase 4 Compose profile', 'infrastructure/phase4/docker-compose.yml'],
  ['developer API tests', 'apps/api/src/modules/developer-api/developer-api.service.spec.ts'],
  ['governance tests', 'apps/api/src/modules/governance/governance.service.spec.ts'],
];
let passed = 0;
for (const [name, file] of checks) {
  const ok = fs.existsSync(path.join(root, file));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++;
}
const schema = fs.readFileSync(path.join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
for (const model of ['DeveloperApiKey', 'GovernanceProposal', 'GovernanceVote']) {
  const ok = schema.includes(`model ${model} `);
  console.log(`${ok ? 'PASS' : 'FAIL'} Prisma model ${model}`); if (ok) passed++;
}
const total = checks.length + 3;
console.log(`Phase 4 source checks: ${passed}/${total}`);
if (passed !== total) process.exitCode = 1;
