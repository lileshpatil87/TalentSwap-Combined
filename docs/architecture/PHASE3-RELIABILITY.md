# Phase 3 — Verification and Reliability

## Scope delivered in source

### Worker and queue reliability
- Worker jobs reject unsupported job names instead of silently acknowledging them.
- Worker failures include queue name, job ID, attempt count and error message without logging credentials or file contents.
- Graceful shutdown closes BullMQ workers, Redis connections, Prisma and the object-storage client.
- Skill embedding requests have a 30-second timeout and bounded exponential retry delays.
- Embedding jobs reload the latest skill text from PostgreSQL and update the vector only if the row's `updated_at` still matches, preventing an older slow embedding request from overwriting a newer skill edit.
- Embedding enqueue failures are logged but do not turn an already-persisted skill creation/update into a false API failure; PostgreSQL full-text search remains available.

### Search indexing
- Skill create/update/deactivate no longer enqueue a no-op `UPDATE skills SET title = title` job. The generated PostgreSQL `tsvector` column and GIN index are maintained automatically by PostgreSQL.
- The admin rebuild operation queues a real `REINDEX INDEX CONCURRENTLY skills_search_vector_gin_idx` job with bounded retries.
- `SearchModule` explicitly imports `CacheModule`, so the queue provider is available regardless of global module wiring.

### Document malware scanning
- Scan jobs contain the private object key, not a short-lived signed URL that could expire during retries.
- The worker downloads from the same S3-compatible bucket used by the API and enforces the 10 MB size limit again before scanning.
- ClamAV INSTREAM uses bounded chunks and respects socket backpressure; the worker handles NUL-terminated clamd replies even when the TCP connection remains open.
- Clean files become `PENDING_REVIEW`; detected malware becomes `REJECTED`; transient failures retry with exponential backoff.
- When scan retries are exhausted or the queue cannot accept a scan job, the document becomes `SCAN_FAILED` with a machine-readable reason rather than remaining stuck in `SCANNING` forever.
- The `SCAN_FAILED` enum and notification receipt result pointer are included in migration `20261012000200_phase3_document_scan_reliability`.
- The web client exposes `SCAN_FAILED` and tells the user to re-upload after the scanner service is restored.

### Idempotent notification delivery
- Worker receipts now store the resulting notification ID.
- If notification persistence succeeds but Redis publish fails, the retry can load the same committed notification and publish it again rather than silently dropping the realtime event after finding a duplicate receipt. Realtime delivery is therefore at-least-once; clients should deduplicate by notification ID.

## Tests and checks executed in this environment

- `node scripts/validate-module-sequence.mjs` — PASS.
- `node scripts/validate-frontend.mjs` — PASS; 154 frontend TS/TSX files transpiled and 26/26 required routes found.
- `node scripts/validate-pwa.mjs` — PASS.
- `node scripts/validate-acceptance.mjs` — PASS.
- `node scripts/validate-phase1.mjs` — PASS.
- `node scripts/validate-phase2.mjs` — PASS, 19/19 assertions.
- `node scripts/validate-phase3.mjs` — PASS, 15/15 assertions.
- `node scripts/test-source.mjs` — PASS.
- `ts-node --transpile-only apps/worker/test/reliability.spec.ts` (run from `apps/worker`) — PASS, 7 tests including fake local ClamAV server tests for clean and infected responses while keeping the socket open after NUL termination.
- Global TypeScript syntax transpilation — PASS, 373 `.ts`/`.tsx` files with zero syntax diagnostics.
- `package.json` and `apps/worker/package.json` parse — PASS.
- `pnpm-lock.yaml` parses — PASS.

## Not executed / environment blocked

The npm registry could not resolve `registry.npmjs.org` (`EAI_AGAIN`), no workspace `node_modules` were available, and Docker/PostgreSQL tools were unavailable. Therefore this environment could not execute:
- dependency installation and the full Jest suite (including the new `DocumentsService` Jest tests);
- semantic TypeScript typecheck or full frontend/API/worker production builds;
- Prisma client generation or application of the migration to a real PostgreSQL database;
- database-backed concurrency tests;
- browser E2E, live Redis/Socket.IO, object storage, ClamAV daemon, or real OpenAI embedding integration tests.

Do not treat source checks or syntax transpilation as proof of runtime correctness. Run the complete commands from the root after registry access and local services are available:

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
pnpm validate
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @talentswap/api prisma:generate
pnpm --filter @talentswap/api prisma:migrate:deploy
```

Apply the migration first to a disposable test database. Configure `DATABASE_URL`, `REDIS_URL`, S3-compatible `R2_*` values, `CLAMAV_HOST`/`CLAMAV_PORT`, and `OPENAI_API_KEY` before live worker integration tests. Use a test-only object bucket and test files; never upload real sensitive documents to test the scanner.

## Deferred by product decision

The user explicitly deferred the SkillPoints zero-balance policy and its proposed solutions. Phase 3 does not change that policy.
