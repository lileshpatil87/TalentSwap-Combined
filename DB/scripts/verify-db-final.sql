-- TalentSwap final database verification.
-- Apply the complete migration chain first, then run this against a disposable database.
-- All inserted test data is rolled back. Requires PostgreSQL 16+ and pgvector.
\set ON_ERROR_STOP on

\ir verify-db-integration.sql

-- Final catalog-only checks after the integration suite's rollback.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension is not installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = 'skills'::regclass AND a.attname = 'embedding'
      AND t.typname = 'vector' AND a.atttypmod = 1536
  ) THEN
    RAISE EXCEPTION 'skills.embedding is not vector(1536)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = 'profiles'::regclass AND a.attname = 'embedding'
      AND t.typname = 'vector' AND a.atttypmod = 1536
  ) THEN
    RAISE EXCEPTION 'profiles.embedding is not vector(1536)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'skills_embedding_hnsw_idx') THEN
    RAISE EXCEPTION 'skills HNSW index is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_embedding_hnsw_idx') THEN
    RAISE EXCEPTION 'profiles HNSW index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'skills_user_id_is_active_idx'
      AND indexdef ILIKE '%WHERE%is_active%true%'
  ) THEN
    RAISE EXCEPTION 'skills active-listing partial index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'notifications_user_id_is_read_idx'
      AND indexdef ILIKE '%WHERE%is_read%false%'
  ) THEN
    RAISE EXCEPTION 'notifications unread partial index is missing';
  END IF;
END $$;

SELECT 'FINAL DATABASE VERIFICATION PASSED' AS result;
