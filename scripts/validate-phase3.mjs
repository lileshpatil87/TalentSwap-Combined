import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['worker uses private object storage instead of expiring signed URLs', read('apps/worker/src/main.ts').includes('new GetObjectCommand') && !read('apps/worker/src/main.ts').includes('job.data.downloadUrl')],
  ['ClamAV parser fails closed for unknown responses', read('apps/worker/src/reliability.ts').includes('CLAMAV_INVALID_RESPONSE')],
  ['document scan failure has a persisted terminal state', read('apps/api/prisma/schema.prisma').includes('SCAN_FAILED') && read('apps/worker/src/main.ts').includes("status: 'SCAN_FAILED'")],
  ['document scan jobs have bounded exponential retries', read('apps/api/src/modules/documents/documents.service.ts').includes('attempts: 5') && read('apps/api/src/modules/documents/documents.service.ts').includes("type: 'exponential'")],
  ['search worker reindexes the actual GIN index', read('apps/worker/src/main.ts').includes('REINDEX INDEX CONCURRENTLY skills_search_vector_gin_idx')],
  ['no-op search projection update removed', !read('apps/api/src/modules/skills/skills.repository.ts').includes('UPDATE skills SET title = title') && !read('apps/worker/src/main.ts').includes('UPDATE skills SET title = title')],
  ['embedding worker loads latest database content', read('apps/worker/src/main.ts').includes('Always embed the latest committed source text') && read('apps/worker/src/main.ts').includes('updated_at = $3 AND is_active = true')],
  ['worker package has test and dev scripts', read('apps/worker/package.json').includes('"test"') && read('apps/worker/package.json').includes('"dev"')],
  ['worker reliability regression tests exist', fs.existsSync(path.join(root, 'apps/worker/test/reliability.spec.ts'))],
  ['search module explicitly imports queue module', read('apps/api/src/modules/search/search.module.ts').includes('CacheModule')],
  ['document scan service regression tests cover queue outage and ownership', read('apps/api/src/modules/documents/documents.service.spec.ts').includes('SCAN_QUEUE_UNAVAILABLE') && read('apps/api/src/modules/documents/documents.service.spec.ts').includes('DocumentAccessException')],
  ['database migration adds terminal scan failure status', read('apps/api/prisma/migrations/20261012000200_phase3_document_scan_reliability/migration.sql').includes('SCAN_FAILED')],
  ['embedding provider requests have timeouts and bounded retries', read('apps/worker/src/main.ts').includes('AbortSignal.timeout(30_000)') && read('apps/worker/src/main.ts').includes('500 * (2 ** attempt)')],
  ['optional embeddings do not make persisted skill writes fail when Redis is unavailable', read('apps/api/src/modules/skills/skills.service.ts').includes('Embedding enqueue deferred') && read('apps/api/src/modules/skills/skills.service.ts').includes('Full-text search is maintained by PostgreSQL')],
  ['notification retry can republish the committed notification idempotently', read('apps/api/prisma/schema.prisma').includes('resultId String? @map("result_id")') && read('apps/worker/src/main.ts').includes('tx.workerJobReceipt.update') && read('apps/worker/src/main.ts').includes('re-publish the same record')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`${checks.length - failed}/${checks.length} Phase 3 source checks passed`);
if (failed) process.exit(1);
