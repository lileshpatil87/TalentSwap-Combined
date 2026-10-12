-- Phase 2 integration: persistent user settings, password reset tokens,
-- document size metadata, and transaction-bound WebRTC call sessions.
CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" UUID NOT NULL,
  "email_notifications" BOOLEAN NOT NULL DEFAULT TRUE,
  "message_notifications" BOOLEAN NOT NULL DEFAULT TRUE,
  "marketing_emails" BOOLEAN NOT NULL DEFAULT FALSE,
  "profile_visibility" VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_settings_profile_visibility_check" CHECK ("profile_visibility" IN ('PUBLIC','MEMBERS'))
);
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "size_bytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "call_sessions" ADD COLUMN IF NOT EXISTS "transaction_id" UUID;
DO $$ BEGIN
  ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "call_sessions_transaction_id_status_idx" ON "call_sessions"("transaction_id", "status");

-- Prevent concurrent requests from creating two live calls for one exchange.
CREATE UNIQUE INDEX IF NOT EXISTS "call_sessions_one_active_transaction_idx" ON "call_sessions"("transaction_id") WHERE "transaction_id" IS NOT NULL AND "status" IN ('RINGING', 'ACTIVE');
