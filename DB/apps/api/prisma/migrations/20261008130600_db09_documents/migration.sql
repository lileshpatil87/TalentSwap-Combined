-- DB-09 — Documents / Verification Workflow

CREATE TYPE "document_status" AS ENUM (
  'PENDING',
  'SCANNING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "file_key" VARCHAR(500) NOT NULL,
  "file_type" VARCHAR(100) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "status" "document_status" NOT NULL DEFAULT 'PENDING',
  "scan_result" JSONB,
  "reviewed_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_user_id_file_key_key"
  ON "documents"("user_id", "file_key");
CREATE INDEX "documents_user_id_status_idx" ON "documents"("user_id", "status");
CREATE INDEX "documents_status_created_at_idx" ON "documents"("status", "created_at");
CREATE INDEX "documents_reviewed_by_idx" ON "documents"("reviewed_by");

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
