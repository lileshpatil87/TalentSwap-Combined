# TalentSwap — Database Constitution

| | |
|---|---|
| **Document ID** | `DB-CON-v1.0` |
| **Document Type** | Database Engineering Standards (Constitution) |
| **Author / Role** | Robert — Database Architect (Account 04) |
| **Authority** | Governs all database schema design, migrations, and data-layer implementation. Does **not** implement schema, does **not** generate Prisma models, SQL, or migrations. |
| **Governing Documents (priority order)** | 1. `TalentSwap_Architecture_Foundation.md` v1.1 (highest authority) · 2. `TalentSwap_Master_Development_Plan.md` · 3. `TalentSwap Specification.md` · 4. `TalentSwap Proposal.md` |
| **Process Authority** | `TalentSwap AI SDLC.md` v1.0 (frozen) — this document may only change per AI SDLC §1 Governance Rules (explicit approval, critical architectural issue, or a formal ADR) |
| **Status** | 🔒 Ratified — v1.0 (approved by Erwin, Lead Architect) |
| **Applies To** | Every `DB-xx` module (DB-01 through DB-15) and any future database module |

---

> **Delivery note (2026-08-09):** this file was previously cited throughout
> the codebase and the Master Development Plan but had never actually been
> committed to this repository — flagged as a documentation gap in
> `docs/architecture/MERGE_NOTES.md` §4 ("Domain/Frontend/DevOps
> Constitutions ... were never delivered as files"). Added here, verbatim,
> as part of the "DB-02 — Core Database Schema" delivery so future module
> sessions can cite it directly instead of by reference only. No content
> below was altered from the version this delivery was built against.

---

## Executive Summary

This document is the single source of truth for how TalentSwap's data layer is designed, named, evolved, secured, and reviewed. It does not choose *what* tables exist — that is the Architecture Foundation's domain-ownership matrix (§3.1) and the Technology Specification's table catalogue (§4.1), both of which this document treats as locked inputs. It chooses *how* every future database module — built by a human or an AI session, today or a year from now — implements those tables so that the result is consistent, auditable, and safe for a financial-grade points ledger.

Three commitments run through every section below:

1. **Nothing here contradicts the Architecture Foundation.** Where the Specification's illustrative examples (e.g., lowercase enum values) conflict with the Architecture Foundation's binding conventions (e.g., `UPPER_SNAKE_CASE` enum members), the Architecture Foundation wins, per the priority order above, and this document states the resolution explicitly rather than leaving it ambiguous for the next engineer.
2. **The ledger is sacred.** Every rule involving money-equivalent data (`skill_points_ledger`, `profiles.skill_points`, `transactions`) defaults to the most conservative, most auditable option available, consistent with ADR-0004 and Architecture §13 rule 7.
3. **Consistency over cleverness.** A database engineer picking up any `DB-xx` module should be able to predict every naming, indexing, and migration decision in this document before opening the schema file — that predictability is what allows sixteen independently-built domains to compose into one coherent database.

This document defines **standards only**. No table is designed, no Prisma model is written, no SQL is generated, and no migration is created here — those are the responsibilities of each `DB-xx` implementation module, built against this constitution.

---

## Table of Contents

**Front Matter** — Executive Summary · Table of Contents

**Part I — Foundations**
0. Purpose and Scope of This Document
1. Database Architecture Philosophy
2. Database Folder Structure
3. Prisma Project Organization
4. Schema Organization Strategy
5. Domain-Based Schema Organization

**Part II — Naming**
6. Naming Conventions (Overview)
7. Table Naming Rules
8. Model Naming Rules
9. Enum Naming Rules
10. Field Naming Rules
11. Relation Naming Rules

**Part III — Keys, Structure & Evolution**
12. Primary Key Standards
13. Foreign Key Standards
14. Composite Key Guidelines
15. UUID Strategy
16. Timestamp Standards
17. Soft Delete Strategy
18. Auditing Standards
19. Versioning Strategy
20. Migration Strategy
21. Seed Strategy

**Part IV — Relationships & Transactions**
22. Relationship Standards
23. One-to-One Guidelines
24. One-to-Many Guidelines
25. Many-to-Many Guidelines
26. Cascading Rules
27. Transaction Standards
28. Concurrency Guidelines

**Part V — Performance**
29. Indexing Strategy
30. Unique Constraint Standards
31. Check Constraint Guidelines
32. Performance Optimization Standards
33. Query Optimization Guidelines
34. Pagination Standards
35. Full-Text Search Guidelines

**Part VI — Data Lifecycle & Compliance**
36. Data Retention Strategy
37. Backup & Recovery Considerations
38. Security Standards
39. Sensitive Data Handling
40. Encryption Guidelines
41. Data Validation Responsibilities
42. Multi-Tenancy Considerations

**Part VII — Domain-Specific Standards**
43. Wallet & Financial Data Standards
44. Analytics Data Guidelines
45. Logging & Audit Data Standards
46. AI-Related Data Storage Guidelines

**Part VIII — Process & Governance**
47. Testing Standards
48. Documentation Standards
49. Database Review Guidelines
50. Definition of Done for Database Modules
51. Future Database Module Development Rules

**Back Matter** — Glossary · Change Log

---

## Part I — Foundations

### 0. Purpose and Scope of This Document

This constitution exists so that sixteen domain schemas (Section 5), built across many independent sessions over the life of the project, land in **one** PostgreSQL database that reads as if a single disciplined engineer wrote it. It is a rulebook, not a design document.

Before creating or modifying any Prisma model, migration, or index, a database engineer must:

1. Confirm the table's owning module against Section 5 and Architecture §3.1 — do not create a table under the wrong module's comment block.
2. Confirm naming against Sections 6–11.
3. Confirm key, relationship, and constraint choices against Sections 12–31.
4. Confirm the change satisfies the Definition of Done (Section 50) before requesting review (Section 49).

This document assumes, and does not re-justify, the technology choices already locked by the Architecture Foundation and Technology Specification: **PostgreSQL 16**, **Prisma ORM**, **Redis 7**, and **Cloudflare R2** (with AWS S3 as the documented fallback). No additional persistence layer may be introduced without an ADR (Section 51).

---

### 1. Database Architecture Philosophy

TalentSwap's data layer follows four ordered priorities, in this order, whenever a trade-off must be made:

1. **Data integrity over convenience.** A schema decision that makes a query 10% faster but permits an invalid state (a negative balance, an orphaned ledger entry, a transaction with no confirmation deadline) is rejected. This is a financial-grade platform (Spec §2.3.1); implicit trust in "the application will always write it correctly" is not an acceptable substitute for a constraint.
2. **Single source of truth, enforced at the database, not just the application.** Every fact has exactly one table that owns it. Denormalized copies (e.g., `profiles.skill_points`, `profiles.total_exchanges`, `profiles.reputation_score`) are permitted only as **derived caches of an authoritative source**, written through a single, auditable path (Section 43), never as a second place the same fact can silently drift.
3. **One database, many owners.** TalentSwap runs a single PostgreSQL 16 instance at launch (Arch §1.2), but every table belongs to exactly one backend module (Arch §3.1). The physical single-database deployment is a cost and operational decision for this stage of the project; the *logical* ownership boundaries are drawn as if the tables were already in separate schemas or services, because Roadmap Phase 3–4 (Transactions, Notifications extraction — Spec §2.9.1, Arch §2.2) depends on that boundary having been respected from day one.
4. **Boring is correct.** PostgreSQL's native features (row-level locking, advisory locks, `CHECK` constraints, generated columns, `tsvector`) are preferred over bespoke application-level enforcement of the same guarantee, because the database is the last line of defense if application code has a bug. Conversely, business logic that has no data-integrity dimension (XP formulas, match-ranking weights) stays entirely out of the database (Arch §1.3) — the database enforces *shape and integrity*, never *business rules*.

This philosophy inherits directly from Architecture §1.2's "modular monolith with clean extraction seams" and Spec §2.3.1's mandate that "partial writes, double spends, or race conditions would undermine platform trust entirely."

---

### 2. Database Folder Structure

The database layer's physical footprint is fixed by Architecture §15 and is not altered here — this section restates it for database-engineer convenience and adds no new top-level paths:

```text
apps/api/
├── prisma/
│   ├── schema.prisma        # The single schema file — see §3, §4
│   ├── migrations/          # Prisma-generated migration history — see §20
│   └── seed.ts              # Wrapped by scripts/seed-db.ts — see §21
├── src/
│   └── database/
│       ├── prisma.service.ts        # The only class that instantiates PrismaClient
│       ├── prisma.module.ts
│       └── transaction.helper.ts    # withTransaction(), advisory-lock helper — see §27–28
docs/
└── architecture/
    └── (ERD notes, one per module, updated as each DB-xx module ships — see §48)
scripts/
├── seed-db.ts                # Thin wrapper around prisma/seed.ts
└── check-boundaries.ts       # Statically flags a module importing another module's Prisma table
```

No database engineer creates a new top-level folder, a second `schema.prisma`, or a parallel migrations directory. If a future requirement seems to need one (e.g., a per-service database after microservice extraction), that is a Section 51 event — it requires an ADR, not a unilateral folder addition.

---

### 3. Prisma Project Organization

- **One `PrismaClient`, one owner.** `database.PrismaService` (Arch §3.1 infrastructure module) is the only class in the codebase that instantiates `PrismaClient`. Every domain module receives it via dependency injection and queries only the tables it owns (Arch §4.3) — this is enforced by `check-boundaries.ts` in CI, not by convention alone.
- **One `datasource` block, one `generator` block.** `schema.prisma` declares exactly one PostgreSQL datasource (`DATABASE_URL`, injected via the validated env schema — Arch §8.2) and one `prisma-client-js` generator. No secondary datasource is added for any reason without an ADR (this includes read replicas — Prisma's read-replica routing, when adopted at Roadmap Phase 4 / Spec §Phase 4, is itself an ADR event, not a default).
- **Shadow database for local/CI migrations.** Prisma's shadow-database mechanism is used for `prisma migrate dev` in local and CI environments (via `docker-compose.yml`'s Postgres service — INFRA-01), so that migration drift is caught before a PR is opened, not after.
- **Generated client stays generated.** The Prisma Client output is never committed to version control and is never hand-edited; if a query pattern is awkward to express through the generated client, that is a repository-layer design problem (Section 22 onward), not a reason to bypass the client with raw SQL. Raw SQL (`$queryRaw`/`$executeRaw`) is permitted only for the two documented exceptions in this project: the `trg_sync_skill_points` trigger definition (ADR-0004) and `pg_advisory_xact_lock` calls (Section 28) — both live in the owning module's repository, never scattered ad hoc.
- **Prisma Migrate is the only schema-change mechanism.** No engineer, human or AI, connects to any environment's Postgres instance and runs manual DDL. Every structural change is a generated migration (Section 20).

---

### 4. Schema Organization Strategy

TalentSwap uses **one monolithic `schema.prisma` file**, organized internally into per-module sections, rather than physically separate schema files per domain. This is a deliberate, locked decision (Arch §17.2 step 2, Master Plan §8.4) for three reasons:

1. **Atomic migration generation.** Prisma generates one migration per `schema.prisma` change-set. A single file guarantees that a cross-cutting review of "everything that changed" is always one diff, never a set of files that must be mentally reassembled.
2. **Relation resolution.** Prisma resolves `@relation` references within a single schema graph. Splitting the file today would require every foreign-key relation to be re-verified against Prisma's (evolving) multi-file schema support — an unnecessary risk for a launch-stage project, per the KISS principle in Arch §10.2.
3. **Append-only discipline is easier to enforce in one file.** Master Plan §8.4 already identifies `schema.prisma` as a known concurrent-edit hotspot; the mitigation — *"strict append-only discipline; no module reorders another's block"* — is simpler to apply and to review when there is exactly one file to look at.

Every `DB-xx` module appends its models to the end of the file (or to its designated section, once the initial module order is established) under a mandatory comment header:

```prisma
// === <module-name> module (owner: <BackendModule>, see Arch §3.1) ===
```

A module's block is **never reordered, split, or interleaved** with another module's block by a later PR. If Prisma's multi-file schema folder support is later adopted, that is itself a Section 51 ADR event, not a decision any single `DB-xx` module PR may make unilaterally.

---

### 5. Domain-Based Schema Organization

Every table in the system belongs to exactly one owning backend module, per Architecture §3.1. The table below is the authoritative cross-reference between the `DB-xx` module registry (Master Plan §3.3) and that ownership matrix. This is restated here, not redefined — any discrepancy between this table and Architecture §3.1 is resolved in Architecture §3.1's favor and reported as a documentation gap (Section 51), not silently reconciled by a database engineer.

| DB Module | Tables / Structures Owned | Owning Backend Module(s) |
|---|---|---|
| `DB-01` | `users`, `refresh_tokens` | `users` (account state); `auth` (documented exception: reads/writes `users` directly for identity operations, per Arch §3.1; sole owner of `refresh_tokens`, ADR-0003) |
| `DB-02` | `profiles` | `profiles` (no application code ever writes `skill_points` — see §43) |
| `DB-03` | `skills`, `skill_categories` | `skills` |
| `DB-04` | `skill_points_ledger`, `trg_sync_skill_points` trigger | `wallet` (sole causal writer of `profiles.skill_points` via the trigger — ADR-0004) |
| `DB-05` | `transactions` | `transactions` |
| `DB-06` | `notifications` | `notifications` |
| `DB-07` | `conversations`, `messages` | `chat` |
| `DB-08` | pgvector columns on `skills`/`profiles`; `match_suggestions` cache table | `matching` (cache table only — embedding columns are read/write targets, not new source-of-truth tables) |
| `DB-09` | `ratings` | `ratings` |
| `DB-10` | `badges`, `user_badges`, `activity_streaks` | `gamification` |
| `DB-11` | `documents` | `documents` |
| `DB-12` | `community_posts` | `community` |
| `DB-13` | Call session records | `calling` |
| `DB-14` | Read-optimized search projection (tsvector/GIN, no new source-of-truth table) | `search` (rebuildable projection only) |
| `DB-15` | `admin_logs` | `admin` |

**Rule:** a table's `// === module ===` comment block in `schema.prisma` must name the module from this table's right-hand column, exactly as written. A model that needs data from another module's table reads it through that module's injected public service (Arch §4.2) — never through a direct Prisma query against a table this matrix does not assign to the querying module.

---

## Part II — Naming

### 6. Naming Conventions (Overview)

Naming in the data layer follows one governing principle: **the database is snake_case, the application is camelCase/PascalCase, and Prisma's `@map`/`@@map` directives are the only bridge between them.** No table, column, or enum in PostgreSQL ever contains a capital letter; no Prisma model, field, or enum member in `schema.prisma`/TypeScript ever contains an underscore (with the sole exception of `UPPER_SNAKE_CASE` enum members, per Architecture §5.2). Sections 7–11 give the specific rule for each construct.

Where the Technology Specification's table definitions (§4.1) use a naming style that conflicts with this section (most notably, lowercase enum values such as `'pending' | 'escrow_held'`), the Architecture Foundation's binding convention (§5.2) governs, per this document's priority order. Those Specification tables remain the authoritative source for *which columns exist and what they mean* — only their casing/style examples are superseded.

---

### 7. Table Naming Rules

- `snake_case`, plural noun: `users`, `profiles`, `skills`, `skill_categories`, `transactions`, `skill_points_ledger`, `ratings`, `badges`, `user_badges`, `notifications`, `conversations`, `messages`, `documents`, `community_posts`, `activity_streaks`, `admin_logs`, `refresh_tokens` — matching the catalogue already established in Spec §4.1.
- Join/junction tables for many-to-many or composite-key relationships are named `<entity_a>_<entity_b>` in dependency order (owner first): `user_badges`, not `badges_users`.
- No table name is abbreviated for brevity (`transactions`, not `txns`; `notifications`, not `notifs`) — full words only, matching Architecture §5's "name states intent, not implementation" principle applied to persistence.
- No table name is prefixed with a module or domain tag (no `wallet_ledger`, no `tx_transactions`) — ownership is expressed by the `schema.prisma` comment block (§4) and the domain matrix (§5), not by a naming prefix that would need to change if ownership is ever refactored.

---

### 8. Model Naming Rules

Every Prisma model is `PascalCase`, singular, and mapped to its snake_case plural table via `@@map`, per Architecture §5.2's entity-naming rule:

| Table (Postgres) | Prisma Model |
|---|---|
| `users` | `User` |
| `profiles` | `Profile` |
| `skills` | `Skill` |
| `skill_categories` | `SkillCategory` |
| `transactions` | `Transaction` |
| `skill_points_ledger` | `SkillPointsLedgerEntry` |
| `refresh_tokens` | `RefreshToken` |
| `ratings` | `Rating` |
| `badges` | `Badge` |
| `user_badges` | `UserBadge` |
| `notifications` | `Notification` |
| `conversations` | `Conversation` |
| `messages` | `Message` |
| `documents` | `Document` |
| `community_posts` | `CommunityPost` |
| `activity_streaks` | `ActivityStreak` |
| `admin_logs` | `AdminLog` |

A model name never repeats its module name (`WalletLedgerEntry` is wrong; `SkillPointsLedgerEntry` is right — the model name describes the *entity*, and the file/folder location already establishes the module).

---

### 9. Enum Naming Rules

Per Architecture §5.2 (binding): the enum **type** is `PascalCase`; enum **members** are `UPPER_SNAKE_CASE`. This supersedes the Specification's illustrative lowercase examples (`pending | escrow_held | ...`) — the underlying values and their meaning are unchanged; only the casing is normalized.

```prisma
enum TransactionStatus {
  PENDING
  ESCROW_HELD
  PROVIDER_CONFIRMED
  RECIPIENT_CONFIRMED
  COMPLETED
  DISPUTED
  CANCELLED
}
```

Applied consistently across every enum in the schema: `UserRole` (`USER`, `VERIFIED_USER`, `MODERATOR`, `ADMIN`), `ExperienceLevel` (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `CHAMPION`), `SkillProficiency`, `SkillType` (`OFFERING`, `SEEKING`), `LedgerEntryType` (`DEBIT`, `CREDIT`, `ESCROW_HOLD`, `ESCROW_RELEASE`, `ADMIN_ADJUSTMENT`), `DocumentStatus`, `NotificationType`, `CommunityPostType`. Each enum lives in the `schema.prisma` block of the module that owns the table it appears on — an enum is never defined once and shared across two different modules' tables, even if the values happen to look similar, unless it genuinely represents the same cross-cutting concept (e.g., a shared `Proficiency` scale would need an explicit justification and Robert's sign-off before being treated as shared rather than duplicated per module).

