-- TalentSwap DB-03 -> DB-17 integration test suite.
-- Run AFTER `prisma migrate deploy` against a disposable database.
-- The entire suite runs inside one transaction and rolls back all test data.
-- Requires PostgreSQL 16+ and pgvector.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE ts_assertions (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_name text, p_condition boolean, p_detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT COALESCE(p_condition, false) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — %', p_name, COALESCE(p_detail, 'no detail');
  END IF;
  INSERT INTO ts_assertions VALUES (p_name, true, p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_raises(p_name text, p_sql text, p_detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO ts_assertions VALUES (p_name, true, COALESCE(p_detail, SQLERRM));
    RETURN;
  END;
  RAISE EXCEPTION 'ASSERTION FAILED: % — statement unexpectedly succeeded', p_name;
END;
$$;

-- 1. Object inventory / extensions.
SELECT pg_temp.assert_true('pgvector extension installed', EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'vector'
));
SELECT pg_temp.assert_true('core uuid extension available', EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid'
));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','refresh_tokens','profiles','skill_categories','skills',
    'skill_points_ledger','transactions','conversations','messages',
    'notifications','documents','badges','user_badges','activity_streaks',
    'ratings','community_posts','admin_logs','call_sessions'
  ] LOOP
    IF to_regclass(t) IS NULL THEN RAISE EXCEPTION 'Missing table %', t; END IF;
  END LOOP;
END $$;

-- 2. Final required indexes, including PostgreSQL partial predicates.
SELECT pg_temp.assert_true('skills active partial index', EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'skills_user_id_is_active_idx'
    AND indexdef ILIKE '%WHERE%is_active%true%'
));
SELECT pg_temp.assert_true('notifications unread partial index', EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'notifications_user_id_is_read_idx'
    AND indexdef ILIKE '%WHERE%is_read%false%'
));
SELECT pg_temp.assert_true('skills FTS GIN index', EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE indexname = 'skills_search_vector_gin_idx' AND indexdef ILIKE '%USING gin%'
));
SELECT pg_temp.assert_true('profile reputation descending index', EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE indexname = 'profiles_reputation_score_idx' AND indexdef ILIKE '%DESC%'
));
SELECT pg_temp.assert_true('profile activity index', EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_last_active_at_idx'
));
SELECT pg_temp.assert_true('ledger history index', EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = 'skill_points_ledger_user_id_created_at_idx'
));
SELECT pg_temp.assert_true('message pagination index', EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = 'messages_conversation_id_sent_at_idx'
));

-- 3. pgvector dimension and ANN index (dimension is authoritative in DB Constitution §46).
SELECT pg_temp.assert_true('skills embedding dimension 1536', EXISTS (
  SELECT 1 FROM pg_attribute a
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE a.attrelid = 'skills'::regclass AND a.attname = 'embedding'
    AND t.typname = 'vector' AND a.atttypmod = 1536
));
SELECT pg_temp.assert_true('profiles embedding dimension 1536', EXISTS (
  SELECT 1 FROM pg_attribute a
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE a.attrelid = 'profiles'::regclass AND a.attname = 'embedding'
    AND t.typname = 'vector' AND a.atttypmod = 1536
));
SELECT pg_temp.assert_true('skills HNSW vector index', EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = 'skills_embedding_hnsw_idx'
    AND indexdef ILIKE '%USING hnsw%vector_cosine_ops%'
));
SELECT pg_temp.assert_true('profiles HNSW vector index', EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_embedding_hnsw_idx'
    AND indexdef ILIKE '%USING hnsw%vector_cosine_ops%'
));

-- 4. Seed-independent fixture rows.
INSERT INTO users (email, password_hash, role, is_email_verified)
VALUES
 ('ts-it-user-a@example.test', 'hash-a', 'USER', true),
 ('ts-it-user-b@example.test', 'hash-b', 'USER', true),
 ('ts-it-admin@example.test', 'hash-admin', 'ADMIN', true);

