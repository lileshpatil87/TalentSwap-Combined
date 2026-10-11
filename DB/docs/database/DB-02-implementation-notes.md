# "DB-02 — Core Database Schema" — Implementation Notes

Written 2026-08-09, delivered against the current monorepo state (Foundation
infra + FE-01 shell, no domain schema, no BE-02/FE-02 present). Mirrors the
hand-off style already established in this folder (`DB-01-merge-notes.md`,
`DB-01-reconciliation.md`) — flag decisions and conflicts explicitly rather
than resolving them silently, per AI SDLC §1 governance.

## 1. Scope reconciliation — read this first

The task brief for this session is titled **"DB-02 — Core Database
Schema"** and describes it as establishing "the stable database
foundation on which future backend feature modules can build," explicitly
distinguishing **core entities** from feature-specific and future
entities. This delivery implements `users`, `refresh_tokens`, and
`profiles`.

That is **not** a literal match to the Master Development Plan §3.3 /
DB-CON-v1.0 §5 domain registry, which assigns:

- `DB-01` → `users`, `refresh_tokens` (owned by `users`/`auth`)
- `DB-02` → `profiles` only (owned by `profiles`)

Here is why this delivery covers both, rather than only the registry's
literal `DB-02`:

1. **The module actually labeled `DB-01` in this repository's history
   never delivered schema.** `docs/database/DB-01-merge-notes.md` and
   `DB-01-reconciliation.md` (already in this folder, written 2026-08-08)
   document that the "DB-01" delivery was infrastructure only —
   `PrismaService`, `TransactionHelper`, health indicators — equivalent to
   Architecture Foundation Roadmap #0 (`FOUND-03`), not Roadmap #1 (Auth's
   `users`/`refresh_tokens` schema). `docs/architecture/MERGE_NOTES.md` §4
   independently flagged this exact module-ID mismatch: *"all three domain
   deliveries flagged that their work maps to `FOUND-01/02/03/04/05/07/08`
   ..., not the `DB-01`/`BE-01`/`FE-01` labels used in their filenames."*
   Confirmed directly by inspection: `apps/api/prisma/schema.prisma`
   contained zero models before this delivery, and
   `apps/api/prisma/migrations/` did not exist.
2. **`profiles.user_id` is a mandatory, `UNIQUE` 1:1 foreign key into
   `users`** (Technology Specification §4.1.2; DB-CON-v1.0 §23). A
   `profiles` table cannot be created, migrated, or validated without a
   `users` table already existing to reference. There was no way to
   deliver "DB-02" in the registry's literal sense without also delivering
   the real "DB-01" first, in the same session.
