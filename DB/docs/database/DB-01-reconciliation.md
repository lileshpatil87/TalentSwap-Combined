# DB-01 → backend-foundation: actual reconciliation

`DB-01-merge-notes.md` (in this folder) is DB-01's own hand-off, written
before its author had access to backend-foundation's real source. In the
same round, backend-foundation's README recorded that it had
*reimplemented* (not copied) DB-01's additive pieces from the review's
description alone, for the same reason. This merge is the first point
both real file sets existed together, so the actual line-by-line diff DB-01's
hand-off asked for was finally possible. Result, file by file:

| File | Verdict | Reasoning |
|---|---|---|
| `database/database-health.indicator.ts` | **Kept backend-foundation's** | DB-01's version depends on `@nestjs/terminus` (`HealthCheckError`, `HealthIndicatorResult`), which is not a dependency anywhere in this tree and would need to be added just for this one indicator. Backend's hand-rolled version (status + latency, no framework dependency) is already wired into `AppService`/`AppController` and covers the same need. |
| `cache/redis-health.indicator.ts` | **Kept backend-foundation's** | Same reasoning — DB-01 didn't ship a Redis indicator at all (out of its own scope, since DB-01 owned the database half only); this is backend-foundation's own addition, already wired. |
| `database/prisma-error.mapper.ts` | **Kept backend-foundation's** | DB-01's version throws `DatabaseOperationException` / `ForeignKeyViolationException` / `RecordNotFoundException` / `UniqueConstraintViolationException` from a `common/exceptions/database.exception.ts` file that exists only in DB-01's delivery. Backend's version throws `ResourceConflictException` / `ResourceNotFoundException` — which **already exist** in this tree's `common/exceptions/domain.exception.ts` — so it requires no new exception hierarchy. Adopting DB-01's version would mean maintaining two parallel exception hierarchies for the same purpose. |
| `common/utils/uuid.util.ts` | **Kept backend-foundation's** | DB-01's is validation-only (`isValidUuid`). Backend's adds `generateUuid()` alongside the validator. Backend's is a strict superset — nothing lost by keeping it. |
| `database/types/audited-entity.type.ts` vs `common/types/audited-entity.type.ts` | **Kept backend-foundation's location** (`common/types/`) | Both define the same `AuditedEntity`/soft-delete typing convention. Path differs (`database/types/` in DB-01 vs `common/types/` in backend-foundation); kept backend-foundation's since it's already imported from that path in this tree and nothing else references the `database/types/` location. |
| `common/exceptions/database.exception.ts` | **Not carried in** | Only consumer would have been DB-01's own `prisma-error.mapper.ts`, which wasn't adopted (see above). Nothing else in this tree references it. Can be resurrected later if a module genuinely needs a dedicated database-error subclass hierarchy beyond `ResourceConflictException`/`ResourceNotFoundException`. |
| `database/database-health.controller.ts` | **Not carried in** | Would duplicate routes: backend-foundation's `AppController` already exposes `GET /health`, `GET /health/database`, `GET /health/redis` directly. A second controller registering `GET /health/database` again would either collide or require renaming — not worth it for an identical result. |
| `prisma/seed.ts` | **Merged** | Backend-foundation's version was already wired via `package.json`'s `"prisma": { "seed": ... }` field; DB-01's had a more thorough idempotency-contract comment. Combined: backend's wiring + DB-01's contract documentation. See `apps/api/prisma/seed.ts`. |

## Open item DB-01 asked to verify: the advisory-lock helper

DB-01's hand-off flagged `transaction.helper.ts` for a real diff rather
than a blind discard, since `DB-CON-v1.0 §28` requires both
`withTransaction()` **and** a `pg_advisory_xact_lock`-based helper for
`wallet`'s future balance check-then-deduct sequence.

**Confirmed:** `apps/api/src/database/transaction.helper.ts` (the version
kept from backend-foundation) already implements both —
`TransactionHelper.withTransaction()` and
`TransactionHelper.withAdvisoryLock()` (wraps
`pg_advisory_xact_lock(hashtext($1))`, transaction-scoped, no manual
unlock needed). No gap. Nothing further to reconcile here.
