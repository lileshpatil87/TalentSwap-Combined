# TalentSwap — Backend Constitution

| | |
|---|---|
| **Document ID** | BE-CON-v1.0 |
| **Document Type** | Backend Engineering Standards Constitution |
| **Author / Role** | Lilesh — Backend Architect (Account 03) |
| **Authority** | Defines binding backend engineering standards only. Contains **no** architectural decisions, business logic, controllers, services, DTOs, APIs, or database schema. |
| **Governing Documents (priority order)** | 1. `TalentSwap_Architecture_Foundation.md` v1.1 (PRIMARY AUTHORITY, amended per ADR-0002–ADR-0005) · 2. `TalentSwap_Master_Development_Plan.md` v1.1 · 3. `TalentSwap Specification.md` v1.0 · 4. `TalentSwap Proposal.md` v2.0 |
| **Process Authority** | `TalentSwap AI SDLC.md` v1.0 (frozen) — this document is produced under Phase 1, "Domain Constitutions," and is owned by the Backend Architect per AI SDLC §3.4 |
| **Status** | ✅ **Ratified** — approved by Erwin (Lead Architect), 2026-08-04. Binding on all backend modules effective immediately. |
| **Change Control** | Amendable only via AI SDLC §1 Governance Rules (explicit approval, critical architectural issue, or a formal ADR). No backend module may deviate from this document without one of those three conditions. |

> **Scope Statement:** This is a **standards** document. It tells every future backend session *how* to build, never *what* to build. Business rules, exact schema fields, exact endpoint lists, and exact XP/ranking formulas belong to the module that owns them (Architecture Foundation §1.3) and are out of scope here. Where this document is silent, the Architecture Foundation governs; where the Architecture Foundation is silent, the Technology Specification governs. This document invents no new technology, framework, or service — every tool referenced below is already approved in Architecture Foundation §1–§2 and Technology Specification §2 / §10.1.

---

## Executive Summary

TalentSwap's backend is a single **NestJS 20 / TypeScript modular monolith** (`apps/api`), organized into domain-owned modules that communicate exclusively through injected services and event subscriptions — never through direct table access, HTTP loopback, or raw SQL across a module boundary. This constitution translates the Architecture Foundation's module boundaries, communication rules, naming conventions, and coding standards into a single, backend-specific reference that any engineer — human or AI — can follow to build a module in isolation and have it integrate cleanly with every other module built the same way.

The document is organized into eight parts covering 57 numbered standards: architectural foundations and layering (§1–11), naming conventions (§12–19), shared libraries and configuration (§20–23), validation/serialization/error handling (§24–29), authentication and authorization (§30–32), REST/API design (§33–41), cross-cutting data and integration concerns (§42–52), and quality/process governance (§53–57). A glossary closes the document.

Three modules — `auth`, `wallet`, `transactions` — are designated **Critical-risk, two-reviewer** code paths throughout this document, consistent with Architecture Foundation §7.3, §13 rule 7, and the Master Development Plan's risk register. Every other standard in this document applies uniformly across all backend modules regardless of risk tier.

---

## Table of Contents

**Part I — Architectural Foundations (§1–§11)**
1. Backend Architecture Philosophy · 2. Backend Folder Structure · 3. Feature-Based Organization · 4. Modular Architecture · 5. Package Organization · 6. Domain Boundaries · 7. Layer Responsibilities · 8. Controller Standards · 9. Service Standards · 10. Repository/Data Access Standards · 11. Module Organization

**Part II — Naming Conventions (§12–§19)**
12. Naming Conventions Overview · 13. File Naming Rules · 14. Folder Naming Rules · 15. API Naming Standards · 16. DTO Naming Standards · 17. Entity Naming Standards · 18. Interface Naming Standards · 19. Enum Standards

**Part III — Shared Libraries & Configuration (§20–§23)**
20. Shared Library Organization · 21. Dependency Injection Standards · 22. Configuration Management · 23. Environment Variable Standards

**Part IV — Validation, Serialization & Error Handling (§24–§29)**
24. Validation Standards · 25. Serialization Standards · 26. Exception Handling Strategy · 27. Global Error Response Format · 28. Logging Standards · 29. Monitoring Standards

**Part V — Authentication & Authorization (§30–§32)**
30. Authentication Standards · 31. Authorization Standards · 32. Role & Permission Guidelines

**Part VI — API Design Standards (§33–§41)**
33. API Versioning Strategy · 34. REST API Design Standards · 35. Request & Response Standards · 36. Pagination Standards · 37. Filtering Standards · 38. Sorting Standards · 39. Search Standards · 40. Rate Limiting Guidelines · 41. Caching Strategy

**Part VII — Cross-Cutting, Integration & Data Standards (§42–§52)**
42. Background Job Standards · 43. File Upload Standards · 44. Notification Service Standards · 45. AI Service Integration Guidelines · 46. Third-Party Integration Standards · 47. Security Best Practices · 48. Secrets Management Guidelines · 49. Performance Optimization Standards · 50. Database Interaction Guidelines · 51. Transaction Management Guidelines · 52. Event & Messaging Guidelines

**Part VIII — Quality & Process Governance (§53–§57)**
53. Testing Standards · 54. Documentation Standards · 55. Code Review Guidelines · 56. Backend Definition of Done · 57. Future Backend Module Development Rules

**Glossary**

---

# Part I — Architectural Foundations

## 1. Backend Architecture Philosophy

- The backend launches and remains a **NestJS modular monolith** (`apps/api`), not microservices, per Architecture Foundation §1.2 and Technology Specification §2.9.1. Module boundaries are drawn *now* specifically so that `transactions` and `notifications` can be extracted into independent services later without a rewrite — this constitution exists to keep that option alive.
- Every module follows the same one-directional layering: **Controller → Service → Repository → PrismaService** (Architecture Foundation §10.1). No layer is ever skipped, and no dependency ever points backward.
- **Consistency over cleverness.** Because independent AI or human sessions build different modules in isolation, the single most important architectural property is that every module looks like it was written by the same disciplined engineer. A locally "simpler" shortcut that deviates from this document is a system-wide liability, not a local convenience.
- **SOLID is applied concretely, not decoratively:** a service owns exactly one module's business rules (Single Responsibility); new behavior is added by extending a strategy interface rather than branching on type (Open/Closed); repositories expose narrow, module-specific interfaces (Interface Segregation); services depend on repository interfaces, not concrete Prisma classes (Dependency Inversion).
- **KISS, bounded by the roadmap.** A module ships the simplest implementation that satisfies its current Master Development Plan sprint. The `search` module boundary anticipates the future Elasticsearch swap; it does not implement Elasticsearch during the Postgres tsvector phase.
- **Financial-grade discipline is not optional in some places and relaxed in others** — it is the default posture for `wallet`, `transactions`, and `auth`, and the baseline posture (validate at the boundary, fail loud, never silently swallow) for every other module.

## 2. Backend Folder Structure

