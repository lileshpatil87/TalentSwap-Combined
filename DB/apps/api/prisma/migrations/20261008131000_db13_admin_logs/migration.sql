-- DB-13 — Admin Logs / Immutable Audit Log
-- The project constitution specifies that admin_logs is append-only. The
-- application/DB role must not be granted UPDATE or DELETE privileges on
-- this table. No extra trigger is introduced because the ratified
-- constitution identifies trg_sync_skill_points as the sole approved
-- database trigger; immutability is therefore a role/ownership boundary.

CREATE TABLE "admin_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "action" VARCHAR(120) NOT NULL,
  "target_type" VARCHAR(80) NOT NULL,
  "target_id" VARCHAR(255),
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_logs_admin_id_created_at_idx"
  ON "admin_logs"("admin_id", "created_at" DESC);
CREATE INDEX "admin_logs_target_type_target_id_idx"
  ON "admin_logs"("target_type", "target_id");
CREATE INDEX "admin_logs_created_at_idx"
  ON "admin_logs"("created_at" DESC);

ALTER TABLE "admin_logs"
  ADD CONSTRAINT "admin_logs_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deliberately revoke DML that would violate the append-only contract from
-- PUBLIC. The deployment role should be the table owner and grant only INSERT
-- and SELECT to the application role. Exact role names are deployment-owned.
REVOKE UPDATE, DELETE, TRUNCATE ON "admin_logs" FROM PUBLIC;