SELECT id AS user_a FROM users WHERE email = 'ts-it-user-a@example.test' \gset
SELECT id AS user_b FROM users WHERE email = 'ts-it-user-b@example.test' \gset
SELECT id AS admin_id FROM users WHERE email = 'ts-it-admin@example.test' \gset

INSERT INTO profiles (user_id, display_name, reputation_score)
VALUES (:'user_a', 'Integration A', 4.50), (:'user_b', 'Integration B', 5.00);

INSERT INTO skill_categories (name, slug) VALUES ('Integration', 'integration') RETURNING id AS category_id \gset

INSERT INTO skills (user_id, title, description, category_id, proficiency, type, point_rate)
VALUES (:'user_b', 'PostgreSQL Testing', 'Integration testing skill', :'category_id', 'EXPERT', 'OFFERING', 20)
RETURNING id AS skill_id \gset

-- 5. DB-03/05 ledger trigger: valid credit, exact balance snapshot, insufficient balance, bad snapshot.
INSERT INTO skill_points_ledger (user_id, entry_type, amount, balance_after, description)
VALUES (:'user_a', 'CREDIT', 100, 100, 'integration credit');
SELECT pg_temp.assert_true('ledger credit synchronizes profile',
  (SELECT skill_points FROM profiles WHERE user_id = :'user_a') = 100);

SELECT pg_temp.assert_raises('ledger rejects wrong balance snapshot',
  format($q$INSERT INTO skill_points_ledger (user_id, entry_type, amount, balance_after, description)
         VALUES (%L, 'CREDIT', 5, 999, 'bad snapshot')$q$, :'user_a'));

SELECT pg_temp.assert_raises('ledger rejects overdraft',
  format($q$INSERT INTO skill_points_ledger (user_id, entry_type, amount, balance_after, description)
         VALUES (%L, 'DEBIT', 101, 0, 'overdraft')$q$, :'user_a'));

SELECT pg_temp.assert_raises('ledger rejects non-positive amount',
  format($q$INSERT INTO skill_points_ledger (user_id, entry_type, amount, balance_after, description)
         VALUES (%L, 'CREDIT', 0, 100, 'zero')$q$, :'user_a'));

-- 6. DB-06 transaction constraints / idempotency / completion timestamp.
INSERT INTO transactions
  (initiator_id, provider_id, skill_id, type, points_held, confirmation_deadline, idempotency_key)
VALUES
  (:'user_a', :'user_b', :'skill_id', 'ONE_WAY', 20, CURRENT_TIMESTAMP + interval '1 day', gen_random_uuid())
RETURNING id AS transaction_id \gset

SELECT pg_temp.assert_raises('transaction participants must differ',
  format($q$INSERT INTO transactions
         (initiator_id, provider_id, skill_id, type, points_held, confirmation_deadline, idempotency_key)
         VALUES (%L, %L, %L, 'ONE_WAY', 10, CURRENT_TIMESTAMP, gen_random_uuid())$q$,
         :'user_a', :'user_a', :'skill_id'));

SELECT pg_temp.assert_raises('transaction points must be positive',
  format($q$INSERT INTO transactions
         (initiator_id, provider_id, skill_id, type, points_held, confirmation_deadline, idempotency_key)
         VALUES (%L, %L, %L, 'ONE_WAY', 0, CURRENT_TIMESTAMP, gen_random_uuid())$q$,
         :'user_a', :'user_b', :'skill_id'));

SELECT pg_temp.assert_raises('transaction idempotency key is unique',
  format($q$INSERT INTO transactions
         (initiator_id, provider_id, skill_id, type, points_held, confirmation_deadline, idempotency_key)
         SELECT %L, %L, %L, 'ONE_WAY', 10, CURRENT_TIMESTAMP, idempotency_key FROM transactions WHERE id = %L$q$,
         :'user_a', :'user_b', :'skill_id', :'transaction_id'));

