-- DB-15 — Calling / Session Records
-- The governing documents require session lifecycle, user/transaction/session
-- references, timestamps and identifiers, but do not enumerate exact field
-- names/status values. The schema uses a minimal explicit representation and
-- records this ambiguity in DB-15 documentation.

CREATE TYPE "call_session_status" AS ENUM (
  'INITIATED',
  'RINGING',
  'ACTIVE',
  'ENDED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "call_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transaction_id" UUID,
  "initiator_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "session_identifier" VARCHAR(255) NOT NULL,
  "status" "call_session_status" NOT NULL DEFAULT 'INITIATED',
  "started_at" TIMESTAMPTZ(6),
  "ended_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "call_sessions_participants_distinct" CHECK ("initiator_id" <> "provider_id"),
  CONSTRAINT "call_sessions_end_after_start"
    CHECK ("ended_at" IS NULL OR "started_at" IS NULL OR "ended_at" >= "started_at")
);

CREATE UNIQUE INDEX "call_sessions_session_identifier_key"
  ON "call_sessions"("session_identifier");
CREATE INDEX "call_sessions_transaction_id_idx" ON "call_sessions"("transaction_id");
CREATE INDEX "call_sessions_initiator_id_created_at_idx"
  ON "call_sessions"("initiator_id", "created_at" DESC);
CREATE INDEX "call_sessions_provider_id_created_at_idx"
  ON "call_sessions"("provider_id", "created_at" DESC);
CREATE INDEX "call_sessions_status_created_at_idx"
  ON "call_sessions"("status", "created_at" DESC);

ALTER TABLE "call_sessions"
  ADD CONSTRAINT "call_sessions_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "call_sessions"
  ADD CONSTRAINT "call_sessions_initiator_id_fkey"
  FOREIGN KEY ("initiator_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "call_sessions"
  ADD CONSTRAINT "call_sessions_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
