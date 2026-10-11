#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PRISMA="$ROOT/apps/api/node_modules/.bin/prisma"

run_if_available() {
  if [[ -x "$PRISMA" ]]; then
    "$PRISMA" "$@"
    return 0
  fi
  return 127
}

echo '=== 1/5 Static migration/schema verification ==='
node scripts/verify-db-static.mjs

echo '=== 2/5 Release package integrity verification ==='
node scripts/verify-release.mjs

echo '=== 3/5 Prisma schema/migration verification ==='
if [[ -x "$PRISMA" ]]; then
  "$PRISMA" validate --schema apps/api/prisma/schema.prisma
  "$PRISMA" generate --schema apps/api/prisma/schema.prisma
  if [[ -n "${DATABASE_URL:-}" ]]; then
    "$PRISMA" migrate deploy --schema apps/api/prisma/schema.prisma
  else
    echo 'SKIP migration deploy: DATABASE_URL is not set.'
  fi
else
  echo 'SKIP: Prisma CLI is not installed in this environment.'
fi

echo '=== 4/5 PostgreSQL integration verification ==='
if command -v psql >/dev/null 2>&1 && [[ -n "${DATABASE_URL:-}" ]]; then
  ./scripts/run-db-tests.sh
  ./scripts/test-db-concurrency.sh
else
  echo 'SKIP: psql is not installed or DATABASE_URL is not set.'
fi

echo '=== 5/5 Final SQL verification ==='
if command -v psql >/dev/null 2>&1 && [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-db-final.sql
else
  echo 'SKIP: psql is not installed or DATABASE_URL is not set.'
fi

echo '=== Validation complete ==='