SELECT pg_temp.assert_raises('invalid transaction skill FK rejected',
  format($q$INSERT INTO transactions
         (initiator_id, provider_id, skill_id, type, points_held, confirmation_deadline, idempotency_key)
         VALUES (%L, %L, gen_random_uuid(), 'ONE_WAY', 10, CURRENT_TIMESTAMP, gen_random_uuid())$q$,
         :'user_a', :'user_b'));

SELECT pg_temp.assert_raises('completed transaction requires completed_at',
  format($q$UPDATE transactions SET status = 'COMPLETED' WHERE id = %L$q$, :'transaction_id'));

-- 7. DB-07 chat minimum cardinality and message FK.
SELECT pg_temp.assert_raises('conversation requires at least two participants',
  format($q$INSERT INTO conversations (participant_ids) VALUES (ARRAY[%L]::uuid[])$q$, :'user_a'));
INSERT INTO conversations (participant_ids) VALUES (ARRAY[:'user_a', :'user_b']::uuid[]) RETURNING id AS conversation_id \gset
INSERT INTO messages (conversation_id, sender_id, content) VALUES (:'conversation_id', :'user_a', 'hello');

SELECT pg_temp.assert_raises('message sender FK rejected',
  format($q$INSERT INTO messages (conversation_id, sender_id, content) VALUES (%L, gen_random_uuid(), 'bad')$q$, :'conversation_id'));

-- 8. DB-08 notification unread index semantics.
INSERT INTO notifications (user_id, type, payload) VALUES (:'user_a', 'TEST', '{}'::jsonb);

-- 9. DB-09 document ownership, status and uniqueness.
INSERT INTO documents (user_id, file_key, file_type, original_name)
VALUES (:'user_a', 'integration/file.pdf', 'application/pdf', 'file.pdf');
SELECT pg_temp.assert_raises('document duplicate file key rejected',
  format($q$INSERT INTO documents (user_id, file_key, file_type, original_name)
         VALUES (%L, 'integration/file.pdf', 'application/pdf', 'file2.pdf')$q$, :'user_a'));

-- 10. DB-10 gamification constraints and composite PK.
INSERT INTO badges (code, name, description, condition_type) VALUES
 ('TS_IT_BADGE', 'Integration Badge', 'Test badge', 'TEST');
SELECT id AS badge_id FROM badges WHERE code = 'TS_IT_BADGE' \gset
INSERT INTO user_badges (user_id, badge_id) VALUES (:'user_a', :'badge_id');
SELECT pg_temp.assert_raises('duplicate user badge rejected',
  format($q$INSERT INTO user_badges (user_id, badge_id) VALUES (%L, %L)$q$, :'user_a', :'badge_id'));

SELECT pg_temp.assert_raises('negative badge XP rejected',
  $q$INSERT INTO badges (code, name, description, xp_reward, condition_type)
      VALUES ('TS_IT_BAD_BADGE', 'Bad', 'Bad', -1, 'TEST')$q);

SELECT pg_temp.assert_raises('negative activity streak rejected',
  format($q$INSERT INTO activity_streaks (user_id, current_streak) VALUES (%L, -1)$q$, :'user_a'));

-- 11. DB-11 rating range, distinct users, duplicate prevention.
INSERT INTO ratings (rater_id, ratee_id, rating, feedback_text, transaction_id)
VALUES (:'user_a', :'user_b', 5, 'Excellent', :'transaction_id');
SELECT pg_temp.assert_raises('duplicate rating rejected',
  format($q$INSERT INTO ratings (rater_id, ratee_id, rating, transaction_id)
         VALUES (%L, %L, 4, %L)$q$, :'user_a', :'user_b', :'transaction_id'));
SELECT pg_temp.assert_raises('rating outside 1-5 rejected',
  format($q$INSERT INTO ratings (rater_id, ratee_id, rating, transaction_id)
         VALUES (%L, %L, 6, gen_random_uuid())$q$, :'user_a', :'user_b'));
