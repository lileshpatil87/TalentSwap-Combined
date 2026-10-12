-- Keep documents that exhausted malware-scan retries out of the review queue.
ALTER TYPE "document_status" ADD VALUE IF NOT EXISTS 'SCAN_FAILED';

-- Link durable notification receipts to the persisted notification so a retry can
-- safely re-publish the realtime event if the original publish failed after commit.
ALTER TABLE "worker_job_receipts" ADD COLUMN IF NOT EXISTS "result_id" VARCHAR(255);