---

### 10. Field Naming Rules

- Prisma fields are `camelCase`; the underlying column is `snake_case` via `@map("...")` — e.g. `userId String @map("user_id")`, `skillPoints Int @map("skill_points")`.
- Boolean fields are prefixed `is`/`has`: `isVerified`, `isBanned`, `isActive`, `isDeleted`, `isRevoked` — matching Architecture §5.2's variable-naming rule, applied to persisted booleans as well as in-memory ones.
- Foreign-key scalar fields are named `<relatedModel>Id` (camelCase) mapping to `<related_table_singular>_id` (snake_case): `userId` → `user_id`, `transactionId` → `transaction_id`, `categoryId` → `category_id`.
- Monetary/points quantities are **always `Int`**, never `Float` or `Decimal` — `skillPoints`, `pointsHeld`, `amount`, `balanceAfter`. SkillPoints have no fractional unit (Proposal §5.1: "1 hour = 10 SkillPoints"); introducing a fractional type would create rounding-error surface area in the ledger that integers cannot have. `Decimal(3,2)` is reserved for genuinely fractional, non-monetary values only — `reputationScore` being the sole current example.
- Timestamps end in `At`: `createdAt`, `updatedAt`, `completedAt`, `expiresAt`, `lastActiveAt`, `sentAt`, `awardedAt` (see §16).
- JSONB payload fields are named for what they semantically hold, not their storage type: `payload` (on `notifications`), `metadata` (on `admin_logs`) — never `data` or `json` as a field name, which states the storage mechanism instead of the intent.

