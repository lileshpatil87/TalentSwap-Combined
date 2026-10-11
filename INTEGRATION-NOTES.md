# TalentSwap combined delivery — integration notes

## What is combined

- Frontend source is at `apps/web`.
- Backend NestJS API is at `apps/api`; the background worker is at `apps/worker`.
- Shared workspace packages and frontend validation scripts are at the repository root.
- The backend Prisma schema/migrations from the BE delivery are the **active runtime database contract** under `apps/api/prisma`.
- The complete DB delivery is preserved separately under `DB/`, including its schema, migration sequence, documentation, SQL checks, and release scripts.

## Important schema/migration conflict (not silently changed)

The supplied BE and DB ZIPs do not describe the same active Prisma contract. For example, the BE calling code/schema uses `CallSession` fields such as `participantIds` and `channelName`, while the DB delivery models calls with `providerId` and `sessionIdentifier` and a different status enum. The BE ZIP also has a consolidated migration that creates domain tables already created by the DB ZIP's incremental migrations. Combining those two migration chains directly would cause duplicate-object failures and/or generated-client mismatches.

To keep the API runnable without silently redesigning either team's approved work, this combined project uses the BE schema/migration chain for the running API and keeps the DB release intact under `DB/`. Do not copy `DB/apps/api/prisma/migrations` into `apps/api/prisma/migrations` until the teams approve one reconciled schema and migration plan. The DB package can still be inspected and its standalone static checks run independently.

## Runtime configuration

- Root `.env.example` configures local Docker services.
- `apps/api/.env.example` is the API configuration template. `scripts/generate-jwt-keys.ps1` creates a local `apps/api/.env` with fresh development RSA keys (requires OpenSSL on PATH).
- `apps/web/.env.example` is the web configuration template; copy it to `apps/web/.env.local`.
- Do not commit `.env`, `.env.local`, private keys, or production secrets.
