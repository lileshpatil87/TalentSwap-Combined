# BE-25 — Common Backend Infrastructure / Final Hardening

## Verified controls

- Global `JwtAuthGuard`, `RolesGuard`, `RateLimitGuard`, Zod validation pipe, exception filter and response-transform interceptor are registered from `AppModule`.
- `OwnershipGuard` remains an extension point; domain services enforce ownership where resource-specific lookup is required.
- Request IDs are injected by `RequestIdMiddleware`.
- Controllers do not hand-build response envelopes or local exception envelopes.
- Module repositories are the backend feature-layer Prisma access points.
- `scripts/check-boundaries.ts` provides a CI-facing boundary check.
- Socket authentication uses the existing JWT token service; chat/call gateways do not create alternate credentials.
- Critical wallet operations use serializable transactions plus PostgreSQL advisory locks.
- Admin audit records are append-only at the database trigger level.
- Search and leaderboard state are derived/rebuildable projections.

## Validation in the offline build environment

The available environment did not contain the workspace `node_modules` tree and could not resolve the npm registry, so a full dependency-backed `pnpm typecheck`, Jest suite, Prisma generation/validation and production build could not be executed here. Syntax parsing, import-path validation and the boundary checker were executed successfully.

Run after dependency installation:

```text
pnpm install
pnpm --filter @talentswap/api prisma:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @talentswap/api test:e2e
pnpm build
pnpm check:boundaries
```