The backend lives entirely at `apps/api/src/` inside the monorepo, exactly as fixed by Architecture Foundation §15. No backend engineer creates a top-level folder outside this tree without an ADR:

```text
apps/api/src/
├── main.ts                # Bootstrap: NestExpressApplication (Express adapter, ADR-0002), ValidationPipe, Swagger, Helmet
├── app.module.ts           # Root module — imports every feature module
├── config/                 # ConfigModule + Zod-validated env schema
├── common/                 # guards/ decorators/ interceptors/ filters/ pipes/ exceptions/ utils/
├── database/                # PrismaService, prisma.module.ts, transaction.helper.ts
├── cache/                   # CacheService, cache.module.ts, QueueService (BullMQ registration)
├── modules/                 # One folder per domain module (Section 6)
├── queues/                  # BullMQ queue + processor definitions
└── websocket/                # ws-auth.middleware.ts — shared handshake-token validation for every gateway
```

`prisma/` (schema, migrations, seed) and `test/` (e2e suites) sit alongside `src/` under `apps/api/`, per Architecture Foundation §15. This structure is fixed; a module's *internal* files (Section 11) are the only place new files are created.

## 3. Feature-Based Organization

- Every unit of backend capability is a **module**, and every module maps 1:1 to a row in Architecture Foundation §3.1's ownership table. There is no "misc," "utils," or "shared-business-logic" module — cross-cutting technical concerns live in `common/`, `database/`, or `cache/`, which are infrastructure layers, not domain modules, and own no business rules.
- A module is the smallest independently reviewable, independently ownable slice of the system (Architecture Foundation §3). If a piece of logic doesn't obviously belong to exactly one existing module, that is a signal to raise the question to the Backend Architect before writing code — not to invent a new ad hoc module or bolt it onto the nearest convenient one.
- Feature organization is backend-first: the module list in Section 6 is authoritative and closed. A new domain capability is added to this list only via ADR, matching Architecture Foundation §17.5.

## 4. Modular Architecture

- A NestJS module (`*.module.ts`) is both a **logical boundary** and a **DI container**. It declares its controllers, providers, imports, and exports explicitly — nothing is available outside the module unless it appears in that module's `exports` array *and* is re-exported from the module's `index.ts` barrel (Section 11).
- Inter-module calls happen **only** through constructor-injected NestJS providers (Architecture Foundation §4.2). The following are always forbidden, with no exceptions for convenience or deadline pressure:
  - HTTP calls from one backend module to another via `localhost`.
  - Direct SQL or raw Prisma queries against a table owned by a different module.
  - Importing another module's Prisma model type for a write operation.
