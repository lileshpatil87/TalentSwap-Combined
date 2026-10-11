# DB-16 — PostgreSQL pgvector Embeddings

## Implementation

- `vector` extension is installed by the DB-16 migration.
- Embeddings live directly on `skills.embedding` and `profiles.embedding`.
- The governing Database Constitution §46 explicitly fixes the
  `text-embedding-3-small` output at **1536 dimensions**.
- A forward-only DB-17 completion migration changes both columns to `vector(1536)`.
- HNSW indexes using `vector_cosine_ops` are created for both embedding columns.
- Embeddings remain nullable because generation is asynchronous and external AI failure must
  not block core row creation.

## Why the final dimension is 1536

The DB-16 prompt says not to guess vector dimensions. The higher-authority Database Constitution
§46 supplies the missing value: 1536 dimensions for `text-embedding-3-small`. Therefore the final
implementation uses 1536 rather than leaving the schema dimension-agnostic.

## Why HNSW + cosine

The project uses embeddings for semantic similarity. HNSW provides approximate nearest-neighbour
search with good online-query characteristics at the expected TalentSwap scale. Cosine distance is
used through pgvector's `vector_cosine_ops`, matching normalized semantic-embedding similarity.
This is a database access-path decision; embedding generation remains outside the database layer.

## Runtime verification

`scripts/verify-db-integration.sql` verifies:

- extension availability;
- 1536-dimensional typmods on both columns;
- both HNSW indexes;
- storage of 1536-dimensional vectors.

A live PostgreSQL + pgvector environment is required to execute those checks.
