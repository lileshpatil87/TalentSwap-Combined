# TalentSwap ERD Notes — DB-03 through DB-17

This cumulative ERD note records the database entities and non-obvious relationships added by the
DB prompt sequence. It is intentionally database-only and complements the authoritative
`TalentSwap_Specification.md` catalogue.

## Relationship inventory

```text
users
 ├── profiles (1:1, user_id UNIQUE)
 ├── refresh_tokens (1:N, cascade)
 ├── skills (1:N, cascade)
 ├── skill_points_ledger (1:N, restrict)
 ├── transactions (1:N as initiator, 1:N as provider, restrict)
 ├── messages (1:N sender, restrict)
 ├── notifications (1:N, cascade)
 ├── documents (1:N owner, cascade; reviewer optional)
 ├── user_badges (1:N, cascade)
 ├── activity_streaks (1:1, cascade)
 ├── ratings (1:N rater, 1:N ratee, restrict)
 ├── community_posts (1:N, restrict)
 ├── admin_logs (1:N, restrict)
 └── call_sessions (1:N initiator/provider, restrict)

skill_categories
 ├── skills (1:N, SET NULL)
 └── community_posts (1:N, SET NULL)

skills
 ├── transactions (1:N, restrict)
 ├── generated search_vector (DB-14, GIN)
 └── embedding vector(1536) (DB-16/17, HNSW cosine)

transactions
 ├── skill_points_ledger (1:N, restrict)
 ├── ratings (1:N, restrict)
 └── call_sessions (1:N, SET NULL)

conversations
 └── messages (1:N, cascade)

badges
 └── user_badges (1:N, cascade)
```

## DB-03

`profiles.skill_points` is the denormalized balance. The approved `trg_sync_skill_points` function
is introduced here and attached to `skill_points_ledger` by DB-05. The trigger locks the profile
row, validates the ledger snapshot and updates the profile balance atomically.

## DB-04

`skill_categories` supports an optional self-referencing hierarchy. `skills.category_id` is
nullable and uses `ON DELETE SET NULL` so category removal does not destroy a user's skill.

## DB-05

`skill_points_ledger` is the financial system of record. Public UPDATE/DELETE/TRUNCATE privileges
are revoked. `profiles.skill_points` is synchronized only by the approved database trigger.

## DB-06

`transactions` references both participants and the owned skill. `idempotency_key` is unique.
The ledger transaction FK is added only after the transaction table exists, preserving clean
migration ordering without weakening referential integrity.

## DB-07

`conversations.participant_ids UUID[]` is the explicit Specification/Constitution exception to
normal relationship-table modeling. It is constrained to at least two participants. Messages use
normal FKs for conversation and sender relationships.

## DB-08

Notifications belong to a user and carry dynamic JSONB payload. The unread retrieval path uses the
DB-17 partial index `notifications(user_id, is_read) WHERE is_read = false`.

## DB-09

Documents belong to users; reviewers are optional user references. `(user_id, file_key)` is unique.

## DB-10

Badges are reference entities. `user_badges` uses a composite primary key to prevent duplicate
awards. Activity streaks are one-to-one with users.

## DB-11

Ratings reference the transaction and both users. `(transaction_id, rater_id)` is unique and
self-rating is forbidden.

## DB-12

Community posts belong to users and may optionally reference a skill category.

## DB-13

Admin logs reference the acting admin and are protected from UPDATE/DELETE/TRUNCATE by the public
privilege boundary. Deployment roles must grant only the intended application capabilities.

## DB-14

`skills.search_vector` is a generated projection from `title` and `description`; it is never a
second source of truth. A GIN index supports PostgreSQL full-text search.

## DB-15

Call sessions reference users and optionally a transaction. Participant distinctness and end-after-
start constraints protect session integrity.

## DB-16 / DB-17

`skills.embedding` and `profiles.embedding` are nullable derived data. Database Constitution §46
specifies 1536 dimensions for `text-embedding-3-small`. DB-17 applies `vector(1536)` and HNSW cosine
indexes. Embeddings can be regenerated without loss of authoritative business data.

## DB-17 indexing decisions

Required access-path indexes from Specification §4.2 are present. The two partial indexes and two
HNSW indexes are implemented through forward-only SQL migrations because Prisma 5.19's schema DSL
does not express the required PostgreSQL predicates/operator classes directly.
