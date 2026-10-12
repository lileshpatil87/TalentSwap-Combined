# TalentSwap — combined FE + BE + DB workspace

This is the merged pnpm/Turborepo monorepo. Read `INTEGRATION-NOTES.md` before running it; the supplied BE and DB database contracts conflict, so the active API uses the BE Prisma schema/migrations while the complete DB release is preserved under `DB/`.

## Requirements

- Node.js 20.x (the API package requires Node 20)
- Corepack + pnpm 9
- Docker Desktop / Docker Engine with Compose
- OpenSSL available on PATH (for local JWT keys)

## First-time setup (Windows PowerShell)

From the extracted `TalentSwap-Combined` directory:

```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
# Generate API .env and development-only RSA keys. This overwrites apps/api/.env if it exists.
./scripts/generate-jwt-keys.ps1
pnpm install --no-frozen-lockfile
pnpm infra:up
```

The same commands work in Bash with equivalent `cp` commands; run the PowerShell key script from PowerShell or create the API `.env` from `apps/api/.env.example` and provide valid PEM key values yourself.

## Prepare the database

Wait for PostgreSQL to become healthy, then run:

```powershell
pnpm db:setup
```

This generates the Prisma client, applies the active BE migration chain, and seeds configured reference data/admin account. The example admin password is only for local development; change it before using any shared environment.

## Start the application

Option A — one command from the repository root:

```powershell
pnpm dev
```

Option B — separate terminals:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Default URLs:

- Web: http://localhost:3000
- API: http://localhost:4000
- API docs (if enabled): http://localhost:4000/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Demo fallback is disabled by default. Authenticated account pages never substitute demo data for live user data. You may explicitly enable demo fallback for non-production public/read-only surfaces only.

## Useful commands

```powershell
pnpm build
pnpm typecheck
pnpm test:source
pnpm validate
pnpm infra:logs
pnpm infra:down
```

`pnpm install --no-frozen-lockfile` is intentional on first setup because the FE and BE ZIPs were produced with separate root lockfiles; pnpm must reconcile the combined workspace's importers. Review the resulting `pnpm-lock.yaml` and commit it after dependency resolution in your development environment.

## DB release checks

The DB delivery remains self-contained under `DB/`. To run its dependency-independent static release check:

```powershell
Set-Location DB
node scripts/verify-db-static.mjs
```

For its live PostgreSQL/Prisma integration tests, follow `DB/README.md` and use its own `docker-compose.db.yml` only after stopping the root infrastructure stack. It is a separate migration contract until the documented schema conflict is reconciled.
## Phase 4 scaling foundation

See [`infrastructure/phase4/README.md`](infrastructure/phase4/README.md) for optional OpenSearch, Kong API Gateway, developer API, governance, mediasoup SFU, PostHog flags, multi-region database, and blue/green release setup. These services are opt-in and require deployment-specific secrets and live validation.
