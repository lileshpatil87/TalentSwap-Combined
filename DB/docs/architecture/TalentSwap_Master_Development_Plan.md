# TalentSwap — Master Engineering Project Management Plan

| | |
|---|---|
| **Document Type** | Engineering Project Management Plan (Master Development Plan) |
| **Author / Role** | Jacob — Project Manager (Account 01) |
| **Authority** | Coordination & tracking only. Contains **no** architectural decisions. |
| **Governing Documents** | `TalentSwap_Architecture_Foundation.md` v1.1 (PRIMARY AUTHORITY — amended per ADR-0002–0004, inline `[ADR-000X]` markers, §18 Amendment Log), `TalentSwap AI SDLC.md` (frozen process v1.0, interpreted per ADR-0005), `TalentSwap Proposal.md`, `TalentSwap Specification.md` |
| **Status** | v1.1 — ADR-0002 through ADR-0005 ratified by Erwin; Sprint-0 critical-path blockers cleared (Section 1.3); `FOUND-01`, `DB-01`, `DB-02`, `DB-04`, `BE-01`, `BE-06` flipped to Ready (Section 7.2) |
| **Change Control** | Locked once approved. Amendments only via AI SDLC §1 Governance Rules (explicit approval, critical architectural issue, or ADR). |

> **PM Boundary Statement:** This document plans, sequences, tracks, and governs work. It does not redesign architecture, write code, define schema, generate APIs/UI, or produce Docker/CI artifacts. Where the source documents conflict or are silent, this document flags the gap for Erwin's (or the relevant architect's) decision — it does not resolve it.

---

## 1. Executive Summary

### 1.1 Purpose

This plan operationalizes the **TalentSwap Architecture Foundation** (the authoritative build contract) and the **frozen AI SDLC v1.0 process** into a concrete, trackable body of work that six independent AI engineering sessions — Erwin, Jacob, John, Lilesh, Robert, Krushna — can execute against without drifting out of sync or duplicating effort.

TalentSwap is delivered as a single pnpm/Turborepo monorepo (`apps/web` — Next.js 14, `apps/api` — NestJS modular monolith) backed by PostgreSQL 16/Prisma, Redis 7/BullMQ, Cloudflare R2, and Socket.io, per the Architecture Foundation §1–§2. The Architecture Foundation's own Section 16 roadmap sequences **17 domain capability areas** in strict dependency order; this plan decomposes that roadmap into **116 independently trackable work modules** across ten categories (Foundation, Database, Backend, Frontend, Infrastructure, AI, Testing, Documentation, Integration, Deployment), each scoped to fit inside a single AI working session, per the PM mandate.

### 1.2 Team of Record (per AI SDLC §2)

| Acct | Name | Permanent Role | Never Does |
|---|---|---|---|
| 00 | **Erwin** | Lead Architect — architecture, standards, final reviews, integration approval, technical decisions | Never writes feature code |
| 01 | **Jacob** | Project Manager — roadmap, tracking, module registry, dependencies, sprint planning, change log | Never writes code |
| 02 | **John** | Frontend Architect — frontend constitution, shared UI, frontend reviews/modules | — |
| 03 | **Lilesh** | Backend Architect — backend constitution, backend reviews/modules | — |
| 04 | **Robert** | Database Architect — DB constitution, schema, migrations, reviews | — |
| 05 | **Krushna** | DevOps Architect — DevOps constitution, Docker, CI/CD, deployment, infrastructure | — |

### 1.3 Architecture & Process Consistency Notes — Resolved via ADR-0002 through ADR-0005

Items C-1 through C-4 below were raised for Erwin's decision rather than resolved unilaterally, per my mandate. All four have now been ruled on. The Architecture Foundation itself has been amended to **v1.1** with inline `[ADR-000X]` markers and a Section 18 Amendment Log, so it — not this table — is the durable record going forward. This table remains as the audit trail: what was flagged, how it was resolved, and which modules it unblocked.

| # | Item | Resolution | Modules Unblocked |
|---|---|---|---|
| **C-1** | HTTP adapter ambiguity (Arch §15 vs. Spec §2.2.5) | **Resolved — ADR-0002.** Launch on the NestJS default Express adapter (`NestExpressApplication`); Fastify swap deferred to a measured, scale-triggered later change with zero application-code cost, exactly as Spec §2.2.5's prose already described. The ambiguity's actual source was the Spec's own §6.2 file-tree comment, not the Architecture Foundation. | `FOUND-01` |
| **C-2** | `refresh_tokens` schema gap (Spec §2.2.4/§3.6/§8.2 vs. Spec §4.1 silent) | **Resolved — ADR-0003.** A `refresh_tokens` table is added, owned by `auth` (not `users`, to keep that boundary clean): `id`, `user_id` FK, `token_hash`, `family_id`, `is_revoked`, `replaced_by_token_id`, `expires_at`, `created_at` — required in `DB-01`'s initial migration, with a composite `(user_id, family_id)` index, unique `(token_hash)` index, and `(expires_at)` index for cleanup scans. | `DB-01`, `BE-01` |
| **C-3** | `profiles.skill_points` write-path ownership (Arch §3.1 vs. Spec §4.1.5) | **Resolved — ADR-0004.** The `trg_sync_skill_points` trigger is the sole writer of the column, and it is migrated under `DB-04` (ledger logic), not `DB-02` — firing exclusively off `wallet`-owned `skill_points_ledger` inserts. "Wallet is the only module permitted to change `profiles.skill_points`" describes causal ownership of the *action* (the ledger insert), not a literal `UPDATE` statement — no module, wallet included, ever hand-writes that column. Backstopped at the TypeScript layer: `profiles.repository.ts`'s update type excludes `skill_points` entirely. | `DB-02`, `DB-04`, `BE-06`, `BE-03` (type-level backstop) |
| **C-4** | AI SDLC Phase 0–7 ↔ Architecture §16 roadmap mapping (no entry/exit criteria, no cross-reference) | **Resolved — ADR-0005.** My §6.1 mapping is adopted as proposed, with one refinement: Phase 6 (Testing) means the post-integration system regression pass (`INT-17` + hardening), not per-module `TEST-xx` — which is already a Phase 3 completion-gate item per this plan's own §11 DoD. Separately, Erwin ruled — as a **critical architectural issue** under AI SDLC §1 condition 2, not merely an interpretation — that Phase 3→4 sequencing is evaluated **per domain**, since a project-wide barrier reading is unbuildable against the §16 dependency graph. Sections 6.1/6.2 amended accordingly. | Governs Section 6 interpretation; no module IDs change status directly |
| **C-5** (minor) | Cross-reference: Architecture Foundation cites `TalentSwap_Technology_Specification.md`; actual file is `TalentSwap Specification.md` | Open — cosmetic only, tracked by Jacob, no architect action required. | — |

With C-1 through C-4 closed, `FOUND-01`, `DB-01`, `BE-01`, `DB-02`, `DB-04`, and `BE-06` move from **Blocked — Pending ADR** to **Ready** in Section 7.2. "Ready" clears the architectural blocker only — standard dependency sequencing (Section 5) still governs when each module is actually picked up.

### 1.4 Scale & Success Context (for prioritization only — not engineering targets)

Per Proposal §3.2 and Spec §1.2, the system must be architected to reach 10,000 active users / 25,000 registered users in Year 1, up to 2,000 concurrent users, and 5,000 transactions/day, with a <2% transaction dispute rate. These figures inform *why* Wallet and Transactions carry Critical risk designation throughout this plan (Section 8) and why they require two-reviewer approval per Architecture §7.3 and §13 rule 7.

---

## 2. Complete Project Roadmap

This roadmap is derived directly from Architecture Foundation §16 (module dependency order) and is not altered. It is restated here as the spine that Sections 3–7 hang off of.

