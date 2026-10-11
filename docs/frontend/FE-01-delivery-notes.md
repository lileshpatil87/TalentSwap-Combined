# FE-01 — Shared Frontend Foundation: Delivery Notes

Written for Erwin (Lead Architect) and Jacob (PM), flagging items
discovered during this build rather than resolved unilaterally — the
same discipline the Master Development Plan itself uses for C-1…C-5.

## 1. Repository topology: monorepo vs. standalone `talentswap-frontend`

The build brief for this task named a standalone GitHub repository,
`talentswap-dev/talentswap-frontend`, as the push target. That structure
matches the **original** Technology Specification (§6.1/§6.2, which
describes `talentswap-frontend` and `talentswap-backend` as separate
repos) but directly contradicts the **authoritative, frozen** Architecture
Foundation v1.1 §2, which explicitly unifies both apps into one
pnpm/Turborepo monorepo (`talentswap/apps/web`, `talentswap/apps/api`)
specifically *because* it supersedes that original two-repo description.

Per this task's own governing-document priority order (Architecture
Foundation > Master Plan > Frontend Constitution > Proposal > Spec) and
the AI SDLC §1 governance rule that only an explicit approval, a critical
architectural issue, or an ADR can change the locked structure, this
delivery follows the Architecture Foundation: everything here is built as
`apps/web` inside a single `talentswap` monorepo, not a standalone
frontend-only repository.

**Recommendation:** if a standalone frontend repo is genuinely intended
going forward, that is a repository-topology change to the Architecture
Foundation itself and needs an ADR, not a silent deviation inside one
module's delivery.

## 2. Module ID: `FE-01` vs. `FOUND-02/05/07`

The task brief labels this delivery `FE-01 — Shared Frontend Foundation`.
In the Master Development Plan's own Module Breakdown Structure (§3.5),
`FE-01` is defined as **Auth UI** (`(auth)` route group, `useAuth`,
`authStore`, login/register forms — depends on `BE-01`). The scope
actually requested in this task's IMPLEMENT list — project structure,
shared packages, app shell, providers, env config, API client foundation,
tooling — maps instead to `FOUND-02` (Shared Packages Skeleton),
`FOUND-05` (Environment & Config Validation), `FOUND-07` (Frontend App
Shell & Providers), and the frontend-relevant slice of `FOUND-01`
(tooling scaffold), per Master Plan §3.2.

This delivery implements the requested **scope** (the Foundation-tier
work described above) rather than the Auth UI scope the `FE-01` label
would imply elsewhere in the project's own tracking documents, since the
task's explicit `DO NOT IMPLEMENT` list rules out Authentication. Jacob
may want to reconcile the ID used to track this delivery in the Master
Tracking Table (§7.2) against `FOUND-02/05/07` rather than `FE-01`, to
avoid a future session mistaking this for the Auth UI module already
being done.

## 3. What was deliberately left as a placeholder, and why

Per the task's own `DO NOT IMPLEMENT` list, the following files named in
Architecture Foundation §15's tree were **not** created, since building
them requires business logic from an explicitly out-of-scope domain:

- `middleware.ts` (auth-gating) — owned by `FE-16` (Dashboard Shell),
  needs `auth`.
- `components/layouts/{Sidebar,Navbar,Footer}.tsx` — owned by `FE-16`.
- `hooks/{useAuth,useWebRTC,useTransactions,useNotifications}.ts` — each
  owned by its domain module (`auth`, `calling`, `transactions`,
  `notifications`).
- `store/{authStore,notificationStore,callStore}.ts` — same, per module.
- `lib/api/{auth,skills,transactions,wallet,chat,community,admin}.ts` —
  per-module API slices, added by each domain module's own PR.
- `Dockerfile` — infrastructure, owned by Krushna (`INFRA-02`), not a
  frontend-foundation concern.

Each location above is scaffolded with a short `README.md` (or barrel
placeholder, where Architecture §15 calls for one) explaining what goes
there and which future module ID owns it, so the next session doesn't
need to restructure anything to build into it.

## 4. Build verification

No network access was available in the environment this was built in, so
`pnpm install` could not be run against the real npm registry. All
authored `.ts`/`.tsx` files were checked with a standalone `tsc --noEmit`
pass; the only errors surfaced were expected artifacts of missing
`node_modules` (unresolved package imports, missing `@types/node`/
`@types/react`) — no syntax or logic errors were found. A real
`pnpm install && pnpm build && pnpm lint && pnpm typecheck && pnpm test`
run in an environment with registry access is the remaining verification
step before this is merged.

## 5. GitHub push

This delivery was produced without direct GitHub write access — see the
final chat response for how these files were delivered instead.

## 6. Cross-repo integration audit (post-delivery addendum)

A subsequent review comparing this delivery against `backend-foundation`,
`backend-DB-01`, and the DevOps foundation surfaced one concrete
integration bug touching this module:

**Env var contract drift.** This delivery's `lib/env.ts` (Zod, fail-fast,
Arch §8.2) and `apps/web/.env.example` are internally consistent
(`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SOCKET_URL`, port `3001`
placeholder). The DevOps delivery independently authored its own
`apps/web/.env.example` using different names
(`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL`) and a different port
(`4000`), with no shared source of truth to check against. Since
`scripts/setup.sh` copies whichever `.env.example` wins a merge straight
to `.env.local`, the app hard-crashes at boot (by design — Zod throws on
a missing required var) if DevOps's version lands instead of this one.

**Resolution direction (not unilaterally decided here):** `lib/env.ts`'s
schema is the enforced contract this app actually reads — infrastructure
tooling (`docker-compose.yml`, `apps/api`'s own `.env.example`,
`setup.sh`) should be the side that conforms, not this file, since
renaming the schema to match ops tooling arbitrarily just moves the same
problem instead of fixing it. `.env.example` here has been annotated
accordingly. Actually reconciling `docker-compose.yml`/`setup.sh`/the
DevOps `.env.example` requires those files, which weren't available in
this session — flagging for Erwin/Krushna to close out, same as the
other cross-repo findings in that review.

The reviewer also confirmed the module-ID mislabeling flag (§2 above) and
the monorepo-over-standalone-repo override (§1 above) were both the
correct call, independently corroborating this delivery's own notes.
