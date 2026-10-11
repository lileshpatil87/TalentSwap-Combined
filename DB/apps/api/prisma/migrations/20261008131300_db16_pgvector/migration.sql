-- DB-16 — pgvector + Embeddings
-- The Specification names OpenAI text-embedding-3-small but does not specify
-- the vector dimension. Per the DB-16 prompt, the migration intentionally
-- does not guess a dimension and uses PostgreSQL's dimension-agnostic vector type.
-- If the governing specification is amended with a fixed dimension, a new
-- migration must add the dimension and an appropriate HNSW/IVFFlat index.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "skills"
  ADD COLUMN "embedding" vector;

ALTER TABLE "profiles"
  ADD COLUMN "embedding" vector;

-- No vector index is created until a fixed dimension is specified. Creating an
-- ANN index against an unspecified dimension would violate the prompt's
-- "do not guess vector dimensions" requirement.
