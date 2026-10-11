-- DB-05 — Skill Points Ledger + balance synchronization trigger
-- Critical financial module. Implementation-ready-for-review; requires dual
-- approval by Erwin + Lilesh before final project approval.

CREATE TYPE "ledger_entry_type" AS ENUM (
  'DEBIT',
  'CREDIT',
  'ESCROW_HOLD',
  'ESCROW_RELEASE',
  'ADMIN_ADJUSTMENT'
);

CREATE TABLE "skill_points_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "transaction_id" UUID,
  "entry_type" "ledger_entry_type" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skill_points_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_points_ledger_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "skill_points_ledger_balance_non_negative" CHECK ("balance_after" >= 0)
);

CREATE INDEX "skill_points_ledger_user_id_created_at_idx"
  ON "skill_points_ledger"("user_id", "created_at" DESC);
CREATE INDEX "skill_points_ledger_transaction_id_idx"
  ON "skill_points_ledger"("transaction_id");
CREATE INDEX "skill_points_ledger_entry_type_idx"
  ON "skill_points_ledger"("entry_type");

ALTER TABLE "skill_points_ledger"
  ADD CONSTRAINT "skill_points_ledger_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- The transaction FK is added by DB-06 after the transactions table exists.
-- This preserves migration ordering without creating a cyclic dependency.

CREATE TRIGGER "trg_sync_skill_points"
AFTER INSERT ON "skill_points_ledger"
FOR EACH ROW
EXECUTE FUNCTION trg_sync_skill_points();

-- Append-only contract: application roles must receive INSERT/SELECT only.
REVOKE UPDATE, DELETE, TRUNCATE ON "skill_points_ledger" FROM PUBLIC;