| Roadmap # | Domain | Depends On | Delivered As (this plan's IDs) |
|---|---|---|---|
| 0 | Foundation | — | `FOUND-01…08`, partial `INFRA-01/04`, `DOC-01/03`, `TEST-00` |
| 1 | Auth | Foundation | `DB-01`, `BE-01`, `FE-01`, `TEST-01`, `INT-01` |
| 2 | Users & Profiles | Auth | `DB-02`, `BE-02`, `BE-03`, `FE-02`, `FE-16`, `TEST-02/03`, `INT-02` |
| 3 | Storage | Foundation (cut early for #2's avatar upload, completed fully here) | `BE-04`, `TEST-04`, `INT-03` |
| 4 | Skills | Users & Profiles | `DB-03`, `BE-05`, `FE-03`, `FE-15`, `TEST-05`, `INT-04` |
| 5 | Wallet | Users & Profiles | `DB-04`, `BE-06`, `FE-05`, `TEST-06`, `INT-05` |
| 6 | Transactions | Skills, Wallet, Storage | `DB-05`, `BE-07`, `FE-06`, `TEST-07`, `INT-06` |
| 7 | Notifications | Users & Profiles | `DB-06`, `BE-08`, `FE-07`, `TEST-08`, `INT-07` |
| 8 | Chat | Users & Profiles, Notifications | `DB-07`, `BE-09`, `FE-08`, `TEST-09`, `INT-08` |
| 9 | Matching | Skills, Users & Profiles | `DB-08`, `AI-01/02/03`, `BE-10`, `FE-04`, `TEST-10`, `INT-09` |
| 10 | Ratings | Transactions | `DB-09`, `BE-11`, `FE-13`, `TEST-11`, `INT-10` |
| 11 | Gamification | Transactions, Ratings | `DB-10`, `BE-12`, `FE-10`, `TEST-12`, `INT-11` |
| 12 | Documents | Storage, Users & Profiles | `DB-11`, `BE-13`, `FE-11`, `TEST-13`, `INT-12` |
| 13 | Community | Skills, Users & Profiles | `DB-12`, `BE-14`, `FE-12`, `TEST-14`, `INT-13` |
| 14 | Calling | Users & Profiles, Chat | `DB-13`, `BE-15`, `FE-09`, `TEST-15`, `INT-14` |
| 15 | Search (extraction seam) | Skills, Users & Profiles | `DB-14`, `BE-16`, `TEST-16`, `INT-15` |
| 16 | Admin | All of the above | `DB-15`, `BE-17`, `FE-14`, `TEST-17`, `INT-16` |
| 17 (hardening) | Payments, fraud, moderation, PWA, extraction seams | Module 16 complete | `AI-04/05`, `DEPLOY-07`, hardening tasks (Section 6.3) |
| 18 (scaling) | Multi-region, Elasticsearch, API Gateway, mediasoup SFU | Phase 17 complete | `INFRA-08`, scale-out tasks (Section 6.3) |
| — (system-wide) | Final integration & completion | All domains | `INT-17` |

---

## 3. Module Breakdown Structure (MBS)

### 3.1 ID Convention & Standard Patterns

| Prefix | Category | Count | Primary Owner |
|---|---|---|---|
| `FOUND` | Foundation | 8 | Mixed (see table) |
| `DB` | Database | 15 | Robert |
| `BE` | Backend | 17 | Lilesh |
| `FE` | Frontend | 16 | John |
| `INFRA` | Infrastructure | 8 | Krushna |
| `AI` | AI / Matching / ML | 5 | Lilesh |
| `TEST` | Testing | 18 | Lilesh (backend) / John (frontend, folded into FE DoD) |
| `DOC` | Documentation | 5 | Jacob (Erwin for DOC-01) |
| `INT` | Integration | 17 | Jacob (coordination) + domain architects (execution) |
| `DEPLOY` | Deployment | 7 | Krushna |
| **Total** | | **116** | |

**Global review rule:** every module requires sign-off from its domain architect **and** final approval from Erwin (Architecture Foundation §7.3/§7.4). `wallet`, `transactions`, and `auth` modules (`DB-01/04/05`, `BE-01/06/07`, `FE-01/05/06`, `INT-01/05/06`) require **two** reviewer approvals per §7.3, given their financial/security criticality (§13 rule 7).

**Standard Inputs / Outputs by category** (stated once; per-module tables below reference this instead of repeating it 116 times):

| Category | Standard Inputs | Standard Outputs |
|---|---|---|
| **DB** | Architecture §3 ownership entry for the domain; Spec §4.1 field definitions; current `schema.prisma`; prior migration history | New Prisma models under a `// === <module> module ===` comment block; generated migration (never hand-edited post-apply); ERD note updated in `docs/architecture` |
| **BE** | Approved corresponding `DB-xx`; Zod schema stub in `packages/validation`; module boundary spec (Arch §3/§4); `generate-module.ts` scaffold | `*.module/controller/service/repository.ts`, `dto/`, `index.ts` per Arch §5/§10.1 layering; unit + e2e tests; OpenAPI entries; barrel export |
| **FE** | Approved `BE-xx` REST/WebSocket contract; `@talentswap/types` + `@talentswap/validation`; design tokens (Arch §11); route placeholder from Arch §15 tree | Route page(s); `components/features/<module>/`; `hooks/use<Module>.ts`; `lib/api/<module>.ts`; loading/empty/error states (§11.8); component tests |
| **INFRA** | Arch §2.4/§8 infra requirements; Spec §2.7 | Config files under `/infrastructure`; reproducible local/CI environment |
| **AI** | `DB-02/03` (profiles/skills); pgvector extension; OpenAI API key (env, via `INFRA-06`) | Embedding adapter; ranking service; BullMQ job wiring |
| **TEST** | Completed corresponding `BE-xx`/`FE-xx` | Passing unit + e2e suite; coverage note; green CI |
| **DOC** | Completed modules / architectural decisions | Markdown docs under `/docs` |
| **INT** | `BE-xx` **and** `FE-xx` both in `Approved` status | Verified end-to-end flow (manual + automated); queue entry (Section 9); Erwin sign-off |
| **DEPLOY** | Relevant `INFRA-xx`; green CI | Live environment; runbook entry |

Complexity scale: `Low / Medium / High / V.High`. Risk scale: `Low / Medium / High / Critical`.

---

### 3.2 Foundation Modules (`FOUND-xx`) — Roadmap #0

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| FOUND-01 | Monorepo & Tooling Scaffold | pnpm workspaces, Turborepo pipeline, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` per Arch §2/§6.1. `apps/api/src/main.ts` bootstraps a standard `NestExpressApplication` (Express adapter) per **ADR-0002**; Fastify swap deferred to a measured throughput trigger (Section 6.3 hardening backlog). | — | Medium | Medium | Krushna (+ Erwin approval) |
| FOUND-02 | Shared Packages Skeleton | `packages/config`, `packages/types`, `packages/validation`, `packages/utils`, `packages/ui-tokens` — barrel exports only, per Arch §2.3 | FOUND-01 | Medium | Low | Lilesh + John |
| FOUND-03 | Database & Cache Infra Modules | `PrismaService`, `transaction.helper.ts` (withTransaction, advisory-lock helper), `CacheService`, `QueueService` per Arch §15 | FOUND-01 | Medium | Medium | Robert + Lilesh |
| FOUND-04 | Common Backend Infrastructure | Guards, decorators, interceptors, filters, pipes, `DomainException` base per Arch §6.6/§10.4/§15 `common/` tree | FOUND-01 | Medium | Medium | Lilesh |
| FOUND-05 | Environment & Config Validation | Zod-validated `env.schema.ts` (api), `env.ts` (web), fail-fast boot validation per Arch §8.2 | FOUND-01 | Low | Medium | Krushna + Lilesh |
| FOUND-06 | Baseline Prisma Schema & Migration | Initial `schema.prisma` with `users`/`profiles` placeholder tables only, per Arch §16 Roadmap #0 scope note | FOUND-03 | Low | Medium | Robert |
| FOUND-07 | Frontend App Shell & Providers | Root `layout.tsx`, `globals.css`, TanStack Query/Zustand providers, PWA manifest stub per Arch §15 | FOUND-01, FOUND-02 | Low | Low | John |
| FOUND-08 | Module Scaffolding & Boundary Tooling | `scripts/generate-module.ts`, `scripts/check-boundaries.ts`, `scripts/seed-db.ts`, `scripts/setup.sh` per Arch §2.6 | FOUND-01 | Medium | Low | Krushna + Erwin |

---

### 3.3 Database Modules (`DB-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| DB-01 | Users & Auth Schema | `users` table (Spec §4.1.1) **plus** the `refresh_tokens` table (per **ADR-0003**, owned by `auth`): `id`, `user_id` FK, `token_hash`, `family_id`, `is_revoked`, `replaced_by_token_id`, `expires_at`, `created_at` — required in the initial migration, with composite index `(user_id, family_id)`, unique index `(token_hash)`, and index `(expires_at)`. Auth module retains its documented exception to read/write the `users` table directly (Arch §3.1). | FOUND-06 | Medium | High | Robert |
| DB-02 | Profiles Schema | `profiles` table (Spec §4.1.2), including `skill_points` as a plain `INTEGER DEFAULT 0 CHECK (>= 0)` column with **no application-level write path** (per **ADR-0004**). The `trg_sync_skill_points` trigger that populates it ships in `DB-04`, not here. | DB-01 | Medium | Medium | Robert |
| DB-03 | Skills & Categories Schema | `skills`, `skill_categories` tables (Spec §4.1.3), GIN `search_vector` index | DB-01 | Medium | Low | Robert |
| DB-04 | Wallet / Ledger Schema | `skill_points_ledger` (Spec §4.1.5), double-entry semantics, CHECK constraints, advisory-lock design notes, **plus** the `trg_sync_skill_points` `AFTER INSERT` trigger on `skill_points_ledger` — the sole writer of `profiles.skill_points` (per **ADR-0004**). Requires 2 reviewers. | DB-02 | V.High | Critical | Robert |
| DB-05 | Transactions Schema | `transactions` table (Spec §4.1.4), idempotency key uniqueness, confirmation-deadline index. Requires 2 reviewers. | DB-01, DB-03, DB-04 | V.High | Critical | Robert |
| DB-06 | Notifications Schema | `notifications` table (JSONB payload) per Spec §4.1.6 | DB-01 | Low | Medium | Robert |
| DB-07 | Chat Schema | `conversations`, `messages` tables per Spec §4.1.6 | DB-01 | Medium | Medium | Robert |
| DB-08 | Matching / Vector Schema | pgvector columns on `skills`/`profiles`, `match_suggestions` cache table (Arch §3.1 — matching owns cache only) | DB-02, DB-03, AI-01 | High | Medium | Robert |
| DB-09 | Ratings Schema | `ratings` table per Spec §4.1.6 | DB-05 | Low | Low | Robert |
| DB-10 | Gamification Schema | `badges`, `user_badges`, `activity_streaks` per Spec §4.1.6 | DB-05, DB-09 | Medium | Medium | Robert |
| DB-11 | Documents Schema | `documents` table (status enum, scan_result, reviewed_by) per Spec §4.1.6 | DB-01 | Medium | High | Robert |
| DB-12 | Community Schema | `community_posts` table per Spec §4.1.6 | DB-01, DB-03 | Low | Low | Robert |
| DB-13 | Calling Schema | Call session records (Arch §3.1 `calling` module ownership) | DB-01 | Medium | Medium | Robert |
| DB-14 | Search Projection | Formalizes tsvector/GIN projection already used by Skills/Matching into its own read-optimized, rebuildable seam (Arch §16 #15) | DB-02, DB-03 | Low | Low | Robert |
| DB-15 | Admin Schema | `admin_logs` immutable audit table per Spec §4.1.6 | DB-01 | Low | Medium | Robert |

**Indexing note:** All indexes listed in Spec §4.2 are created in each table's **initial** migration (Arch §14 performance standard) — not added reactively. This is a completion-checklist item for every `DB-xx` module (see §11).

---

### 3.4 Backend Modules (`BE-xx`) — Roadmap #1–16

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| BE-01 | Auth Module | Registration, login, JWT (RS256) issuance/verification, refresh-token rotation and family tracking against the `refresh_tokens` table (per **ADR-0003**), OAuth (Google/LinkedIn) strategies, password reset. Requires 2 reviewers. | FOUND-04, DB-01 | High | Critical | Lilesh |
| BE-02 | Users Module | `users` CRUD, account state (banned, verified), role assignment | BE-01, DB-01 | Medium | High | Lilesh |
| BE-03 | Profiles Module | `profiles` CRUD, reputation aggregate, experience level exposure. Per **ADR-0004**, `profiles.repository.ts` exposes no update method whose input type includes `skill_points` (`Omit<ProfileUpdateInput,'skill_points'>`) — compile-time enforced, not a review convention. | BE-02, DB-02 | Medium | Medium | Lilesh |
| BE-04 | Storage Module | Presign/confirm/delete endpoints, R2 adapter, MIME + magic-byte validation | FOUND-04 | Medium | High | Lilesh |
| BE-05 | Skills Module | Skill CRUD, category management, full-text search index population | BE-03, DB-03 | Medium | Low | Lilesh |
| BE-06 | Wallet Module | Balance read, `debit/credit/hold/release` service API (the **only** legal points-mutation surface, Arch §4.2). Starter-grant-on-registration is issued as a `wallet.credit()` call producing an `admin_adjustment`-type ledger entry with `transaction_id = NULL` — never a direct row-creation seed (per **ADR-0004**). Wallet is the only module that can transitively cause `profiles.skill_points` to change, via the `DB-04` trigger — its own repository never issues an `UPDATE` against `profiles`. Requires 2 reviewers. | BE-03, DB-04 | V.High | Critical | Lilesh |
| BE-07 | Transactions Module | Escrow lifecycle, `TransactionStrategy` (one-way/two-way), dual-confirmation state machine, dispute escalation stub. Requires 2 reviewers. | BE-05, BE-06, BE-04, DB-05 | V.High | Critical | Lilesh |
| BE-08 | Notifications Module | In-app delivery, Web Push (VAPID), Resend email adapter, default Socket.io namespace fan-out | BE-03, DB-06 | Medium | Medium | Lilesh |
| BE-09 | Chat Module | `conversations`/`messages` service, `/chat` gateway | BE-03, BE-08, DB-07 | High | Medium | Lilesh |
| BE-10 | Matching Module | OpenAI embedding adapter, pgvector similarity ranking, `/discover` suggestions endpoint | BE-05, BE-03, AI-01/02/03, DB-08 | High | Medium | Lilesh |
| BE-11 | Ratings Module | Post-exchange rating submission, reputation recalculation trigger | BE-07, DB-09 | Low | Low | Lilesh |
| BE-12 | Gamification Module | XP calculation, badges, streaks, leaderboard sorted sets; `@OnEvent` listeners on `transaction.completed`/`rating.created` | BE-07, BE-11, DB-10 | Medium | Medium | Lilesh |
| BE-13 | Documents Module | Upload tracking, presign coordination via `storage`, ClamAV scan dispatch, verification review workflow, Verified-badge call to `profiles` | BE-04, BE-03, DB-11 | High | High | Lilesh |
| BE-14 | Community Module | Board post CRUD (requests/offers/events) | BE-05, BE-03, DB-12 | Low | Low | Lilesh |
| BE-15 | Calling Module | Agora token generation, call session records, `/call` gateway (signalling only) | BE-03, BE-09, DB-13 | High | Medium | Lilesh |
| BE-16 | Search Module | Read-optimized projection sync jobs (Postgres tsvector at launch) | BE-05, BE-03, DB-14 | Medium | Low | Lilesh |
| BE-17 | Admin Module | Moderation queues, ban/unban, document review, dispute resolution, analytics aggregation — calls owning modules' services, never bypasses guards (Arch §3.1) | All BE-01…16, DB-15 | Medium | High | Lilesh |

---

### 3.5 Frontend Modules (`FE-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| FE-01 | Auth UI | `(auth)` route group, `useAuth`, `authStore`, login/register/forgot-password/reset-password forms | BE-01, FOUND-07 | Medium | High | John |
| FE-02 | Profile UI | `profile/` feature, `(dashboard)/profile`, own-profile edit forms | BE-02, BE-03 | Medium | Medium | John |
| FE-03 | Skills UI | `skills/` feature, listing CRUD, skill editor forms | BE-05 | Medium | Low | John |
| FE-04 | Discover (Matching) UI | `discover/` feature, ranked match suggestion cards, filters | BE-10 | Medium | Medium | John |
| FE-05 | Wallet UI | `wallet/` feature, balance display, ledger history table | BE-06 | Medium | High | John |
| FE-06 | Transactions (Exchanges) UI | `transactions/` feature, `exchanges/` routes, escrow status, confirm dialog | BE-07 | High | High | John |
| FE-07 | Notifications UI | `notifications/` feature, notification bell, list, settings | BE-08 | Low | Medium | John |
| FE-08 | Chat (Messages) UI | `chat/` feature, `messages/` routes, `useSocket` wiring | BE-09 | High | Medium | John |
| FE-09 | Calling UI | `calling/` feature, `useWebRTC`, `callStore`, video call modal | BE-15 | High | Medium | John |
| FE-10 | Gamification UI | `gamification/` feature, badge display, level progress, leaderboard | BE-12 | Medium | Low | John |
| FE-11 | Documents (Verification) UI | `documents/` feature, credential upload flow | BE-13 | Medium | High | John |
| FE-12 | Community UI | `community/` feature, board post CRUD | BE-14 | Low | Low | John |
| FE-13 | Ratings UI | Post-exchange rating prompt component | BE-11 | Low | Low | John |
| FE-14 | Admin UI | `(admin)` route group, moderation dashboards, analytics views | BE-17 | Medium | High | John |
| FE-15 | Public Pages & SEO | `(public)` route group — landing (SSG), public skill directory (SSR), public profile (SSR) | BE-05, BE-03 | Medium | Low | John |
| FE-16 | Dashboard Shell & Navigation | `(dashboard)` layout, Sidebar/Navbar/Footer, auth-gating `middleware.ts`, PWA install shell | FOUND-07, BE-01 | Low | Low | John |

---

### 3.6 Infrastructure Modules (`INFRA-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| INFRA-01 | Docker Compose Local Dev Env | Local Postgres, Redis, Mailhog, api, web services per Arch §15 | FOUND-01 | Medium | Medium | Krushna |
| INFRA-02 | Application Dockerfiles | Multi-stage prod builds for `apps/web`, `apps/api` | FOUND-01 | Medium | Medium | Krushna |
| INFRA-03 | Nginx Reverse Proxy Config | TLS termination, gzip/brotli, WebSocket upgrade headers (self-hosted path) | INFRA-02 | Low | Low | Krushna |
| INFRA-04 | CI Pipeline — Lint/Typecheck/Test | GitHub Actions reusable workflow, Turborepo affected-graph scoping | FOUND-01 | Medium | Medium | Krushna |
| INFRA-05 | CI/CD — Build, Migrate & Deploy | Full pipeline: build → Prisma migrate (rollback on failure) → deploy | INFRA-04, DEPLOY-01/02 | High | High | Krushna |
| INFRA-06 | Secrets Management Setup | Per-environment secret stores (local `.env`, GH Actions Secrets, Doppler/Railway, AWS Secrets Manager) per Arch §8.3 | FOUND-05 | Medium | High | Krushna |
| INFRA-07 | Monitoring & Logging Infrastructure | Sentry, Prometheus + Grafana, Winston → Loki/CloudWatch wiring | INFRA-02 | Medium | Medium | Krushna |
| INFRA-08 | Terraform Placeholder & Scale Prep | Roadmap Phase 4 placeholder per Arch §2.4; activated only at scaling stage | — | Low | Low | Krushna |

---

### 3.7 AI Modules (`AI-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| AI-01 | pgvector Extension & Embedding Columns | Enable pgvector extension, add embedding columns to `skills`/`profiles` | DB-02, DB-03 | Medium | Medium | Lilesh + Robert |
| AI-02 | OpenAI Embedding Adapter & Sync Job | `text-embedding-3-small` adapter, BullMQ job to (re)generate embeddings on skill/profile change | AI-01, INFRA-06 | High | Medium | Lilesh |
| AI-03 | Match Ranking Algorithm | Weighted composite scoring (embedding similarity + geo proximity + reputation + availability) per Spec §8.2 | AI-02 | High | Medium | Lilesh |
| AI-04 | Content Moderation Adapter | OpenAI moderation API integration for chat/community (Phase 3 hardening, Arch §16 hardening list) | BE-09, BE-14 | Medium | Medium | Lilesh |
| AI-05 | Fraud / Velocity Anomaly Job | Hourly BullMQ job flagging abnormal point-accumulation velocity (Spec §8.1) into admin review queue (Phase 3 hardening) | BE-06, BE-17 | Medium | High | Lilesh |

---

### 3.8 Testing Modules (`TEST-xx`)

> Frontend component-level tests (`*.test.tsx`) are part of each `FE-xx` module's own Definition of Done and are **not** separately tracked here, to avoid duplicate IDs for the same deliverable. `TEST-xx` below tracks backend unit (`*.spec.ts`) and e2e (`*.e2e-spec.ts`) suites, matched 1:1 to `BE-xx` domains.

| ID | Name | Covers | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| TEST-00 | Test Infrastructure Setup | Jest config, isolated test DB + rollback-per-test harness, Supertest wiring, Turborepo affected-graph test scoping | FOUND-01 | Medium | Medium | Lilesh |
| TEST-01 | Auth Tests | BE-01 | BE-01, TEST-00 | Medium | Critical | Lilesh |
| TEST-02 | Users Tests | BE-02 | BE-02, TEST-00 | Low | High | Lilesh |
| TEST-03 | Profiles Tests | BE-03 | BE-03, TEST-00 | Low | Medium | Lilesh |
| TEST-04 | Storage Tests | BE-04 | BE-04, TEST-00 | Medium | High | Lilesh |
| TEST-05 | Skills Tests | BE-05 | BE-05, TEST-00 | Low | Low | Lilesh |
| TEST-06 | Wallet Tests | BE-06 | BE-06, TEST-00 | High | Critical | Lilesh |
| TEST-07 | Transactions Tests | BE-07 | BE-07, TEST-00 | High | Critical | Lilesh |
| TEST-08 | Notifications Tests | BE-08 | BE-08, TEST-00 | Medium | Medium | Lilesh |
| TEST-09 | Chat Tests | BE-09 | BE-09, TEST-00 | Medium | Medium | Lilesh |
| TEST-10 | Matching Tests | BE-10 | BE-10, TEST-00 | Medium | Medium | Lilesh |
| TEST-11 | Ratings Tests | BE-11 | BE-11, TEST-00 | Low | Low | Lilesh |
| TEST-12 | Gamification Tests | BE-12 | BE-12, TEST-00 | Medium | Medium | Lilesh |
| TEST-13 | Documents Tests | BE-13 | BE-13, TEST-00 | Medium | High | Lilesh |
| TEST-14 | Community Tests | BE-14 | BE-14, TEST-00 | Low | Low | Lilesh |
| TEST-15 | Calling Tests | BE-15 | BE-15, TEST-00 | Medium | Medium | Lilesh |
| TEST-16 | Search Tests | BE-16 | BE-16, TEST-00 | Low | Low | Lilesh |
| TEST-17 | Admin Tests | BE-17 | BE-17, TEST-00 | Medium | High | Lilesh |

---

### 3.9 Documentation Modules (`DOC-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| DOC-01 | Architecture ADR Log & Template | `docs/architecture/adr/`, ADR template, first entry (`0001-monorepo-structure.md`) | FOUND-01 | Low | Low | Erwin |
| DOC-02 | OpenAPI/Swagger Pipeline | Generated (never hand-written) `docs/api/openapi.json` + Postman export | BE-01 (first module with endpoints) | Low | Low | Jacob (Lilesh executes) |
| DOC-03 | Onboarding Guide | `docs/onboarding/getting-started.md` | FOUND-01 | Low | Low | Jacob |
| DOC-04 | Operational Runbooks | Deploy, rollback, incident response runbooks, populated as modules ship | INFRA-05 | Low | Medium | Jacob + Krushna |
| DOC-05 | Module README & Contribution Standards | Per-module README conventions, PR template upkeep | FOUND-01 | Low | Low | Jacob |

---

### 3.10 Integration Modules (`INT-xx`)

| ID | Name | Verifies | Depends On | Complexity | Risk |
|---|---|---|---|---|---|
| INT-01 | Auth Integration | FE-01 ↔ BE-01 end-to-end (register/login/refresh/OAuth) | FE-01, BE-01 | Medium | Critical |
| INT-02 | Users & Profiles Integration | FE-02 ↔ BE-02/BE-03 | FE-02, BE-02, BE-03 | Medium | High |
| INT-03 | Storage Integration | Presign → direct-to-R2 upload → confirm flow end-to-end | BE-04 | Medium | High |
| INT-04 | Skills Integration | FE-03 ↔ BE-05, search sync | FE-03, BE-05 | Medium | Low |
| INT-05 | Wallet Integration | FE-05 ↔ BE-06, balance consistency with ledger | FE-05, BE-06 | High | Critical |
| INT-06 | Transactions Integration | Full escrow lifecycle E2E incl. WebSocket status events | FE-06, BE-07 | High | Critical |
| INT-07 | Notifications Integration | WebSocket + Web Push delivery E2E | FE-07, BE-08 | Medium | Medium |
| INT-08 | Chat Integration | `/chat` namespace E2E, reconnect handling | FE-08, BE-09 | High | Medium |
| INT-09 | Matching/Discover Integration | Embedding pipeline → ranked suggestions → FE render | FE-04, BE-10 | High | Medium |
| INT-10 | Ratings Integration | Post-exchange prompt → reputation recalculation | FE-13, BE-11 | Low | Low |
| INT-11 | Gamification Integration | Cross-module event listeners (`transaction.completed`, `rating.created`) fire correctly | BE-12, BE-07, BE-11 | Medium | Medium |
| INT-12 | Documents Integration | Upload → ClamAV scan → review → Verified badge propagation to `profiles` | FE-11, BE-13 | High | High |
| INT-13 | Community Integration | FE-12 ↔ BE-14 | FE-12, BE-14 | Low | Low |
| INT-14 | Calling Integration | `/call` signalling + Agora token E2E | FE-09, BE-15 | High | Medium |
| INT-15 | Search Integration | Projection sync correctness vs. source tables | BE-16 | Medium | Low |
| INT-16 | Admin Integration | Cross-module moderation actions respect all module guards | FE-14, BE-17 | Medium | High |
| INT-17 | Full System Integration & Regression | All prior `INT-xx` green; full regression pass across all modules | INT-01…16 | High | Critical |

---

### 3.11 Deployment Modules (`DEPLOY-xx`)

| ID | Name | Description | Depends On | Complexity | Risk | Owner |
|---|---|---|---|---|---|---|
| DEPLOY-01 | Vercel Frontend Deployment | `apps/web` continuous deploy from `main`, preview URLs per PR | FOUND-07 | Low | Low | Krushna |
| DEPLOY-02 | Railway Backend + DB + Redis (MVP) | `apps/api` container deploy, Supabase/Railway Postgres, Redis | INFRA-01/02 | Medium | Medium | Krushna |
| DEPLOY-03 | Production Secrets & Env Config | Production variable injection per Arch §8.3 | INFRA-06 | Medium | High | Krushna |
| DEPLOY-04 | DB Migration Deploy Pipeline | Automatic Prisma migration on merge, automatic rollback on failure | INFRA-05, DB-01 | High | High | Krushna |
| DEPLOY-05 | Monitoring & Alerting Activation | Production Sentry/Prometheus/Grafana/BetterUptime live | INFRA-07 | Medium | Medium | Krushna |
| DEPLOY-06 | Staging Environment Setup | Mirrors production variable names exactly (Arch §8.3) | DEPLOY-02/03 | Medium | Medium | Krushna |
| DEPLOY-07 | AWS ECS Fargate Migration | Scale-out backend migration per Spec Phase 3/4 | DEPLOY-02, INT-17 | High | Medium | Krushna |

---

## 4. Dependency Graph

**No circular dependencies exist** in the module set above — every edge points from a later-numbered domain to an earlier one, consistent with Architecture §16's own acyclic ordering. Verified by construction: each domain's `Depends On` column in Section 3 only references domains that precede it in the Roadmap #0–16 sequence, or Foundation.

### 4.1 Domain-Level Edges (from Architecture §16, restated)

```
Foundation
  └─▶ Auth
        └─▶ Users & Profiles ──┬─▶ Skills ──┬─▶ Matching (+ Storage, Wallet feed in)
                                 │            ├─▶ Community
             ┌───────────────────┤            └─▶ Search
             │                   ├─▶ Wallet ──▶ Transactions ──┬─▶ Ratings ──▶ Gamification
             │                   │      ▲            ▲          │
             │                   │      └── Storage ─┘          │
             │                   ├─▶ Notifications ──▶ Chat ──▶ Calling
             │                   └─▶ Documents (needs Storage too)
             └─▶ Admin (depends on ALL of the above)
Foundation ──▶ Storage (cut early for Users&Profiles avatar upload; completed at #3)
```

### 4.2 Critical Path

The longest dependency chain — and therefore the sequence that determines the shortest possible time-to-Admin-module — is:

```
FOUND-01…08 → DB-01/BE-01/FE-01 (Auth) → DB-02/BE-02/BE-03/FE-02 (Users & Profiles)
  → DB-04/BE-06/FE-05 (Wallet) → DB-05/BE-07/FE-06 (Transactions)
  → DB-09/BE-11/FE-13 (Ratings) → DB-10/BE-12/FE-10 (Gamification)
  → DB-15/BE-17/FE-14 (Admin) → INT-17 (Full System Integration)
```

Every module on this path is **Critical or High risk** (Section 8). C-1/C-2/C-3 (Section 1.3) all sat directly on this path and are now resolved via ADR-0002–ADR-0004 — the path is clear to begin at `FOUND-01`. It remains Erwin's and Lilesh's first review priority regardless, given its concentration of Critical-risk modules.

### 4.3 Parallelizable Branches

Once Users & Profiles (`BE-02/03`) is Approved, the following branches have **no dependency on each other** and can be built concurrently by different sessions:

- **Branch A (Skills lineage):** Skills → {Matching, Community, Search}
- **Branch B (Money lineage):** Storage → Wallet → Transactions → {Ratings → Gamification}
- **Branch C (Realtime lineage):** Notifications → Chat → Calling
- **Branch D (Trust lineage):** Storage → Documents

Admin (`BE-17`) is the sole convergence point and must wait for all four branches.

---

## 5. Sprint Plan

Each sprint corresponds 1:1 to a Roadmap # from Section 2. "Sprint" here means a logical unit of work, not a calendar timebox (Section 6 restates this without dates).

| Sprint | Objectives | Deliverables (IDs) | Required Deps | Risks |
|---|---|---|---|---|
| **S0 — Foundation** | Stand up the buildable skeleton every later module needs | FOUND-01…08, INFRA-01, INFRA-04, DOC-01, DOC-03, TEST-00 | — | ADR-0002 resolved the HTTP adapter choice (Express at launch, Fastify deferred) — no longer a blocker. Getting the skeleton right here still compounds into every later module. |
| **S1 — Auth** | Registration, login, JWT, refresh, OAuth | DB-01, BE-01, FE-01, TEST-01, INT-01, FE-16 | S0 | ADR-0003 resolved the `refresh_tokens` schema gap — no longer a blocker. 2-reviewer gate remains. |
| **S2 — Users & Profiles** | Profile CRUD, public profile pages | DB-02, BE-02, BE-03, FE-02, FE-15 (public profile slice), TEST-02/03, INT-02 | S1 | ADR-0004 resolved the `skill_points` write-path (trigger ships in `DB-04`, not here) — no longer a blocker. |
| **S3 — Storage** | Presign/confirm/delete, R2 adapter (full build; avatar-upload slice already needed in S2) | BE-04, TEST-04, INT-03 | S0 (parallel-eligible with S1/S2 for the minimal slice per Arch §16 note) | R2 credential provisioning depends on INFRA-06 |
| **S4 — Skills** | Skill CRUD, categories, full-text search | DB-03, BE-05, FE-03, FE-15 (directory slice), TEST-05, INT-04 | S2 | Low |
| **S5 — Wallet** | Ledger, balance, starter grant, debit/credit/hold/release API | DB-04, BE-06, FE-05, TEST-06, INT-05 | S2 | **Critical — 2 reviewers required.** Write-path resolved via ADR-0004 (trigger lives in `DB-04`; wallet is sole causal writer). |
| **S6 — Transactions** | Escrow lifecycle, dual-confirmation, dispute stub | DB-05, BE-07, FE-06, TEST-07, INT-06 | S4, S5, S3 | **Critical — 2 reviewers, highest-scrutiny module in the system (Arch §13 rule 7)** |
| **S7 — Notifications** | In-app + push delivery infra every later module depends on | DB-06, BE-08, FE-07, TEST-08, INT-07 | S2 | Medium |
| **S8 — Chat** | `/chat` namespace, conversations, messages | DB-07, BE-09, FE-08, TEST-09, INT-08 | S2, S7 | Medium |
| **S9 — Matching** | Embeddings, pgvector ranking, `/discover` | DB-08, AI-01/02/03, BE-10, FE-04, TEST-10, INT-09 | S4, S2 | External OpenAI dependency (cost/availability) |
| **S10 — Ratings** | Post-exchange rating, reputation recalculation | DB-09, BE-11, FE-13, TEST-11, INT-10 | S6 | Low |
| **S11 — Gamification** | XP, badges, streaks, leaderboards | DB-10, BE-12, FE-10, TEST-12, INT-11 | S6, S10 | Redis sorted-set correctness under concurrent writes |
| **S12 — Documents** | Credential upload, ClamAV, verification workflow | DB-11, BE-13, FE-11, TEST-13, INT-12 | S3, S2 | High — security-sensitive credential data |
| **S13 — Community** | Board CRUD | DB-12, BE-14, FE-12, TEST-14, INT-13 | S4, S2 | Low |
| **S14 — Calling** | Agora tokens, `/call` signalling | DB-13, BE-15, FE-09, TEST-15, INT-14 | S2, S8 | WebRTC cross-device/network variability |
| **S15 — Search** | Formalized read-projection seam | DB-14, BE-16, TEST-16, INT-15 | S4, S2 | Low |
| **S16 — Admin** | Moderation, ban/unban, dispute UI, analytics | DB-15, BE-17, FE-14, TEST-17, INT-16 | **All of S1–S15** | High — touches every module's guard surface |
| **S17 — System Integration** | Full regression across all domains | INT-17 | S16 | Critical — last gate before deployment readiness |
| **S18 — Hardening** | Stripe points purchase, fraud ML, content moderation, PWA, extraction seam prep | AI-04, AI-05, hardening tasks | S17 | Medium |
| **S19 — Scaling** | Multi-region Postgres, Elasticsearch swap, API Gateway, mediasoup SFU | INFRA-08, DEPLOY-07 | S18, real usage data | High — infra complexity, cost |

---

## 6. Project Timeline (Logical Phases — No Calendar Dates)

Per PM scope, this is a **sequencing** document, not a scheduling one. Phases below map Sprints (Section 5) onto the AI SDLC v1.0 frozen process (§4). The mapping was flagged as **C-4** in Section 1.3 and is now **adopted per ADR-0005**, with the refinements reflected in §6.1's Phase 6 row and §6.2 below.

### 6.1 Phase ↔ Sprint Mapping (adopted per ADR-0005)

| AI SDLC Phase | Maps To | Entry Criteria | Exit Criteria |
|---|---|---|---|
| Phase 0 — Governance | (pre-work) | Team roster confirmed, this plan drafted | Erwin signs off this document; C-1…C-4 resolved (**done** — ADR-0002–0005) |
| Phase 1 — Domain Constitutions | S0 (Foundation, partial) | Phase 0 exit | Frontend/Backend/DB/DevOps constitutions exist (owned by John/Lilesh/Robert/Krushna respectively, referencing Arch §5/§6/§10/§11) |
| Phase 2 — Shared Foundations | S0 (remainder) | Constitutions exist | All `FOUND-xx` = Completed, `TEST-00` green |
| Phase 3 — Feature Modules | S1–S16 | Foundation Completed | All `DB/BE/FE/TEST-xx` for a given domain = Approved |
| Phase 4 — Domain Integration | `INT-01…16`, interleaved after each Sprint | Domain's BE+FE Approved | Domain `INT-xx` = Integrated |
| Phase 5 — System Integration | S17 (`INT-17`) | All domain INTs Integrated | Full regression green |
| Phase 6 — Testing | System-level regression (`INT-17`) + hardening validation (S17/S18); **per-module `TEST-xx` is a Phase 3 completion-gate item, not part of Phase 6** (ADR-0005) | All domain `INT-xx` Integrated | Full regression green, hardening DoD met |
| Phase 7 — Deployment | `DEPLOY-01…07` | S17 exit | Production live, monitoring active (`DEPLOY-05`) |

### 6.2 Phase Sequencing Rule

Per AI SDLC §4 (locked), phases progress strictly in order — **Phase 3 (Feature Modules) does not begin until Phase 2 (Shared Foundations) fully exits**, and no domain's Phase 4 (Integration) begins until that domain's Phase 3 work is Approved by both the domain architect and Erwin.

**Per ADR-0005:** "Phase 3 fully exits before Phase 4 begins" is evaluated **per domain, not as a project-wide barrier**. This is a binding ruling under AI SDLC §1 condition 2 (critical architectural issue), not merely an interpretation — a literal global reading is unbuildable against the acyclic dependency graph in Section 4 (e.g., `Transactions` cannot begin until `Wallet` is Approved, so a "finish all Feature Modules first" gate would leave Phase 4 unreachable until Admin, the last domain, closes). This plan's Sprint numbering (S1–S16) already respects the dependency graph on this basis, so Phase 3/4 interleave naturally per domain — e.g., `INT-01` (Auth) may proceed the moment `BE-01`/`FE-01` are Approved, without waiting on unrelated later domains.

### 6.3 Hardening & Scaling Phases (post Roadmap #16)

Per Architecture §16 "Hardening phases" and Spec Phase 3/4:

- Stripe integration inside `wallet` for SkillPoints purchase
- ML-based fraud/anomaly detection (`AI-05`) added to wallet's velocity-check queue
- Content moderation (`AI-04`) added to `chat`/`community`
- PWA: service worker, offline caching, install prompt
- Microservice extraction: `transactions` and `notifications` become independent `apps/*` entries (enabled specifically because module boundaries were respected from S6 onward — this is the payoff of the boundary discipline tracked in Section 11)
- Elasticsearch swap for `search`, multi-region read replicas, API Gateway, mediasoup SFU (`INFRA-08`, `DEPLOY-07`)

---

## 7. Module Tracking Tables

### 7.1 Status Legend

`Not Started` → `Ready` (unblocked, awaiting pickup) → `In Progress` → `Blocked` (dependency unmet or ADR pending) → `Review` → `Approved` → `Integrated` → `Completed`

A module marked `Ready` with a parenthetical dependency note has cleared all ADR blockers but still awaits an unfinished upstream module; it transitions to active pickup automatically once that upstream module reaches `Completed` — "Ready" clears the architecture question, it does not skip the build order.

### 7.2 Master Tracking Table (initial state)

At project inception, Foundation-tier modules were queued behind unresolved ADRs. Per ADR-0002 through ADR-0004 (Section 1.3), `FOUND-01`, `DB-01`, `BE-01`, `DB-02`, `DB-04`, and `BE-06` are now **Ready** — cleared of their architectural blockers, though several still await an upstream module's completion per normal sequencing (noted inline below). Everything else remains `Blocked` pending its ordinary dependency chain.

| ID | Name | Phase | Owner | Status |
|---|---|---|---|---|
| FOUND-01 | Monorepo & Tooling Scaffold | S0 | Krushna | **Ready** (ADR-0002) |
| FOUND-02 | Shared Packages Skeleton | S0 | Lilesh/John | Blocked (FOUND-01) |
| FOUND-03 | DB & Cache Infra Modules | S0 | Robert/Lilesh | Blocked (FOUND-01) |
| FOUND-04 | Common Backend Infrastructure | S0 | Lilesh | Blocked (FOUND-01) |
| FOUND-05 | Env & Config Validation | S0 | Krushna/Lilesh | Blocked (FOUND-01) |
| FOUND-06 | Baseline Prisma Schema | S0 | Robert | Blocked (FOUND-03) |
| FOUND-07 | Frontend App Shell | S0 | John | Blocked (FOUND-01/02) |
| FOUND-08 | Scaffolding & Boundary Tooling | S0 | Krushna | Blocked (FOUND-01) |
| DB-01 | Users & Auth Schema | S1 | Robert | **Ready** (ADR-0003; awaiting FOUND-06 completion per sequencing) |
| DB-02 | Profiles Schema | S2 | Robert | **Ready** (ADR-0004; awaiting DB-01 completion per sequencing) |
| DB-03 | Skills & Categories Schema | S4 | Robert | Blocked (DB-01) |
| DB-04 | Wallet / Ledger Schema | S5 | Robert | **Ready** (ADR-0004; awaiting DB-02 completion per sequencing) |
| DB-05 | Transactions Schema | S6 | Robert | Blocked (DB-04) |
| DB-06 | Notifications Schema | S7 | Robert | Blocked (DB-01) |
| DB-07 | Chat Schema | S8 | Robert | Blocked (DB-01) |
| DB-08 | Matching / Vector Schema | S9 | Robert | Blocked (DB-02/03, AI-01) |
| DB-09 | Ratings Schema | S10 | Robert | Blocked (DB-05) |
| DB-10 | Gamification Schema | S11 | Robert | Blocked (DB-05/09) |
| DB-11 | Documents Schema | S12 | Robert | Blocked (DB-01) |
| DB-12 | Community Schema | S13 | Robert | Blocked (DB-01/03) |
| DB-13 | Calling Schema | S14 | Robert | Blocked (DB-01) |
| DB-14 | Search Projection | S15 | Robert | Blocked (DB-02/03) |
| DB-15 | Admin Schema | S16 | Robert | Blocked (DB-01) |
| BE-01 | Auth Module | S1 | Lilesh | **Ready** (ADR-0003; awaiting FOUND-04 & DB-01 completion per sequencing) |
| BE-02 | Users Module | S2 | Lilesh | Blocked (BE-01) |
| BE-03 | Profiles Module | S2 | Lilesh | Blocked (BE-02) |
| BE-04 | Storage Module | S3 | Lilesh | Blocked (FOUND-04) |
| BE-05 | Skills Module | S4 | Lilesh | Blocked (BE-03) |
| BE-06 | Wallet Module | S5 | Lilesh | **Ready** (ADR-0004; awaiting BE-03 & DB-04 completion per sequencing) |
| BE-07 | Transactions Module | S6 | Lilesh | Blocked (BE-05/06/04) |
| BE-08 | Notifications Module | S7 | Lilesh | Blocked (BE-03) |
| BE-09 | Chat Module | S8 | Lilesh | Blocked (BE-03/08) |
| BE-10 | Matching Module | S9 | Lilesh | Blocked (BE-05/03, AI-01/02/03) |
| BE-11 | Ratings Module | S10 | Lilesh | Blocked (BE-07) |
| BE-12 | Gamification Module | S11 | Lilesh | Blocked (BE-07/11) |
| BE-13 | Documents Module | S12 | Lilesh | Blocked (BE-04/03) |
| BE-14 | Community Module | S13 | Lilesh | Blocked (BE-05/03) |
| BE-15 | Calling Module | S14 | Lilesh | Blocked (BE-03/09) |
| BE-16 | Search Module | S15 | Lilesh | Blocked (BE-05/03) |
| BE-17 | Admin Module | S16 | Lilesh | Blocked (all BE) |
| FE-01 | Auth UI | S1 | John | Blocked (BE-01) |
| FE-02 | Profile UI | S2 | John | Blocked (BE-02/03) |
| FE-03 | Skills UI | S4 | John | Blocked (BE-05) |
| FE-04 | Discover UI | S9 | John | Blocked (BE-10) |
| FE-05 | Wallet UI | S5 | John | Blocked (BE-06) |
| FE-06 | Transactions UI | S6 | John | Blocked (BE-07) |
| FE-07 | Notifications UI | S7 | John | Blocked (BE-08) |
| FE-08 | Chat UI | S8 | John | Blocked (BE-09) |
| FE-09 | Calling UI | S14 | John | Blocked (BE-15) |
| FE-10 | Gamification UI | S11 | John | Blocked (BE-12) |
| FE-11 | Documents UI | S12 | John | Blocked (BE-13) |
| FE-12 | Community UI | S13 | John | Blocked (BE-14) |
| FE-13 | Ratings UI | S10 | John | Blocked (BE-11) |
| FE-14 | Admin UI | S16 | John | Blocked (BE-17) |
| FE-15 | Public Pages & SEO | S2/S4 | John | Blocked (BE-03/05) |
| FE-16 | Dashboard Shell | S1 | John | Blocked (FOUND-07, BE-01) |
| INFRA-01 | Docker Compose Local Dev | S0 | Krushna | Blocked (FOUND-01) |
| INFRA-02 | App Dockerfiles | S0 | Krushna | Blocked (FOUND-01) |
| INFRA-03 | Nginx Config | S0+ | Krushna | Blocked (INFRA-02) |
| INFRA-04 | CI — Lint/Typecheck/Test | S0 | Krushna | Blocked (FOUND-01) |
| INFRA-05 | CI/CD — Build/Migrate/Deploy | S17 | Krushna | Blocked (INFRA-04, DEPLOY-01/02) |
| INFRA-06 | Secrets Management | S0 | Krushna | Blocked (FOUND-05) |
| INFRA-07 | Monitoring & Logging Infra | S0+ | Krushna | Blocked (INFRA-02) |
| INFRA-08 | Terraform Placeholder | S19 | Krushna | Not Started (dormant until scaling) |
| AI-01 | pgvector & Embedding Columns | S9 | Lilesh/Robert | Blocked (DB-02/03) |
| AI-02 | OpenAI Embedding Adapter | S9 | Lilesh | Blocked (AI-01, INFRA-06) |
| AI-03 | Match Ranking Algorithm | S9 | Lilesh | Blocked (AI-02) |
| AI-04 | Content Moderation Adapter | S18 | Lilesh | Not Started (hardening) |
| AI-05 | Fraud/Velocity Anomaly Job | S18 | Lilesh | Not Started (hardening) |
| TEST-00 | Test Infrastructure Setup | S0 | Lilesh | Blocked (FOUND-01) |
| TEST-01…17 | Domain test suites | S1–S16 (matched) | Lilesh | Blocked (matching BE-xx) |
| DOC-01 | ADR Log & Template | S0 | Erwin | Blocked (FOUND-01) |
| DOC-02 | OpenAPI Pipeline | S1+ | Jacob/Lilesh | Blocked (BE-01) |
| DOC-03 | Onboarding Guide | S0 | Jacob | Blocked (FOUND-01) |
| DOC-04 | Operational Runbooks | S17 | Jacob/Krushna | Blocked (INFRA-05) |
| DOC-05 | Module README Standards | S0 | Jacob | Blocked (FOUND-01) |
| INT-01…16 | Domain integrations | S1–S16 (matched) | Jacob (+ architects) | Blocked (matching BE-xx + FE-xx) |
| INT-17 | Full System Integration | S17 | Jacob (+ all) | Blocked (INT-01…16) |
| DEPLOY-01 | Vercel Frontend Deploy | S0+ | Krushna | Blocked (FOUND-07) |
| DEPLOY-02 | Railway Backend Deploy (MVP) | S0+ | Krushna | Blocked (INFRA-01/02) |
| DEPLOY-03 | Production Secrets & Config | S0+ | Krushna | Blocked (INFRA-06) |
| DEPLOY-04 | DB Migration Deploy Pipeline | S1+ | Krushna | Blocked (INFRA-05, DB-01) |
| DEPLOY-05 | Monitoring & Alerting (Prod) | S17 | Krushna | Blocked (INFRA-07) |
| DEPLOY-06 | Staging Environment | S0+ | Krushna | Blocked (DEPLOY-02/03) |
| DEPLOY-07 | AWS ECS Fargate Migration | S19 | Krushna | Not Started (scaling) |

*(`TEST-01…17` and `INT-01…16` are compressed above for readability; each carries the identical status/owner/dependency pattern as its matched `BE-xx`/domain row and should be expanded to individual rows in the live tracker — e.g., a spreadsheet or issue tracker — once tooling is selected in `DEPLOY`/`INFRA` setup.)*

---

## 8. Risk Register

### 8.1 Critical & High-Risk Modules

| Module(s) | Risk | Mitigation Owner |
|---|---|---|
| BE-01/DB-01 (Auth) | Security-critical identity surface; refresh-token family-tracking schema now specified (ADR-0003) — residual risk is implementation correctness (hash comparison, family-revocation-on-reuse), not schema ambiguity | Erwin, Robert, Lilesh |
| BE-06/DB-04 (Wallet) | Financial-grade ledger; write-path resolved (ADR-0004) — residual risk is trigger correctness and advisory-lock discipline under concurrent load; any bug = real economic harm to users | Erwin, Robert, Lilesh (2-reviewer gate mandatory) |
| BE-07/DB-05 (Transactions) | Highest-scrutiny module system-wide (Arch §13 rule 7); escrow correctness under concurrency | Erwin, Robert, Lilesh (2-reviewer gate mandatory) |
| BE-13/FE-11 (Documents) | Handles sensitive credential documents; ClamAV pipeline correctness | Lilesh, Krushna (INFRA-06 secret handling) |
| BE-17/FE-14 (Admin) | Elevated-privilege surface touching every module's guard boundary | Erwin, Lilesh |
| INT-17 (Full System Integration) | Convergence point for all 116 modules — single point of schedule risk | Jacob, Erwin |

### 8.2 Modules That Should Be Built First

Per the critical path (Section 4.2): `FOUND-*` → `Auth` → `Users & Profiles`. Nothing else can meaningfully start before Users & Profiles is Approved, since 13 of the remaining 14 domain areas depend on it directly.

### 8.3 Modules Safe for Parallel Development

Once Users & Profiles (`BE-02/03`) is Approved, Branches A–D (Section 4.3) — Skills lineage, Money lineage, Realtime lineage, Trust lineage — can proceed with **independent AI sessions simultaneously**, provided each session works only inside its module boundary (Arch §3/§4) and pulls the latest `packages/*` before starting, to avoid drift.

### 8.4 Potential Merge Conflicts

| Area | Why | Mitigation |
|---|---|---|
| `packages/types`, `packages/validation` | Every domain module adds its own schema/type file here; concurrent sessions on different domains can still collide on `index.ts` barrel exports | Each session adds only its own file + a single-line barrel export; `index.ts` conflicts resolved by rebasing, not by re-authoring |
| `apps/api/src/app.module.ts` | `generate-module.ts` auto-wires new modules here | Same barrel-append pattern; last-registered-module conflicts resolved by rebase |
| `prisma/schema.prisma` | Every `DB-xx` module appends to the same file under its own comment block | Strict append-only discipline (Arch §17.2 step 2); no module reorders another's block |
| `docs/api/openapi.json` | Auto-generated from Swagger decorators | Never hand-edited (Arch §17.4); regenerated, not merged |

### 8.5 Potential Architecture Risks

- **Boundary erosion under parallel AI development:** the biggest systemic risk is not any single module but many independent AI sessions each slightly reinterpreting Section 3/4 boundaries. Mitigation: `check-boundaries.ts` (`FOUND-08`) must be running in CI (`INFRA-04`) **before** any domain module PR is accepted — this is a hard gate, not a suggestion.
- **Context loss across sessions:** because each module is scoped to fit one AI conversation, cross-module consistency depends entirely on this document and the Architecture Foundation being re-read at the start of every session (Arch §17.1) — sessions must now reference **v1.1** of the Architecture Foundation, not the original text, since ADR-0002–0004 are amendments to it, not footnotes. PM recommends this plan be pinned/referenced at the start of every module-building session.
- **ADR backlog — cleared:** items C-1–C-4 were on the critical path and have now been ruled on via ADR-0002–ADR-0005 (Section 1.3), before any session could "decide" them ad hoc. This is the process working as intended; the residual risk going forward is maintaining the same discipline on future ambiguities rather than letting one get silently absorbed by whichever module hits it first.

### 8.6 Product-Level Risks Carried Forward from Proposal §10 (for context only — not engineering-actionable by this plan)

Cold-start network effects, points-economy inflation/deflation balance, verification review scalability, dual-confirmation UX friction, and WebRTC device/network variability are acknowledged but sit outside PM's engineering-coordination scope; they are noted here so Erwin and the domain architects have full context when making implementation trade-offs inside their modules (e.g., BE-07's dispute-window defaults, FE-06's confirmation UX).

---

## 9. Integration Strategy

### 9.1 Integration Queues

| Queue | Accepts | Exit Gate |
|---|---|---|
| **Frontend Integration Queue** | `FE-xx` modules whose corresponding `BE-xx` is Approved | Manual smoke test against live BE contract + component tests green |
| **Backend Integration Queue** | `BE-xx` modules whose corresponding `DB-xx` is Approved and `TEST-xx` green | e2e suite green against test DB, `check-boundaries.ts` clean |
| **Database Integration Queue** | `DB-xx` modules with migration generated and applied to a scratch DB | Migration applies cleanly forward, indexes per Spec §4.2 present |
| **Infrastructure Integration Queue** | `INFRA-xx` / `DEPLOY-xx` modules | Reproducible in a clean environment (fresh clone, `setup.sh`) |
| **Final System Integration Queue** | Domain `INT-xx` entries once both FE and BE sides are Approved | Full regression (`INT-17`) green |

### 9.2 Process

1. A module enters its category queue only after its own Definition of Done (Section 11) is met.
2. A domain's `INT-xx` cannot be scheduled until **both** its `BE-xx` and `FE-xx` (where applicable) are in `Approved` status.
3. Erwin signs off each `INT-xx` before it moves to `Integrated`.
4. `INT-17` (Final System Integration) is the only gate before any `DEPLOY-xx` beyond the MVP staging setup (`DEPLOY-01/02/03/06`) proceeds to production traffic.

---

## 10. Change Management Process

Per AI SDLC §1 (Governance Rules, frozen), this process itself cannot change without explicit approval, a critical architectural issue, or a formal ADR — and neither can the Architecture Foundation it implements. When an architect proposes a standards change:

1. **Record** — Jacob logs the proposed change, its author, and rationale in the Change Log (append-only, referenced from `DOC-01`).
2. **Assess impact** — Jacob cross-references Section 3 (MBS) to identify every module whose `Depends On`, standard Inputs/Outputs, or Completion Checklist the change touches.
3. **Flag affected modules for review** — any module already `Approved` or `Integrated` that is affected is reverted to `Review` status until re-confirmed against the new standard.
4. **Update this document** — Section 4 (Dependency Graph), Section 5 (Sprint Plan), and Section 7 (Tracking) are updated to reflect the change; version number incremented.
5. **Erwin ratifies** — no change is binding until Erwin's explicit approval is recorded, per AI SDLC §1.

Change requests do not pause in-flight work outside the affected modules — this process is scoped, not a project-wide freeze, unless Erwin explicitly declares one (e.g., in response to a critical architectural issue).

### 10.1 Change Log (Live Record)

| Date | Change | Author | Type | Modules / Sections Affected | Status |
|---|---|---|---|---|---|
| 2026-08-04 | ADR-0002: Express adapter at launch, Fastify deferred to a measured scale trigger | Erwin | ADR (Arch §15 amendment) | `FOUND-01`; Section 6.3 gains a future "Fastify migration" hardening task | Ratified — Architecture Foundation v1.1 |
| 2026-08-04 | ADR-0003: `refresh_tokens` table added, owned by `auth` | Erwin | ADR (Arch §3.1 amendment) | `DB-01`, `BE-01` | Ratified — Architecture Foundation v1.1 |
| 2026-08-04 | ADR-0004: `profiles.skill_points` write-path — trigger migrated under `DB-04`, wallet is sole causal writer, TypeScript-level backstop on `profiles.repository.ts` | Erwin | ADR (Arch §3.1, §4.3 amendment) | `DB-02`, `DB-04`, `BE-06`, `BE-03` | Ratified — Architecture Foundation v1.1 |
| 2026-08-04 | ADR-0005: AI SDLC Phase↔Roadmap mapping adopted; Phase 6 redefined as system-level regression only; Phase 3→4 sequencing ruled per-domain (critical architectural issue, AI SDLC §1 condition 2) | Erwin | ADR (governs this plan's §6, not the Architecture Foundation directly) | Master Plan §6.1 (Phase 6 row), §6.2 (sequencing rule) | Ratified |

Per Section 10 step 3, no module was already `Approved` or `Integrated` at the time these ADRs landed — the project is pre-Sprint-0 — so none required reversion to `Review` status, consistent with the note in the Architecture Foundation's own §18 Amendment Log.

---

## 11. Definition of Done (DoD)

Standard checklists by category, derived from Architecture Foundation §17.4, §7.3, §7.4, and §13. A module cannot move to `Approved` until every applicable item is checked.

**DoD-FOUND / DoD-DB / DoD-BE / DoD-FE (shared core, from Arch §17.4):**
- [ ] Stays entirely inside its Section 3 boundary; `check-boundaries.ts` passes
- [ ] Naming matches Arch §5 exactly
- [ ] `strict` TypeScript passes with zero `any`
- [ ] Validation schema lives in `packages/validation`, shared by both apps (BE/FE only)
- [ ] API responses match Arch §9 envelope/error format without hand-rolled formatting (BE only)
- [ ] UI states (loading/empty/error) implemented per Arch §11.8 (FE only)
- [ ] Unit + e2e tests included; CI green
- [ ] `docs/api/openapi.json` regenerated automatically, never hand-edited (BE only)
- [ ] PR opened per Arch §7.3 with module named in scope, reviewed per Arch §7.4
- [ ] **For `wallet`/`transactions`/`auth` modules specifically:** two reviewer approvals obtained (Arch §7.3)

**DoD-DB additions:**
- [ ] Every index from Spec §4.2 for this table exists in the **initial** migration
- [ ] Migration never hand-edited post-application
- [ ] Table namespaced under correct owning-module comment block in `schema.prisma`

**DoD-INFRA / DoD-DEPLOY additions:**
- [ ] Reproducible from a clean checkout via `setup.sh` or the relevant CI workflow
- [ ] No secret committed to version control (Arch §8.4 checklist)
- [ ] Runbook entry added (`DOC-04`) for anything operationally significant

**DoD-AI additions:**
- [ ] External API failure/timeout handled gracefully (no user-facing hard failure on OpenAI outage)
- [ ] BullMQ job idempotent and retry-safe

**DoD-TEST additions:**
- [ ] Coverage of at least the module's `DomainException` paths, not just happy path
- [ ] e2e test uses a real test-database transaction, rolled back after each test (Arch §17.2 step 8)

**DoD-DOC additions:**
- [ ] No content duplicated from source-of-truth docs — links/references instead

**DoD-INT additions:**
- [ ] Verified against a running instance, not just unit-level mocks
- [ ] Erwin sign-off recorded
- [ ] Entered into the correct queue (Section 9) with exit gate satisfied

---

## 12. Project Completion Criteria

TalentSwap's engineering build is considered **complete** when all of the following hold simultaneously:

1. **All 116 modules** in Section 3 are in `Completed` status per Section 7's tracking definitions (with `INFRA-08`/`DEPLOY-07`/`AI-04`/`AI-05` explicitly deferred to the Hardening/Scaling phases per Section 6.3, and tracked as `Not Started` rather than blocking MVP completion).
2. **Roadmap #0–16** (Architecture §16) is fully delivered end-to-end, with `INT-17` (Full System Integration & Regression) green.
3. **Zero open boundary violations** — `check-boundaries.ts` clean across the entire codebase.
4. **All ADRs from Section 1.3 (C-1 through C-4) resolved and recorded** in `DOC-01`, with no outstanding architectural ambiguity on the critical path.
5. **Quality gates met** per Section 11 for every module, including the mandatory two-reviewer rule on `auth`/`wallet`/`transactions`.
6. **Production deployment live** (`DEPLOY-01…06` complete) with monitoring and alerting active (`DEPLOY-05`) and a documented rollback path (`DOC-04`).
7. **Definition-of-Done items satisfied platform-wide** for accessibility (WCAG 2.1 AA, Arch §11.4), security (Arch §13), and performance standards (Arch §14).

Full **product-level** success (Proposal §3.2 targets — 10,000 active users in 12 months, <2% dispute rate, 85%+ match satisfaction, 60%+ verified-user adoption) is explicitly **out of scope for engineering completion** — those are post-launch operational metrics, not build deliverables, and are noted here only so Jacob can distinguish "the platform is built" from "the platform is succeeding" when reporting status to stakeholders.

---

_This document is a coordination artifact. It carries no authority to change architecture, and any conflict between this plan and the Architecture Foundation is resolved in the Architecture Foundation's favor — report it (Section 1.3 pattern), don't override it._

**— End of Master Engineering Project Management Plan —**
