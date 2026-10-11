-- DB-17 — Final pgvector completion based on Database Constitution §46.
-- The Constitution explicitly fixes text-embedding-3-small at 1536 dimensions.
-- This is a forward-only correction; DB-16 history is not rewritten.
-- HNSW + cosine distance is used for semantic embedding similarity at the
-- project's expected scale.

ALTER TABLE "skills"
  ALTER COLUMN "embedding" TYPE vector(1536)
  USING "embedding"::vector(1536);

ALTER TABLE "profiles"
  ALTER COLUMN "embedding" TYPE vector(1536)
  USING "embedding"::vector(1536);

CREATE INDEX "skills_embedding_hnsw_idx"
  ON "skills" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "profiles_embedding_hnsw_idx"
  ON "profiles" USING hnsw ("embedding" vector_cosine_ops);
