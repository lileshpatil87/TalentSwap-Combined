# TalentSwap — Architecture & Engineering Standards Foundation

**Document Type:** Architecture Foundation & Engineering Standards (governs all future module development)
**Status:** Authoritative — supersedes ad-hoc decisions made in individual module PRs
**Source of Truth:** `TalentSwap_Proposal.md` (product intent) and `TalentSwap_Technology_Specification.md` (technical decisions). Where this document is silent, the Technology Specification governs. Where this document adds structure not present in either source document, it does so only to make the specified stack buildable by multiple independent contributors without drift.
**Scope of this document:** Foundation only. No business logic, no API routes, no React pages, no NestJS feature modules, no Prisma schema, no SQL are implemented here. This document defines the skeleton, the rules, and the contracts that every future module — built by a human or by a future Claude session — must obey.

---

## 0. How to Use This Document

1. Before creating any file in this repository, identify which **module** owns that responsibility (Section 3).
2. Confirm the file's location against the **Complete Project Tree** (Section 15) — do not invent new top-level folders.
3. Confirm naming against **Section 5**, TypeScript rules against **Section 6**, and API shape against **Section 9**.
4. If a module needs something from another module, check **Section 4 (Communication Rules)** before writing an import.
5. New contributors (human or AI) should read Section 17 (Integration Guide) in full before opening a PR.

This document assumes a **monorepo**, managed with **pnpm workspaces + Turborepo**, as the delivery mechanism for the stack specified in the Technology Specification. The two source documents describe `talentswap-frontend` and `talentswap-backend` as if they were separate repositories; this document unifies them into one repository with clean internal boundaries, for the reasons given in Section 2. Nothing about the chosen frontend or backend technology changes — Next.js 14 App Router and NestJS remain exactly as specified.

---

## 1. Overall Architecture

### 1.1 System Layers

TalentSwap is composed of five architectural layers, matching the Technology Specification's high-level traffic flow:

```
[ Client Browser ]
        │
        ▼
[ Edge Layer ]            Cloudflare CDN / WAF  — TLS termination, DDoS mitigation, static + R2 asset caching
        │
        ▼
[ Presentation Layer ]    Next.js 14 (apps/web) — SSR/SSG public pages, CSR authenticated dashboard, PWA shell
        │  REST (HTTPS)          │  WebSocket (WSS)
        ▼                        ▼
[ Application Layer ]     NestJS (apps/api) — REST controllers, WebSocket gateways, guards, services
        │
        ▼
[ Data & Integration Layer ]
   PostgreSQL 16 (via Prisma) — durable relational + ledger data
   Redis 7                    — cache, Socket.io adapter, BullMQ queues
   Cloudflare R2               — object storage (documents, avatars, chat media)
   External services           — Agora, Resend, OpenAI, ClamAV (all accessed through dedicated adapters)
```

### 1.2 Architectural Style

- **Frontend:** Next.js App Router monolith, hybrid SSR/CSR, single deployable unit (`apps/web`).
- **Backend:** NestJS **modular monolith** at launch, per Technology Specification §2.9.1 — not microservices. Module boundaries (Section 3) are drawn now specifically so that the Transaction, Notification, and Real-Time modules can be extracted into independent services later (Spec §2.9.1, Roadmap Phase 3–4) without a rewrite.
- **Communication:** Synchronous REST for request/response; Socket.io for push/real-time; no GraphQL, no gRPC at launch (Spec §5.1).
- **Data ownership:** Single PostgreSQL database at launch, but every table is namespaced under a Prisma schema owned by exactly one backend module (Section 3), so a future split to per-service databases is a partition, not a redesign.
- **Background work:** All slow or non-critical-path work (email, document scanning, gamification evaluation, search sync) is deferred to BullMQ workers — never performed inline in a request handler.

### 1.3 Non-Goals of This Document

This document does not choose business rules (e.g., exact XP formulas, exact match-ranking weights) — those belong to the module that owns them and will be specified when that module is built. This document only guarantees that whichever module makes those decisions does so inside its own boundary, using the shared conventions defined here.

---

## 2. Repository Structure — `/apps`, `/packages`, `/infrastructure`, `/docs`, `/scripts`

TalentSwap is delivered as a single monorepo using **pnpm workspaces** for dependency management and **Turborepo** for task orchestration (build/lint/test caching and pipeline ordering). Package manager: **pnpm** (fast, disk-efficient, strict dependency resolution — prevents phantom dependencies that plague large multi-package repos).