---

### 11. Relation Naming Rules

- A to-one relation field is named after the related model, singular, camelCase: `user User @relation(...)`.
- A to-many relation field is named after the related model, pluralized, camelCase: `skills Skill[]`.
- **Multiple relations between the same two models require an explicit, named `@relation`.** This project's clearest case is `transactions`, which references `users` twice (`initiator_id`, `provider_id`) — Prisma requires disambiguation:

```prisma
model Transaction {
  initiator   User @relation("TransactionInitiator", fields: [initiatorId], references: [id])
  provider    User @relation("TransactionProvider",  fields: [providerId],  references: [id])
}
```

  The relation name is `PascalCase`, describes the *role* the relation plays (`TransactionInitiator`, not `TransactionUser1`), and the same name is used on both sides of the relation.
- **Self-referencing relations** (e.g., `skill_categories.parent_id` for hierarchical categories) follow the same rule: `@relation("CategoryHierarchy", fields: [parentId], references: [id])`, with the field named `parent`/`children` on each side, not `parentCategory`/`childCategories` (redundant with the model name already being `SkillCategory`).
- A relation field is never named identically to its scalar foreign-key field. `userId` (scalar) and `user` (relation) — never `userId` and `userId` typed differently, which Prisma disallows in any case but which engineers should not attempt to work around via aliasing.

---

## Part III — Keys, Structure & Evolution

### 12. Primary Key Standards

Every table has a single-column primary key named `id`, type `UUID`, generated via `@default(dbgenerated("gen_random_uuid()"))` (Postgres 13+ native `gen_random_uuid()`, no `pgcrypto`/`uuid-ossp` extension dependency required), matching Spec §4.1's `PK, DEFAULT gen_random_uuid()` convention for every core table.

UUID primary keys are non-negotiable for all user-facing and cross-service-referenced entities (Spec §4.1.1: *"UUID preferred over serial to prevent enumeration attacks"*). The **sole exception** is `skill_categories.id`, which may remain an `Integer` auto-increment per Spec §4.1.3, because categories are a small, admin-managed, non-enumerable-risk taxonomy, not user-generated or user-referenced-by-URL content — any future table proposing a non-UUID primary key must argue the same two conditions (small, admin-managed, no enumeration risk) or default to UUID.

---

### 13. Foreign Key Standards

- Every foreign key is a `UUID` column named `<referenced_entity>_id`, with an explicit Prisma `@relation` (never an implicit/ambiguous relation).
- Foreign keys are declared `NOT NULL` unless the relationship is genuinely optional by business rule (e.g., `documents.reviewed_by` is nullable until a moderator picks it up; `transactions.skill_id` is not nullable, since a transaction without a skill reference is meaningless).
- A foreign key never references a table outside the referencing module's declared dependency edge in Architecture §16's roadmap graph. If `community_posts` ever needed a foreign key into `transactions`, that would signal an undocumented dependency and must be raised to Robert and Erwin before being added — Section 5's ownership matrix and Architecture §4.3's cross-module rule apply to relations exactly as they apply to raw queries.
- Every foreign-key column receives a supporting index unless it is already the leading column of a composite index that serves the same lookup pattern (Section 29) — an unindexed foreign key is treated as a review-blocking defect, not a follow-up ticket, given this project's join-heavy read patterns (Spec §1.2: ~80% reads).

---

### 14. Composite Key Guidelines

- A composite **primary key** is used only where the entity has no independent identity beyond the pair/tuple itself — the canonical example is `user_badges (user_id, badge_id)`, whose composite PK both identifies the row and enforces "a user cannot be awarded the same badge twice" as a structural guarantee, not an application check (Spec §4.1.6).
- Where an entity *does* have independent identity but still needs a uniqueness or lookup guarantee over a tuple of columns, use a single UUID primary key plus a composite **index or unique constraint** instead of a composite primary key — the canonical example is `refresh_tokens`, which has its own `id` PK but carries a composite index on `(user_id, family_id)` for lookup and a separate unique index on `token_hash` (ADR-0003). Do not conflate "needs a composite key for lookup" with "needs a composite primary key" — they solve different problems (Section 29 covers indexing).
- A composite key (primary or unique) never exceeds three columns. If a fourth column seems necessary to disambiguate, that is usually a sign the table is missing an entity of its own — flag it for Robert's review rather than widening the key further.

---

### 15. UUID Strategy

- **Generation:** database-side, via Postgres 16's native `gen_random_uuid()` (UUID v4), set as the column default — never generated in application code and passed in, except where a client-supplied idempotency key is the explicit design (Section 30; `transactions.idempotency_key`, which is a distinct concern from the row's own primary key).
- **Format:** standard RFC 4122 UUID, stored as Postgres's native `UUID` type (16 bytes), never as a `VARCHAR(36)` — the native type is smaller, comparable, and indexable more efficiently than its string representation.
- **Why UUID over serial, restated as a rule, not just a rationale:** any externally-exposed identifier (anything that appears in a URL, an API response body, or a WebSocket payload — which is effectively every table in this system except `skill_categories`) must be a UUID, full stop, to prevent enumeration attacks and to allow IDs to be generated client-side for idempotency and offline-first patterns without a round-trip collision risk.

---

### 16. Timestamp Standards

- Every table carries `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Tables representing mutable entities also carry `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **`updated_at` is maintained by Prisma's `@updatedAt` directive (application-layer), not a database trigger.** The Specification (§4.1.1) leaves this ambiguous ("auto-updated via trigger or ORM hook"); this constitution resolves it in favor of the ORM hook, for one reason: this project has exactly **one** approved database trigger in its entire schema — `trg_sync_skill_points` (ADR-0004) — and that scarcity is deliberate (Arch §10.2 KISS: prefer the simplest mechanism; every additional trigger is an additional piece of logic invisible to a TypeScript-only code search). `@updatedAt` gives the same guarantee with zero additional database surface area. Any future proposal to move `updated_at` maintenance into the database is a Section 51 ADR event.
- Immutable/append-only rows (`skill_points_ledger`, `admin_logs`, `messages` post-send) carry `created_at` only — there is no `updated_at`, because the row is never updated (Section 43, Section 45).
- All timestamp columns are `TIMESTAMPTZ` (timezone-aware), never bare `TIMESTAMP` — the platform has no single-timezone assumption (Spec §4.1.1), and mixing aware/naive timestamps across tables is a correctness bug waiting to happen.
- Deadline/expiry columns (`transactions.confirmation_deadline`, `refresh_tokens.expires_at`) are always indexed (Section 29) since they exist specifically to be scanned by a cron/BullMQ job.

---

### 17. Soft Delete Strategy

TalentSwap does **not** apply a single blanket "soft delete" pattern to every table. Instead, each table uses the specific lifecycle mechanism its business meaning calls for. A database engineer building a new module chooses from this decision matrix rather than defaulting to a generic `deleted_at` column:

| Pattern | Used For | Mechanism |
|---|---|---|
| **Active/inactive flag** | `skills.is_active` | Boolean toggle; inactive rows excluded from search/discovery but retained for the owning user's history (Spec §4.1.3). |
| **Soft-delete flag on content** | `messages.is_deleted` | Boolean toggle; content hidden from the chat UI but retained for moderation and legal/dispute-evidence purposes (Spec §4.1.6). |
| **Status enum, not deletion** | `documents.status`, `transactions.status` | The row's lifecycle *is* the enum; there is no "deleted" state, only terminal states (`REJECTED`, `CANCELLED`, `COMPLETED`). |
| **Ban flag, not deletion** | `users.is_banned` | A banned user's row, and every row that references it, remains intact — banning is an authorization decision, not a data-lifecycle one. |
| **Anonymization, never hard delete** | `users` under a GDPR erasure request | See Section 36. Ledger, transaction, and rating integrity require the user reference to persist; the row's PII fields are nulled/replaced, the row itself is not deleted (Spec §8.3). |
| **True hard delete** | Never, for any table currently in the domain matrix (§5) | No table in this schema is hard-deleted by application code. If a future module has a genuine "row must be physically removed" requirement (e.g., an expired, unclaimed presigned-upload placeholder), that is scoped, justified per-table, and reviewed by Robert — it is not assumed as a default capability. |

