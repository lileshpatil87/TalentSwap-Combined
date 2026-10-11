CREATE EXTENSION IF NOT EXISTS vector;

-- TalentSwap backend cumulative domain migration.
-- This migration is intentionally append-only after DB-02 and contains the
-- approved schemas required by BE-03..BE-25.
CREATE TYPE "skill_proficiency" AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT');
CREATE TYPE "skill_type" AS ENUM ('OFFERING','SEEKING');
CREATE TYPE "ledger_entry_type" AS ENUM ('DEBIT','CREDIT','ESCROW_HOLD','ESCROW_RELEASE','ADMIN_ADJUSTMENT');
CREATE TYPE "transaction_type" AS ENUM ('ONE_WAY','TWO_WAY');
CREATE TYPE "transaction_status" AS ENUM ('PENDING','ESCROW_HELD','PROVIDER_CONFIRMED','RECIPIENT_CONFIRMED','COMPLETED','DISPUTED','CANCELLED');
CREATE TYPE "notification_type" AS ENUM ('TRANSACTION','CHAT_MESSAGE','BADGE_AWARDED','DOCUMENT_UPDATE','SYSTEM','MATCH','COMMUNITY','CALL');
CREATE TYPE "document_status" AS ENUM ('PENDING','SCANNING','PENDING_REVIEW','APPROVED','REJECTED');
CREATE TYPE "call_status" AS ENUM ('RINGING','ACTIVE','ENDED','FAILED');
CREATE TYPE "community_post_type" AS ENUM ('REQUEST','OFFER','EVENT');

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

CREATE TABLE "skill_categories" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "parent_id" INTEGER REFERENCES "skill_categories"("id") ON DELETE SET NULL,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "icon" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "skill_categories_parent_id_idx" ON "skill_categories"("parent_id");
CREATE INDEX "skill_categories_is_active_idx" ON "skill_categories"("is_active");

CREATE TABLE "skills" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" INTEGER NOT NULL REFERENCES "skill_categories"("id") ON DELETE RESTRICT,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL,
  "proficiency" "skill_proficiency" NOT NULL,
  "type" "skill_type" NOT NULL,
  "point_rate" INTEGER NOT NULL DEFAULT 10 CHECK ("point_rate" > 0),
  "embedding" vector(1536),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "skills_user_id_is_active_idx" ON "skills"("user_id","is_active");
CREATE INDEX "skills_category_id_is_active_idx" ON "skills"("category_id","is_active");
ALTER TABLE "skills" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("description",''))) STORED;
CREATE INDEX "skills_search_vector_gin_idx" ON "skills" USING GIN("search_vector");
CREATE INDEX "skills_embedding_hnsw_idx" ON "skills" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "profiles_embedding_hnsw_idx" ON "profiles" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "skill_points_ledger" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "transaction_id" UUID,
  "entry_type" "ledger_entry_type" NOT NULL,
  "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "balance_after" INTEGER NOT NULL CHECK ("balance_after" >= 0),
  "description" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "skill_points_ledger_user_id_created_at_idx" ON "skill_points_ledger"("user_id","created_at" DESC);
CREATE INDEX "skill_points_ledger_transaction_id_idx" ON "skill_points_ledger"("transaction_id");

CREATE TABLE "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "initiator_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "provider_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "skill_id" UUID NOT NULL REFERENCES "skills"("id") ON DELETE RESTRICT,
  "type" "transaction_type" NOT NULL,
  "points_held" INTEGER NOT NULL CHECK ("points_held" > 0),
  "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
  "provider_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "recipient_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "confirmation_deadline" TIMESTAMPTZ(6) NOT NULL,
  "idempotency_key" UUID NOT NULL UNIQUE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ(6)
);
CREATE INDEX "transactions_initiator_id_status_idx" ON "transactions"("initiator_id","status");
CREATE INDEX "transactions_provider_id_status_idx" ON "transactions"("provider_id","status");
CREATE INDEX "transactions_confirmation_deadline_idx" ON "transactions"("confirmation_deadline");

