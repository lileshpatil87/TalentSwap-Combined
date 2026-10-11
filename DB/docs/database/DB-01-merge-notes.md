# DB-01 → backend-foundation Merge Notes

Written after review feedback identified DB-01 as a standalone repo that
should never have existed separately — it duplicates backend-foundation's
infrastructure instead of extending it. This package contains **only**
the pieces of DB-01 that are genuinely additive; everything that
duplicated backend-foundation has been dropped.

## Root cause (owning this, not just fixing it)

DB-01's task brief said "Backend Repository: talentswap-backend" and I
built to that literally, at the repo root, with npm + a standalone
`package.json` named `talentswap-backend`. Architecture Foundation §2/§15
— the higher-priority document I was told to follow — mandates a single
pnpm monorepo with the backend at `apps/api/`, package name
`@talentswap/api`. That's a direct conflict between the task brief and
the governing architecture doc, and per the AI SDLC governance model
(flag conflicts, don't resolve them unilaterally) I should have raised it
instead of silently building the standalone shape. The DevOps and
Frontend deliveries caught the same conflict in their own briefs and
correctly overrode it in favor of the monorepo. This is the fix.

## Drop-in files (copy as-is to the paths shown)

All five of these sit at the exact path Architecture Foundation §15
already specifies, so they should require no import-path changes:

| File | Target path |
|---|---|
| `database-health.indicator.ts` | `apps/api/src/database/database-health.indicator.ts` |
| `database-health.controller.ts` | `apps/api/src/database/database-health.controller.ts` |
| `prisma-error.mapper.ts` | `apps/api/src/database/prisma-error.mapper.ts` |
| `database.exception.ts` | `apps/api/src/common/exceptions/database.exception.ts` |
| `uuid.util.ts` | `apps/api/src/common/utils/uuid.util.ts` |
| `audited-entity.type.ts` | `apps/api/src/database/types/audited-entity.type.ts` (or promote into `packages/types` later — not mandated by DB-CON, your call) |
| `seed.ts` | `apps/api/prisma/seed.ts` — **only if backend-foundation doesn't already have one.** If it does, diff the two; keep whichever states the idempotent-upsert contract from DB-CON-v1.0 §21 and merge any content, don't just pick one blindly. |

## Before wiring these in, verify two dependencies line up

1. **`database.exception.ts` extends `DomainException`.** It expects
   `DomainException` (from `../../common/exceptions/domain.exception`) to
   be an abstract class with `abstract code: string`,
   `abstract httpStatus: number`, and a `details: Record<string, unknown>
   | undefined` field, constructed as `super(message, details)`. If
   backend-foundation's `domain.exception.ts` has a different shape
   (different field names, no `details`, etc.), `database.exception.ts`
   won't compile as-is — adjust one side to match, don't fork it.
2. **`database-health.indicator.ts` imports `PrismaService` from
   `./prisma.service`.** This only resolves if backend-foundation's
   `PrismaService` lives at `apps/api/src/database/prisma.service.ts`
   (per Architecture §15, it should) and exposes an `isHealthy(): Promise<boolean>`
   method — if it doesn't have that method yet, add it (see the snippet
   at the bottom of this file) rather than reimplementing the health
   check a different way.

## Deliberately NOT included here — reconcile by diff, not by discard

DB-01 also duplicated `main.ts`, `app.module.ts`, `prisma.module.ts`,
`prisma.service.ts`, `config.module.ts`, `env.schema.ts`, and
`transaction.helper.ts`. The review's recommendation was to discard
DB-01's copies of the first four wholesale in favor of
backend-foundation's — I agree with that. But I'm flagging
**`transaction.helper.ts` specifically for a real diff, not a blind
discard**: DB-CON-v1.0 §28 requires both a `withTransaction()` wrapper
*and* a `pg_advisory_xact_lock`-based advisory-lock helper (needed later
by `wallet`'s balance check-then-deduct sequence). If backend-foundation's
version only has `withTransaction()` and not the advisory-lock helper,
that's a real gap DB-01's copy fills — worth checking before deleting
either one. I don't have backend-foundation's actual source to compare
against, so I can't resolve this one unilaterally; if you can share that
zip (or the relevant file), I'll do the actual diff and hand back one
reconciled version instead of two guesses.

## `isHealthy()` snippet, if PrismaService doesn't already have it

```ts
async isHealthy(): Promise<boolean> {
  try {
    await this.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    this.logger.error('Database health check failed.', error as Error);
    return false;
  }
}
```