Rows are never both soft-deleted *and* referenced as if active elsewhere without a check — every query against a table with a lifecycle flag filters on it explicitly (or via a Prisma middleware scoped to that model), rather than relying on callers to remember.

---

### 18. Auditing Standards

- **Row-level provenance:** `created_at` (Section 16) on every table is the baseline audit fact — when a row came into existence is never lost.
- **Immutable audit trail for administrative action:** `admin_logs` (`DB-15`) is the single, append-only record of every moderation/administrative action (`admin_id`, `action`, `target_type`, `target_id`, `metadata` JSONB, `created_at` — Spec §4.1.6). No `UPDATE` or `DELETE` is ever issued against this table by any module, including `admin` itself; if a logged action was itself wrong, a **new** log entry records the correction, the old entry is never edited.
- **Immutable audit trail for financial action:** `skill_points_ledger` (Section 43) serves the identical role for money-equivalent state — append-only, one row per movement, `balance_after` snapshotted at write time so the full history is reconstructable without replaying every prior row.
- **Application-layer correlation:** every request is assigned a `requestId` (Arch §6.7); database-layer audit rows do not duplicate this UUID as a stored column unless a specific table's audit requirement calls for cross-referencing a request to a row (not currently the case for any table in Section 5) — the correlation happens in Winston's structured logs, not in Postgres, to avoid audit-table bloat for a concern the logging layer already owns.
- **What is never audited at the database layer:** ordinary read access. TalentSwap does not maintain a `SELECT`-level audit log for any table — that is a Section 51 conversation if a future compliance requirement demands it, not a default.

---

### 19. Versioning Strategy

Two distinct things are versioned in this project, and they are not conflated:

1. **Schema version.** The Prisma `migrations/` directory *is* the version history of the database schema — an ordered, append-only sequence of timestamped, named migrations (Section 20). There is no separate "schema version number" column or table; the migration history is authoritative and sufficient.
2. **This document's version.** `DB-CON-v1.0` is versioned under the same governance as every other TalentSwap standards document — per `AI SDLC §1` (frozen process) and the Master Development Plan §10 Change Management Process. A change to this constitution requires the same lifecycle any other standards amendment requires: logged by Jacob, impact-assessed against every `DB-xx` module's Definition of Done, and ratified by Erwin before it binds future work. A version bump (`v1.1`, `v2.0`) is issued only alongside a corresponding entry in this document's own Change Log (back matter) — never silently.

