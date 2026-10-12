# TalentSwap Worker

The worker is backend-only and consumes BullMQ queues from the API.

## Processors

- `document-scan` — downloads private objects directly from configured S3-compatible storage and scans them with ClamAV INSTREAM. It does not depend on short-lived presigned URLs, enforces the 10 MB document limit, retries transient failures, and marks exhausted scans as `SCAN_FAILED` instead of leaving them stuck in `SCANNING`.
- `notifications` — persists notifications idempotently and publishes after commit.
- `gamification` — awards XP, updates levels/badges, and uses durable job receipts.
- `search-sync` — handles explicit search-index rebuild jobs with `REINDEX INDEX CONCURRENTLY`. Normal skill inserts/updates/deactivations do not need queue synchronization because PostgreSQL maintains the generated `tsvector` column and GIN index transactionally.
- `skill-embeddings` — generates embeddings with bounded request timeouts/retries and always reads the latest committed skill title/description before embedding to avoid stale out-of-order job payloads.

## Required environment

- `DATABASE_URL`
- `REDIS_URL`
- `R2_BUCKET` (defaults to `talentswap`)
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` for S3-compatible object storage unless the runtime provides an appropriate default credential chain
- `CLAMAV_HOST` and `CLAMAV_PORT` (defaults to `localhost:3310`)
- `OPENAI_API_KEY` for embedding jobs
- `OPENAI_EMBEDDING_MODEL` (defaults to `text-embedding-3-small`)

The worker and API must use the same storage bucket and Redis/database instances. Run the Phase 3 migration before starting a worker version that writes the `SCAN_FAILED` document status.

## Commands

From the monorepo root:

```bash
pnpm --filter @talentswap/worker dev
pnpm --filter @talentswap/worker test
pnpm --filter @talentswap/worker typecheck
pnpm --filter @talentswap/worker build
```

`test` runs dependency-light reliability tests for ClamAV response parsing, upload size limits and retry policy. Full typecheck/build require workspace dependencies to be installed.

## Failure handling

Queue jobs use bounded attempts with exponential backoff. Failed jobs are logged with queue/job identifiers and attempt counts; do not log tokens, credentials, or file contents. Document scans that exhaust retries are moved to `SCAN_FAILED`; users should upload again after storage/ClamAV service health is restored. The queue's failed-job retention allows operators to inspect failures. Production deployments should monitor Redis, storage and ClamAV health and alert on `SCAN_FAILED` records.
