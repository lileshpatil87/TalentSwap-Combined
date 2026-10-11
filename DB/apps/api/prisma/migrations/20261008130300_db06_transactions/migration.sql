-- DB-06 — Transactions / Escrow State Machine
-- Critical financial module. Requires dual approval by Erwin + Lilesh.

CREATE TYPE "transaction_type" AS ENUM ('ONE_WAY', 'TWO_WAY');
CREATE TYPE "transaction_status" AS ENUM (
  'PENDING',
  'ESCROW_HELD',
  'PROVIDER_CONFIRMED',
  'RECIPIENT_CONFIRMED',
  'COMPLETED',
  'DISPUTED',
  'CANCELLED'
);

CREATE TABLE "transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "initiator_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "skill_id" UUID NOT NULL,
  "type" "transaction_type" NOT NULL,
  "points_held" INTEGER NOT NULL,
  "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
  "provider_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "recipient_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "confirmation_deadline" TIMESTAMPTZ(6) NOT NULL,
  "idempotency_key" UUID NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transactions_points_held_positive" CHECK ("points_held" > 0),
  CONSTRAINT "transactions_participants_distinct" CHECK ("initiator_id" <> "provider_id"),
  CONSTRAINT "transactions_completed_timestamp_consistency"
    CHECK (("status" = 'COMPLETED' AND "completed_at" IS NOT NULL) OR ("status" <> 'COMPLETED'))
);

CREATE UNIQUE INDEX "transactions_idempotency_key_key"
  ON "transactions"("idempotency_key");
CREATE INDEX "transactions_initiator_id_status_idx"
  ON "transactions"("initiator_id", "status");
CREATE INDEX "transactions_provider_id_status_idx"
  ON "transactions"("provider_id", "status");
CREATE INDEX "transactions_confirmation_deadline_idx"
  ON "transactions"("confirmation_deadline");
CREATE INDEX "transactions_skill_id_idx" ON "transactions"("skill_id");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_initiator_id_fkey"
  FOREIGN KEY ("initiator_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "skill_points_ledger"
  ADD CONSTRAINT "skill_points_ledger_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