SELECT pg_temp.assert_raises('self rating rejected',
  format($q$INSERT INTO ratings (rater_id, ratee_id, rating, transaction_id)
         VALUES (%L, %L, 5, gen_random_uuid())$q$, :'user_a', :'user_a'));

-- 12. DB-12 community post + category FK.
INSERT INTO community_posts (author_id, title, body, post_type, skill_category_id)
VALUES (:'user_a', 'Integration post', 'Body', 'REQUEST', :'category_id');

-- 13. DB-13 admin log and privilege boundary.
INSERT INTO admin_logs (admin_id, action, target_type, target_id, metadata)
VALUES (:'admin_id', 'TEST', 'USER', :'user_a', '{}'::jsonb);
SELECT pg_temp.assert_true('admin logs revoke UPDATE from PUBLIC', NOT has_table_privilege('public', 'admin_logs', 'UPDATE'));
SELECT pg_temp.assert_true('admin logs revoke DELETE from PUBLIC', NOT has_table_privilege('public', 'admin_logs', 'DELETE'));

-- 14. DB-14 generated FTS projection updates with source text.
SELECT pg_temp.assert_true('FTS vector generated',
  (SELECT search_vector FROM skills WHERE id = :'skill_id') @@ plainto_tsquery('simple', 'PostgreSQL'));
UPDATE skills SET description = 'Kubernetes cloud integration testing' WHERE id = :'skill_id';
SELECT pg_temp.assert_true('FTS vector regenerates after update',
  (SELECT search_vector FROM skills WHERE id = :'skill_id') @@ plainto_tsquery('simple', 'Kubernetes'));

-- 15. DB-15 call session lifecycle constraints.
INSERT INTO call_sessions
  (transaction_id, initiator_id, provider_id, session_identifier, started_at)
VALUES (:'transaction_id', :'user_a', :'user_b', 'ts-it-session', CURRENT_TIMESTAMP)
RETURNING id AS call_id \gset
SELECT pg_temp.assert_raises('call participants must differ',
  format($q$INSERT INTO call_sessions
         (initiator_id, provider_id, session_identifier)
         VALUES (%L, %L, 'ts-it-bad-session')$q$, :'user_a', :'user_a'));
SELECT pg_temp.assert_raises('call end cannot precede start',
  format($q$UPDATE call_sessions SET ended_at = started_at - interval '1 second' WHERE id = %L$q$, :'call_id'));

-- 16. DB-16 vector storage accepts exactly 1536 dimensions.
UPDATE skills SET embedding = ('[' || repeat('0,', 1535) || '0]')::vector WHERE id = :'skill_id';
UPDATE profiles SET embedding = ('[' || repeat('0,', 1535) || '0]')::vector WHERE user_id = :'user_a';
SELECT pg_temp.assert_true('vector value stored',
  (SELECT embedding IS NOT NULL FROM skills WHERE id = :'skill_id'));

-- 17. DB-17 final index inventory sanity.
SELECT pg_temp.assert_true('all DB-17 required indexes exist', (
  SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
    'profiles_user_id_key','profiles_reputation_score_idx','profiles_last_active_at_idx',
    'skills_search_vector_gin_idx','skills_user_id_is_active_idx','skills_category_id_is_active_idx',
    'transactions_initiator_id_status_idx','transactions_provider_id_status_idx',
    'transactions_confirmation_deadline_idx','skill_points_ledger_user_id_created_at_idx',
    'messages_conversation_id_sent_at_idx','notifications_user_id_is_read_idx',
    'documents_user_id_status_idx','user_badges_user_id_idx'
  )
) = 14);

SELECT name, passed, detail FROM ts_assertions ORDER BY name;

DO $$
DECLARE failed integer;
BEGIN
  SELECT count(*) INTO failed FROM ts_assertions WHERE NOT passed;
  IF failed > 0 THEN RAISE EXCEPTION '% integration assertions failed', failed; END IF;
END $$;

ROLLBACK;
