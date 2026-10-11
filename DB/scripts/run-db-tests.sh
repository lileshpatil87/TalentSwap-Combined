#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${DATABASE_URL:?DATABASE_URL must be set to a disposable PostgreSQL database}"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required." >&2
  exit 127
fi

echo "==> Applying/validating migrations is intentionally separate; run prisma migrate deploy first."
echo "==> Running comprehensive DB-03 -> DB-17 integration suite..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/verify-db-integration.sql"
echo "==> DB integration suite PASSED."
