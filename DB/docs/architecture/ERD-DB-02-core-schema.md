# ERD Note — "DB-02: Core Database Schema" (users, refresh_tokens, profiles)

Per DB-CON-v1.0 §48, this note accompanies the migration in
`apps/api/prisma/migrations/20260809020000_core_users_auth_profiles_schema/`.
It is a short, current description of the tables this delivery added,
their relationships, and non-obvious constraint rationale that would not
be obvious from the migration file alone. See
`docs/database/DB-02-implementation-notes.md` for the full module hand-off
(scope decisions, conflict resolutions, validation log).

## Entities

```
┌─────────────────────────┐
│ users                    │
│───────────────────────── │
│ id               UUID PK │
│ email            VARCHAR │  UNIQUE
│ password_hash    VARCHAR?│  nullable — OAuth-only accounts
│ role             ENUM    │  user_role
│ is_email_verified BOOL   │
│ is_banned        BOOL    │
│ oauth_provider   VARCHAR?│
│ oauth_id         VARCHAR?│  UNIQUE (nullable)
│ created_at       TSTZ    │
│ updated_at       TSTZ    │
└─────────────┬────────────┘
              │ 1
              │
      ┌───────┴────────┐
      │                │
      │ 1:N             │ 1:1
      ▼                ▼
┌──────────────────┐  ┌───────────────────────────┐
│ refresh_tokens     │  │ profiles                    │
│───────────────────│  │─────────────────────────── │
│ id           UUID PK│  │ id                UUID PK  │
│ user_id      UUID FK│  │ user_id           UUID FK  │  UNIQUE (1:1)
│ token_hash   VARCHAR│  │ display_name      VARCHAR  │
│              UNIQUE │  │ bio               TEXT?    │
│ family_id    UUID   │  │ avatar_url        VARCHAR? │
│ is_revoked   BOOL    │  │ location          VARCHAR? │
│ replaced_by_ │  ┐    │  │ skill_points      INT      │  CHECK >= 0
│  token_id    UUID? │◄─┘ (self-FK, SET NULL)          │  (write path: none yet — DB-04)
│ expires_at   TSTZ   │  │ reputation_score  DEC(3,2)  │  CHECK 0.00–5.00
│ created_at   TSTZ    │  │ total_exchanges   INT      │  CHECK >= 0
└──────────────────┘  │ is_verified       BOOL      │
                       │ verification_badge VARCHAR? │
                       │ experience_level  ENUM      │  experience_level
                       │ experience_points INT       │  CHECK >= 0
                       │ last_active_at    TSTZ?     │
                       │ created_at        TSTZ      │
                       │ updated_at        TSTZ      │
                       └───────────────────────────┘
```

## Relationships

| Relationship | Cardinality | On Delete | Rationale |
|---|---|---|---|
| `refresh_tokens.user_id → users.id` | N:1 | `CASCADE` | Refresh tokens are dependent security-session artifacts with no meaning independent of the user (DB-CON-v1.0 §26). Practically dormant given §36's anonymize-not-delete policy for `users`, but structurally the correct choice per §26's decision table. |
| `refresh_tokens.replaced_by_token_id → refresh_tokens.id` | self, N:1 (optional) | `SET NULL` | Weak, optional reference — the token that replaced this one; DB-CON-v1.0 §26's `documents.reviewed_by` pattern applied to token rotation. |
| `profiles.user_id → users.id` | 1:1 | `CASCADE` | DB-CON-v1.0 §23's own canonical one-to-one example: "a profile cannot meaningfully exist without a user." |

## Enums

