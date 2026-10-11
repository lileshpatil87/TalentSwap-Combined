/**
 * scripts/seed-db.ts
 *
 * Convenience wrapper around `apps/api/prisma/seed.ts`, so a contributor
 * (or a future Claude session) can seed the local database from the
 * repository root without first `cd apps/api`.
 *
 * Owner: DevOps (Krushna) — Architecture Foundation §2.6: "Wraps
 * prisma/seed.ts for convenience." Delivered as part of DEV-02, closing
 * the gap `apps/api/prisma/seed.ts`'s own header comment already
 * flagged: "The convention scripts/seed-db.ts (FOUND-08, still
 * outstanding) will wrap this for convenience ... once it exists."
 *
 * This script does NOT contain seed data or business logic itself — it
 * only invokes the existing, already-wired `prisma db seed` entrypoint
 * (`apps/api/package.json`'s `"prisma": { "seed": "ts-node prisma/seed.ts" }`
 * field), via the `prisma:seed` npm script that already exists in
 * `apps/api/package.json`. Every domain module's seed section lives in
 * `apps/api/prisma/seed.ts` itself, per that file's own header contract
 * (idempotent upserts, append-only per-module sections) — nothing here
 * duplicates or overrides that.
 *
 * Usage:
 *   pnpm ts-node scripts/seed-db.ts
 *   pnpm seed:db                        (package.json alias)
 *
 * Prerequisite: local Postgres must be reachable (see `docker compose
 * ... up -d postgres` / `./scripts/setup.sh`) and `DATABASE_URL` must be
 * set in `apps/api/.env` (DEV-CON-v1.0 §6, §8).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const API_PACKAGE = '@talentswap/api';

function main(): void {
  console.log(`==> Seeding the TalentSwap database (wraps apps/api/prisma/seed.ts via '${API_PACKAGE}#prisma:seed')`);

  const result = spawnSync('pnpm', ['--filter', API_PACKAGE, 'run', 'prisma:seed'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`✖ Failed to run pnpm: ${result.error.message}`);
    console.error('  Is pnpm installed? See docs/onboarding/getting-started.md.');
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error('✖ Seed failed — see the Prisma output above.');
    console.error('  Common causes: Postgres is not running (docker compose up -d postgres),');
    console.error("  or apps/api/.env's DATABASE_URL doesn't match the running instance.");
    process.exit(result.status ?? 1);
  }

  console.log('==> Seed complete.');
}

main();
