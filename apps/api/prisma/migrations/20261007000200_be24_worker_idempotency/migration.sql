-- BE-24 durable worker idempotency receipts.
CREATE TABLE "worker_job_receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_id" VARCHAR(255) NOT NULL UNIQUE,
  "queue_name" VARCHAR(100) NOT NULL,
  "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "worker_job_receipts_queue_name_processed_at_idx" ON "worker_job_receipts"("queue_name","processed_at");


-- Wallet operation idempotency key. Transaction-scoped ledger rows keep their
-- existing transaction_id; any authorized standalone ledger operation may use this key.
ALTER TABLE "skill_points_ledger" ADD COLUMN "idempotency_key" UUID;
CREATE UNIQUE INDEX "skill_points_ledger_idempotency_key_key" ON "skill_points_ledger"("idempotency_key");