- **Reactive coupling** (a module that must respond to another module's state change) is implemented via NestJS `EventEmitter2` (`@OnEvent('domain.event')`), never via a synchronous call embedded inside the originating module's own service method (Section 52).
- Module boundaries are deliberately drawn to be **extraction seams**: `wallet`, `transactions`, and `notifications` are the modules Technology Specification §2.9.1 names as future independent services. Nothing about their internal structure should assume they will always live inside `apps/api` — all cross-module communication already looks like it's crossing a service boundary, even though today it's just a function call.

## 5. Package Organization

- `packages/types`, `packages/validation`, and `packages/utils` are the **only** legal mechanism by which `apps/web` and `apps/api` agree on a data shape (Architecture Foundation §2.3). A backend module never hand-defines a DTO shape that duplicates something already expressible from `packages/types`.
- Backend code imports these via the fixed path aliases: `@talentswap/types`, `@talentswap/validation`, `@talentswap/utils` (Architecture Foundation §6.2). Relative imports (`../../../packages/...`) are never used.
- No package may import from `apps/*` (one-way dependency direction, Architecture Foundation §2.3). No package contains NestJS decorators or any framework-specific code — everything in `packages/*` must be importable from a plain Node process or a browser bundle without polyfills.
- A backend module that needs a new shared type or schema **adds a new file** to the appropriate package (e.g., `packages/validation/src/wallet.schema.ts`) and appends a single barrel export line to that package's `index.ts` — it does not modify another domain's existing file.

## 6. Domain Boundaries

The following table is the backend's canonical ownership map, restated in full from Architecture Foundation §3.1 for backend-session reference. It is authoritative; no backend PR may write to a table or invoke a mutation outside the "Owns" column without going through the owning module's public service.

| Module | Owns | Must NOT Access Directly |
|---|---|---|
| `auth` | Login, registration, JWT issuance/verification, refresh-token rotation & family tracking (`refresh_tokens` — ADR-0003), OAuth strategies, password reset | Any domain table other than `users` and `refresh_tokens` |
| `users` | `users` table, account state (banned, email-verified), role assignment | Wallet balance mutation (call `wallet`); skill data (call `skills`) |
| `profiles` | `profiles` table — display name, bio, avatar, reputation aggregate, experience level | Direct ledger writes (call `wallet`); direct XP writes (call `gamification`) |
| `skills` | `skills`, `skill_categories`; skill CRUD and full-text index | Transaction creation (call `transactions`); identity checks (call `users`) |
| `matching` | Match-ranking computation, embedding lookup via pgvector, `match_suggestions` cache | Never writes to a table it does not own; read-only consumer of `skills`/`profiles` via their services |
| `wallet` | `skill_points_ledger`, balance read/write, is the sole module whose actions may trigger the `trg_sync_skill_points` write to `profiles.skill_points` (ADR-0004) | Transaction lifecycle state (owned by `transactions`); direct `UPDATE`s to `profiles.skill_points` — no module, `wallet` included, ever issues one |
| `transactions` | `transactions` table, escrow lifecycle, dual-confirmation state machine, dispute escalation | Direct ledger writes (call `wallet.debit()`/`credit()`); direct notification delivery (call `notifications`) |
| `gamification` | `badges`, `user_badges`, `activity_streaks`, XP calculation, leaderboard sorted sets in Redis | Transaction data beyond read-only event subscription |
| `documents` | `documents` table, presign coordination with `storage`, ClamAV dispatch, verification review workflow | Direct R2 calls (call `storage`); direct profile badge writes (call `profiles`) |
| `storage` | Presigned URL generation, R2/S3 interaction, file key lifecycle | Any business meaning of a file |
| `chat` | `conversations`, `messages`, `/chat` namespace | Call signalling (owned by `calling`); notification fan-out (call `notifications`) |
| `calling` | Agora token generation, call session records, `/call` namespace (signalling only) | Chat message persistence; identity verification beyond service reads |
| `notifications` | `notifications` table, in-app delivery, Web Push, default namespace fan-out | Deciding *when* a notification is warranted — that is the triggering module's job |
| `community` | `community_posts` table, board CRUD | Direct match-suggestion generation (call `matching`) |
| `ratings` | `ratings` table, reputation-score recalculation | Transaction status changes (read-only subscriber only) |
| `admin` | `admin_logs`, moderation queues, aggregation views | Never bypasses another module's guards; calls owning services with elevated context |
| `search` | Search index sync jobs (tsvector at launch → Elasticsearch post-scale) | Owns no source-of-truth data — a rebuildable projection only |

Infrastructure (not domain) modules: **`database`** (single `PrismaService`, `withTransaction()`, advisory-lock helper), **`cache`** (Redis client, `CacheService`, `QueueService`), **`common`** (guards/interceptors/filters/pipes shared by every module, owned by none).

## 7. Layer Responsibilities

Every module obeys the same four-layer flow, request data moving in one direction only (Architecture Foundation §10.1):

| Layer | Responsibility | Forbidden |
|---|---|---|
| **Controller** | HTTP concern only: route, status code, DTO binding, one delegated service call | Business logic; direct `PrismaService` access; hand-rolled try/catch or response construction |
| **Service** | Business decisions; orchestrates its own repository plus other modules' injected public services; throws `DomainException` subtypes | Raw SQL/Prisma queries inline; calling another module's repository or private methods |
| **Repository** | The only place `this.prisma.<model>` appears for the module's owned tables; intent-named methods | Business logic; queries against tables the module does not own |
| **`PrismaService`** (database module) | Connection lifecycle, `withTransaction()`, advisory-lock helper | Being imported anywhere except a module's repository layer |

## 8. Controller Standards

- A controller method body is **validation-binding + exactly one service call + a return statement.** Nothing more.
- Every route is decorated with `@Roles(...)` or explicitly `@Public()` — there is no undecorated, ambiguous route (Section 31).
- Controllers never construct the response envelope by hand; `ResponseTransformInterceptor` does this uniformly (Section 27). Controllers never write local `try/catch`; `GlobalExceptionFilter` is the single catch point (Section 26).
- A module has one primary controller unless a genuinely distinct sub-resource justifies a second (documented in the module's `index.ts` comment) — controllers are not split for cosmetic reasons.
- Controllers never call another module's service directly for a **write**; if a controller needs cross-module data for a read, it does so by injecting that module's public service (never its repository).

## 9. Service Standards

- One service class per module owns that module's business rules (Single Responsibility, Architecture Foundation §10.2). If a service starts computing another module's concern (e.g., `TransactionService` calculating XP), that logic has leaked out of `gamification` and must be moved, not left to grow in place.
- Services depend on **repository interfaces**, with the Prisma-backed implementation bound in the module's `providers` array (Dependency Inversion) — this is what makes a repository swappable for a unit-test double without touching the service.
- A service that can fail in an expected, business-meaningful way (insufficient balance, already confirmed, not found) **throws** a specific `DomainException` subclass. It never returns `null`/`false` and forces the caller to guess why (Section 26).
- New variant behavior (e.g., a new transaction type) is added by extending a strategy interface (`TransactionStrategy` → `OneWayTransactionStrategy`, `TwoWayTransactionStrategy`), never by adding another `if (type === 'x')` branch to an ever-growing method.
- Services that need to move SkillPoints call **only** `wallet`'s public `debit()`/`credit()`/`hold()`/`release()` methods — no module, `admin` included, writes to `skill_points_ledger` directly.

## 10. Repository/Data Access Standards

- The repository is the **only** place a module's Prisma queries live. Method names state query intent (`findActiveByCategory`), never generic names (`query1`, `getData`).
- A repository never queries a table it does not own (Section 6); this is statically enforced by `scripts/check-boundaries.ts` in CI, not left to review discretion alone.
- Multi-table writes that must be atomic (e.g., escrow hold: check balance + deduct + create ledger entry) are wrapped in `database.withTransaction()`, invoked from the **owning module's** repository or service — never spread across two modules inside one transaction (Section 51).
- Repositories implement narrow, module-specific interfaces (Interface Segregation) rather than a single generic repository interface shared by every module — `TransactionRepository` exposes only what `TransactionService` needs, nothing more.

## 11. Module Organization

Every backend module, once scaffolded, contains the standard file set (Architecture Foundation §5.1, §15):

```text
modules/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.service.ts
├── <domain>.repository.ts
├── <domain>.gateway.ts          # only if the module owns a WebSocket namespace
├── dto/
├── strategies/                  # only if the module has pluggable business strategies
├── adapters/                    # only if the module wraps an external SDK (Section 46)
├── listeners/                   # only if the module reacts to another module's events (Section 52)
└── index.ts                     # exactly one barrel — the module's entire public surface
```

- New modules are scaffolded via `pnpm ts-node scripts/generate-module.ts <module-name>` **only** — never hand-rolled, so every module starts from an identical skeleton wired into `app.module.ts` automatically (Architecture Foundation §17.2).
- `index.ts` re-exports **only** what other modules are permitted to call. Anything not re-exported is private; deep-importing an unexported file (`@app/modules/transactions/transaction.repository`) is forbidden and CI-checked (Section 6.5 of the Architecture Foundation).

---

# Part II — Naming Conventions

## 12. Naming Conventions Overview

Sections 13–19 restate and elaborate Architecture Foundation §5 specifically for the backend. Nothing below contradicts that source; where a rule is not repeated here, the Architecture Foundation's original text still governs.

## 13. File Naming Rules

| File type | Convention | Example |
|---|---|---|
| Module definition | `<name>.module.ts` | `transaction.module.ts` |
| Controller | `<name>.controller.ts` | `transaction.controller.ts` |
| Service | `<name>.service.ts` | `transaction.service.ts` |
| Repository | `<name>.repository.ts` | `transaction.repository.ts` |
| WebSocket gateway | `<name>.gateway.ts` | `chat.gateway.ts` |
| DTO | `<verb-noun>.dto.ts` | `create-transaction.dto.ts` |
| Entity / domain model | `<name>.entity.ts` | `transaction.entity.ts` |
| Enum | `<name>.enum.ts` | `transaction-status.enum.ts` |
| Guard | `<name>.guard.ts` | `jwt-auth.guard.ts` |
| Interceptor | `<name>.interceptor.ts` | `response-transform.interceptor.ts` |
| Pipe | `<name>.pipe.ts` | `zod-validation.pipe.ts` |
| Adapter | `<vendor>.adapter.ts` | `agora.adapter.ts` |
| Event listener | `<event-name>.listener.ts` | `transaction-completed.listener.ts` |
| Unit test | `<name>.spec.ts` | `transaction.service.spec.ts` |
| e2e test | `<name>.e2e-spec.ts` | `transaction.e2e-spec.ts` |
| Barrel | always exactly `index.ts` | — |

All backend filenames are lowercase `kebab-case`, all lowercase — never `camelCase.ts` or `PascalCase.ts` on the backend (that convention is reserved for frontend component files).

## 14. Folder Naming Rules

- Backend module folders: `kebab-case`, singular domain noun — `modules/transactions/`, never `modules/Transactions/` or `modules/transaction-management/`.
- Standard subfolders inside a module, when needed, are always exactly: `dto/`, `strategies/`, `adapters/`, `listeners/` (lowercase, plural where the folder holds multiple items of that kind, singular `dto/` by established convention).
- No module introduces a subfolder name not listed in Section 11 without an ADR — this keeps every module's internal shape predictable across independently built domains.

## 15. API Naming Standards

- URL paths use **plural resource nouns**: `/api/v1/skills`, `/api/v1/transactions`, never `/api/v1/skill` or `/api/v1/getSkills`.
- State-transition actions on a resource are expressed as a sub-resource verb only where Technology Specification §5.3 already establishes the pattern: `POST /transactions/:id/confirm`, `POST /transactions/:id/dispute`. This is a deliberately narrow exception, not a general license to add verbs to paths.
- Query parameters are `camelCase`: `?verifiedOnly=true`, `?proficiency=expert`.
- Path parameters are named for the resource they identify: `:id`, `:conversationId`, `:userId` — never a bare `:param`.
- Every endpoint lives under the versioned prefix `/api/v1/` (Section 33); no unversioned or "internal" shortcut endpoints exist, including for SSR (Architecture Foundation §4.1).

## 16. DTO Naming Standards

- `PascalCase`, pattern **Verb + Noun + `Dto`**: `CreateTransactionDto`, `ConfirmTransactionDto`, `UpdateSkillDto`, `<Resource>QueryDto` for filter/pagination inputs (Architecture Foundation §5.2, §9.4).
- A DTO class is a thin wrapper over a Zod schema imported from `packages/validation` via `createZodDto()` — it never redefines validation rules locally (Section 24, Architecture Foundation §17.2 step 3).
- Response DTOs (where distinct from the entity) are named `<Resource>ResponseDto`; list responses are `<Resource>ListResponseDto` and always include the pagination `meta` shape (Section 36).

## 17. Entity Naming Standards

- `PascalCase`, singular, matching the Prisma model name exactly: `Transaction`, `SkillPointsLedgerEntry`, `RefreshToken`.
- Entities are framework-agnostic domain shapes — they carry no NestJS decorators and no React/frontend concerns. Where an entity's shape must be shared with the frontend, it is defined once in `packages/types` and re-exported, never duplicated by hand in `apps/api`.

## 18. Interface Naming Standards

- `PascalCase`, **no `I` prefix** — `TransactionRepository`, `MatchCandidate`, `NotificationDeliveryAdapter` (Architecture Foundation §5.2; the `I` prefix is treated as noise, not information, per modern TypeScript convention).
- Repository interfaces are named `<Entity>Repository`; adapter interfaces are named `<Capability>Adapter` (e.g., `EmailAdapter`, `EmbeddingAdapter`) so a vendor swap changes only the implementing class, never the interface name.

## 19. Enum Standards

- `PascalCase` type name; members `UPPER_SNAKE_CASE` — `enum TransactionStatus { ESCROW_HELD, PROVIDER_CONFIRMED, COMPLETED }` (Architecture Foundation §5.2).
- Backend TypeScript enums mirror their corresponding Prisma enum definitions **one-to-one** in name and member set — a backend enum never introduces a value the database schema does not also define, and vice versa. Any divergence is a schema-drift bug, not a stylistic choice.
- Enums used by both `apps/web` and `apps/api` are defined once in `packages/types` and imported, never redeclared per app.

---

# Part III — Shared Libraries & Configuration

## 20. Shared Library Organization

- `packages/validation/src/<domain>.schema.ts` — one file per domain, the single source of truth for that domain's validation rules. The same file backs both the NestJS `ZodValidationPipe` (via `createZodDto()`) and the frontend's React Hook Form resolver (Technology Specification §2.1.4).
- `packages/types/src/<domain>.types.ts` — framework-agnostic interfaces, enums, and DTO shapes. `api-envelope.types.ts` specifically is the canonical, singular definition of the response envelope (Section 27) — every backend interceptor and every frontend error parser imports from this one file.
- `packages/utils/src/` — pure, side-effect-free functions only (date formatting, points formatting, pagination helpers). No backend-only or frontend-only logic belongs here; if a utility needs `PrismaService` or a React hook, it does not belong in `packages/utils`.
- A backend engineer adding a new domain's schema/type file appends exactly one barrel-export line to the package's existing `index.ts` — never reorders or restructures another domain's existing exports.

## 21. Dependency Injection Standards

- Constructor injection is used for **every** cross-class dependency; `new Service()` never appears anywhere in application code (Architecture Foundation §10.1). This is what makes every layer independently unit-testable.
- A provider is declared in the module that owns it and is exported from that module **only** if another module is permitted to inject it (Section 6). An unexported provider is private, even if technically importable by path.
- Where a service needs to depend on an abstraction rather than a concrete class (e.g., a repository), the interface is injected via a NestJS custom provider token, with the Prisma-backed implementation bound in the module's `providers` array — never a direct class reference that would prevent test-double substitution.

## 22. Configuration Management

- A single `ConfigModule` (backend) reads and validates all environment variables at boot against a Zod schema (`apps/api/src/config/env.schema.ts`), per Architecture Foundation §8.2.
- Configuration is **fail-fast**: a missing or malformed required variable crashes the process on startup, never surfaces as a first-request 500. This is deliberate — a silently-missing `JWT_PRIVATE_KEY` discovered on the first login attempt is a worse outcome than a crash-on-boot in every environment including CI.
- No module reads `process.env.X` directly, anywhere, ever. All environment access goes through the validated, typed config object injected via `ConfigModule`.

## 23. Environment Variable Standards

- `UPPER_SNAKE_CASE`, module-prefixed where the name would otherwise be ambiguous: `DATABASE_URL`, `AGORA_APP_ID`, `JWT_ACCESS_TOKEN_TTL` (Architecture Foundation §5.1).
- Every variable a module needs is documented in `apps/api/.env.example` with a placeholder value and an explanatory comment — this file is the contract a future session reads to know what a module needs, and it is the **only** place a new variable is introduced (Architecture Foundation §8.1).
- `.env` (actual local secrets) is never committed; `.gitignore` blocks it globally, not per-app (Architecture Foundation §8.4). Staging/production values are injected by the hosting platform's secret store (Section 48) and never exist as files in the repository.

---

# Part IV — Validation, Serialization & Error Handling

## 24. Validation Standards

- Every input crosses the trust boundary **exactly once**, at the controller, via the shared `ZodValidationPipe` wrapping the schema imported from `packages/validation` (Architecture Foundation §10.3).
- Services trust their inputs completely once past the pipe — a service **never** re-validates what the controller-level pipe already validated. Re-validation deeper in the stack is a sign the boundary was drawn in the wrong place, not a defensive best practice.
- WebSocket gateway payloads are validated against the **same** Zod schemas used by the REST layer, inside the gateway handler, before any processing occurs (Technology Specification §5.5). Payloads exceeding 64 KB are rejected outright.

## 25. Serialization Standards

- `ResponseTransformInterceptor` applies the standard success envelope (Section 27) to every response automatically; no controller or service hand-constructs `{ success, data, meta }`.
- Sensitive fields (`password_hash`, refresh-token hashes, internal-only columns) are **excluded at the query level** via an explicit Prisma `select`/`include` — never fetched and then stripped afterward by a serializer decorator. Over-fetch-then-filter is treated as a data-exposure risk, not a convenience.
- Every list-returning query uses Prisma's explicit `select` to scope exactly the fields the endpoint's DTO promises — accidental over-fetching from a bare `findMany()` is caught in code review (Section 55, Architecture Foundation §14).

## 26. Exception Handling Strategy

- Expected, business-meaningful failures are thrown as typed exceptions extending a shared `DomainException` base (`common/exceptions/domain.exception.ts`), each carrying a stable `code` (`INSUFFICIENT_BALANCE`, `TRANSACTION_ALREADY_CONFIRMED`) — never returned as `null`/`false`/a magic string (Architecture Foundation §6.6).
- A single `GlobalExceptionFilter` catches every exception and maps it to the standard error envelope (Section 27). No controller writes its own try/catch-and-format logic.
- Unexpected failures (a dropped DB connection, an unhandled third-party SDK error) are left to propagate to `GlobalExceptionFilter` — they are never caught-and-swallowed locally. Ledger, escrow, and auth code paths fail loud and roll back; there is no "log and continue" for these paths under any circumstance.

## 27. Global Error Response Format

Every REST response, success or failure, uses the identical envelope (Architecture Foundation §9.1/§9.2), applied automatically by the shared interceptor/filter pair:

```json
// Success
{ "success": true, "data": { }, "meta": { "requestId": "uuid", "timestamp": "ISO-8601" } }

// Error
{
  "success": false,
  "error": { "code": "INSUFFICIENT_BALANCE", "message": "You do not have enough SkillPoints for this exchange.", "details": { "required": 20, "available": 12 } },
  "meta": { "requestId": "uuid", "timestamp": "ISO-8601" }
}
```

`code` is stable and machine-switchable by the frontend; `message` is always safe to display as-is; `details` is optional, structured, and **never** a stack trace or internal error string.

## 28. Logging Standards

- Backend logging uses **Winston**, structured JSON output, with a minimum of one log line per request: method, path, status, duration, `userId`, `requestId` (Architecture Foundation §6.7).
- Every request receives a `requestId` (UUID) generated by middleware and threaded through to the error envelope, so a user-reported error greps straight to its log line.
- Log levels: `error` (pages/investigation required), `warn` (degraded but handled), `info` (business events — transaction completed, user registered), `debug` (dev-only, stripped from production builds).
- Secrets, tokens, raw passwords, and full credential-document contents are never logged. Redaction is applied centrally in the Winston formatter — never left to individual call sites to remember.

## 29. Monitoring Standards

- **Sentry** provides error tracking and performance monitoring for the backend (Technology Specification §2.7.5); every unhandled exception reaching `GlobalExceptionFilter` at `error` level is reported.
- **Prometheus + Grafana** dashboards track API latency, DB query time, WebSocket connection count, queue depth, and error rate. A module that introduces a new BullMQ queue or WebSocket namespace exposes its depth/connection-count metric through the existing dashboard convention — it does not stand up a bespoke, module-specific monitoring stack.
- Database-level monitoring (pgBadger, `pg_stat_statements`) is an infrastructure concern owned by DevOps, not replicated per backend module.

---

# Part V — Authentication & Authorization

## 30. Authentication Standards

- Access tokens are **JWT, RS256-signed, 15-minute expiry**, validated statelessly (no DB round-trip) at the API layer (Technology Specification §2.2.4, §8.2).
- Refresh tokens are long-lived (30-day), stored **hashed** in the `refresh_tokens` table (`token_hash`, `family_id`, `is_revoked`, `replaced_by_token_id`, `expires_at` — ADR-0003), delivered as an httpOnly, Secure cookie, and **rotated on every use**. Presentation of an already-used (revoked) token indicates theft/replay and invalidates the **entire token family**, forcing full re-authentication.
- OAuth (Google, LinkedIn) is implemented via Passport.js strategies owned exclusively by `auth`; no other module touches an OAuth provider directly.
- WebSocket connections authenticate **once**, at handshake, via a short-lived one-time token derived from the JWT — never by resending the bearer token per event (Architecture Foundation §9.6).
- `auth` is a **two-reviewer, Critical-risk** module (Section 55) — any change to token issuance, rotation, or family-revocation logic is held to that standard without exception.

## 31. Authorization Standards

- **Deny by default.** Every NestJS route requires authentication unless explicitly decorated `@Public()` (Architecture Foundation §13 rule 3). An undecorated route is a bug, not an implicit default.
- Elevated-access routes are decorated `@Roles(Role.Moderator)` / `@Roles(Role.Admin)` **and** additionally check resource ownership in the service layer where relevant (a user editing "their" skill listing). The guard checks role; the service checks ownership. Neither alone is sufficient, and neither substitutes for the other.
- No module writes its own inline auth check "just for this one route" — every auth/role/rate-limit control is implemented once in `common/` and applied via decorator, never duplicated ad hoc (Architecture Foundation §13 rule 8).

## 32. Role & Permission Guidelines

- Canonical roles, owned exclusively by the `users` module: `user | verified_user | moderator | admin` (Technology Specification §4.1.1). Role assignment is a `users`-module mutation; no other module writes to the `role` column.
- `verified_user` is granted only via the `documents` module's verification workflow calling `profiles` to set `is_verified` — never assigned directly by an admin editing the role column as a shortcut.
- Admin-tier actions (`admin` module) always call the owning module's service with an elevated context rather than writing to another module's tables directly (Section 6) — admin privilege changes *who is allowed to call a service*, never *which layer gets bypassed*.

---

# Part VI — API Design Standards

## 33. API Versioning Strategy

- URL path prefix only: `/api/v1/`, future `/api/v2/` (Architecture Foundation §9.7, Technology Specification §5.2). Header-based versioning is explicitly rejected — it is invisible in browser history and harder to test.
- A deprecated version carries `Deprecation: true` and `Sunset: <date>` response headers throughout its remaining support window before retirement.

## 34. REST API Design Standards

- Endpoints map to the resource groups already enumerated in Technology Specification §5.3 (Auth, Users, Skills, Matches, Transactions, Wallet, Storage, Documents, Chat, Notifications, Ratings, Badges, Community, Admin) — a new endpoint belongs to the module that owns the underlying resource (Section 6), never to a convenient nearby controller.
- Status codes follow the fixed table in Architecture Foundation §9.8 (`200`/`201`/`204`/`400`/`401`/`403`/`404`/`409`/`422`/`429`/`500`) — a `404` is used uniformly for both "does not exist" and "exists but you have no access," never leaking existence via a 403-vs-404 distinction on private resources.
- Every list endpoint documents an explicit default sort in its controller — "whatever the database returns" is never acceptable (Architecture Foundation §9.5).

## 35. Request & Response Standards

- `Authorization: Bearer <access_token>` is required on every authenticated REST call (Architecture Foundation §9.6).
- Every response — success or error — uses the Section 27 envelope without exception, applied by the shared interceptor/filter, never hand-rolled per endpoint.
- Server Components in `apps/web` calling the backend for SSR use the **same** versioned REST client and endpoints as client-side code — the backend never exposes a private/internal SSR-only endpoint (Architecture Foundation §4.1).

## 36. Pagination Standards

- **Offset pagination** (`?page=1&limit=20`) for admin tables and any list where jumping to an arbitrary page matters.
- **Cursor pagination** (`?cursor=<opaque>&limit=20`) for infinite-scroll feeds where concurrent inserts occur — Discover feed, chat message history, community board — since offset pagination breaks under concurrent inserts (Architecture Foundation §9.3).
- Response `meta.pagination` is either `{ nextCursor, hasMore }` or `{ page, limit, total, totalPages }`, matching the style the endpoint uses; a single endpoint never mixes both styles.

## 37. Filtering Standards

- Query-param based, namespaced to avoid collision with pagination/sort params: `?filter[category]=design&filter[verifiedOnly]=true` (Architecture Foundation §9.4).
- Each endpoint documents its supported filter keys in its `<Resource>QueryDto`, validated by the shared Zod schema. An unsupported filter key is rejected with `400 VALIDATION_ERROR` — it is never silently ignored, since silent-ignore produces a query that looks filtered to the caller but isn't.

## 38. Sorting Standards

- `?sort=field:dir`, multi-field `?sort=reputationScore:desc,createdAt:asc` (Architecture Foundation §9.5). The default sort is always explicit in the controller and documented per endpoint (Section 34).

## 39. Search Standards

- MVP search uses **PostgreSQL full-text search** (`tsvector`/`tsquery` with `pg_trgm` for fuzzy matching), owned by the `search` module as a read-optimized, fully rebuildable projection over `skills`/`profiles` — it owns no source-of-truth data (Technology Specification §2.3.4, Architecture Foundation §3.1).
- The scale trigger for an Elasticsearch/OpenSearch swap is ~50,000 profiles or search latency degrading beyond acceptable thresholds. When that trigger fires, only the `search` module's internals change — no consuming module's contract changes, because the module boundary was drawn for exactly this swap from the start.
- Search is never treated as a second source of truth; if the `search` projection and the primary tables ever disagree, the primary tables are correct and the projection is rebuilt.

## 40. Rate Limiting Guidelines

Implemented once as a decorator-based policy (`@RateLimit('auth')`), never re-implemented per controller (Architecture Foundation §13 rule 4). Tiers, per Technology Specification §5.4:

| Endpoint / Resource | Limit |
|---|---|
| Auth endpoints (login, register, forgot-password) | 5 requests / 15 minutes / IP |
| Standard authenticated endpoints | 200 requests / minute / user |
| File upload presign endpoint | 10 requests / minute / user |
| WebSocket connections | 1 active connection / authenticated user |
| Admin endpoints | 50 requests / minute / admin user |

## 41. Caching Strategy

- Redis wraps **expensive aggregate reads only** — leaderboards, category aggregations, platform statistics — with a TTL of 5–60 minutes (Architecture Foundation §14). Transactional and ledger reads are **never** cached; they are always read fresh from PostgreSQL given the platform's financial-grade correctness requirement.
- Only the `cache` module holds the Redis client. Domain modules call `CacheService.get/set/del` and `QueueService.add(<queueName>, payload)` — no domain module instantiates its own `ioredis` client (Architecture Foundation §4.4).

---

# Part VII — Cross-Cutting, Integration & Data Standards

## 42. Background Job Standards

- All slow or non-critical-path work — email dispatch, document scanning, gamification evaluation, search sync, fraud scoring — is deferred to **BullMQ**, never performed inline in a request handler (Architecture Foundation §1.2, Technology Specification §2.9.2).
- Queue names are `kebab-case` nouns: `document-scan`, `gamification-events` (Architecture Foundation §5.1).
- Every job is idempotent and retry-safe with a configurable backoff strategy — a job that runs twice (due to a retry) must never produce a different outcome than running once.
- External-API-dependent jobs (embedding generation, OpenAI moderation) handle failure/timeout gracefully — an upstream outage degrades functionality, it never produces a hard user-facing failure.

## 43. File Upload Standards

- Files are **never** transmitted through the application server (Architecture Foundation §13 rule 6). The flow is fixed: client requests a presigned URL from `storage` → uploads directly to R2/S3 → confirms with `storage` → `storage` (via `documents`, where applicable) enqueues a ClamAV scan job (Technology Specification §3.5).
- MIME type **and** magic-byte validation are both required — the declared `Content-Type` header is never trusted alone (Technology Specification §8.4).
- Size limits are enforced at the CDN layer and re-validated at the presign endpoint: profile images 5 MB, documents 20 MB, chat attachments 10 MB.
- A document's status is never anything other than `PENDING`/`PENDING_REVIEW` reachability-gated behind a **passed** ClamAV scan — no status transition skips the scan step, regardless of file size or type.

## 44. Notification Service Standards

- `notifications` handles **delivery only** — in-app (default Socket.io namespace), Web Push (VAPID), and email (Resend adapter). It never decides *when* a notification is warranted; that decision belongs to the triggering module, communicated via `EventEmitter2` (Section 52, Architecture Foundation §3.1).
- Delivery is fanned out to the user's personal room (`user:{userId}`) on the default namespace (Technology Specification §3.3).
- A new module that needs to notify a user emits a domain event and lets `notifications` subscribe — it never calls a `notifications` internal delivery method directly, and it never bypasses `notifications` to push its own WebSocket event on an ad hoc basis.

## 45. AI Service Integration Guidelines

- The OpenAI `text-embedding-3-small` integration is wrapped in `matching/adapters/openai-embedding.adapter.ts`, owned exclusively by `matching`. No other module calls the OpenAI SDK directly.
- Embeddings are stored via the `pgvector` PostgreSQL extension; ranking is a weighted composite of embedding similarity, geographic proximity, reputation, and availability, computed inside `matching`'s service layer — the only artifact `matching` persists beyond source data is the `match_suggestions` cache (Section 6).
- Embedding (re)generation runs as an idempotent, retry-safe BullMQ job triggered on skill/profile change — never synchronously inside the request that created or edited the skill/profile.
- External AI API failure or timeout is handled gracefully at the adapter boundary; a user never sees a hard failure because OpenAI is briefly unavailable — degraded/stale suggestions are an acceptable fallback, a broken Discover page is not.

## 46. Third-Party Integration Standards

- Every third-party SDK (Agora, Resend, OpenAI, Stripe, ClamAV, R2) is wrapped in an **adapter class**, owned by the module that uses it: `calling/adapters/agora.adapter.ts`, `notifications/adapters/resend.adapter.ts`, `storage/adapters/r2.adapter.ts`, `matching/adapters/openai-embedding.adapter.ts` (Architecture Foundation §4.5).
- No controller and no business-logic service calls an external SDK directly, under any circumstance. This is what keeps a vendor swap (Resend → SendGrid, R2 → S3) a one-file change rather than a cross-codebase search-and-replace.

## 47. Security Best Practices

Restated in full from Architecture Foundation §13 as binding backend rules:

1. **Secrets never reach the client.** No `NEXT_PUBLIC_*` variable holds anything beyond a publishable/public key.
2. **Validate at the boundary, trust internally** (Section 24) — services never re-validate what the controller pipe already validated.
3. **Deny by default** (Section 31) — every route requires auth unless `@Public()`.
4. **Rate limit by sensitivity tier** (Section 40), implemented once as a decorator policy.
5. **Sanitize all user-generated content** server-side (`sanitize-html`) before persistence — client-side `DOMPurify` is a second, non-substitutable layer, not the only one.
6. **File uploads never touch the app server's memory** — presigned direct-to-R2 only, MIME + magic-byte validated, ClamAV-scanned (Section 43).
7. **Points movement is the highest-security-tier code path in the system.** Any change to `wallet` or `transactions` requires two reviewer approvals and must go through `database.withTransaction()` with the advisory-lock pattern (Section 51) — no exceptions, no "quick fix" bypasses.
8. **No security control is duplicated ad hoc.** Auth guards, roles guards, rate limiting, and sanitization are implemented once in `common/` and applied via decorators.

## 48. Secrets Management Guidelines

| Environment | Secret store |
|---|---|
| Local development | `.env` files (gitignored) + Docker Compose defaults for Postgres/Redis; each developer provisions their own sandbox third-party keys |
| CI | GitHub Actions Secrets, scoped per workflow, rotated quarterly |
| Staging | Doppler / Railway Secrets, mirroring production variable names exactly |
| Production | AWS Secrets Manager (post-migration) / Railway Secrets (MVP); access restricted to the deploy pipeline identity only — no human reads production secrets directly |

Never committed, anywhere, under any name: database URLs with credentials, JWT signing keys (RS256 private key especially), Agora/OpenAI/Stripe/Resend API keys, R2 access keys, ClamAV daemon connection strings (Architecture Foundation §8.4).

## 49. Performance Optimization Standards

| Area | Standard |
|---|---|
| HTTP caching | `Cache-Control` per Architecture Foundation §14 table on every GET; immutable assets `max-age=31536000, immutable` |
| DB query cache | Redis wraps expensive aggregate reads only (Section 41); ledger reads never cached |
| Connection pooling | PgBouncer in front of PostgreSQL at all times, local dev included |
| Ingest-time image processing | Uploads resized server-side (Sharp) at ingest, never resized client-side per render |
| Database indexing | Every index from Technology Specification §4.2 is created in the table's **initial** migration, never added reactively (Section 50) |
| Query scoping | Prisma's explicit `select`/`include` used deliberately per query — a bare `findMany()` default over-fetch is a review finding, not a style nit (Section 25) |
| N+1 prevention | A Prisma call inside a `.map()`/loop is caught in code review; batch via `include` or `findMany({ where: { id: { in: [...] } } })` instead |

## 50. Database Interaction Guidelines

- **Only** the `database` module's `PrismaService` talks to PostgreSQL. Every domain module receives it via injection but queries only the tables it owns (Section 6), enforced by `check-boundaries.ts` in CI (Architecture Foundation §4.3).
- Every index listed in Technology Specification §4.2 is created in its owning table's **initial** migration — indexing is a completion-checklist item for every database change, never a reactive fix after a slow-query alert.
- **ADR-0004 exception, binding on every module:** `profiles.skill_points` is never written by application code, by any module — not `profiles`, not `wallet`, not `admin`. It is written exclusively by the `trg_sync_skill_points` database trigger, fired by `wallet`-owned `skill_points_ledger` inserts. `profiles.repository.ts` exposes no update method whose input type includes `skill_points` — this is enforced at the TypeScript type level, not left to reviewer vigilance alone.

## 51. Transaction Management Guidelines

- Multi-table atomic writes are wrapped in `database.withTransaction()`, invoked from the **owning module** of the operation — `wallet` for balance/ledger operations, `transactions` for escrow-lifecycle operations — never spread across modules inside one transaction (Architecture Foundation §4.3).
- **SERIALIZABLE** isolation is used for the escrow-initiation step (balance check → deduct), where concurrent double-spend must be prevented at the database level; **READ COMMITTED** is sufficient for the less-critical confirmation steps (Technology Specification §4.3).
- `pg_advisory_xact_lock(user_id_hash)` provides application-level serialization around the critical balance-check-then-deduct sequence, as database isolation alone does not guarantee this across all PostgreSQL versions.
- Any change touching `wallet` or `transactions` requires **two reviewer approvals** and goes through `withTransaction()` plus the advisory-lock pattern described above — this is Section 47 rule 7 restated as a data-layer rule, not a separate, softer standard.

## 52. Event & Messaging Guidelines

- Reactive cross-module coupling is implemented via NestJS `EventEmitter2` (`@OnEvent('domain.event')`) — a module that needs to react to another module's state change subscribes to its event; it is never called synchronously inline inside the originating module's transaction (Architecture Foundation §4.2).
- The canonical example: `transaction.completed` is emitted once by `transactions`. `ratings`, `gamification`, and `notifications` each subscribe independently. `transactions` remains entirely ignorant of who is listening — this decoupling is a strict requirement given how many modules react to that single event.
- Socket.io events follow `domain:action` naming (`transaction:escrow_funded`, `message:send`), namespaced by concern (`/` default, `/chat`, `/call`, `/admin` — Technology Specification §5.5). Every payload is validated against the same Zod schema used by the equivalent REST DTO, and payloads over 64 KB are rejected.
- In horizontally scaled deployments, the Redis adapter for Socket.io ensures events emitted on one instance reach sockets connected to any other instance — no gateway assumes single-instance affinity.

---

# Part VIII — Quality & Process Governance

## 53. Testing Standards

- **Unit tests** mock the repository layer and exercise the service in isolation — this is only possible because services depend on repository interfaces (Section 21).
- **e2e tests** run against a real test-database transaction that is rolled back after each test (Architecture Foundation §17.2 step 8) — never against a shared, stateful test database that accumulates cross-test pollution.
- Test coverage must include the module's `DomainException` paths, not just the happy path — a module whose only tests are happy-path is not considered tested for the purposes of Section 56.
- CI gates, all required before merge: TypeScript typecheck, lint, unit tests, Turborepo-affected e2e tests, and `check-boundaries.ts` (Architecture Foundation §7.3).

## 54. Documentation Standards

- `docs/api/openapi.json` is **generated** from Swagger decorators on controllers and DTOs — it is never hand-edited. A PR that adds an endpoint without the corresponding Swagger annotations is incomplete (Architecture Foundation §17.4).
- A module-level README documents any deliberate deviation from this constitution's defaults (there should be very few) and any non-obvious business rule the module owns — it never duplicates content that already lives in a source-of-truth document (this constitution, the Architecture Foundation, or the Specification); it links instead.
- Runbooks for anything operationally significant (a new queue, a new external dependency) are added under `docs/runbooks/` as part of the module's completion, not deferred indefinitely.

## 55. Code Review Guidelines

- Reviewer checks proceed in this fixed order (Architecture Foundation §7.4): **(1)** does it stay inside its Section 6/Part I module boundary, **(2)** does it follow the naming/typing standards in Parts II–III, **(3)** is the business logic correct, **(4)** is it adequately tested (Section 53).
- Any cross-module direct-table access or bypassed service call is an **automatic "request changes,"** never a style nit, regardless of how small the change is or how confident the author is.
- `wallet`, `transactions`, and `auth` require **two** reviewer approvals, without exception (Architecture Foundation §7.3, Section 47 rule 7).
- No PR is approved with `// eslint-disable` on a boundary-enforcing or `strict`-mode rule without an inline comment explaining why **and** a linked follow-up issue to remove it.

## 56. Backend Definition of Done

A backend module cannot move to `Approved` status (Master Development Plan §7.1) until every applicable item below is checked:

- [ ] Stays entirely inside its Section 6 module boundary; `check-boundaries.ts` passes.
- [ ] Naming matches Parts II–III of this document exactly.
- [ ] `strict` TypeScript passes with **zero** `any`.
- [ ] Validation schema lives in `packages/validation`, shared by both apps (Section 24).
- [ ] API responses match the Section 27 envelope/error format without hand-rolled formatting.
- [ ] Unit **and** e2e tests included; CI green (Section 53).
- [ ] `docs/api/openapi.json` regenerated automatically, never hand-edited (Section 54).
- [ ] PR opened with the module named in scope, reviewed per Section 55.
- [ ] **For `wallet` / `transactions` / `auth` specifically:** two reviewer approvals obtained.
- [ ] Every relevant Technology Specification §4.2 index exists in the module's **initial** migration, where the module introduces new tables (Section 50).

## 57. Future Backend Module Development Rules

Every future backend session — human or AI — follows this exact sequence, restated from Architecture Foundation §17.1–§17.2 as binding backend process:

1. **Confirm ownership.** Re-read Section 6 for the module's exact table ownership and forbidden-access list.
2. **Confirm communication rules.** Re-read Parts I and VII (especially Sections 4, 46, 51, 52) for exactly how this module is allowed to talk to every other module and external service it needs.
3. **Confirm dependencies are built.** Check the Master Development Plan's Section 5/7 — if an upstream dependency module is not yet `Completed`, stop and flag it; do not build around a missing dependency with a temporary shortcut.
4. **Scaffold, never hand-roll.** Run `pnpm ts-node scripts/generate-module.ts <module-name>` (Section 11) to generate the standard skeleton, wired into `app.module.ts` automatically.
5. **Schema before code.** Define the module's Prisma models under a `// === <module> module ===` comment block in `prisma/schema.prisma`; generate the migration; never hand-edit a migration file after it has been applied anywhere (Section 50).
6. **Validation before DTOs.** Define Zod schemas in `packages/validation/src/<module>.schema.ts` first; the DTO class wraps this schema via `createZodDto()` (Section 16, Section 24).
7. **Layer in order.** Write the repository, then the service, then the controller (Section 7) — never out of order, never skipping a layer.
8. **Reactive modules add listeners**, not synchronous calls into another module's transaction (Section 52).
9. **Export only the public surface** from `index.ts` (Section 11).
10. **Endpoints inherit conventions for free** — the response envelope and error codes come from the shared interceptor/filter; the module only needs to throw the correct `DomainException` subtypes (Sections 26–27).
11. **Test both layers** — unit tests mocking the repository, e2e tests against a rolled-back test-database transaction (Section 53).
12. **This constitution itself changes only via AI SDLC §1 Governance Rules** (explicit approval, critical architectural issue, or a formal ADR) — a future session that finds this document genuinely unworkable for a specific module opens an ADR proposing an amendment; it does not quietly deviate inside that module's PR.

---

## Glossary

| Term | Meaning |
|---|---|
| **ADR** | Architecture Decision Record — the only mechanism, besides explicit approval, by which the frozen AI SDLC process or this constitution may be amended. |
| **DI** | Dependency Injection — NestJS's constructor-based mechanism for supplying a class's collaborators. |
| **DTO** | Data Transfer Object — the typed shape of data crossing the controller boundary, always backed by a shared Zod schema. |
| **DomainException** | The shared exception base class every module's expected business-rule failures extend, carrying a stable `code`. |
| **e2e** | End-to-end test — exercises a controller through a real (rolled-back) test-database transaction. |
| **Envelope** | The fixed `{ success, data/error, meta }` JSON shape every REST response uses (Section 27). |
| **GIN index** | Generalized Inverted Index — the PostgreSQL index type used for full-text (`tsvector`) search. |
| **JWT** | JSON Web Token — the platform's stateless access-token format, RS256-signed. |
| **KISS** | Keep It Simple — build only what the current roadmap phase requires. |
| **ORM** | Object-Relational Mapper — Prisma, the platform's sole database access layer. |
| **RBAC** | Role-Based Access Control — the platform's authorization model (`user | verified_user | moderator | admin`). |
| **RS256** | An asymmetric JWT signing algorithm (private key signs, public key verifies) used for access tokens. |
| **SDLC** | Software Development Life Cycle — here, the frozen `TalentSwap AI SDLC.md` v1.0 process this constitution operates under. |
| **SOLID** | The five object-oriented design principles applied concretely per Section 1. |
| **Strategy pattern** | The Open/Closed-compliant mechanism (`TransactionStrategy`, etc.) for adding new variant behavior without branching logic. |
| **WS** | WebSocket — the platform's real-time transport, implemented via Socket.io with a Redis adapter for multi-instance fan-out. |

---

## Change Log

| Version | Date | Change | Author | Status |
|---|---|---|---|---|
| BE-CON-v1.0 | 2026-08-04 | Initial Backend Constitution — 57 standards across 8 parts, derived from Architecture Foundation v1.1 (incl. ADR-0002–ADR-0004), Master Development Plan v1.1, and Technology Specification v1.0. No architectural decisions made; no new technology introduced. | Lilesh (Backend Architect) | Submitted for ratification |
| BE-CON-v1.0 | 2026-08-04 | **Ratified.** Erwin approved BE-CON-v1.0 without amendment. Document is now binding on every backend module per AI SDLC §1 Governance Rules — deviation requires explicit approval, a critical architectural issue, or a formal ADR. | Erwin (Lead Architect) | Ratified |

---

_This document defines standards only. It carries no authority to change architecture, business logic, or the approved technology stack. Any conflict between this constitution and the Architecture Foundation is resolved in the Architecture Foundation's favor — flag it for Erwin's review; do not override it. As of ratification, this document is binding on every current and future backend module built for TalentSwap._

**— End of Backend Constitution (BE-CON-v1.0) —**