| Enum (Prisma) | DB type name | Members |
|---|---|---|
| `UserRole` | `user_role` | `USER`, `VERIFIED_USER`, `MODERATOR`, `ADMIN` |
| `ExperienceLevel` | `experience_level` | `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `CHAMPION` |

## Indexes

| Index | Table | Type | Why |
|---|---|---|---|
| `users_email_key` | `users` | UNIQUE btree | Login lookup; Spec §4.1.1 |
| `users_oauth_id_key` | `users` | UNIQUE btree (nullable) | OAuth account linking; Spec §4.1.1 |
| `refresh_tokens_token_hash_key` | `refresh_tokens` | UNIQUE btree | Token verification lookup; ADR-0003 |
| `refresh_tokens_user_id_family_id_idx` | `refresh_tokens` | btree, composite | Family lookup / reuse-detection scan; ADR-0003 |
| `refresh_tokens_expires_at_idx` | `refresh_tokens` | btree | Expiry cleanup job scan; ADR-0003, DB-CON-v1.0 §16 |
| `refresh_tokens_replaced_by_token_id_idx` | `refresh_tokens` | btree | FK support index (DB-CON-v1.0 §13) — not covered by the composite index above |
| `profiles_user_id_key` | `profiles` | UNIQUE btree | 1:1 enforcement; Spec §4.2 |
| `profiles_reputation_score_idx` | `profiles` | btree, DESC | Match-ranking / leaderboard queries; Spec §4.2 |
| `profiles_last_active_at_idx` | `profiles` | btree | Activity filtering / streak calculation; Spec §4.2 |

## CHECK constraints (raw SQL — see "Non-obvious decisions" below)

| Constraint | Table.Column | Rule |
|---|---|---|
| `profiles_skill_points_non_negative` | `profiles.skill_points` | `>= 0` |
| `profiles_reputation_score_range` | `profiles.reputation_score` | `>= 0.00 AND <= 5.00` |
| `profiles_total_exchanges_non_negative` | `profiles.total_exchanges` | `>= 0` |
| `profiles_experience_points_non_negative` | `profiles.experience_points` | `>= 0` |

## Non-obvious decisions

1. **Why this migration adds `users`/`refresh_tokens`, not just `profiles`.**
   See `docs/database/DB-02-implementation-notes.md` for the full
   explanation — in short, the table this repository's history labeled
   "DB-01" never actually delivered schema (only infrastructure), and
   `profiles.user_id` cannot exist without `users` existing first.

2. **`password_hash` is nullable**, despite Technology Specification
   §4.1.1's constraints column literally saying `NOT NULL` — that same
   row's own description says "NULL for OAuth-only accounts," a
   self-contradiction in the source document. Resolved in favor of
   nullable; OAuth-only registration is an explicitly approved pathway
   (Architecture Foundation §2.2.4) that would be structurally impossible
   otherwise.

3. **`is_email_verified`, not `email_verified`.** Technology
   Specification §4.1.1's raw column name lacks the `is_` prefix its own
   sibling column (`is_banned`) already carries. DB-CON-v1.0 §10's
   boolean-prefix rule is binding and applies to persisted columns, so
   the column was renamed; no behavior or meaning changes.

4. **`skill_points`'s `CHECK` exists even though nothing writes a
   non-default value to it yet.** The column's sole application write
   path is the `trg_sync_skill_points` trigger, which ships with the
   future `DB-04`/`wallet` module (ADR-0004) — out of this delivery's
   scope. The `CHECK` constraint is added now, in this table's *initial*
   migration, per DB-CON-v1.0 §20/§29's "every constraint/index exists in
   the initial migration, not added reactively" rule — so it is already
   in place, tested, and unremarkable by the time `DB-04` needs it.

5. **`reputation_score`'s range CHECK (0.00–5.00)** is new relative to
   what Technology Specification §4.1.2's constraints column literally
   states (blank) — justified under DB-CON-v1.0 §31's explicit "a rating
   1–5" business-defined-range example, applied to this column's own
   documented bounds ("Rolling weighted average... (0.00–5.00)").

6. **CHECK constraints were added as hand-written raw SQL**, appended to
   the migration file after the Prisma-schema-generated DDL. Prisma
   Schema Language (as pinned in this project, `prisma@^5.19.1`) has no
   declarative `@check`/`@@check` syntax. DB-CON-v1.0 §3/§20 explicitly
   sanction exactly this workaround (its own examples: the future
   `trg_sync_skill_points` trigger, `pg_advisory_xact_lock` calls) for
   anything Prisma cannot express declaratively.

## Validated against

A real PostgreSQL 16 instance (matching Architecture Foundation's pinned
version), since the sandbox this migration was authored in has no network
route to `binaries.prisma.sh` and could not run `prisma migrate dev`/
`prisma generate` (see `docs/database/DB-02-implementation-notes.md`,
"Validation status," for the full log). The migration file applied with
zero errors; every constraint, cascade, and index behaved as designed
under direct SQL testing (duplicate email/oauth_id rejection, negative
`skill_points`/out-of-range `reputation_score` rejection, 1:1 profile
enforcement, orphan-profile rejection, refresh-token rotation chain via
the self-referencing FK, composite-index usage confirmed via `EXPLAIN`,
and `ON DELETE CASCADE` confirmed end-to-end from `users` through to
`profiles` and `refresh_tokens`).
