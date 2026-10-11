# TalentSwap BE-03 → BE-25 Implementation & Validation Matrix

This document records the cumulative backend implementation against `BE Prompts(1).pdf`.

## Implemented critical controls

- BE-06 wallet ledger is the sole application writer of `skill_points_ledger` and uses PostgreSQL SERIALIZABLE transactions plus transaction-scoped advisory locks.
- BE-08 escrow creation creates the transaction, applies the escrow hold and moves the transaction to `ESCROW_HELD` in the same financial unit of work.
- BE-09 confirmation/dispute locks the transaction row and performs the ledger settlement/refund and state mutation atomically.
- Domain events are emitted only after the surrounding financial transaction has committed.
- BE-10 Socket.IO uses the Redis adapter; `/chat` and `/call` reuse the shared realtime infrastructure.
- BE-11 notification persistence is queued through BullMQ; the worker publishes committed notifications through Redis pub/sub for realtime delivery.
- BE-13/14 storage security validates ownership, declared MIME, object size and file magic bytes; document scanning is performed by a real ClamAV worker processor.
- BE-16 gamification is asynchronous and uses durable worker-job receipts for idempotent XP processing.
- BE-17 leaderboards use Redis sorted sets with database-backed rebuild/recovery.
- BE-18 isolates OpenAI embedding calls behind `EmbeddingService` with timeout/retry/failure handling.
- BE-19 matching is read-only with respect to skills/profiles and consumes precomputed pgvector embeddings; it never writes embeddings itself.
- BE-22 search uses PostgreSQL `tsvector` + GIN as a derived projection and provides an explicit rebuild path.
- BE-23 admin mutations delegate to owning module services.
- BE-24 contains real processors for notifications, documents, gamification, search synchronization and skill embeddings, with retry-safe/idempotent job handling.
- BE-25 common validation, response envelope, guards, rate limiting, request IDs, error handling and boundary checks remain centralized.

## Test suites included

### Unit

Existing and expanded Jest suites cover authentication, password/token handling, users, wallet, transactions and module-level critical rules.

### E2E

- `test/app.e2e-spec.ts` — health, response envelope, request IDs and prefix behavior.
- `test/auth.e2e-spec.ts` — registration, login, refresh rotation, logout and authentication failures.
- `test/backend-contract.e2e-spec.ts` — protected mutation routes and public search validation.

### Financial concurrency integration

- `test/integration/wallet.concurrency.int.spec.ts`
- `test/integration/transactions.concurrency.int.spec.ts`

Run these against a real PostgreSQL database with:

```powershell
$env:RUN_FINANCIAL_CONCURRENCY_TESTS="true"
pnpm --filter @talentswap/api test:concurrency
```

The integration suites intentionally require an explicit environment flag so normal unit-test runs do not mutate a developer database.

## Required validation commands

```powershell
pnpm install
pnpm --filter @talentswap/api prisma:generate
pnpm --filter @talentswap/api prisma:migrate:deploy
pnpm --filter @talentswap/api typecheck
pnpm --filter @talentswap/api lint
pnpm --filter @talentswap/api test
pnpm --filter @talentswap/api test:e2e
pnpm --filter @talentswap/worker typecheck
pnpm --filter @talentswap/worker build
pnpm build
pnpm check:boundaries
```

A full production validation pass also requires reachable PostgreSQL, Redis and (for document/embedding/calling integration paths) the corresponding configured external services.
