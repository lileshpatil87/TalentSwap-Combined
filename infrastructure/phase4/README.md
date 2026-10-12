# TalentSwap Phase 4 — Scaling foundation

Phase 4 is opt-in. Local development and existing deployments keep PostgreSQL full-text search, the existing API deployment, and the existing calling transport unless the Phase 4 services are explicitly configured.

## Implemented in source

- **Regional PostgreSQL reads:** `DATABASE_READ_URL` config and `ReadReplicaService`; search and public skill discovery use the configured regional reader. Financial writes remain on the primary writer.
- **OpenSearch:** optional OpenSearch index, query adapter, skill indexing/deletion jobs, bulk rebuild, and PostgreSQL fallback when OpenSearch is unavailable.
- **API Gateway:** Kong declarative route, Redis-backed rate limits, payload-size limiting, and Prometheus metrics plugin; gateway routes `/api/v1` to the API service.
- **Public developer API:** scoped API keys are stored as SHA-256 hashes, returned only at creation, revocable, expiry-aware, owner-ban-aware, and rate-limited at the gateway. Public read-only skills endpoint and OpenAPI contract are included.
- **Governance:** proposal creation, one-vote-per-member enforcement, vote tallies, expiry handling, 300 XP eligibility, and a dashboard route.
- **Mediasoup SFU:** standalone Socket.IO SFU with short-lived HMAC tokens issued only after the API validates exchange participation, WebRTC transports/producers/consumers, Docker image, and operational notes.
- **A/B testing:** authenticated backend adapter for PostHog feature flag evaluation and event capture. User identity is derived from the authenticated session, not a caller-supplied distinct ID.
- **Availability foundation:** multi-region Aurora Global Database Terraform template, health-checked service containers, release-gate workflow, and blue/green / failover runbooks.

## Local scale profile

1. Copy `.env.example` to `.env` and `apps/api/.env.example` to `apps/api/.env`.
2. Generate a strong `SFU_SHARED_SECRET` (32+ characters) and place the same value in `.env` and `apps/api/.env`.
3. For API container use, ensure the JWT key values in `apps/api/.env` are configured and `CORS_ORIGIN` matches the browser origin.
4. Start the base database/cache plus the optional scale services:

   ```bash
   docker compose up -d postgres redis
   docker compose -f docker-compose.yml -f infrastructure/phase4/docker-compose.yml --profile scale up --build
   ```

5. Apply migrations to a disposable database first, then run the migration deploy command against the intended environment. For local scale profile, set `SEARCH_BACKEND=opensearch` in `.env` to enable OpenSearch; PostgreSQL remains the default.
6. Visit the frontend on port 3000; its build-time API URL points to Kong at `http://localhost:8000/api/v1` in this profile. API direct port is intentionally not published by the scale overlay.

## Production prerequisites — not automatic

- The Terraform files are a reviewed starting template; provide actual private subnets, security groups, regional quotas, KMS/network controls, secret management, alerts, and perform `terraform validate/plan` in the target AWS account before applying.
- Configure TLS/WSS at the gateway/load balancer, trusted forwarded headers, private service networking, Cloudflare/WAF rules, and production secrets.
- OpenSearch should use TLS/authentication and private networking in production. The Compose OpenSearch service disables its security plugin only for local development and binds the host port to loopback.
- The SFU service is a standalone media server. Configure public/announced IP, UDP/TCP media port ranges, TLS, TURN fallback, and client-side `mediasoup-client` integration before routing real calls to it. The current browser calling UI remains on the existing calling flow until that client integration is built and browser-tested.
- PostHog requires a project key and host; experiment variants and statistical significance are configured in PostHog. Feature flags default off when not configured.
- A 99.9% SLA is a target, not a verified guarantee. It requires live multi-AZ/multi-region deployment, measured SLIs, load/failover/restore drills, and operational response coverage.

## Validation

`pnpm validate:phase4` checks the presence of Phase 4 source and configuration contracts. It is not a substitute for `pnpm install`, semantic TypeScript checks, Prisma schema validation/generation, database migrations, full tests, container builds, and live AWS/OpenSearch/PostHog/SFU tests.
