# TalentSwap Phase 5 — Final Integration, Quality Gate and Release Readiness

## Scope

The supplied product specification defines four roadmap phases; it does not define a fifth product-feature phase. This Phase 5 package therefore means the final integration/release-readiness gate across Phases 1–4, rather than silently inventing another product roadmap.

## Included finalization work

- Added a unified release source gate (`pnpm validate:release`) that checks required runtime/configuration files, package manifests, and reruns phase 1–4, frontend, PWA and acceptance checks.
- Added a configurable HTTP smoke test (`pnpm smoke`) for a locally running API.
- Added Windows PowerShell and Bash setup helpers that install the workspace dependencies, start PostgreSQL/Redis, generate Prisma Client, and apply the active API migration chain.
- Added this release checklist and explicit validation boundaries.
- Preserved the Phase 1–4 source and infrastructure work in the same project tree.

## Local development setup

### Requirements

- Node.js 20 LTS or newer (Node 20 is the supported Docker runtime)
- Corepack and pnpm 9
- Docker Desktop / Docker Engine with Compose
- Network access to the npm registry for package installation

### Windows

1. Extract the ZIP into a writable folder.
2. Open PowerShell in the extracted folder.
3. Review `.env.example`, `apps/api/.env.example`, and `apps/web/.env.example`.
4. Run `Set-ExecutionPolicy -Scope Process Bypass` if local policy blocks scripts.
5. If `apps/api/.env` does not yet contain valid JWT PEM values, run `./scripts/generate-jwt-keys.ps1` from the root before starting the API. This creates development-only keys.
6. Run `./RUN-WINDOWS.ps1` and follow the prompts. The script does not generate production secrets or deploy cloud resources.
6. Open two terminals at the project root and run `corepack pnpm dev:api` and `corepack pnpm dev:web`.
7. Visit `http://localhost:3000`; the API defaults to `http://localhost:4000`.

### macOS/Linux

1. Extract the ZIP and open a terminal in the project root.
2. Review the same `.env` examples and set development JWT keys/configuration.
3. Run `./RUN-LOCAL.sh`.
4. Start the API and frontend in separate terminals with `corepack pnpm dev:api` and `corepack pnpm dev:web`.

The first install requires registry access. If the install is interrupted, fix the network/registry issue and rerun `corepack pnpm install --no-frozen-lockfile`; do not delete the lockfile as a workaround.

## Final verification commands

Run these from the project root after installing dependencies:

```bash
corepack pnpm validate:release
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @talentswap/api exec prisma validate --schema prisma/schema.prisma
corepack pnpm smoke
```

The smoke test defaults to `http://localhost:4000` and checks `/health` and `/api/v1/health`. Override `TALENTSWAP_API_URL` or `TALENTSWAP_SMOKE_PATHS` if the deployment uses another base URL/health route.

Before a release, also run database integration/concurrency tests against a disposable database, build all Docker images, validate the optional Terraform stack, and run browser E2E and security tests. Never run destructive migration or failover tests against production.

## Remaining environment-dependent release gates

These cannot be truthfully marked complete by packaging source code alone:

- Dependency-based semantic typecheck, full Jest suite and production builds, because package installation in this execution environment failed when `registry.npmjs.org` could not resolve (`EAI_AGAIN`).
- Live PostgreSQL migration, rollback/recovery, escrow concurrency, and read-replica lag/failover tests.
- Live OpenSearch secured indexing/rebuild/fallback tests; production Kong TLS/auth/rate-limit verification; public API abuse/rate-limit testing.
- PostHog project/secret setup and live flag/event verification.
- Browser-side mediasoup client integration, TURN fallback, TLS/UDP networking, reconnection and multi-party call tests. The current SFU package is a service foundation, not evidence that the existing browser call flow is fully switched over.
- AWS account-specific Terraform review/apply, multi-AZ/multi-region failover, blue-green deployment, secret management, backups/restore drills, load testing, and proof of 99.9% uptime / 100,000-user capacity.
- End-to-end user workflows in real browsers and external integrations (email, object storage, Sentry/metrics) using deployment-owned credentials.

Do not claim production readiness or an SLA until those gates pass in the target environment.

## Preserved requirement

The zero-SkillPoints balance problem and all previously discussed solutions remain deferred and unchanged, as explicitly requested. No real-money SkillPoints purchase path should be enabled; monetization is out of scope.
