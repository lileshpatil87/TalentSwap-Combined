# Database Validation Scripts

This directory contains the executable validation tooling for the final TalentSwap database-only
release.

| Script | Purpose |
|---|---|
| `verify-db-static.mjs` | Static migration-chain, schema and required-index gate. |
| `verify-release.mjs` | Release artifact, dependency and integration-test integrity gate. |
| `verify-db-final.sql` | Final catalog and integration verification entrypoint for PostgreSQL. |
| `verify-db-integration.sql` | Comprehensive transactional DB-03→DB-17 constraint/invariant test suite. |
| `run-db-tests.sh` | Runs the comprehensive PostgreSQL suite with `psql`. |
| `test-db-concurrency.sh` | Two-connection ledger race/double-spend test. |
| `run-all-db-validation.sh` | Combined static, release, Prisma and PostgreSQL validation runner. |
| `seed-db.ts` | Convenience wrapper for the Prisma seed entrypoint. |

## Local PostgreSQL

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/talentswap_dev?schema=public'
bash scripts/run-all-db-validation.sh
```

## Docker PostgreSQL + pgvector

The repository root provides `docker-compose.db.yml`. The `test` profile installs the database
package dependencies, generates Prisma Client, deploys the full migration chain, seeds the database,
and runs the complete validation suite.

```bash
docker compose -f docker-compose.db.yml up -d postgres
docker compose -f docker-compose.db.yml --profile test run --rm db-test
```

## Scope

These scripts validate only the database workstream. They do not implement frontend, backend,
DevOps, AI or QA application modules that the DB prompts explicitly exclude.