Neither versioning mechanism implies row-level data versioning (e.g., temporal tables, `SCD Type 2` history tracking) for business entities. No table in Section 5 currently requires historical-state tracking beyond what its own append-only tables (`skill_points_ledger`, `admin_logs`) already provide; if a future module needs it (e.g., tracking every historical value of a user's `reputation_score` over time, not just the current value), that is a deliberate, reviewed addition — not an implicit expectation of "versioning" as a general database feature.

---

### 20. Migration Strategy

- **Prisma Migrate is the only path to a schema change**, in every environment — local, CI, staging, production (Section 3).
- **A migration is generated, reviewed as part of its PR, and never hand-edited once it has been applied in any environment** — this is a hard rule restated from Architecture §17.2 step 2 and enforced as a Definition-of-Done item (Master Plan §11, Section 50 below) precisely because a hand-edited migration desynchronizes the migration file from what Prisma's internal `_prisma_migrations` tracking table believes was applied, which is a production-incident-class mistake.
- **Every index required by the Specification's §4.2 table for a given table is created in that table's *initial* migration** — not added reactively after a slow-query alert (Arch §14, restated in every `DB-xx` module's Definition of Done). Retrofitting an index onto a large production table is an `INFRA`/`DEPLOY`-coordinated event (potential lock contention), not a routine follow-up PR.
- **Forward-only, backward-compatible by default.** Migrations are written to be deployable without downtime: adding a nullable column, then backfilling, then tightening to `NOT NULL` in a later migration, is preferred over a single migration that would lock a large table or break a currently-deployed application version reading the old shape. This "expand → migrate → contract" pattern is expected for any change to a table already carrying production data; it is not required for `DB-xx` modules building a table for the first time.
- **CI-gated, with automatic rollback on failure**, per Spec §2.7.2 and Arch §7.5: every merge to `main` touching `apps/api` runs Prisma migrations as part of the deploy pipeline; a failed migration rolls back automatically rather than leaving the schema in a partially-applied state.
- **No destructive migration ships without an explicit, named justification in the PR description** — dropping a column or table is flagged for two-reviewer approval regardless of whether the table is on the `wallet`/`transactions`/`auth` list (Section 49), because data loss is irreversible in a way that adding structure is not.

---

### 21. Seed Strategy

- `prisma/seed.ts`, wrapped by `scripts/seed-db.ts` (Arch §2.6), is the only seeding mechanism.
- Seed data is **idempotent** — running the seed script twice against the same database produces the same end state, not duplicate rows (achieved via `upsert`, keyed on a natural or well-known identifier, never a blind `create`).
- Local development and CI/test seeding may include representative fake data (sample users, skills, a few completed transactions) to support manual and automated testing (Section 47). **Staging and production seeding is limited to structural/reference data only** — `skill_categories`, `badges` definitions, and the minimum administrative bootstrap account required to operate the platform. No fake user, transaction, or ledger data is ever seeded into an environment that could be mistaken for or connected to real user-facing infrastructure.
- Every `DB-xx` module that introduces reference/lookup data it owns (e.g., `gamification`'s `badges` catalogue) is responsible for that data's seed entries, added to `seed.ts` under its own clearly-commented section, following the same append-only discipline as `schema.prisma` (Section 4).

---

## Part IV — Relationships & Transactions

### 22. Relationship Standards

Every relationship in the schema is expressed as an explicit Prisma `@relation`, with both the scalar foreign-key field and the relation field declared (never a "virtual" relation inferred implicitly). A relationship crosses a module boundary in name only when Section 5's ownership matrix and Architecture §4.3 permit it as a **read** — a relationship is never used as a backdoor for one module's Prisma model to *write* into a table it does not own; that write must go through the owning module's public service instead, exactly as if no direct schema relation existed (Arch §4.2, §4.3).

---

### 23. One-to-One Guidelines

The canonical one-to-one relationship in this schema is `users` ↔ `profiles` (Spec §4.1.2: *"Profile primary key — 1-to-1 with users"*). The standard for any future one-to-one relationship:

- The dependent table carries the foreign key (`profiles.user_id`), marked `UNIQUE`, not the owning table — this is what makes it one-to-one rather than one-to-many at the constraint level, not just by convention.
- The dependent table has its own `id` primary key (not `user_id` reused as the PK) — this keeps the table consistent with the UUID-PK standard (Section 12) and avoids a special case in tooling that expects every table to have an `id` column.
- A one-to-one relationship is used only when the dependent entity's lifecycle is genuinely coupled to its parent's (a profile cannot meaningfully exist without a user). Where two entities are related but independently meaningful, use a one-to-many or many-to-many relationship instead, even if the current data happens to only ever have one row on each side.

---

### 24. One-to-Many Guidelines

The dominant relationship shape in this schema (a `user` to many `skills`; a `skill_category` to many `skills`; a `conversation` to many `messages`; a `user` to many `skill_points_ledger` entries). Standard:

- The "many" side carries the foreign key, always indexed (Section 29), always paired with whatever secondary filter the domain's primary access pattern needs — `skills (user_id, is_active)`, `transactions (initiator_id, status)`, matching Spec §4.2's composite-index catalogue exactly.
- Cascade behavior is set deliberately per relationship, not defaulted — see Section 26.
- A one-to-many relationship's "many" side is never modeled as a JSON/array column on the "one" side purely for convenience (e.g., a user's skills are never stored as a JSON array on `profiles`) — the one documented, deliberate exception in the current catalogue is `conversations.participant_ids UUID[]` (Spec §4.1.6), which is accepted specifically because conversation participancy is small (2+ users), rarely queried by "find all conversations for a participant using an array-containment index" at high frequency relative to its simplicity benefit, and does not carry any per-participant state (read receipts, roles) that would demand a proper join table. Any future array-column relationship must argue the same three conditions or use a join table instead.

---

### 25. Many-to-Many Guidelines

- Every many-to-many relationship is modeled as an explicit join table with its own `id` (or composite PK where justified per Section 14), never Prisma's implicit many-to-many convenience table — an implicit join table cannot carry additional columns (e.g., `awarded_at` on `user_badges`) and is invisible to `check-boundaries.ts`'s per-module table ownership scan.
- The join table is owned by whichever module's business logic the *relationship itself* represents, not automatically defaulted to one side's owning module — `user_badges` is owned by `gamification` (Section 5), not split between `users` and `gamification`.
- The canonical example, `user_badges (user_id, badge_id)` composite PK, is the reference pattern: it prevents duplicate awards structurally (Section 14) and carries `awarded_at` as its one substantive additional column (Spec §4.1.6).

---

### 26. Cascading Rules

`ON DELETE` behavior is chosen per relationship, against this default hierarchy, not left at the Postgres default (`NO ACTION`) by omission:

| Behavior | Default use | Example |
|---|---|---|
| **`RESTRICT`** | Any reference into a financial or audit-trail table. The referenced row must never disappear out from under a ledger, transaction, or admin-log reference. | `skill_points_ledger.transaction_id` → `transactions.id`; any FK → `users.id` from a financial table |
| **`CASCADE`** | Genuinely dependent child rows with no independent significance once the parent is gone, where the parent itself is realistically deletable in this system's design. | Given Section 17's rule that `users` is never hard-deleted, true `CASCADE` chains rooted at `users` are largely theoretical today; where used, it is for content genuinely meaningless without its parent, e.g. `messages` on a hard-purged `conversation` (a scoped, reviewed retention job — Section 36 — not ordinary application deletion) |
| **`SET NULL`** | Optional, weak references where the referencing row remains meaningful without the link. | `documents.reviewed_by` → `users.id` (a moderator leaving the platform should not delete the document review record — it should simply lose its "reviewed by whom" attribution) |

A database engineer proposing a new foreign key states which of the three behaviors applies and why, in the migration's PR description, whenever the choice is not obviously `RESTRICT` (the safe default for anything touching Section 43's financial tables).

---

### 27. Transaction Standards

- Any write that must be atomic across more than one statement is wrapped in `database.withTransaction()` (Arch §15's `transaction.helper.ts`), invoked by the **owning module of the operation** — never spread across two modules' code inside one transaction block (Arch §4.3).
- **Isolation level is chosen per operation, not globally**, per Spec §4.3: `SERIALIZABLE` for the escrow-initiation balance-check-then-deduct sequence (the single highest-risk read-then-write pattern in the system); `READ COMMITTED` for the less contention-sensitive confirmation-flag updates that follow.
- A transaction block does the minimum necessary work — it never holds a row lock across an external network call (an Agora token request, an OpenAI embedding call, an email send). Anything that can be deferred to a BullMQ job after the transaction commits, is deferred (Arch §1.2: *"All slow or non-critical-path work... is deferred to BullMQ workers — never performed inline in a request handler"*, which applies with even more force inside an open database transaction).
- Every multi-table financial write (escrow hold: balance check + ledger insert + transaction status update) is a single `withTransaction()` call inside `wallet`'s or `transactions`' repository — not two separate transactions that could leave the system in an inconsistent state if the process crashes between them.

---

### 28. Concurrency Guidelines

- **Row-level locking (`SELECT ... FOR UPDATE`)** is the default mechanism for read-then-write sequences on a single row (Spec §3.4 step 2: checking a recipient's balance before deduction).
- **Advisory locks (`pg_advisory_xact_lock(hashtext(user_id::text))`)** provide an additional, application-level serialization layer specifically for the wallet balance check → deduct sequence, per Spec §4.3 and Arch §13 rule 7 — this exists because row-level locking alone does not fully close every race window across all Postgres isolation-level interactions, and the ledger's correctness requirement (Section 43) does not accept "usually correct." The advisory lock is acquired and released entirely within the `wallet` module's `withTransaction()` call; no other module ever calls `pg_advisory_xact_lock` directly.
- **Idempotency keys** (`transactions.idempotency_key UNIQUE`) prevent duplicate transaction creation from network retries or double-submits at the application boundary — this is a concurrency guideline, not a redundant safety net, because it protects against a *different* failure mode (client-side retry) than row/advisory locking (server-side concurrent request) does; both are required, neither substitutes for the other.
- **No optimistic-locking (version-column) pattern is used anywhere in the current schema.** Given the explicit pessimistic-locking design already mandated for the one contention-critical path (wallet/transactions), introducing a second concurrency-control pattern elsewhere would add conceptual surface area without a corresponding need — any future table with a genuine "conflicting concurrent edits with automatic conflict detection" requirement should raise it to Robert rather than adding a `version Int` column by convention.

---

## Part V — Performance

### 29. Indexing Strategy

- **Every index named in Specification §4.2 exists in the table's initial migration** (restated from Section 20 as a standing indexing rule, not just a migration rule): `profiles (user_id)` unique, `profiles (reputation_score DESC)`, `profiles (last_active_at)`, `skills (search_vector)` GIN, `skills (user_id, is_active)`, `skills (category_id, is_active)`, `transactions (initiator_id, status)`, `transactions (provider_id, status)`, `transactions (confirmation_deadline)`, `skill_points_ledger (user_id, created_at DESC)`, `messages (conversation_id, sent_at)`, `notifications (user_id, is_read)`, `documents (user_id, status)`, `user_badges (user_id)`.
- **Composite index column order:** the most selective / equality-filtered column first, the range/sort column last — `(user_id, status)` not `(status, user_id)`, because `status` alone has low cardinality (a handful of enum values) while `user_id` narrows to a single user's rows first.
- **Partial indexes** are used where a query pattern only ever targets a subset of rows — e.g., an index on `skills (user_id) WHERE is_active = true` is preferred over a full index if "active listings by user" dominates the access pattern and inactive listings are rarely queried by this path; the general composite index (`user_id, is_active`) remains the default unless profiling justifies the narrower partial index.
- **GIN indexes** are reserved for `tsvector` full-text search columns (Section 35) and, where introduced, `pg_trgm`-backed fuzzy-match columns — never applied to ordinary equality/range-filtered columns, where a B-tree is both sufficient and cheaper to maintain.
- **Every foreign key gets a supporting index** (Section 13), whether or not Spec §4.2 explicitly lists it — §4.2 documents the known hot-path indexes, not an exhaustive list; a database engineer does not treat §4.2's silence on a given FK as license to leave it unindexed.
- Indexes are never added speculatively "in case it's needed" — each index in a `DB-xx` module's initial migration traces to either an explicit Spec §4.2 entry, a documented access pattern in that module's service layer, or a foreign-key support requirement. An unused index has a real write-amplification cost and is a review-time question ("what query does this serve?"), not a free safety margin.

---

### 30. Unique Constraint Standards

- Applied wherever the business rule is a genuine uniqueness guarantee, never simulated via an application-level "check then insert": `users.email` (`UNIQUE`), `users.oauth_id` (`UNIQUE`, nullable), `profiles.user_id` (`UNIQUE`, Section 23), `transactions.idempotency_key` (`UNIQUE`), `refresh_tokens.token_hash` (`UNIQUE`, ADR-0003).
- A unique constraint spanning multiple columns (a composite unique constraint) is preferred over a composite primary key (Section 14) whenever the table already has, or should have, its own independent `id` — e.g., if a future table needed "one rating per (rater, transaction)" without the rating row itself being identified by that pair, the pair becomes a composite unique constraint, and `id` remains the PK.
- Nullable columns participating in a unique constraint follow Postgres's standard semantics (multiple `NULL`s do not violate uniqueness) — this is relied upon deliberately for `users.oauth_id` (many users have no OAuth account, hence many `NULL`s) and is never worked around with a sentinel non-null placeholder value.

---

### 31. Check Constraint Guidelines

`CHECK` constraints enforce invariants that are true by business definition, not just by "the application currently happens to only write valid values":

- `profiles.skill_points INTEGER DEFAULT 0 CHECK (skill_points >= 0)` — a negative balance is not a state the database will ever accept, regardless of what application code attempts (Spec §4.1.2).
- Enum-backed status columns rely on the Postgres/Prisma enum type itself as their constraint — no additional `CHECK` is needed on top of an enum column, since the enum type already rejects invalid values at the type level.
- Any table introducing a numeric column with a business-defined valid range (a rating `1`–`5`, a proficiency ranking, a percentage) declares a `CHECK` constraint for that range at the table level, rather than trusting the Zod validation layer (Arch §10.3) alone — Zod validates at the API boundary; the `CHECK` constraint validates every write, including ones that might one day bypass the API layer (an admin script, a data migration, a future internal service).
- `CHECK` constraints are kept simple (single-column range/set checks) — cross-column or cross-table invariants (e.g., "the sum of ledger entries for a user equals `profiles.skill_points`") are enforced by the trigger design in Section 43, not by an ever-more-elaborate `CHECK` expression.

---

### 32. Performance Optimization Standards

Restating Architecture §14's database-relevant rows as binding rules for every `DB-xx` module:

- Every index from Spec §4.2 exists in its owning table's *initial* migration, not added reactively (Section 20, Section 29).
- `SELECT`/`include` scoping is deliberate per query — Prisma's explicit `select` is used to prevent the over-fetching that a bare `findMany()` invites; a repository method returns exactly the columns its caller needs, not "the whole row, just in case."
- N+1 query patterns (a Prisma call inside a `.map()`/loop) are a review-blocking defect, not a follow-up optimization — batch via `include` or `findMany({ where: { id: { in: [...] } } })`.
- Redis (via `cache.CacheService`, Arch §4.4) wraps expensive aggregate reads only — leaderboards, category aggregations, platform-wide statistics — with a 5–60 minute TTL per Spec §2.8. **Transactional/ledger reads are never cached** — `wallet.getBalance()` and any read touching `skill_points_ledger` or `transactions` always hits PostgreSQL directly, given the financial-grade correctness requirement (Section 43); a stale cached balance is not an acceptable trade-off for read latency on this specific path.
- PgBouncer connection pooling (Arch §14) is assumed present in every environment, including local Docker Compose, so that pooling behavior is never first encountered as a surprise in staging.

---

### 33. Query Optimization Guidelines

- A repository method's name states the query's intent (`findActiveByCategory`, `findPendingConfirmations`), never a generic `query1`/`getData` — restating Architecture §10.1 as a database-layer discipline, since a poorly-named repository method is often the first sign that its underlying query is also poorly scoped.
- Every list-returning repository method is written with pagination in mind from the start (Section 34) — a method that returns "all rows matching X" without a `take`/`cursor` parameter is not shipped, even if the current data volume makes it harmless today.
- Aggregate/`COUNT`-heavy admin dashboard queries (Roadmap #16, `BE-17`) are scoped to use indexed columns for their `WHERE` clauses and are candidates for the Redis-cached-aggregate pattern (Section 32) rather than being run live against production tables on every dashboard load.
- Query plans for any new index or query pattern touching a `Critical`-risk table (`wallet`, `transactions`, `auth` — Master Plan §8.1) are reviewed with `EXPLAIN ANALYZE` as part of that module's PR, not assumed correct from schema design alone.

---

### 34. Pagination Standards

Per Architecture §9.3, restated here for its database implications:

- **Offset pagination** (`page`/`limit`) is used for admin tables and any list where jumping to an arbitrary page matters — backed by a standard `LIMIT`/`OFFSET` query against an indexed sort column (typically `created_at DESC` or the table's primary sort key).
- **Cursor pagination** (`cursor`/`limit`) is used for infinite-scroll feeds where concurrent inserts are expected — the Discover feed, chat message history, the community board — because offset pagination silently skips or duplicates rows under concurrent inserts, which these three feeds will experience constantly at any meaningful scale.
- A cursor-paginated query's cursor is built from the same column(s) the query is sorted and indexed on (typically `(created_at, id)` as a tie-broken composite cursor, to guarantee a stable total order even when multiple rows share a timestamp) — the cursor is never a raw `OFFSET` value in disguise.
- Every paginated repository method caps its `limit` server-side (a maximum page size, independent of what the client requests) to prevent a single request from forcing an unbounded table scan.

---

### 35. Full-Text Search Guidelines

Approved per Spec §2.3.4 and Arch §3.1 (`search` module): PostgreSQL native full-text search (`tsvector`/`tsquery`) at launch, with a defined extraction seam toward Elasticsearch/OpenSearch when the user base exceeds roughly 50,000 profiles or search latency degrades (Spec §2.3.4).

- `skills.search_vector` is a `GENERATED ALWAYS AS (...) STORED` `tsvector` column (Spec §4.1.3), maintained by Postgres itself on every row write — not maintained by application code or a trigger, since Postgres's generated-column mechanism already provides this guarantee natively and correctly.
- The GIN index on `search_vector` (Section 29) is created in `skills`' initial migration, not deferred.
- `pg_trgm` is the approved extension for fuzzy/typo-tolerant matching (Spec §2.3.1's "pg_trgm for fuzzy search"), applied selectively (e.g., a trigram index on `profiles.display_name` or `skills.title`) only where a specific fuzzy-search requirement is confirmed by the owning module — not applied blanket across every text column, since trigram indexes carry a real storage and write cost.
- **The `search` module (`DB-14`) owns no source-of-truth data.** Its tables/projections are a read-optimized, rebuildable view over `skills` and `profiles` — formalizing what `skills`/`matching` already use directly (Arch §3.1: *"Owns no source-of-truth data — it is a read-optimized projection... rebuildable at any time"*). Any future migration to Elasticsearch replaces this projection's storage mechanism entirely; it does not change what any other module's schema looks like, which is the entire point of drawing the seam this way now.

---

## Part VI — Data Lifecycle & Compliance

### 36. Data Retention Strategy

- **Ledger and audit data (`skill_points_ledger`, `admin_logs`) is retained indefinitely** — these are the platform's financial and administrative record of truth; no automatic purge job ever runs against either table.
- **Transaction records (`transactions`) are retained indefinitely** for the same reason, and because `skill_points_ledger` rows reference them (Section 26's `RESTRICT` rule depends on this).
- **User accounts are never hard-deleted.** Per Spec §8.3, a GDPR/account-deletion request triggers **anonymization**, not row removal: PII fields (`email`, `display_name`, `bio`, `avatar_url`, `location`) are nulled or replaced with a placeholder, `is_banned`/an equivalent deactivation state is set, and every row referencing that `user_id` elsewhere in the schema remains intact and valid, preserving ledger and transaction integrity.
- **Chat messages, community posts, and similar user-generated content:** this constitution does **not** set a specific retention period (e.g., "purge after 24 months") because that is a legal/product policy decision, not a database-architecture one — Robert flags this as an open item for Erwin and product/legal review, following the same pattern the Master Development Plan used for C-1 through C-5. Until that ruling exists, no automatic content-purge job is built against any table, and `is_deleted`/soft-delete flags (Section 17) are the only mechanism in place.
- **Uploaded files (R2/S3)** follow the retention posture of the `documents`/`storage` modules' own review; rejected/quarantined files (Spec §8.4) are retained in a quarantine prefix pending security review, not immediately purged, so that a false-positive can be investigated.

---

### 37. Backup & Recovery Considerations

- **PostgreSQL:** the MVP hosting choice (Supabase managed Postgres, Arch §1's technology stack) provides point-in-time recovery (PITR) as a managed-tier capability; the scale-stage migration to AWS RDS (Spec §2.7.1) carries forward automated snapshotting and PITR as a non-negotiable requirement of any managed Postgres provider this platform uses — this is a hosting/`INFRA`/`DEPLOY` responsibility, not something enforced at the schema level, but this constitution records it as a standing requirement any `DEPLOY-xx` module must satisfy before production traffic is accepted (Master Plan §12 completion criteria).
- **Redis:** since Redis is explicitly a cache/queue layer and never the source of truth for durable data (Arch §1.1, this document's Section 32), it does not require the same backup rigor as PostgreSQL. However, because BullMQ queues carry in-flight critical async work (document-scan dispatch, email delivery, gamification event processing — Spec §2.9.2), Redis persistence (AOF or RDB, per the managed Redis provider's configuration) is enabled in every environment above local development, so that a Redis restart does not silently drop queued jobs.
- **Object storage (R2/S3):** versioning and a defined retention policy for credential documents is a `storage`/`documents` module requirement, tracked against Cloudflare R2's or AWS S3's native versioning features — not re-implemented at the Postgres layer. The `documents` table's `file_key` is the pointer of record; the underlying object's durability is the storage provider's responsibility per its SLA.
- **Recovery drills:** not specified by this document — a periodic backup-restore drill is a `DEPLOY`/operational runbook item (`DOC-04`), outside a Database Constitution's scope, but this document records the expectation that one exists before the platform is considered production-hardened (Master Plan §12).

---

### 38. Security Standards

Restating Architecture §13 and Specification §8 as binding database-layer rules:

- **Every controller input is validated at the boundary (Zod) before it reaches a service; services trust their inputs completely** (Arch §10.3) — the database layer's `CHECK` constraints (Section 31) exist as the *second*, not first, line of defense, for anything a future code path might write without going through today's validated controller.
- **No module writes to a table it does not own** (Section 5) — enforced by `check-boundaries.ts` in CI, not by code review alone.
- **Points movement is the highest-security-tier code path in the system** (Arch §13 rule 7) — restated fully in Section 43.
- **No security control is implemented ad hoc per module** — row-level authorization (a user editing "their" skill listing) is checked in the service layer against the authenticated user's ID, using the same ownership-check pattern across every module, never a one-off `WHERE` clause improvised per repository method.

---

### 39. Sensitive Data Handling

The following columns are classified **sensitive** and receive handling beyond the platform's baseline:

| Data | Table.Column | Handling |
|---|---|---|
| Password hash | `users.password_hash` | bcrypt, cost factor 12 (Spec §4.1.1, §8.2); never selected in a default Prisma query — repository methods that don't explicitly need it use `select` to exclude it (Section 32) |
| Refresh token | `refresh_tokens.token_hash` | Stored hashed, never in plaintext; the plaintext token exists only transiently in the httpOnly cookie (Arch §3.1, ADR-0003) |
| OAuth identifiers | `users.oauth_id` | Treated as PII-adjacent; excluded from any data export unless explicitly requested by the user themselves via the GDPR export endpoint (Spec §8.3) |
| Credential documents | `documents.file_key` (pointer only — file content lives in R2) | Private bucket prefix, backend-generated time-limited signed URLs only, never a public direct URL (Spec §8.4) |
| Chat message content | `messages.content` | Column-level encryption at rest (Section 40); never logged in plaintext by the application logging layer (Arch §6.7) |
| Location | `profiles.location` | City/region granularity only — no precise coordinates are ever stored, by design (Spec §8.3 data-minimization) |
| Ledger/financial detail | `skill_points_ledger.*` | Not classified "sensitive" in the PII sense, but subject to the same never-log-raw-detail discipline as any financial record, and to the immutability rule (Section 18, Section 43) |

Sensitive columns are never included in a bulk `SELECT *`-style query pattern (which this constitution already discourages generally, Section 32) and are never returned in an API response unless that specific field is the explicit purpose of the endpoint.

---

### 40. Encryption Guidelines

- **At rest:** `AES-256-GCM` for sensitive document metadata (Spec §8.2); column-level encryption for chat message content (Spec §8.3). The encryption key is managed via the platform's secrets manager (Arch §8.3), never stored alongside the encrypted data, and never hand-rolled per module — a single shared encryption utility (owned by `common/utils`, Arch §15) is used by any module that needs column-level encryption, so the scheme, key-rotation approach, and algorithm choice stay consistent across `chat` and `documents` rather than diverging.
- **In transit:** TLS 1.3 at the CDN/load-balancer layer (Arch §13.1) covers all database-bound traffic's upstream leg; the connection from `apps/api` to PostgreSQL uses TLS as provided by the managed hosting provider (Supabase/RDS) — this is a hosting-configuration requirement (`DEPLOY`/`INFRA`), asserted here as a standing expectation, not implemented at the schema level.
- **Password hashing is not "encryption"** and is never treated as reversible — bcrypt (cost 12) is a one-way hash; there is no code path, admin tool, or support workflow that recovers a user's original password, ever.
- **WebRTC media (SRTP/DTLS) and Agora's channel-level encryption** are call-infrastructure concerns (`calling` module), not database concerns — call session *records* (`DB-13`) store metadata about a call (participants, timestamps, channel identifiers), never media content, so no additional at-rest encryption requirement applies to that table beyond the platform baseline.

---

### 41. Data Validation Responsibilities

A clean division of responsibility, restated for the database layer specifically:

| Layer | Responsibility | Example |
|---|---|---|
| **Zod (`packages/validation`)** | Shape, format, and business-rule validation at the API boundary — the first and primary line of defense (Arch §10.3) | Email format, string length limits, required fields |
| **Prisma / TypeScript types** | Structural type safety between the database schema and application code — catches shape mismatches at compile time | A field renamed in `schema.prisma` breaks the build everywhere it's referenced |
| **PostgreSQL constraints (`CHECK`, `NOT NULL`, `UNIQUE`, foreign keys)** | The last line of defense — invariants that must hold **no matter what** wrote the row, including a future code path, an admin script, or a data migration (Section 31) | `skill_points >= 0`; `idempotency_key` uniqueness |

The database layer never assumes Zod already caught a problem and skips its own constraint as a result — the two layers are complementary, not redundant, per Architecture §13 rule 5's "both layers required, neither is sufficient alone" principle (stated there for sanitization, applied identically here to validation).

---

### 42. Multi-Tenancy Considerations

TalentSwap is **not multi-tenant at launch** — a single shared schema serves every user on the platform; there is no `tenant_id`/`organization_id` partitioning column on any table in the current domain matrix (Section 5), and none is added speculatively (Arch §10.2 KISS).

This is noted explicitly, rather than left silent, because the Proposal's medium-term roadmap (§11.2) names "Organisation accounts" as a future capability. When that capability is scoped as an actual `DB-xx`/`BE-xx` module, it will most likely introduce an `organizations` table and an optional `organization_id` foreign key on relevant tables (most plausibly `skills`, `community_posts`, and a new membership join table) — but that design happens at the time that module is built, against this constitution's standards, informed by the concrete requirements gathered then. Building speculative tenant-partitioning columns today, before the feature is scoped, is exactly the anti-pattern Architecture §10.2 warns against ("do not build the Phase 4 feature while implementing the Phase 1 requirement").

---

## Part VII — Domain-Specific Standards

### 43. Wallet & Financial Data Standards

This is the highest-scrutiny section of this constitution, matching the highest-scrutiny designation the rest of the project's governance already assigns to `wallet` and `transactions` (Arch §13 rule 7, Master Plan §8.1, two-reviewer requirement).

- **Double-entry, append-only ledger.** `skill_points_ledger` is the single source of truth for every SkillPoints movement. Every row is written once and never updated or deleted, for the life of the platform (Section 18, Section 36). `balance_after` is snapshotted at write time specifically so the ledger's history is independently reconstructable without trusting any denormalized total.
- **`profiles.skill_points` has exactly one write path, and it is not application code.** Per ADR-0004: the column is written **exclusively** by the `trg_sync_skill_points` `AFTER INSERT` trigger on `skill_points_ledger`. No module — not `wallet`, not `profiles`, not `admin` — ever issues a direct `UPDATE` against this column. This is enforced at two independent layers: the database layer (the trigger is the only writer in practice, by convention and code review) and the TypeScript layer (`profiles.repository.ts`'s update method's input type structurally excludes `skill_points`, so it is a compile error to attempt it, not just a review-time catch).
- **This is the one approved exception to Section 16's "no database triggers beyond `@updatedAt`" default posture.** It is approved specifically because the alternative — trusting every future code path that touches the ledger to also remember to update `profiles.skill_points` in the same transaction — has a real, recurring failure mode (a forgotten sync, at any of a dozen call sites over the project's life) that a single, one-time-authored trigger eliminates structurally. No second trigger is added to this schema without an ADR of the same weight as ADR-0004.
- **`profiles.skill_points` carries `CHECK (skill_points >= 0)`** (Section 31) as a final backstop, even though the intended design (pre-deduction escrow, Spec §3.4) should make a negative balance unreachable through the normal transaction flow.
- **Concurrency:** the balance-check-then-deduct sequence uses both row-level locking and an advisory lock (Section 28), and runs at `SERIALIZABLE` isolation (Section 27) — this combination, not any single mechanism alone, is what this project treats as sufficient for the escrow-initiation path.
- **Idempotency:** `transactions.idempotency_key` is `UNIQUE`, rejecting duplicate submission with a `409`-mapped conflict at the database layer, not merely at the application layer (Section 30).
- **Two-reviewer rule applies to every migration touching `skill_points_ledger`, `profiles.skill_points`-adjacent structure, or `transactions`**, without exception, per Section 49.
- **No caching of any balance or ledger read** (Section 32) — every balance display reflects the current committed state of PostgreSQL, never a Redis-cached value, regardless of the latency cost.

---

### 44. Analytics Data Guidelines

- **Denormalized counters are updated within the same transaction as their authoritative event, not recomputed by a separate cron job**, wherever the counter is cheap to maintain incrementally — `profiles.total_exchanges` is incremented as part of the same `withTransaction()` call that marks a `transactions` row `COMPLETED`, not recalculated later by a `COUNT(*)` sweep.
- **Expensive aggregates (leaderboards, category-level statistics, platform-wide dashboard metrics) live in Redis, not as materialized views in Postgres**, at this project's current scale — sorted sets for leaderboards (Spec §2.3.3), TTL-based caching for other aggregates (Section 32). Postgres materialized views are not introduced without a specific, profiled justification, since they add a refresh-scheduling concern this project does not yet need.
- **The `admin` module's analytics aggregation never queries another module's table directly.** Per Architecture §3.1, `admin` "never bypasses another module's guards — admin actions call the owning module's service." A cross-domain analytics dashboard (e.g., "exchange volume by category over time") is built by composing read calls to each owning module's public service, not by a raw multi-table `JOIN` written inside `admin`'s repository against tables it does not own. Where this genuinely cannot produce acceptable performance, the correct escalation is a purpose-built, explicitly-owned reporting/projection table (analogous to `DB-14`'s search projection) proposed to Robert and Erwin — not a boundary exception granted ad hoc.
- **No table in the current domain matrix (Section 5) exists solely for analytics.** Analytics is a read pattern over operational tables (plus Redis caching), not a separate persisted data model, at this project's current stage.

---

### 45. Logging & Audit Data Standards

- **`admin_logs` is the canonical, immutable audit record for administrative action** (Section 18) — `admin_id`, `action`, `target_type`, `target_id`, `metadata` JSONB, `created_at`. Every module whose data an admin action touches (a ban, a document approval, a manual point adjustment) is responsible for ensuring the corresponding `admin_logs` entry is written in the same transaction as the action itself, via the `admin` module's logging service — not as an afterthought written by a separate, best-effort process.
- **Application logs (Winston, Arch §6.7) and database audit tables are complementary, not duplicative.** Winston captures request-level, operational detail (method, path, status, duration, `requestId`) for debugging and observability; `admin_logs` and `skill_points_ledger` capture business-meaningful, permanent, queryable-by-the-business state changes. A database engineer does not attempt to make Postgres tables serve the high-volume, ephemeral role Winston/Loki already own, and does not rely on application logs to substitute for a proper audit table where one is required (any `Critical`/`High`-risk financial or moderation action).
- **Secrets are never persisted to any table, in any form**, matching Arch §6.7's logging rule extended to the database layer — no column in this schema ever stores a raw password, a raw refresh token, an API key, or a full credential-document's raw content; hashed/tokenized/pointer representations only.

---

### 46. AI-Related Data Storage Guidelines

- **pgvector is the approved vector-storage mechanism** (Spec §2.3.1, Arch §3.1 `matching` module, `AI-01`) — embedding columns are added directly to `skills` and `profiles` (the entities being matched), dimensioned to match the OpenAI `text-embedding-3-small` model's output (1536 dimensions), per `DB-08`'s scope.
- **Embeddings are never treated as source-of-truth data.** They are a derived, rebuildable representation of a skill's or profile's text content — if the embedding column is dropped and regenerated from scratch via the `AI-02` sync job, no information is lost that isn't already present in the owning row's text fields. This mirrors the `search` module's projection philosophy (Section 35) applied to vectors instead of `tsvector`.
- **`match_suggestions` is a cache table, owned by `matching`, containing no data that cannot be recomputed** (Arch §3.1: *"Never writes to any table it does not own (`match_suggestions` cache only)"*) — it is not indexed or retained as if it were durable business history; a TTL/refresh policy (owned by the `matching` module's service layer) governs its freshness, not this constitution.
- **Embedding generation is asynchronous, via BullMQ, never inline in a request handler** (Section 27's rule applied specifically to the OpenAI call latency/cost) — a skill or profile update enqueues a re-embedding job; it does not block the write that triggered it.
- **External AI-service failure never corrupts or blocks core data.** If the OpenAI embedding call fails or times out, the owning row's core fields (already validated and written) are unaffected; only the embedding column is stale until the retry succeeds — this is a `AI-xx` module Definition-of-Done requirement (Master Plan §11 DoD-AI: *"External API failure/timeout handled gracefully"*), stated here as the data-layer implication of that rule: no embedding column is ever `NOT NULL`, since a row must be able to exist validly before its embedding is computed.

---

## Part VIII — Process & Governance

### 47. Testing Standards

- **Every `TEST-xx` covering a `BE-xx` module that touches the database uses a real, isolated test-database transaction, rolled back after each test** (Arch §17.2 step 8, Master Plan DoD-TEST) — never a mocked Prisma client for anything that exercises a `CHECK` constraint, a unique constraint, a cascade rule, or the `trg_sync_skill_points` trigger; those guarantees are only meaningfully tested against a real PostgreSQL instance.
- **Migration correctness is tested by applying every migration forward, cleanly, to a scratch database** (Master Plan's DB Integration Queue exit gate, Section 9.1) — a migration that fails to apply cleanly to a fresh database blocks that module's PR, independent of whether the application-level tests pass.
- **Concurrency-critical paths (`wallet`, `transactions`) receive test coverage for the race conditions the locking strategy (Section 28) is specifically designed to prevent** — e.g., a test that fires two concurrent debit requests against the same balance and asserts exactly one succeeds when the balance is insufficient for both — not just happy-path single-request tests.
- **Seed data used in tests (Section 21) is isolated per test run** and never shared mutable state across parallel test suites, to avoid flaky cross-test interference on shared unique constraints (e.g., `users.email`).

---

### 48. Documentation Standards

- **Every `DB-xx` module updates an ERD note in `docs/architecture`** upon shipping (Master Plan §3.1's standard DB output: *"ERD note updated in `docs/architecture`"*) — a short, current description of the tables the module added, their relationships, and any non-obvious constraint rationale (why a particular `CHECK` exists, why a particular cascade behavior was chosen) that would not be obvious from the migration file alone.
- **`schema.prisma`'s own comment blocks (Section 4) are the primary in-schema documentation** — every non-obvious column (a JSONB payload's expected shape, a trigger's behavior, an advisory-lock hash input) carries an inline Prisma comment (`///`) rather than relying on tribal knowledge or a separate document that can drift out of sync.
- **No content is duplicated from this constitution or the Architecture Foundation into a module-level README** — a module's own documentation links back to the relevant section of `DB-CON-v1.0` or the Architecture Foundation rather than restating the rule, so that a future amendment to this document doesn't leave stale copies scattered across module READMEs (restating Master Plan's DoD-DOC rule for the database layer specifically).

---

### 49. Database Review Guidelines

- **Every `DB-xx` module requires Robert's (Database Architect) sign-off and Erwin's (Lead Architect) final approval**, per Architecture §7.3/§7.4's global review rule.
- **`DB-01`, `DB-04`, and `DB-05`** (the `auth`, `wallet`, and `transactions` schemas respectively) **require two reviewer approvals**, per Architecture §13 rule 7 and Master Plan §3.1 — no migration touching these tables' structure merges on a single approval, regardless of how small the change appears.
- **Review order, restated for the database layer specifically:** (1) does the change stay inside its Section 5 ownership boundary and pass `check-boundaries.ts`; (2) does it follow this constitution's naming, key, and constraint standards (Sections 6–31); (3) is the migration itself clean — generated, not hand-edited, forward-compatible (Section 20); (4) does the indexing strategy match the module's actual access patterns (Section 29, Section 33); (5) only then, is the business logic it supports correct.
- **A destructive change (dropped column, dropped table, narrowed constraint on existing data) is a "request changes" by default**, not a style nit, until the PR explicitly justifies why the destructive change is safe (Section 20).
- **Any cross-module direct-table access discovered in review is an automatic "request changes,"** restating Architecture §7.4's rule with no database-specific exception.

---

### 50. Definition of Done for Database Modules

A `DB-xx` module is not `Approved` (Master Plan §7.1 status legend) until every item below is satisfied, restating and consolidating Master Plan §11's DoD-DB additions alongside this constitution's own standards:

- [ ] Every table is namespaced under the correct owning-module comment block in `schema.prisma` (Section 4, Section 5).
- [ ] Table, model, enum, field, and relation naming match Sections 7–11 exactly.
- [ ] Primary keys, foreign keys, and any composite keys follow Sections 12–14.
- [ ] `created_at`/`updated_at` (where applicable) follow Section 16; `updated_at` uses `@updatedAt`, not a bespoke trigger, unless the module is `DB-04` implementing the one approved exception (Section 43).
- [ ] The correct lifecycle mechanism (Section 17) is used — no ad hoc `deleted_at` column invented outside the decision matrix.
- [ ] Every index named in Spec §4.2 for this table exists in the **initial** migration (Section 20, Section 29); every foreign key has a supporting index.
- [ ] Relevant `CHECK`/`UNIQUE` constraints are in place (Sections 30–31), not deferred to application-only validation.
- [ ] Cascade behavior (Section 26) is explicit and justified for every foreign key.
- [ ] The migration applies cleanly to a scratch database and has never been hand-edited post-application.
- [ ] `check-boundaries.ts` passes — no cross-module table access introduced.
- [ ] An ERD note is added/updated in `docs/architecture` (Section 48).
- [ ] e2e tests exist using a real, rolled-back test-database transaction (Section 47).
- [ ] For `DB-01`/`DB-04`/`DB-05`: two reviewer approvals obtained (Section 49); for every other module: Robert's sign-off plus Erwin's final approval.

---

### 51. Future Database Module Development Rules

- **This document governs every `DB-xx` module that exists today (DB-01 through DB-15) and every database module proposed after it**, including capabilities named only in the Proposal's medium/long-term roadmap (§11.2–11.3) that have not yet been scoped into a `DB-xx` ID — organisation accounts, multi-party chain exchanges, cross-community SkillPoints portability, and similar.
- **A genuinely new table or structural pattern that does not fit this constitution's existing rules is not resolved by quietly deviating inside one module's PR.** Per Architecture §17.5 and AI SDLC §1, it is raised as one of: (a) a request for explicit approval if it is a minor extension of an existing rule, (b) a flagged critical architectural issue if it affects the critical path or a `Critical`-risk module, or (c) a formal ADR if it changes a rule stated in this document. This constitution's own version number (currently `v1.0`) only advances alongside a corresponding ADR and Change Log entry (Section 19).
- **Multi-tenancy (Section 42), the Elasticsearch search extraction (Section 35), Redis-vs-Postgres aggregate placement changes (Section 44), and the notifications/transactions microservice extraction (Arch §2.2, Spec §2.9.1)** are named in advance here specifically because they are foreseeable triggers for a future amendment — a database engineer encountering the early signs of any of these (a scale threshold, a new tenant-shaped requirement) should treat that as the cue to raise a Section 51 event, not to solve it locally.
- **No future module introduces a second persistence technology** (a document store, a second SQL engine, a dedicated time-series database) without an ADR explicitly justifying why PostgreSQL 16 plus Redis 7 — the two approved, locked technologies — cannot serve the requirement, per this document's opening constraint and Architecture §1.2's single-database-per-stage philosophy.
- **Every future `DB-xx` module inherits this document's Definition of Done (Section 50) unmodified** unless a specific item is explicitly waived by Robert and Erwin together, recorded in this document's Change Log, not silently skipped by an individual module's PR.

---

## Glossary

| Term | Meaning in this document |
|---|---|
| **ADR** | Architecture Decision Record — the formal mechanism (per AI SDLC §1) for amending a frozen or authoritative document, including this one |
| **Advisory lock** | A PostgreSQL application-level lock (`pg_advisory_xact_lock`) used to serialize a critical section across concurrent transactions, independent of row-level locks |
| **Append-only** | A table whose rows are only ever inserted, never updated or deleted, after creation |
| **Boundary (module boundary)** | The set of tables and operations a given backend module is exclusively permitted to read/write directly, per Architecture §3.1 |
| **Comment block namespacing** | The `// === <module> module ===` convention used to group each module's models within the single `schema.prisma` file |
| **Composite key** | A primary key or unique/index constraint spanning more than one column |
| **Domain matrix** | This document's Section 5 table mapping each `DB-xx` module to its owning backend module and tables |
| **Ledger** | `skill_points_ledger` — the append-only, double-entry record of every SkillPoints movement |
| **Projection** | A read-optimized, rebuildable derived view over source-of-truth data (e.g., the `search` module's tsvector projection), owning no data of its own |
| **RESTRICT / CASCADE / SET NULL** | The three `ON DELETE` foreign-key behaviors used in this schema, per Section 26's decision table |
| **Two-reviewer rule** | The requirement (Arch §7.3, §13 rule 7) that changes to `auth`, `wallet`, or `transactions` receive two independent approvals before merge |

---

## Change Log

| Version | Date | Change | Author | Status |
|---|---|---|---|---|
| `v1.0` | 2026-08-04 | Initial publication of the Database Constitution, covering all 51 required standards areas, derived from and subordinate to Architecture Foundation v1.1 (including ADR-0002 through ADR-0005) | Robert — Database Architect | **Ratified** — approved by Erwin (Lead Architect) per Arch §7.3/§7.4 |

Amendments to this document follow the Master Development Plan §10 Change Management Process and are only ever made per AI SDLC §1 Governance Rules (explicit approval, a critical architectural issue, or a formal ADR). No `DB-xx` module's PR may modify this constitution as a side effect of its own review.

---

_This document defines standards only. It designs no schema, writes no Prisma model, generates no SQL, and creates no migration. Every future `DB-xx` module is built against it — not around it._

**— End of Database Constitution (DB-CON-v1.0) —**
