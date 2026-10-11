# DB-04 — Skills + Skill Categories

## Scope
Adds hierarchical skill categories and user-owned skill listings.

## Tables
- `skill_categories`: self-referencing hierarchy, unique slug, active flag.
- `skills`: user, optional category, proficiency/type enums, point rate, active flag and timestamps.

## Constraints and indexes
Positive point rate; user/category foreign keys; active-listing composite indexes; category lookup indexes; category hierarchy index.

## Notes
The FTS `search_vector` and pgvector `embedding` columns are intentionally introduced by later prompt modules DB-14 and DB-16.
