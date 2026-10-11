# TalentSwap — Final Database Release (DB-03 → DB-17)

This is the cumulative **DATABASE-ONLY** TalentSwap release. It contains the approved DB-02
starting state plus every DB prompt from DB-03 through DB-17, including final forward-only
corrections and executable database integration tests.

## What is included

- Prisma PostgreSQL schema and the complete forward-only migration chain.
- DB-03 profiles balance trigger.
- DB-04 skills/categories.
- DB-05 append-only SkillPoints ledger and balance synchronization.
- DB-06 transaction/escrow state-machine schema and idempotency constraints.
- DB-07 conversations/messages.
- DB-08 notifications and unread partial index.
- DB-09 document verification states.
- DB-10 badges/user badges/activity streaks.
- DB-11 ratings.
- DB-12 community posts.
- DB-13 immutable admin-log privilege boundary.
- DB-14 generated PostgreSQL FTS projection + GIN index.
- DB-15 calling/session records.
- DB-16 pgvector embeddings on skills/profiles at the authoritative 1536 dimensions.
- DB-17 final indexing/performance review plus forward-only index/vector corrections.
- Comprehensive SQL integration tests covering constraints, FKs, triggers, financial invariants,
  FTS, pgvector, ratings, chat, documents, gamification, community, admin audit and indexes.
- Docker Compose PostgreSQL + pgvector runtime for repeatable local verification.

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- pgvector with HNSW support

Docker users can use the supplied `docker-compose.db.yml` to obtain PostgreSQL + pgvector.

## Full local validation

```bash
cp .env.db.example .env
pnpm install
pnpm db:generate
pnpm db:validate
pnpm db:up
pnpm db:migrate
pnpm db:seed
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/talentswap_dev?schema=public'
pnpm test:db
pnpm verify:db
```

Or run the complete validation wrapper:

```bash
pnpm run-all-db-validation
```

The explicit wrapper is available as:

```bash
bash scripts/run-all-db-validation.sh
```

For a clean database, destroy the volume first:

```bash
pnpm db:down
pnpm db:up
pnpm db:migrate
```

## Seed

The seed is idempotent. It creates the optional admin bootstrap account only when
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are provided. The governing documents do not
provide an authoritative production catalogue of skill categories or badges, so no invented
reference catalogue is seeded.

## Financial verification

DB-05 and DB-06 are covered by the integration test suite. The tests verify positive ledger
entries, balance synchronization, bad balance snapshots, overdraw protection, transaction
constraints, idempotency, and completion timestamp consistency.

The supplied prompts additionally require **Erwin + Lilesh dual approval** for DB-05 and DB-06.
The ZIP cannot manufacture human approvals; those remain explicit governance sign-off gates.

## pgvector resolution

The DB-16 prompt says not to guess vector dimensions. The higher-authority Database Constitution
§46 explicitly states that `text-embedding-3-small` produces **1536 dimensions** for this project.
The final release therefore uses `vector(1536)` and HNSW cosine indexes on both `skills.embedding`
and `profiles.embedding`.

## What was executed during package preparation

The environment available to this build has Node.js but no PostgreSQL server, `psql`, Docker or
Podman, and no cached Prisma engine. Therefore live PostgreSQL/Prisma execution cannot be falsely
reported as already completed. All environment-independent release checks and static migration
checks are executed before packaging.

When PostgreSQL + pgvector is available, `scripts/run-all-db-validation.sh` runs the static checks, release checks, Prisma checks, PostgreSQL integration tests, the concurrent ledger double-spend test, and the final catalog SQL verification.

## Migration history

The release preserves the complete forward-only history. No earlier migration is rewritten.
DB-17 corrections are represented by additional migrations after the original DB-17 review gate.
