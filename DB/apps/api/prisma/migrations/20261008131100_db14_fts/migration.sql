-- DB-14 — PostgreSQL Full-Text Search projection
-- The specification explicitly defines skills.search_vector as a generated
-- tsvector indexed by GIN. It is a rebuildable projection, not a source of truth.

ALTER TABLE "skills"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))
  ) STORED;

CREATE INDEX "skills_search_vector_gin_idx"
  ON "skills" USING GIN ("search_vector");
