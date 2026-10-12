# Phase 2 — Migration history ownership

## Canonical runtime schema and migration chain

The API package scripts in `apps/api/package.json` run Prisma against `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`. Therefore this is the canonical, executable migration chain for the current monorepo runtime.

The separate `DB/apps/api/prisma/` tree contains a divergent staged/release history with differently segmented migration IDs and is not configured as the runtime API's Prisma schema path. It must not be concatenated into the active chain or run against the same database without a deliberate baseline/reconciliation plan. Doing so could replay DDL already present in the active combined backend migration.

## Phase 2 changes

The Phase 2 migration is `apps/api/prisma/migrations/20261012000100_phase2_settings_password_reset_call_documents/migration.sql`. It adds user settings, hashed password-reset tokens, document byte-size metadata, exchange-linked call sessions, and a partial unique index preventing multiple live calls for the same transaction.

## Safe application

1. Back up the target database.
2. Confirm the target database's `_prisma_migrations` table reflects the `apps/api/prisma/migrations/` history.
3. Run `pnpm --filter @talentswap/api prisma:generate`.
4. Run `pnpm --filter @talentswap/api prisma:migrate:deploy` against a disposable test database first.
5. If the database was previously migrated using `DB/apps/api/prisma/`, stop and reconcile migration baselines explicitly; do not force this chain onto that database.

No migration has been executed against a live database in this environment.