3. **`refresh_tokens` is included alongside `users`** because ADR-0003
   requires it to ship in the *same initial migration* as `users`
   (Master Development Plan §3.3 `DB-01` row: *"required in `DB-01`'s
   initial migration"*) — it is not a separable follow-up.

**Net effect:** this delivery satisfies the Master Development Plan's
`DB-01` and `DB-02` module rows simultaneously. Per this project's own
Section 10 Change Management Process (Master Development Plan), status
tracking in `TalentSwap_Master_Development_Plan.md` §7.2 is Jacob's
document to update — not edited here, consistent with how the prior
Foundation merge handled the identical class of naming discrepancy (see
`docs/database/DB-01-merge-notes.md`'s own "Root cause" section and
`apps/api/README.md`'s "⚠️ Two open items flagged for Erwin / Jacob, not
resolved here"). **Flagging for Jacob/Erwin:** once reviewed, `DB-01`
(Users & Auth Schema) and `DB-02` (Profiles Schema) rows in the Master
Tracking Table (§7.2) should both move to `Review`/`Approved` off the
back of this one delivery, and `DB-04`'s `Depends On` (currently listed
as `DB-02`) is now unblocked at the schema-dependency level (implementation
of `DB-04` itself — the ledger table and `trg_sync_skill_points` trigger —
remains a separate, not-yet-started module).

## 2. What is explicitly NOT in this delivery

Per the task brief's scope discipline ("respect boundaries between core
entities, feature-specific entities, future entities") and the Master
Development Plan §2 roadmap, the following were deliberately **not**
added, even though they are common in similar platforms:

- `skills` / `skill_categories` (Roadmap #4, `DB-03`) — feature-specific,
  depends only on Users & Profiles, not part of the core identity model.
- `skill_points_ledger` and the `trg_sync_skill_points` trigger (Roadmap
  #5, `DB-04`) — explicitly named in ADR-0004 and DB-CON-v1.0 §5 as a
  separate module; `profiles.skill_points` is created here as a plain
  `INTEGER DEFAULT 0` column with its `CHECK (>= 0)` backstop only, per
  ADR-0004's own text: *"The `trg_sync_skill_points` trigger that
  populates it ships in `DB-04`, not here."*
- `transactions`, `notifications`, `chat`, `matching`, `ratings`,
  `gamification`, `documents`, `community`, `calling`, `search`, `admin`
  tables — all later Roadmap modules (#6–#16), out of scope per the task's
  explicit DO NOT IMPLEMENT list (marketplace/booking/wallet/transaction/
  chat/community/notification/AI/admin logic).
- Any NestJS module, controller, service, or DTO for `users`/`auth`/
  `profiles` — those are `BE-02`/`BE-03`'s scope (Auth Module, Profiles
  Module per Master Development Plan §3.4). This delivery touches only
  `apps/api/prisma/` and documentation; `apps/api/src/modules/` was not
  created or modified.
- Seed data for `users`/`profiles` — see §4 below.
- `packages/types` domain type files (`user.types.ts`, etc.) — per
  Master Development Plan §3.1's standard I/O table, these are `BE-xx`
  outputs, not `DB-xx` outputs; DB-CON-v1.0's own standard DB output list
  (§2, §48) is Prisma models + migration + ERD note, nothing in
  `packages/`.

## 3. Conflicts identified and how they were resolved

Per the task brief: *"If an existing implementation conflicts with an
approved architecture document: STOP and identify the conflict before
making an architectural change. Do not silently redesign the
architecture."* Two internal *document* conflicts (not conflicts with
existing code, since no schema code existed yet) were found and resolved
with DB-CON-v1.0's own conflict-resolution discipline (§6); both are
documented inline in `schema.prisma` as `///` comments at the point of
resolution, not just here:

| # | Conflict | Resolution |
|---|---|---|
| 1 | Technology Specification §4.1.1's `users.password_hash` row states constraint `NOT NULL`, but the same row's description says *"NULL for OAuth-only accounts"* — a self-contradiction within the Specification itself. | Made nullable. A `NOT NULL` constraint would make OAuth-only registration (an approved pathway, Architecture Foundation §2.2.4/§13) structurally impossible; the description is the more specific, intent-revealing statement. |
| 2 | Technology Specification §4.1.1 names the column `email_verified` (no `is_` prefix), but DB-CON-v1.0 §10 states a binding rule that persisted boolean columns are prefixed `is`/`has` — and the Specification's own sibling column on the same table, `is_banned`, already follows that prefix. | Renamed to `is_email_verified`. No meaning change, only the column name; resolved in favor of the more specific, later, binding DB-CON-v1.0 naming rule over the Specification's inconsistent illustrative name. |

Neither of these rose to a "critical architectural issue" (AI SDLC §1
condition 2) or required a new ADR — both are narrow, well-precedented
naming/nullability resolutions of exactly the kind DB-CON-v1.0 §6
anticipates ("Where the Technology Specification's table definitions...
use a naming style that conflicts with this section... the Architecture
Foundation's binding convention governs").

No conflicts were found between this delivery and any **existing code** —
`schema.prisma` had no models to conflict with, and `PrismaService`/
`TransactionHelper` (Foundation infra) were used exactly as delivered,
unmodified.

## 4. Seed data — deliberately not added

DB-CON-v1.0 §21 and the task brief's SEED DATA section both permit
representative fake data for local/CI environments, but this delivery
adds **none** for `users`/`profiles`. Reasoning:

- Seeding a usable test account requires a real bcrypt hash, and password
  hashing (cost-factor choice, hashing utility) is `auth`/`BE-02`'s
  concern, not a database-schema concern — pre-empting that would cross
  into "Authentication logic," which the task brief's DO NOT IMPLEMENT
  list explicitly excludes.
- The task brief explicitly says never to insert data that "creates
  misleading business assumptions"; a schema-module-authored fake user
  account, ahead of `auth` existing, risks exactly that.
- `prisma/seed.ts`'s existing placeholder/contract-only pattern (already
  established by the Foundation delivery) was extended with a commented
  convention example for `users`/`profiles`, consistent with how it
  already documents the pattern for `skills`/`gamification` — no actual
  `prisma.user.upsert(...)` call was added. See the updated file's
  `// === users / profiles modules (convention only — no seed rows yet) ===`
  section.

## 5. Validation status

**`prisma generate` / `prisma migrate dev` could not be run** in the
sandbox this delivery was built in — confirmed identical to the failure
already documented in `docs/architecture/MERGE_NOTES.md` §3.5 for the
prior Foundation merge:

```
$ npx prisma generate
Error: Failed to fetch sha256 checksum at
https://binaries.prisma.sh/all_commits/.../libquery_engine.so.node.gz.sha256
- 403 Forbidden
```

`curl -D - https://binaries.prisma.sh` returns `403` with response header
`x-deny-reason: host_not_allowed` — this is a sandbox network-egress
policy, not a code defect. `pnpm install` at the workspace root **did**
succeed (`registry.npmjs.org` is reachable), confirming the monorepo's
dependency graph (including `apps/api`'s `@prisma/client`/`prisma`
packages) resolves cleanly; only the post-install engine-binary fetch is
blocked.

Given this, the migration SQL in
`apps/api/prisma/migrations/20260809020000_core_users_auth_profiles_schema/migration.sql`
was **hand-authored** to match exactly what `prisma migrate dev` would
generate from `schema.prisma` (verified against Prisma's documented
default naming algorithm for tables/indexes/constraints), with the
`CHECK` constraints Prisma cannot express declaratively appended as raw
SQL in a clearly marked final section — the same documented workaround
DB-CON-v1.0 §3/§20 already sanctions for exactly this class of gap.

**This was then validated for real**, not just reviewed by inspection:
`postgresql-16` (`archive.ubuntu.com`, matching Architecture Foundation's
pinned Postgres version exactly) was installed directly in the sandbox,
and the hand-written `migration.sql` was applied against a real,
empty `talentswap_dev` database with `psql -v ON_ERROR_STOP=1`:

- ✅ Migration applied end-to-end with **zero errors** — every
  `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE ... ADD
  CONSTRAINT` statement succeeded in order.
- ✅ `\d users` / `\d refresh_tokens` / `\d profiles` confirmed every
  column, type, default, index, and constraint matches the Prisma schema
  exactly (see `ERD-DB-02-core-schema.md` for the full column-by-column
  listing).
- ✅ Functional tests run directly against the live schema:
  - OAuth-only insert (`password_hash IS NULL`, `oauth_id` set) succeeds.
  - A second, independent OAuth-less user with `oauth_id IS NULL` also
    succeeds (confirms Postgres's multi-NULL unique-constraint semantics
    work as DB-CON-v1.0 §30 relies on).
  - Duplicate `email` → rejected (`users_email_key` violation).
  - Duplicate `oauth_id` → rejected (`users_oauth_id_key` violation).
  - `profiles.skill_points = -5` → rejected
    (`profiles_skill_points_non_negative` violation).
  - `profiles.reputation_score = 5.50` → rejected
    (`profiles_reputation_score_range` violation).
  - A second `profiles` row for the same `user_id` → rejected
    (`profiles_user_id_key` violation — 1:1 enforced).
  - A `profiles` row for a nonexistent `user_id` → rejected
    (`profiles_user_id_fkey` violation — no orphaned profiles possible).
  - Refresh-token rotation (`token_1` → `token_2`, `replaced_by_token_id`
    self-reference, `is_revoked` flip) round-tripped correctly.
  - `EXPLAIN` on a `(user_id, family_id)` lookup confirmed the query
    planner actually selects the `refresh_tokens_user_id_family_id_idx`
    composite index, not a sequential scan.
  - `pg_advisory_xact_lock(hashtext(...))` (the exact call
    `TransactionHelper.withAdvisoryLock()` issues) executes successfully
    against this schema, confirming forward-compatibility with the
    existing Foundation-delivered advisory-lock helper.
  - `DELETE FROM users WHERE email = ...` correctly cascaded away the
    user's `profiles` row and both of their `refresh_tokens` rows in one
    statement, confirming `ON DELETE CASCADE` end-to-end.

**Required follow-up, stated plainly:** the next session with normal
network access must run
`pnpm --filter @talentswap/api exec prisma generate` and
`pnpm --filter @talentswap/api exec prisma migrate dev` (or
`prisma migrate deploy` in CI/staging) against this schema. Because the
hand-written SQL was authored to match `schema.prisma` exactly, the
expected outcome is "already in sync" with **no further changes
proposed** — if Prisma's engine proposes any diff at all when run for
real, that is genuine drift introduced by the hand-authoring process in
this sandbox and must be resolved (most likely by regenerating a fresh
migration and diffing it against this one) before this module is marked
`Approved` in the Master Tracking Table.

TypeScript/lint/build checks across the rest of the monorepo were also
re-run after this delivery (see the top-level summary for this session)
to confirm nothing outside `apps/api/prisma/` was affected — this
delivery does not touch `apps/api/src/`, so no application code changes
needed re-verification beyond confirming the workspace still installs
and typechecks as it did before this session.

## 5a. Additional finding — flagged, not fixed (out of DB-02 scope)

While attempting to run the e2e test suite for validation (§5), a
`prisma generate` invocation partially succeeded before hitting the
network-blocked engine-binary fetch: it wrote Prisma's untyped fallback
client stub (`PrismaClient: any`, `dmmf: any` — the shim Prisma emits so
`import { PrismaClient } from '@prisma/client'` doesn't hard-crash before
a real `generate` has run) into `node_modules/.pnpm/.../  .prisma/client`.
This is a `node_modules` artifact only — it is **not** part of this
delivery and is excluded from the shipped ZIP along with the rest of
`node_modules`.

With that stub in place, `apps/api`'s e2e suite (`test/app.e2e-spec.ts`)
got past its previous `Cannot find module '.prisma/client/default'`
failure and reached a **different, later** failure:

```
Nest can't resolve dependencies of the GlobalExceptionFilter (?). Please
make sure that the argument "winston" at index [0] is available in the
AppModule context.
```

**This was verified to be pre-existing and unrelated to DB-02**, not
something this delivery introduced: the identical fallback stub was
copied into a completely separate, freshly-extracted copy of the
*original, unmodified* project ZIP (no `schema.prisma` changes, no new
migration, nothing from this session), and the exact same
`GlobalExceptionFilter`/`winston` dependency-resolution failure occurred
there too, byte-for-byte identical error text. The Foundation delivery's
`AppModule`/`GlobalExceptionFilter`/Winston-logger wiring has a latent
DI issue that a normal fresh install simply never surfaces, because the
*earlier* `Cannot find module '@prisma/client'` failure masks it first.

This is Backend Foundation wiring (`apps/api/src/common/filters/`,
`apps/api/src/app.module.ts`, and/or wherever `WinstonModule`/
`WINSTON_MODULE_PROVIDER` is registered) — entirely outside
`apps/api/prisma/`, and squarely inside the task brief's DO NOT IMPLEMENT
list ("Backend services," "Controllers," "Do not modify unrelated
application code"). **Flagged for Erwin/Lilesh, not fixed here.** No file
under `apps/api/src/` was touched by this delivery.

## 6. Files touched

| Path | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Added `User`, `RefreshToken`, `Profile` models + `UserRole`, `ExperienceLevel` enums. Header comment rewritten to reflect the delivery and the naming reconciliation in §1 above. |
| `apps/api/prisma/migrations/migration_lock.toml` | New — Prisma's required provider-lock file (`postgresql`). |
| `apps/api/prisma/migrations/20260809020000_core_users_auth_profiles_schema/migration.sql` | New — hand-authored migration, see §5. |
| `apps/api/prisma/seed.ts` | Extended with a commented `users`/`profiles` convention section (no data rows added — see §4). |
| `docs/architecture/DB-CON-v1.0_Database_Constitution.md` | New — fills the gap flagged in `docs/architecture/MERGE_NOTES.md` §4 ("never delivered as files"). |
| `docs/architecture/ERD-DB-02-core-schema.md` | New — ERD note per DB-CON-v1.0 §48. |
| `docs/database/DB-02-implementation-notes.md` | New — this file. |

Nothing under `apps/api/src/`, `apps/web/`, `packages/`, or
`infrastructure/` was modified.