```
talentswap/
├── apps/
├── packages/
├── infrastructure/
├── docs/
├── scripts/
├── .github/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### 2.1 Why this split, specifically

| Folder | Purpose | Why it exists as a top-level boundary |
| --- | --- | --- |
| `/apps` | Independently **deployable** applications (`web`, `api`) | Anything here has its own build output, its own Dockerfile/Vercel target, and its own runtime. If it can't be deployed on its own, it doesn't belong here. |
| `/packages` | Code **shared** by two or more apps, but never deployed on its own | Prevents duplication of types, validation schemas, and lint config between `web` and `api`. Nothing in `/packages` may import from `/apps` — dependency direction is one-way (apps depend on packages, never the reverse). |
| `/infrastructure` | Everything needed to **run** the apps, but which is not application code | Dockerfiles, Compose files, Nginx config, CI reusable workflows, Terraform (future). Keeping this separate from `/apps` means infra changes (e.g., bumping a base image) never touch application code review paths, and vice versa. |
| `/docs` | Everything needed to **understand** the system | This document, Architecture Decision Records (ADRs), generated OpenAPI specs, runbooks. Documentation that lives next to code (module-level READMEs) still lives inside the module; `/docs` is for cross-cutting and architectural documentation. |
| `/scripts` | One-off or repeatable **operational** tooling | DB seeding, module scaffolding generator, bulk lint/format runners. Scripts are not part of any app's runtime and must never be imported by application code. |

### 2.2 `/apps` — deployable units

```
apps/
├── web/     # Next.js 14 frontend — maps to "talentswap-frontend" in the Technology Specification
└── api/     # NestJS backend — maps to "talentswap-backend" in the Technology Specification
```

Only two apps exist at launch. `apps/api` contains the BullMQ workers and Socket.io gateways in-process (per Spec §2.9.1, extraction happens later). When the Technology Specification's Phase 3/4 extraction occurs (Notification Service, Transaction Service), those become new entries under `/apps` (e.g. `apps/notification-service`) that consume the same `/packages` — this is precisely why shared code lives in `/packages` and not inside `apps/api`.

### 2.3 `/packages` — shared, non-deployable code

```
packages/
├── config/           # Shared ESLint, Prettier, and base tsconfig — consumed by every app and package
├── types/             # Framework-agnostic TypeScript interfaces, enums, and DTO shapes shared by web + api
├── validation/        # Zod schemas — single source of truth for validation, used client-side (RHF) and server-side (NestJS pipes)
├── utils/             # Pure, framework-agnostic utility functions (date/point formatting, pagination helpers)
└── ui-tokens/         # Design tokens (color, spacing, typography scale) consumed by Tailwind config in apps/web
```

Rules for `/packages`:
- No package may depend on `apps/*`.
- No package may depend on another package's **internals** — only on its published barrel export (`index.ts`).
- `packages/types` and `packages/validation` are the **only** legal way for `apps/web` and `apps/api` to agree on a data shape. Duplicating a DTO by hand in both apps is a violation of this document.
- Packages contain no NestJS decorators, no React components, and no framework-specific code — they must be importable from either a Node server or a browser bundle without polyfills.

### 2.4 `/infrastructure`

```
infrastructure/
├── docker/
├── nginx/
├── ci/
└── terraform/         # placeholder only — activated in Roadmap Phase 4 (Spec §"Phase 4 — Scaling Stage")
```

### 2.5 `/docs`

```
docs/
├── architecture/       # This document + ADRs
├── api/                 # Generated OpenAPI/Swagger JSON, Postman collection (generated, not hand-written)
├── runbooks/            # Operational runbooks (deploy, rollback, incident response) — populated as modules ship
└── onboarding/          # New-contributor setup guide
```

### 2.6 `/scripts`

```
scripts/
├── setup.sh              # One-command local environment bootstrap
├── generate-module.ts    # Scaffolds a new NestJS module following Section 3/5 conventions
├── seed-db.ts             # Wraps prisma/seed.ts for convenience
└── check-boundaries.ts    # Lint rule runner that fails CI if a module import violates Section 4
```

---

## 3. Module Boundaries

Every unit of business capability — frontend or backend — is a **module**. A module is the smallest independently reviewable, independently ownable slice of the system. The module list below is drawn directly from the domains enumerated in the Technology Specification (Product Overview §1, Backend folder structure §6.2, API groups §5.3) so that no future module needs to be invented; it only needs to be filled in.

### 3.1 Backend Modules (`apps/api/src/modules/*`)

Each row states what the module **owns** (may read/write directly) and what it is **forbidden** from touching directly (must go through another module's public service interface instead).

| Module | Owns | Must NOT access directly |
| --- | --- | --- |
| **auth** | Login, registration, JWT issuance/verification, refresh-token rotation, OAuth strategies, password reset | Any domain table other than `users` (identity only — no profile, wallet, or skill data) |
| **users** | `users` table, account state (banned, email-verified), role assignment | Wallet balance mutation (must call `wallet`), skill data (must call `skills`) |
| **profiles** | `profiles` table — display name, bio, avatar, reputation aggregate, experience level | Direct ledger writes (must call `wallet`); direct XP writes (must call `gamification`) |
| **skills** | `skills`, `skill_categories` tables; skill CRUD and full-text search index | Transaction creation (must call `transactions`); user identity checks (must call `users` via injected service) |
| **matching** | Match-ranking computation, embedding generation/lookup via pgvector | Never writes to any table it does not own (`match_suggestions` cache only); read-only consumer of `skills` and `profiles` via their services |
| **wallet** | `skill_points_ledger` table, balance read/write, the **only** module permitted to change `profiles.skill_points` | Transaction lifecycle state (owned by `transactions`) — wallet only executes debits/credits requested by `transactions` |
| **transactions** | `transactions` table, escrow lifecycle, dual-confirmation state machine, dispute escalation | Direct ledger row writes (must call `wallet.debit()` / `wallet.credit()`); direct notification delivery (must call `notifications`) |
| **gamification** | `badges`, `user_badges`, `activity_streaks`, XP calculation, leaderboard sorted sets in Redis | Transaction data beyond read-only event subscription; never mutates `transactions` or `wallet` |
| **documents** | `documents` table, presign coordination with `storage`, ClamAV scan job dispatch, verification review workflow | Direct R2 bucket calls (must call `storage`); direct profile badge writes (must call `profiles` to set `is_verified`) |
| **storage** | Presigned URL generation, R2/S3 bucket interaction, file key lifecycle | Any business meaning of a file — `storage` knows only keys, MIME types, and sizes, never "this is a credential" |
| **chat** | `conversations`, `messages` tables, `/chat` Socket.io namespace | Call signalling (owned by `calling`); notification fan-out (must call `notifications`) |
| **calling** | Agora token generation, call session records, `/call` Socket.io namespace (signalling only — no media) | Chat message persistence; identity verification (reads `users`/`profiles` via service only) |
| **notifications** | `notifications` table, in-app delivery, Web Push (VAPID), default Socket.io namespace fan-out | Deciding *when* a notification is warranted — modules push events to `notifications`, which only handles delivery, not business triggering logic |
| **community** | `community_posts` table, board CRUD | Direct match-suggestion generation (must call `matching`) |
| **ratings** | `ratings` table, reputation score recalculation trigger | Transaction status changes (read-only subscriber to `transaction:completed` events) |
| **admin** | `admin_logs`, moderation queues, admin-only aggregation views | Never bypasses another module's guards — admin actions call the owning module's service with an elevated context, they do not write to other modules' tables directly |
| **search** | Search index sync jobs (Postgres tsvector at launch, Elasticsearch post-scale per Spec §2.3.4) | Owns no source-of-truth data — it is a read-optimized projection of `skills`/`profiles`, rebuildable at any time |
| **notifications-integrations** (sub-module of `notifications`) | Resend (email), Web Push adapters | N/A — internal to `notifications` |

Cross-cutting infrastructure modules (not domain modules, live in `apps/api/src/common` and `apps/api/src/database`, see Section 15):

| Infrastructure module | Owns |
| --- | --- |
| **database** | The single `PrismaService` instance, connection lifecycle, transaction helper (`withTransaction()`), advisory-lock helper |
| **cache** | Redis client instance, `CacheService` (get/set/TTL), `QueueService` (BullMQ queue registration) |
| **common/guards, interceptors, filters, pipes** | Auth guards, roles guard, global exception filter, response transform interceptor, Zod validation pipe — used by every module, owned by none |

**Rule:** every domain module gets exactly one Prisma "sub-schema" of tables it owns (per Spec §4.1). A module may **never** import another module's Prisma model type directly for writes — it may only call the owning module's exported service methods. Read-only cross-module lookups (e.g., `transactions` needs to know a user's display name) go through the owning module's public service, never through raw Prisma queries against another module's tables.

### 3.2 Frontend Modules (`apps/web/components/features/*` + `apps/web/app/(dashboard)/*`)

Frontend modules mirror backend domains one-to-one so a contributor building "Transactions" always touches the same conceptual boundary on both sides:

`auth`, `profile`, `skills`, `discover` (matching UI), `wallet`, `transactions`, `gamification`, `documents` (verification UI), `chat`, `calling`, `notifications`, `community`, `ratings`, `admin`.

Each frontend module owns:
- Its route segment(s) under `app/(dashboard)/...`
- Its feature components under `components/features/<module>/`
- Its TanStack Query hooks under `hooks/` (or co-located `use<Module>.ts`)
- Its slice of the API client under `lib/api/<module>.ts`

A frontend module may **not** import another module's internal components directly (e.g., `transactions` importing `wallet`'s internal `BalanceCard` implementation). If UI needs to be shared, it is promoted to `components/ui/` (generic) — never cross-imported from another feature folder.

---

## 4. Communication Rules

These rules are absolute. A PR that violates any rule below fails review regardless of functional correctness.

### 4.1 Frontend ↔ Backend

- `apps/web` communicates with `apps/api` **exclusively** via:
  1. REST calls to `/api/v1/*` for request/response operations, through the single configured API client (`lib/api.ts`) — no ad-hoc `fetch()` calls scattered through components.
  2. Socket.io connection to the NestJS gateway for real-time events, through the single client singleton (`lib/socket.ts`).
- The frontend **never** connects directly to PostgreSQL, Redis, or Cloudflare R2. Even "read-only" data access goes through a REST endpoint. The only exception is client-side upload of a file **to** R2 using a presigned URL that the backend generated — the frontend never holds R2 credentials.
- Server Components in `apps/web` may call the backend REST API server-side for SSR data fetching, but they use the same API client and the same versioned endpoints as client-side code — no private/internal endpoints exist for SSR shortcuts.

### 4.2 Backend module ↔ module

- All inter-module calls happen through **injected NestJS providers** (constructor-injected services), never through HTTP calls to `localhost`, never through direct SQL, never through importing another module's Prisma model for a write.
- A module exposes its public surface through a barrel file (`modules/<name>/index.ts`) that re-exports only what other modules are allowed to call. Anything not re-exported is private to the module (controllers, internal repositories, internal DTOs stay unexported).
- Modules that need to **react** to another module's event (e.g., `gamification` reacting to a completed transaction) subscribe to a domain event emitted via NestJS's `EventEmitter2` (`@OnEvent('transaction.completed')`). They do **not** get called synchronously inline inside `transactions`' service method. This keeps `transactions` ignorant of who is listening — a strict requirement given how many modules (ratings, gamification, notifications) react to that single event.
- Any module wanting to move points **must** call `wallet`'s public `debit()`/`credit()`/`hold()`/`release()` methods. No module, including `admin`, writes to `skill_points_ledger` directly.

### 4.3 Backend ↔ Database

- **Only** `database` module's `PrismaService` talks to PostgreSQL. Every domain module receives `PrismaService` via dependency injection but only queries the tables it owns (enforced by code review + the `check-boundaries.ts` script in Section 2.6, which statically flags a module importing `prisma.<otherModulesTable>`).
- Multi-table writes that must be atomic (e.g., escrow hold: check balance + deduct + create ledger entry) are wrapped in `database.withTransaction()`, invoked from the **owning** module of the operation (`wallet` for balance/ledger operations), never spread across modules inside one transaction.

### 4.4 Backend ↔ Redis

- Only `cache` module holds the Redis client. Domain modules use `CacheService.get/set/del` and `QueueService.add(<queueName>, payload)` — no module instantiates its own `ioredis` client.

### 4.5 Backend ↔ External Services

- Every third-party integration (Agora, Resend, OpenAI, ClamAV) is wrapped in an **adapter class** owned by the module that uses it (e.g., `calling/adapters/agora.adapter.ts`, `notifications/adapters/resend.adapter.ts`). No controller or business-logic service calls an external SDK directly. This keeps vendor swaps (e.g., Resend → SendGrid, per Spec §7 alternatives) a one-file change.

### 4.6 Realtime

- WebSocket gateways only **emit and receive events** and delegate all business logic to the same services REST controllers use — a gateway method body is never more than payload validation + a service call + an emit. No business logic lives in a `.gateway.ts` file.

### 4.7 Summary Diagram

```
Browser
  │ REST (JWT bearer)         │ Socket.io (handshake token)
  ▼                            ▼
Next.js apps/web  ─────────────┘
  │ (server-side fetch, same REST client)
  ▼
NestJS apps/api
  Controller → Service → (other modules' public services | database.PrismaService | cache.CacheService | storage.StorageService | external adapters)
  Gateway    → Service → (same as above)
  EventEmitter2 ─→ subscribed listener services in other modules (async, decoupled)
```

---

## 5. Naming Conventions

### 5.1 Folders and Files

| Item | Convention | Example |
| --- | --- | --- |
| Folders (all) | `kebab-case` | `skill-listings/`, `activity-streaks/` |
| Backend module folder | `kebab-case`, singular domain noun | `modules/transactions/` |
| NestJS file suffixes | `<name>.<type>.ts`, all lowercase kebab | `transaction.controller.ts`, `transaction.service.ts`, `transaction.module.ts`, `transaction.gateway.ts`, `create-transaction.dto.ts`, `transaction.entity.ts`, `transaction-status.enum.ts`, `transaction.repository.ts`, `jwt-auth.guard.ts`, `response-transform.interceptor.ts`, `zod-validation.pipe.ts` |
| React component file | `PascalCase.tsx`, matches the component's default export name | `TransactionCard.tsx`, `EscrowStatusBadge.tsx` |
| React hook file | `camelCase.ts`, always prefixed `use` | `useTransactions.ts`, `useWebRTC.ts` |
| Zustand store file | `camelCase` + `Store` suffix | `authStore.ts`, `callStore.ts` |
| API client slice | `camelCase.ts`, matches module name | `lib/api/transactions.ts` |
| Test files | co-located, `<name>.spec.ts` (unit) / `<name>.e2e-spec.ts` (e2e) / `<Name>.test.tsx` (React) | `transaction.service.spec.ts`, `TransactionCard.test.tsx` |
| Barrel file | always exactly `index.ts` | `modules/transactions/index.ts` |

### 5.2 Code-Level Naming

| Construct | Convention | Example |
| --- | --- | --- |
| Classes (Services, Controllers, Guards, etc.) | `PascalCase`, suffixed with its NestJS role | `TransactionService`, `TransactionController`, `JwtAuthGuard`, `RolesGuard`, `ResponseTransformInterceptor` |
| DTOs | `PascalCase`, verb + noun + `Dto` | `CreateTransactionDto`, `ConfirmTransactionDto`, `UpdateSkillDto` |
| Entities / Prisma-mapped domain models | `PascalCase`, singular | `Transaction`, `SkillPointsLedgerEntry` |
| Enums | `PascalCase` type name; members `UPPER_SNAKE_CASE` | `enum TransactionStatus { ESCROW_HELD, PROVIDER_CONFIRMED, COMPLETED }` |
| Interfaces | `PascalCase`, **no `I` prefix** (modern TS convention; prefix adds noise, not information) | `TransactionRepository`, `MatchCandidate` |
| Type aliases | `PascalCase` | `type PaginatedResult<T> = { ... }` |
| Constants (module-level, immutable) | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE_MB`, `CONFIRMATION_WINDOW_HOURS` |
| Variables | `camelCase`, no Hungarian notation, boolean vars prefixed `is/has/should/can` | `isVerified`, `hasPendingConfirmation` |
| Functions / methods | `camelCase`, verb-first, name states intent not implementation | `calculateReputationScore()`, not `updateStuff()` |
| React components | `PascalCase`, name = default export = filename | `function TransactionCard() {}` |
| Custom hooks | `camelCase`, `use` prefix, returns a named object not a bare tuple unless there are exactly 2 values with an obvious order (React convention, e.g. `[value, setValue]`) | `const { data, isLoading } = useTransactions();` |
| Route segments (App Router) | `kebab-case` folder = URL segment | `app/(dashboard)/exchanges/[id]/page.tsx` → `/exchanges/:id` |
| Socket.io events | `domain:action`, lowercase, colon-separated (per Spec §5.5) | `transaction:escrow_funded`, `message:send` |
| BullMQ queue names | `kebab-case`, noun | `document-scan`, `gamification-events` |
| Environment variables | `UPPER_SNAKE_CASE`, module-prefixed where ambiguous | `DATABASE_URL`, `AGORA_APP_ID`, `JWT_ACCESS_TOKEN_TTL` |
| CSS / Tailwind custom tokens | `kebab-case` CSS variables | `--color-surface-elevated` |

---

## 6. TypeScript Standards

### 6.1 Compiler Configuration

`tsconfig.base.json` (root, extended by every app/package) enforces:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

`strict: true` is non-negotiable for both `apps/web` and `apps/api` and every package — this is a financial-grade ledger platform (Spec §2.3.1); implicit `any` on a points calculation is an incident waiting to happen.

### 6.2 Path Aliases

| App/Package | Alias | Resolves to |
| --- | --- | --- |
| `apps/web` | `@/*` | `apps/web/*` |
| `apps/api` | `@app/*` | `apps/api/src/*` |
| any app/package | `@talentswap/types` | `packages/types/src` |
| any app/package | `@talentswap/validation` | `packages/validation/src` |
| any app/package | `@talentswap/utils` | `packages/utils/src` |
| `apps/web` | `@talentswap/ui-tokens` | `packages/ui-tokens/src` |

Relative imports (`../../../`) are permitted only **within** a module's own folder tree (e.g., a component importing a sibling in the same feature folder). Any import that crosses a module boundary must use the alias form. This is enforced by an ESLint `no-restricted-imports` rule plus `scripts/check-boundaries.ts`.

### 6.3 ESLint & Prettier

- Base config lives in `packages/config/eslint` and `packages/config/prettier`, extended (not overridden) by each app.
- ESLint: `@typescript-eslint/recommended-requiring-type-checking`, `eslint-plugin-import` (enforces the ordering below and forbids circular imports), `eslint-plugin-react-hooks` (web only), `@nestjs/eslint-plugin` conventions (api only).
- Prettier: 2-space indent, single quotes, trailing commas (`all`), semicolons on, print width 100. Prettier runs via ESLint integration so `pnpm lint --fix` is the single source of formatting truth — no separate `pnpm format` drift.

### 6.4 Import Ordering

Enforced automatically (`eslint-plugin-import` `order` rule), four groups separated by a blank line:

```ts
// 1. Node/external packages
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 2. Workspace packages (aliased)
import { TransactionStatus } from '@talentswap/types';
import { createTransactionSchema } from '@talentswap/validation';

// 3. Internal absolute (this app's alias)
import { WalletService } from '@app/modules/wallet';
import { PrismaService } from '@app/database/prisma.service';

// 4. Relative (same module only, per §6.2)
import { TransactionRepository } from './transaction.repository';
```

### 6.5 Barrel Exports

Every module folder has exactly one `index.ts` that exports **only** its public surface (Section 4.2). Deep-importing a file that isn't re-exported from a module's barrel (e.g. `import { TransactionRepository } from '@app/modules/transactions/transaction.repository'`) is forbidden and caught in review — always import from the module root (`@app/modules/transactions`).

### 6.6 Error Handling

- Backend: domain errors are thrown as typed exceptions extending a shared `DomainException` base (`common/exceptions/domain.exception.ts`), each carrying a stable `code` (e.g. `INSUFFICIENT_BALANCE`, `TRANSACTION_ALREADY_CONFIRMED`). A single `GlobalExceptionFilter` (in `common/filters`) catches all exceptions and maps them to the standard error envelope (Section 9.2) — no controller ever writes its own try/catch-and-format logic.
- Frontend: TanStack Query's `onError` + a shared `parseApiError()` utility (in `lib/api.ts`) translate the standard error envelope into user-facing messages. React Error Boundaries wrap each route group (`(dashboard)`, `(admin)`) to catch render-time failures without crashing the whole app.
- Never swallow an error silently. Never log and continue for anything touching the ledger, escrow, or auth — those paths fail loud and roll back.

### 6.7 Logging

- Backend: **Winston**, structured JSON output, one log line per request minimum (method, path, status, duration, userId, requestId). Every request gets a `requestId` (UUID) generated by middleware and threaded through to the error envelope, so a user-reported error can be grepped straight to its log line.
- Log levels: `error` (needs paging/investigation), `warn` (degraded but handled), `info` (business events — transaction completed, user registered), `debug` (dev-only, stripped in production builds).
- Never log secrets, tokens, raw passwords, or full credential-document contents. Redaction is applied centrally in the Winston formatter, not per call site.

---

## 7. Git Workflow

### 7.1 Branch Strategy — Trunk-Based

- `main` is always deployable and protected (no direct pushes, CI must pass, at least one approval required).
- Short-lived branches only, named `<type>/<module>-<short-description>`:
  - `feat/wallet-escrow-hold`
  - `fix/auth-refresh-race-condition`
  - `chore/update-prisma`
  - `docs/architecture-adr-003`
- Branches are expected to merge within days, not weeks. If a module is too large for that, it is broken into smaller PRs behind a feature flag or an unrouted (not-yet-registered) module rather than living on a long branch.
- No `develop` branch — trunk-based avoids the perpetual merge-hell of long-lived integration branches on a project with many independent module owners.

### 7.2 Commit Conventions — Conventional Commits

```
<type>(<scope>): <short summary, imperative mood>

[optional body]

[optional footer(s)]
```

- `type` ∈ `feat | fix | docs | style | refactor | perf | test | chore | ci | build`
- `scope` = the module name from Section 3 (e.g., `wallet`, `chat`, `web-transactions`)
- Examples:
  - `feat(wallet): add row-level lock to debit operation`
  - `fix(chat): prevent duplicate message emit on reconnect`
  - `docs(architecture): record ADR for search extraction`
- Breaking changes: footer `BREAKING CHANGE: <description>` — required whenever a shared package's (`packages/*`) public export signature changes.

### 7.3 PR Rules

- PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires: linked issue, module(s) touched, checklist confirming Section 4 boundaries were respected, screenshot/GIF for UI changes, and confirmation that new endpoints were added to the OpenAPI export.
- CI must pass: typecheck, lint, unit tests, affected e2e tests (Turborepo's affected-graph limits e2e scope to touched modules), `check-boundaries.ts`.
- One approval minimum; two required for changes touching `wallet`, `transactions`, or `auth` given their financial/security criticality.
- Squash merge only — keeps `main` history one commit per logical change, matching the Conventional Commits scope.

### 7.4 Code Review Rules

- Reviewer checks, in order: (1) does it stay inside its module boundary per Section 3/4, (2) does it follow naming/typing standards (Section 5/6), (3) is business logic correct, (4) is it tested.
- Any cross-module direct-table-access or bypassed service call is an automatic "request changes," not a style nit.
- No PR is approved with `// eslint-disable` on a boundary or strict-mode rule without an inline comment explaining why and a linked follow-up issue.

### 7.5 Release Strategy

- Semantic Versioning for `/packages/*` (independently versioned via **Changesets** — a PR touching `packages/types` must include a changeset describing the semver bump).
- `apps/web` and `apps/api` are **not** independently versioned by semver; they are deployed continuously from `main` (Vercel auto-deploy for `apps/web`; GitHub Actions → Railway/ECS for `apps/api`), tagged `vYYYY.MM.DD-<short-sha>` for traceability.
- Every merge to `main` that touches `apps/api` runs Prisma migrations as part of the deploy pipeline (Section 8.7 of the Technology Specification) with automatic rollback on migration failure.

---

## 8. Environment Configuration

### 8.1 Files

| File | Committed? | Purpose |
| --- | --- | --- |
| `.env.example` (root, and one per app: `apps/web/.env.example`, `apps/api/.env.example`) | ✅ Yes | Documents every required variable with a placeholder value and a comment explaining it. This is the contract new contributors and future Claude sessions read to know what a module needs. |
| `.env.local` (web), `.env` (api) | ❌ No (gitignored) | Actual local developer secrets, never committed. |
| `.env.staging`, `.env.production` | ❌ No | Never exist as files in the repo — injected as environment variables by the hosting platform (Vercel env vars, Railway/AWS Secrets Manager), per Spec §8.5. |

### 8.2 Validation

Every app validates its environment at boot against a Zod schema (`apps/api/src/config/env.schema.ts`, `apps/web/lib/env.ts`) and **fails fast** (crashes on startup, not on first request) if a required variable is missing or malformed. No module reads `process.env.X` directly anywhere else in the codebase — all env access goes through the validated, typed config object injected via NestJS `ConfigModule` (backend) or the single `env.ts` export (frontend, and only for build-time/public variables prefixed `NEXT_PUBLIC_`).

### 8.3 Secrets by Environment

| Environment | Secret store | Notes |
| --- | --- | --- |
| Local development | `.env` files (gitignored) + `docker-compose.yml` defaults for Postgres/Redis | Never real third-party API keys in shared docs; each developer provisions their own sandbox Agora/Resend/OpenAI keys |
| CI | GitHub Actions Secrets | Scoped per workflow, rotated quarterly |
| Staging | Doppler / Railway Secrets | Mirrors production variable names exactly so config drift is caught before prod |
| Production | AWS Secrets Manager (post Spec §Phase 3 migration) / Railway Secrets (MVP) | Access restricted to deploy pipeline identity only; no human reads production secrets directly — rotated via pipeline |

### 8.4 Never Committed

Database URLs with credentials, JWT signing keys (RS256 private key especially), Agora/OpenAI/Resend API keys, R2 access keys, ClamAV daemon connection strings. `.gitignore` at the repo root blocks `.env`, `.env.*.local`, `*.pem`, `*.key` globally — not per-app, so a new app added later inherits the protection automatically.

---

## 9. API Conventions

### 9.1 Response Envelope

Every REST response — success or failure — uses the same envelope shape, applied automatically by `ResponseTransformInterceptor` so individual controllers never hand-construct it:

```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": { "requestId": "uuid", "timestamp": "2026-08-03T10:00:00Z" }
}
```

### 9.2 Error Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "You do not have enough SkillPoints for this exchange.",
    "details": { "required": 20, "available": 12 }
  },
  "meta": { "requestId": "uuid", "timestamp": "2026-08-03T10:00:00Z" }
}
```

`code` is a stable, machine-readable `UPPER_SNAKE_CASE` string the frontend can switch on for custom UI (e.g., showing a "top up points" CTA on `INSUFFICIENT_BALANCE`). `message` is safe to show a user as-is. `details` is optional and structured, never a free-text stack trace.

### 9.3 Pagination

- **Offset pagination** (`?page=1&limit=20`) for admin tables and any list where jumping to an arbitrary page matters.
- **Cursor pagination** (`?cursor=<opaque>&limit=20`) for infinite-scroll feeds where new items may be inserted (Discover feed, chat message history, community board) — offset pagination breaks under concurrent inserts, which chat and the community board will see constantly.
- Response `meta` includes `{ "pagination": { "nextCursor": "...", "hasMore": true } }` or `{ "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }` depending on style used.

### 9.4 Filtering

Query-param based, namespaced to avoid collision with pagination/sort params: `?filter[category]=design&filter[verifiedOnly]=true&filter[proficiency]=expert`. Each endpoint documents its supported filter keys in its DTO (a `<Resource>QueryDto` validated by the shared Zod schema in `packages/validation`) — unsupported filter keys are rejected with a `400 VALIDATION_ERROR`, never silently ignored.

### 9.5 Sorting

`?sort=reputationScore:desc` or multi-field `?sort=reputationScore:desc,createdAt:asc`. Default sort is always explicit in the controller (never "whatever the database returns") and documented per endpoint.

### 9.6 Authentication Headers

`Authorization: Bearer <access_token>` on every authenticated REST call. WebSocket connections authenticate once at handshake via a short-lived one-time token derived from the JWT (per Spec §3.3.1), not by resending the bearer token per-event.

### 9.7 Versioning

URL path prefix only — `/api/v1/`, future `/api/v2/` — per Spec §5.2. Header-based versioning is explicitly rejected for the reasons the Technology Specification already gives (invisible in browser history, harder to test). Deprecated versions carry `Deprecation: true` and `Sunset: <date>` response headers during their support window.

### 9.8 Status Codes

| Code | Use |
| --- | --- |
| `200` | Successful GET/PATCH/POST that doesn't create a resource |
| `201` | Successful POST that creates a resource (body includes the created resource) |
| `204` | Successful DELETE, or POST with no response body (e.g., `confirm` action) |
| `400` | Validation error (`VALIDATION_ERROR` code) |
| `401` | Missing/invalid/expired auth token |
| `403` | Authenticated but not authorized (RBAC/ownership failure) |
| `404` | Resource does not exist (or exists but the user has no access — never leak existence via a 403 vs 404 distinction on private resources) |
| `409` | Conflict — duplicate idempotency key, duplicate confirmation, concurrent-edit conflict |
| `422` | Semantically invalid request the schema alone couldn't catch (e.g., confirming an already-completed transaction) |
| `429` | Rate limit exceeded |
| `500` | Unhandled server error — always logged with full context server-side, always returned to the client as a generic message (no stack trace, no internal detail) |

---

## 10. Coding Standards

### 10.1 Clean Architecture Layering (Backend)

Every backend module follows the same strict layering, request flowing one direction only:

```
Controller (HTTP concern only: route, status code, DTO binding)
   ↓
Service (business logic — the only layer allowed to make business decisions)
   ↓
Repository (data access — the only layer allowed to write Prisma queries)
   ↓
PrismaService (database module, injected)
```

- **Controllers** never contain business logic and never call `PrismaService` directly. A controller method body is validation-binding + one service call + return.
- **Services** never construct raw SQL/Prisma queries inline — they call their module's repository. This is what makes the Repository Pattern (Spec-implied by "Service Layer" requirement) actually enforceable: swapping Prisma for something else later touches only repositories, never services.
- **Repositories** are the only place `this.prisma.<model>` appears for a module's owned tables. A repository method name states the query intent (`findActiveByCategory`, not `query1`).
- **Dependency Injection** is used for every cross-class dependency (NestJS constructor injection) — no manual `new Service()` inside another class, ever, which is what makes unit testing every layer in isolation possible.

### 10.2 SOLID, DRY, KISS — applied concretely

- **Single Responsibility:** a service class owns one module's business rules. If `TransactionService` starts calculating XP, that logic has leaked out of `gamification` — move it, don't let it grow in place.
- **Open/Closed:** new transaction types are added by extending the `TransactionStrategy` interface (e.g., `OneWayTransactionStrategy`, `TwoWayTransactionStrategy`), not by adding `if (type === 'x')` branches to an ever-growing `TransactionService.process()`.
- **Liskov / Interface Segregation:** repositories implement narrow interfaces (`TransactionRepository` exposes only what `TransactionService` needs) rather than one giant generic repository interface shared by every module.
- **Dependency Inversion:** services depend on repository **interfaces**, with the Prisma-backed implementation bound in the module's providers array — this is what allows a repository to be swapped for a test double in unit tests without touching the service.
- **DRY:** shared validation lives in `packages/validation`, shared types in `packages/types`, shared formatting in `packages/utils` — never copy-pasted between `apps/web` and `apps/api`. Business logic, however, is deliberately **not** DRY'd across modules if doing so would create a cross-module dependency that Section 4 forbids — a small amount of duplication is preferred over a forbidden coupling.
- **KISS:** a module ships the simplest implementation that satisfies its current Roadmap phase (Section 16). Do not build the Phase 4 Elasticsearch sync while implementing the Phase 1 Postgres full-text search — build the seam (the `search` module boundary already does this), not the future feature.

### 10.3 Validation

Every input crosses the trust boundary exactly once, at the controller, via a Zod schema from `packages/validation` wrapped in the shared `ZodValidationPipe`. Services trust their inputs completely — they never re-validate what the pipe already validated. The same Zod schema is imported by `apps/web`'s React Hook Form resolver, guaranteeing client and server never disagree on shape (Spec §2.1.4).

### 10.4 Error Handling (restated as a coding rule)

A service that can fail in an expected, business-meaningful way (insufficient balance, already confirmed, not found) **throws** a specific `DomainException` subclass — it never returns `null`/`false` and forces the caller to guess why. Unexpected failures (a DB connection drop) are left to propagate to the `GlobalExceptionFilter`, not caught-and-swallowed locally.

---

## 11. Reusable UI Standards

These are enforced through `packages/ui-tokens` (raw values) → `apps/web/tailwind.config.ts` (Tailwind theme extension) → `components/ui/*` (shadcn/ui primitives styled from the theme). No component hardcodes a raw hex color, raw pixel spacing, or raw font size — everything references a token.

### 11.1 Spacing

Tailwind's default 4px base scale is adopted as-is (`0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24...`). Component-level spacing decisions use semantic Tailwind classes (`gap-4`, `p-6`) — never inline `style={{ margin: '13px' }}`.

### 11.2 Typography

A fixed semantic scale, mapped to Tailwind text classes, used by name rather than by raw size:

| Semantic role | Tailwind class | Use |
| --- | --- | --- |
| `display` | `text-4xl md:text-5xl font-bold` | Landing page hero only |
| `heading-1` | `text-3xl font-semibold` | Page titles |
| `heading-2` | `text-xl font-semibold` | Section headers |
| `heading-3` | `text-lg font-medium` | Card titles |
| `body` | `text-base` | Default paragraph/UI text |
| `body-sm` | `text-sm` | Secondary text, metadata |
| `caption` | `text-xs text-muted-foreground` | Timestamps, helper text |

### 11.3 Colors

Semantic CSS variables (shadcn/ui convention), never raw Tailwind color utilities (`bg-blue-500`) in feature components — always semantic (`bg-primary`): `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--destructive`, `--success`, `--warning`, `--border`, `--ring`. Domain-specific semantic colors are added deliberately, not ad hoc: `--color-points` (SkillPoints branding), `--color-verified` (verified badge), `--color-escrow` (escrow/pending state).

### 11.4 Accessibility

WCAG 2.1 AA minimum across the platform (the Proposal explicitly targets inclusivity for economically and demographically diverse users — accessibility is not optional here):
- All interactive elements reachable and operable by keyboard; visible focus ring (`ring-2 ring-ring`) never suppressed with `outline: none` alone.
- All shadcn/ui (Radix) primitives are used specifically because they ship correct ARIA roles/labeling out of the box — custom interactive components must match that bar before merge.
- Color is never the only signal (e.g., escrow status uses an icon + text + color, not color alone) — important given the platform's reputation/verification/dispute states are all color-coded.
- All images (avatars, uploaded portfolio samples) require `alt` text; decorative icons use `aria-hidden`.

### 11.5 Dark Mode

`next-themes` class-strategy (`class="dark"` on `<html>`), driven by the same semantic CSS variables — a component never needs a `dark:` variant if it used semantic tokens correctly. System preference respected by default, user override persisted.

### 11.6 Responsive Breakpoints

Tailwind defaults, used consistently: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`. Mobile-first authoring (unprefixed classes = mobile, then progressively enhanced) — required given the platform is "Web Application Only" and must be fully functional on mobile browsers (Spec §1.1).

### 11.7 Animations

Tailwind's built-in transition utilities for micro-interactions; Framer Motion only for orchestrated, multi-element animations (e.g., badge-award celebration, level-up modal) where Tailwind alone is insufficient. `prefers-reduced-motion` is respected everywhere — any Framer Motion animation is gated behind a `useReducedMotion()` check.

### 11.8 Loading / Empty / Error States

Every list-rendering feature component implements all three via shared primitives from `components/ui/`:
- **Loading:** `<Skeleton>` shapes matching the eventual content's layout (never a bare spinner for content that has a known shape).
- **Empty:** `<EmptyState icon title description action? />` — e.g., "No exchanges yet — browse Discover to find your first match."
- **Error:** `<ErrorState message retry? />` — wired to TanStack Query's `error`/`refetch`.

---

## 12. State Management Strategy

| Kind of state | Tool | Examples |
| --- | --- | --- |
| **Server state** (anything that originates from the API and can go stale) | **TanStack Query** | Skill listings, transaction history, wallet balance, chat history, match suggestions, notifications list |
| **Global ephemeral UI state** (client-only, no server source of truth, needed across distant components) | **Zustand** | Auth session mirror (decoded JWT claims for UI gating), active WebRTC call state, unread-notification badge count, sidebar collapsed/expanded, active theme |
| **Local component state** | **`useState`/`useReducer`** | Modal open/closed, dropdown selection before submit, hover/focus UI-only flags, tab selection within a single component |
| **Form state** | **React Hook Form** (backed by a Zod resolver from `packages/validation`) | Registration wizard, skill listing editor, transaction confirmation dialog — never mirrored into Zustand or component state in parallel |

Rules:
- Server data is **never** copied into a Zustand store "for convenience." If it came from the API, TanStack Query owns its cache, staleness, and invalidation — Zustand only ever holds derived, client-only booleans/enums (e.g., `isCallModalOpen`), never a duplicate of `transaction.status`.
- Query keys follow a fixed structure so invalidation is predictable: `[<module>, <resource>, <id?>, <filters?>]`, e.g. `['transactions', 'list', { status: 'escrow_held' }]`, `['transactions', 'detail', transactionId]`. Mutations invalidate the narrowest matching key set, defined once per module in that module's `hooks/use<Module>.ts`, not ad hoc at each call site.
- WebSocket-pushed events update the TanStack Query cache directly (`queryClient.setQueryData` / `invalidateQueries` inside the socket event handler) rather than maintaining a parallel realtime store — there is exactly one cache for server-originated data, whether it arrived via REST or WebSocket.

---

## 13. Security Rules

These restate the Technology Specification's Section 8 as binding **engineering rules**, not just design notes:

1. **Secrets never reach the client.** No `NEXT_PUBLIC_*` env var may hold anything more sensitive than a publishable/public key (e.g., Agora App ID is fine; Agora App Certificate is not). Code review specifically checks any new `NEXT_PUBLIC_` variable.
2. **Validate at the boundary, trust internally.** Every controller input passes through the shared Zod schema (Section 10.3) before it reaches a service. Services do not re-validate.
3. **Deny by default.** Every NestJS route requires authentication unless explicitly decorated `@Public()`. Every route requiring elevated access is decorated `@Roles(Role.Moderator)`/`@Roles(Role.Admin)` and additionally checks resource ownership in the service layer where relevant (a user editing "their" skill listing) — the guard checks role, the service checks ownership; neither alone is sufficient.
4. **Rate limit by sensitivity tier**, exactly per Spec §5.4 (auth endpoints strictest, admin endpoints elevated-but-monitored) — implemented once as a decorator-based policy (`@RateLimit('auth')`), not re-implemented per controller.
5. **Sanitize all user-generated content** server-side (`sanitize-html`) before persistence, and client-side (`DOMPurify`) before render — both layers required, neither is sufficient alone.
6. **File uploads never touch the app server's memory** — presigned URL direct-to-R2 only (Section 4.5-adjacent), MIME + magic-byte validated, ClamAV-scanned before any status other than `PENDING_REVIEW` is reachable.
7. **Points movement is the highest-security-tier code path in the system.** Any change to `wallet` or `transactions` requires two reviewer approvals (Section 7.3) and must go through `database.withTransaction()` with the advisory-lock pattern specified in Spec §4.3 — no exceptions, no "quick fix" bypasses.
8. **No security control is duplicated ad hoc.** Auth guards, roles guards, rate limiting, and sanitization are implemented once in `common/` and applied via decorators — a module never writes its own inline auth check "just for this one route."

---

## 14. Performance Standards

| Area | Standard |
| --- | --- |
| **CDN / HTTP caching** | `Cache-Control` set per Spec §2.8 table on every GET endpoint; static/immutable assets `max-age=31536000, immutable`; stale-while-revalidate for profile cards and skill listings. |
| **Database query cache** | Redis wraps expensive aggregate reads only (leaderboards, category aggregations, platform stats) — TTL 5–60 min per Spec §2.8. Transactional/ledger reads are **never** cached — always read fresh from Postgres given financial-grade correctness requirements. |
| **Connection pooling** | PgBouncer (via Supabase/self-hosted) in front of Postgres at all times, including local dev via Docker Compose, so pooling behavior is never a surprise first encountered in staging. |
| **Image optimization** | `next/image` exclusively for any user-facing image — no bare `<img>` tags in feature components (enforced via ESLint `@next/next/no-img-element`). Uploads are resized server-side (Sharp) to standard dimensions at ingest, not resized client-side per render. |
| **SSR vs CSR** | Public, SEO-relevant routes (`(public)` route group: landing, public skill directory, public profile) are SSR/SSG. Authenticated routes (`(dashboard)`, `(admin)`) are CSR with TanStack Query — SSR adds no value behind a login wall and only increases TTFB. |
| **Streaming** | React Suspense boundaries wrap any dashboard section with an independent, potentially-slow data dependency (e.g., match suggestions loading independently of the rest of the dashboard shell) so the shell paints immediately. |
| **Lazy loading** | Heavy, rarely-immediately-needed components are dynamically imported (`next/dynamic`, `ssr: false` where appropriate): video calling UI, rich text editor, admin analytics charts. |
| **Bundle splitting** | Automatic per-route splitting from the App Router is the baseline; manual `dynamic()` splitting is added only for the components in the row above, not applied preemptively everywhere (avoid over-splitting into micro-chunks that increase request count). |
| **Memoization** | `useMemo`/`useCallback` used only where a profiler-confirmed re-render cost exists (expensive derived computation, or a callback passed to a memoized child list item) — not applied reflexively to every function, which the React team itself advises against as premature optimization. `React.memo` is applied to list item components in long lists (skill cards, leaderboard rows, message bubbles). |
| **Database optimization** | Every index in Spec §4.2 is created in the initial Prisma migration for its owning module — not added reactively after a slow-query alert. `SELECT`/`include` scoping is deliberate per query (Prisma's explicit select prevents accidental over-fetching that raw `findMany()` defaults invite). N+1 queries are caught in code review by checking for a Prisma call inside a `.map()`/loop — batch via `include` or `findMany({ where: { id: { in: [...] } } })` instead. |

---

## 15. Complete Project Tree

This is the full repository skeleton. Every folder below is created as part of the foundation; feature files inside `modules/<domain>/` and `components/features/<domain>/` are placeholders only (created empty with a `.gitkeep` or a bare barrel file) until that module's dedicated build task begins per the Roadmap (Section 16). No top-level folder outside this tree may be created without amending this document.

```text
talentswap/
├── apps/
│   ├── web/                                   # Next.js 14 — apps/web
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   │   ├── page.tsx                   # Landing (SSG)
│   │   │   │   ├── skills/page.tsx             # Public skill directory (SSR)
│   │   │   │   └── users/[id]/page.tsx         # Public profile (SSR)
│   │   │   ├── (auth)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   └── reset-password/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── discover/page.tsx
│   │   │   │   ├── skills/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/edit/page.tsx
│   │   │   │   ├── exchanges/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── wallet/page.tsx
│   │   │   │   ├── messages/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [conversationId]/page.tsx
│   │   │   │   ├── community/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [postId]/page.tsx
│   │   │   │   ├── gamification/page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/page.tsx
│   │   │   │   ├── documents/page.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── notifications/page.tsx
│   │   │   │       └── security/page.tsx
│   │   │   ├── (admin)/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── users/page.tsx
│   │   │   │   │   ├── documents/page.tsx
│   │   │   │   │   ├── transactions/page.tsx
│   │   │   │   │   └── analytics/page.tsx
│   │   │   ├── layout.tsx                      # Root layout (fonts, providers)
│   │   │   ├── globals.css
│   │   │   └── not-found.tsx
│   │   ├── components/
│   │   │   ├── ui/                             # shadcn/ui base primitives (generic, no feature imports)
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── skills/
│   │   │   │   ├── discover/
│   │   │   │   ├── transactions/
│   │   │   │   ├── wallet/
│   │   │   │   ├── chat/
│   │   │   │   ├── calling/
│   │   │   │   ├── gamification/
│   │   │   │   ├── documents/
│   │   │   │   ├── community/
│   │   │   │   ├── ratings/
│   │   │   │   ├── notifications/
│   │   │   │   ├── profile/
│   │   │   │   └── admin/
│   │   │   └── layouts/
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Navbar.tsx
│   │   │       └── Footer.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useWebRTC.ts
│   │   │   ├── useTransactions.ts
│   │   │   └── useNotifications.ts
│   │   ├── lib/
│   │   │   ├── api.ts                          # Configured fetch wrapper + parseApiError
│   │   │   ├── api/                            # Per-module API client slices
│   │   │   │   ├── auth.ts
│   │   │   │   ├── skills.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   ├── wallet.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── community.ts
│   │   │   │   └── admin.ts
│   │   │   ├── socket.ts                       # Socket.io client singleton
│   │   │   ├── env.ts                          # Validated public env
│   │   │   └── utils.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   └── callStore.ts
│   │   ├── types/                              # App-local types only (cross-app types live in packages/types)
│   │   ├── public/
│   │   │   ├── manifest.json                   # PWA manifest
│   │   │   └── favicon.ico
│   │   ├── middleware.ts                       # Auth-gating middleware
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json                       # extends ../../tsconfig.base.json
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                                    # NestJS — apps/api
│       ├── src/
│       │   ├── main.ts                         # Bootstrap: Fastify adapter, ValidationPipe, Swagger, Helmet
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   ├── env.schema.ts               # Zod-validated environment schema
│       │   │   └── config.module.ts
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   ├── roles.guard.ts
│       │   │   │   └── ownership.guard.ts
│       │   │   ├── decorators/
│       │   │   │   ├── current-user.decorator.ts
│       │   │   │   ├── roles.decorator.ts
│       │   │   │   ├── public.decorator.ts
│       │   │   │   └── rate-limit.decorator.ts
│       │   │   ├── interceptors/
│       │   │   │   ├── response-transform.interceptor.ts
│       │   │   │   └── logging.interceptor.ts
│       │   │   ├── filters/
│       │   │   │   └── global-exception.filter.ts
│       │   │   ├── pipes/
│       │   │   │   └── zod-validation.pipe.ts
│       │   │   ├── exceptions/
│       │   │   │   └── domain.exception.ts
│       │   │   └── utils/
│       │   │       ├── crypto.util.ts
│       │   │       ├── date.util.ts
│       │   │       └── pagination.util.ts
│       │   ├── database/
│       │   │   ├── prisma.service.ts
│       │   │   ├── prisma.module.ts
│       │   │   └── transaction.helper.ts       # withTransaction(), advisory-lock helper
│       │   ├── cache/
│       │   │   ├── cache.service.ts
│       │   │   ├── cache.module.ts
│       │   │   └── queue.service.ts            # BullMQ queue registration wrapper
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── jwt.strategy.ts
│       │   │   │   │   ├── google.strategy.ts
│       │   │   │   │   └── linkedin.strategy.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── users/
│       │   │   │   ├── users.module.ts
│       │   │   │   ├── users.controller.ts
│       │   │   │   ├── users.service.ts
│       │   │   │   ├── users.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── profiles/
│       │   │   │   ├── profiles.module.ts
│       │   │   │   ├── profiles.controller.ts
│       │   │   │   ├── profiles.service.ts
│       │   │   │   ├── profiles.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── skills/
│       │   │   │   ├── skills.module.ts
│       │   │   │   ├── skills.controller.ts
│       │   │   │   ├── skills.service.ts
│       │   │   │   ├── skills.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── matching/
│       │   │   │   ├── matching.module.ts
│       │   │   │   ├── matching.controller.ts
│       │   │   │   ├── matching.service.ts
│       │   │   │   ├── adapters/
│       │   │   │   │   └── openai-embedding.adapter.ts
│       │   │   │   └── index.ts
│       │   │   ├── wallet/
│       │   │   │   ├── wallet.module.ts
│       │   │   │   ├── wallet.controller.ts
│       │   │   │   ├── wallet.service.ts
│       │   │   │   ├── wallet.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── transactions/
│       │   │   │   ├── transactions.module.ts
│       │   │   │   ├── transactions.controller.ts
│       │   │   │   ├── transactions.service.ts
│       │   │   │   ├── transactions.repository.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── one-way.strategy.ts
│       │   │   │   │   └── two-way.strategy.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── gamification/
│       │   │   │   ├── gamification.module.ts
│       │   │   │   ├── gamification.controller.ts
│       │   │   │   ├── gamification.service.ts
│       │   │   │   ├── gamification.repository.ts
│       │   │   │   ├── listeners/
│       │   │   │   │   └── transaction-completed.listener.ts
│       │   │   │   └── index.ts
│       │   │   ├── documents/
│       │   │   │   ├── documents.module.ts
│       │   │   │   ├── documents.controller.ts
│       │   │   │   ├── documents.service.ts
│       │   │   │   ├── documents.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── storage/
│       │   │   │   ├── storage.module.ts
│       │   │   │   ├── storage.controller.ts
│       │   │   │   ├── storage.service.ts
│       │   │   │   ├── adapters/
│       │   │   │   │   └── r2.adapter.ts
│       │   │   │   └── index.ts
│       │   │   ├── chat/
│       │   │   │   ├── chat.module.ts
│       │   │   │   ├── chat.controller.ts
│       │   │   │   ├── chat.service.ts
│       │   │   │   ├── chat.repository.ts
│       │   │   │   ├── chat.gateway.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── calling/
│       │   │   │   ├── calling.module.ts
│       │   │   │   ├── calling.controller.ts
│       │   │   │   ├── calling.service.ts
│       │   │   │   ├── calling.gateway.ts
│       │   │   │   ├── adapters/
│       │   │   │   │   └── agora.adapter.ts
│       │   │   │   └── index.ts
│       │   │   ├── notifications/
│       │   │   │   ├── notifications.module.ts
│       │   │   │   ├── notifications.controller.ts
│       │   │   │   ├── notifications.service.ts
│       │   │   │   ├── notifications.repository.ts
│       │   │   │   ├── notifications.gateway.ts      # default namespace
│       │   │   │   ├── adapters/
│       │   │   │   │   ├── resend.adapter.ts
│       │   │   │   │   └── web-push.adapter.ts
│       │   │   │   └── index.ts
│       │   │   ├── ratings/
│       │   │   │   ├── ratings.module.ts
│       │   │   │   ├── ratings.controller.ts
│       │   │   │   ├── ratings.service.ts
│       │   │   │   ├── ratings.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── community/
│       │   │   │   ├── community.module.ts
│       │   │   │   ├── community.controller.ts
│       │   │   │   ├── community.service.ts
│       │   │   │   ├── community.repository.ts
│       │   │   │   ├── dto/
│       │   │   │   └── index.ts
│       │   │   ├── search/
│       │   │   │   ├── search.module.ts
│       │   │   │   ├── search.controller.ts
│       │   │   │   ├── search.service.ts
│       │   │   │   └── index.ts
│       │   │   └── admin/
│       │   │       ├── admin.module.ts
│       │   │       ├── admin.controller.ts
│       │   │       ├── admin.service.ts
│       │   │       ├── admin.repository.ts
│       │   │       ├── dto/
│       │   │       └── index.ts
│       │   ├── queues/
│       │   │   ├── email.queue.ts
│       │   │   ├── notification.queue.ts
│       │   │   ├── document-scan.queue.ts
│       │   │   ├── gamification.queue.ts
│       │   │   └── search-sync.queue.ts
│       │   └── websocket/
│       │       └── ws-auth.middleware.ts       # Shared handshake-token validation used by all gateways
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── test/                               # e2e tests (Jest + Supertest)
│       ├── tsconfig.json                       # extends ../../tsconfig.base.json
│       ├── .env.example
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── config/
│   │   ├── eslint/
│   │   │   └── index.js
│   │   ├── prettier/
│   │   │   └── index.json
│   │   └── package.json
│   ├── types/
│   │   ├── src/
│   │   │   ├── user.types.ts
│   │   │   ├── skill.types.ts
│   │   │   ├── transaction.types.ts
│   │   │   ├── wallet.types.ts
│   │   │   ├── chat.types.ts
│   │   │   ├── notification.types.ts
│   │   │   ├── gamification.types.ts
│   │   │   ├── api-envelope.types.ts           # Shared success/error response shape
│   │   │   └── index.ts
│   │   └── package.json
│   ├── validation/
│   │   ├── src/
│   │   │   ├── auth.schema.ts
│   │   │   ├── skill.schema.ts
│   │   │   ├── transaction.schema.ts
│   │   │   ├── profile.schema.ts
│   │   │   ├── community.schema.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── utils/
│   │   ├── src/
│   │   │   ├── date.ts
│   │   │   ├── points.ts
│   │   │   ├── pagination.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── ui-tokens/
│       ├── src/
│       │   ├── colors.ts
│       │   ├── spacing.ts
│       │   ├── typography.ts
│       │   └── index.ts
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml                  # Local dev: postgres, redis, mailhog, api, web
│   │   ├── docker-compose.prod.yml
│   │   └── Dockerfile.base                     # Shared multi-stage base if needed
│   ├── nginx/
│   │   └── nginx.conf
│   ├── ci/
│   │   └── reusable-workflows/
│   │       ├── lint-test.yml
│   │       └── deploy.yml
│   └── terraform/                              # Placeholder — activated in Roadmap Phase 4
│       └── README.md
│
├── docs/
│   ├── architecture/
│   │   ├── TalentSwap_Architecture_Foundation.md   # This document
│   │   └── adr/
│   │       └── 0001-monorepo-structure.md
│   ├── api/
│   │   └── openapi.json                        # Generated, not hand-written
│   ├── runbooks/
│   │   └── README.md
│   └── onboarding/
│       └── getting-started.md
│
├── scripts/
│   ├── setup.sh
│   ├── generate-module.ts
│   ├── seed-db.ts
│   └── check-boundaries.ts
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── package.json                                 # Root workspace manifest
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .nvmrc
└── README.md
```

---

## 16. Development Roadmap

This roadmap sequences modules by **dependency order**, not by the Technology Specification's Phase 1–4 feature grouping alone — a module cannot be built before the modules it depends on exist. Each module includes both its backend (`apps/api/src/modules/<name>`) and frontend (`components/features/<name>` + relevant route segment) halves, built together so the module is demoable end-to-end before the next one starts.

| # | Module | Depends on | What it delivers |
| --- | --- | --- | --- |
| **0** | **Foundation** (this document's output) | — | Monorepo scaffold, all folders in Section 15, ESLint/Prettier/TS config, Docker Compose local env, CI skeleton (lint+typecheck only), Prisma initialized with `users`/`profiles` tables only. |
| **1** | **Auth** | Foundation | Registration, login, JWT issuance, refresh rotation, OAuth (Google/LinkedIn), email verification, password reset. Frontend `(auth)` route group + `useAuth`/`authStore`. |
| **2** | **Users & Profiles** | Auth | Profile CRUD, avatar upload (needs a minimal `storage` module cut early), public profile pages. Frontend `profile/` feature + `(public)/users/[id]`. |
| **3** | **Storage** | Foundation | Presign/confirm/delete endpoints, R2 adapter — built fully here even though a slice was needed in #2, since every later module (documents, chat media, avatars) depends on it. |
| **4** | **Skills** | Users & Profiles | Skill CRUD, categories, Postgres full-text search. Frontend `skills/` feature + public skill directory. |
| **5** | **Wallet** | Users & Profiles | Ledger table, balance read, starter-grant-on-registration hook, `debit/credit/hold/release` service API consumed by later modules. Frontend `wallet/` feature. |
| **6** | **Transactions** | Skills, Wallet, Storage | Escrow lifecycle, dual-confirmation state machine, dispute escalation stub. This is the highest-scrutiny module (Section 13, rule 7). Frontend `transactions/` feature + `exchanges/` routes. |
| **7** | **Notifications** | Users & Profiles | In-app delivery, default Socket.io namespace, Web Push, Resend email adapter. Every subsequent module publishes events this module delivers. |
| **8** | **Chat** | Users & Profiles, Notifications | `/chat` namespace, conversations, messages, media attachments (via Storage). Frontend `chat/` feature + `messages/` routes. |
| **9** | **Matching** | Skills, Users & Profiles | OpenAI embeddings + pgvector similarity ranking, `/discover` suggestions endpoint. Frontend `discover/` feature. |
| **10** | **Ratings** | Transactions | Post-exchange rating submission, reputation score recalculation subscriber. Frontend rating prompt component. |
| **11** | **Gamification** | Transactions, Ratings | XP, badges, streaks, leaderboards (Redis sorted sets), event listeners on `transaction.completed`/`rating.created`. Frontend `gamification/` feature. |
| **12** | **Documents** | Storage, Users & Profiles | Credential upload, ClamAV scan queue, verification review workflow, Verified badge issuance (calls `profiles`). Frontend `documents/` feature. |
| **13** | **Community** | Skills, Users & Profiles | Board posts, requests/offers/events. Frontend `community/` feature. |
| **14** | **Calling** | Users & Profiles, Chat | `/call` namespace, Agora token generation, call session records. Frontend `calling/` feature. |
| **15** | **Search (extraction seam)** | Skills, Users & Profiles | Formalizes the read-optimized search projection already used by #4/#9 into its own module boundary, ready for the Elasticsearch swap named in Roadmap Phase 4 below. |
| **16** | **Admin** | All of the above | Moderation queues, ban/unban, document review dashboard, transaction dispute resolution UI, analytics dashboard. Frontend `(admin)` route group. |

### Hardening phases (post module #16), aligned to Technology Specification Phases 3–4

- **Payments:** No real-money SkillPoints purchase flow is permitted; do not add a payment integration for points.
- **Fraud detection:** ML-based anomaly detection job added to `wallet`'s velocity-check queue (Spec §8.1).
- **Content moderation:** profanity/image moderation added to `chat` and `community` via an OpenAI moderation adapter.
- **PWA:** service worker, offline caching, install prompt added to `apps/web` (Spec §Phase 3).
- **Microservice extraction:** `transactions` and `notifications` become their own `apps/*` entries per Section 2.2, consuming the same `packages/*` — enabled specifically because Section 3/4's boundaries were respected from module #6 onward.
- **Scale infrastructure:** Elasticsearch swap for `search`, multi-region Postgres read replicas, API Gateway introduction, mediasoup SFU for group calls — all per Spec §"Phase 4 — Scaling Stage", each mapped onto the module/infra folder that already anticipated it (`infrastructure/terraform`, `modules/search`).

---

## 17. Integration Guide — For Future Module-Building Sessions

This section is written directly for whoever (human or a future Claude session) picks up the next module from Section 16. Follow it exactly; do not improvise a different structure even if it seems simpler for a single module in isolation — consistency across independently-built modules is the entire point of this document.

### 17.1 Before writing any code

1. Re-read Section 3 for the module's ownership boundary (what tables, what it may/may not touch).
2. Re-read Section 4 for exactly how this module is allowed to talk to every other module it needs.
3. Check Section 16 — confirm every dependency module is already built. If not, stop and flag it; do not build around a missing dependency with a temporary shortcut.
4. Locate the module's exact placeholder location in Section 15's tree. Do not create files outside it.

### 17.2 Building a backend module

1. Scaffold via `pnpm ts-node scripts/generate-module.ts <module-name>` — this generates the standard `*.module.ts`/`*.controller.ts`/`*.service.ts`/`*.repository.ts`/`dto/`/`index.ts` skeleton matching Section 5 naming and Section 10.1 layering, wired into `app.module.ts` automatically.
2. Define the module's Prisma models in `prisma/schema.prisma`, namespaced under a comment header naming the owning module (e.g., `// === wallet module ===`). Generate the migration; never hand-edit a migration file after it has been applied anywhere.
3. Define DTOs as Zod schemas in `packages/validation/src/<module>.schema.ts` first — the DTO class in the module wraps this shared schema via `createZodDto()`, it does not redefine validation rules locally.
4. Write the repository (Prisma queries), then the service (business logic, calling the repository and any other module's injected public service), then the controller (thin, delegates to service).
5. If the module needs to react to another module's event, add a listener under `listeners/`, subscribing via `@OnEvent()` — never call the other module's internal method directly from inside its own transaction.
6. Export only the intended public surface from `index.ts`.
7. Add the module's endpoints to the Section 9 conventions — response envelope and error codes come for free from the shared interceptor/filter; just throw the right `DomainException` subtypes.
8. Write unit tests for the service (mocking the repository) and e2e tests for the controller (real test-database transaction, rolled back after each test).

### 17.3 Building a frontend module

1. Create `components/features/<module>/` and the matching route segment under the correct route group (`(dashboard)` unless the module is public or admin-only).
2. Create `lib/api/<module>.ts` — thin wrapper functions calling the shared `api.ts` client against the module's REST endpoints, typed using `@talentswap/types`.
3. Create `hooks/use<Module>.ts` — TanStack Query hooks with the query-key structure from Section 12; mutations here, not inline in components.
4. Build forms with React Hook Form + the same Zod schema from `packages/validation` used by the backend DTO.
5. Compose UI exclusively from `components/ui/` primitives and semantic tokens (Section 11) — do not introduce a one-off styled element that isn't reusable.
6. Wire any realtime updates for this module through the existing `lib/socket.ts` singleton and Section 12's cache-update rule — do not open a second socket connection.

### 17.4 Definition of Done for any module

- [ ] Stays entirely inside its Section 3 boundary; `check-boundaries.ts` passes.
- [ ] Naming matches Section 5 exactly.
- [ ] `strict` TypeScript passes with zero `any`.
- [ ] Validation schema lives in `packages/validation`, shared by both apps.
- [ ] API responses match Section 9's envelope/error format without hand-rolled formatting.
- [ ] UI states (loading/empty/error) implemented per Section 11.8.
- [ ] Unit + e2e tests included; CI green.
- [ ] `docs/api/openapi.json` regenerated (automatic from Swagger decorators — do not hand-edit).
- [ ] PR opened per Section 7.3 with the module named in its scope, reviewed per Section 7.4.

### 17.5 What never changes without amending this document

The `/apps`, `/packages`, `/infrastructure`, `/docs`, `/scripts` top-level split; the module list in Section 3; the communication rules in Section 4; the naming conventions in Section 5; the response envelope in Section 9. If a future module genuinely cannot fit these constraints, that is a signal to open an ADR (`docs/architecture/adr/`) proposing a change to this document itself — not to quietly deviate inside one module's PR.

---

_This document is the foundation. Nothing above builds a feature — it makes every feature built afterward consistent, independently reviewable, and safe to extend toward the tens-of-thousands-of-users scale target set out in the Technology Specification._

**— End of Architecture Foundation Document —**