ALTER TABLE "skill_points_ledger" ADD CONSTRAINT "skill_points_ledger_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION talentswap_sync_skill_points() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "profiles" SET "skill_points" = NEW."balance_after", "updated_at" = NOW() WHERE "user_id" = NEW."user_id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_skill_points AFTER INSERT ON "skill_points_ledger" FOR EACH ROW EXECUTE FUNCTION talentswap_sync_skill_points();
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_skill_points_nonnegative" CHECK ("skill_points" >= 0);

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "notification_type" NOT NULL, "payload" JSONB NOT NULL, "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id","is_read");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id","created_at" DESC);

CREATE TABLE "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "participant_ids" UUID[] NOT NULL,
  "last_message_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at" DESC);
CREATE TABLE "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "content" TEXT NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE, "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id","sent_at");

CREATE TABLE "documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "file_key" VARCHAR(500) NOT NULL, "file_type" VARCHAR(100) NOT NULL, "original_name" VARCHAR(255) NOT NULL,
  "status" "document_status" NOT NULL DEFAULT 'PENDING', "scan_result" JSONB, "reviewed_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "documents_user_id_status_idx" ON "documents"("user_id","status");

CREATE TABLE "ratings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "rater_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "ratee_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "feedback_text" TEXT, "transaction_id" UUID NOT NULL REFERENCES "transactions"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE("transaction_id","rater_id")
);
CREATE INDEX "ratings_ratee_id_created_at_idx" ON "ratings"("ratee_id","created_at" DESC);

CREATE TABLE "badges" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "code" VARCHAR(100) NOT NULL UNIQUE, "name" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL, "icon_url" VARCHAR(500), "xp_reward" INTEGER NOT NULL DEFAULT 0,
  "condition_type" VARCHAR(100) NOT NULL, "condition_value" INTEGER NOT NULL
);
CREATE TABLE "user_badges" (
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "badge_id" UUID NOT NULL REFERENCES "badges"("id") ON DELETE CASCADE,
  "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), PRIMARY KEY("user_id","badge_id")
);
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");
CREATE TABLE "activity_streaks" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE, "current_streak" INTEGER NOT NULL DEFAULT 0,
  "longest_streak" INTEGER NOT NULL DEFAULT 0, "last_active_date" DATE
);

CREATE TABLE "match_suggestions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "candidate_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "score" DECIMAL(6,5) NOT NULL,
  "reason" JSONB, "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE("user_id","candidate_user_id")
);
CREATE INDEX "match_suggestions_user_id_score_idx" ON "match_suggestions"("user_id","score" DESC);

CREATE TABLE "call_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "initiator_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "participant_ids" UUID[] NOT NULL, "channel_name" VARCHAR(255) NOT NULL, "status" "call_status" NOT NULL DEFAULT 'RINGING',
  "started_at" TIMESTAMPTZ(6), "ended_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "call_sessions_initiator_id_status_idx" ON "call_sessions"("initiator_id","status");

CREATE TABLE "community_posts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" VARCHAR(200) NOT NULL, "body" TEXT NOT NULL, "post_type" "community_post_type" NOT NULL,
  "skill_category_id" INTEGER REFERENCES "skill_categories"("id") ON DELETE SET NULL, "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "community_posts_author_id_created_at_idx" ON "community_posts"("author_id","created_at" DESC);
CREATE INDEX "community_posts_skill_category_id_is_active_idx" ON "community_posts"("skill_category_id","is_active");

CREATE TABLE "admin_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "admin_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action" VARCHAR(100) NOT NULL, "target_type" VARCHAR(100) NOT NULL, "target_id" VARCHAR(255) NOT NULL,
  "metadata" JSONB NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "admin_logs_admin_id_created_at_idx" ON "admin_logs"("admin_id","created_at" DESC);
CREATE INDEX "admin_logs_target_type_target_id_idx" ON "admin_logs"("target_type","target_id");

CREATE OR REPLACE FUNCTION talentswap_reject_admin_log_mutation() RETURNS TRIGGER AS $$ BEGIN RAISE EXCEPTION 'admin_logs is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER admin_logs_immutable_update BEFORE UPDATE ON "admin_logs" FOR EACH ROW EXECUTE FUNCTION talentswap_reject_admin_log_mutation();
CREATE TRIGGER admin_logs_immutable_delete BEFORE DELETE ON "admin_logs" FOR EACH ROW EXECUTE FUNCTION talentswap_reject_admin_log_mutation();

