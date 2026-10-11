-- DB-08 — Notifications

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_is_read_idx"
  ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_user_id_created_at_idx"
  ON "notifications"("user_id", "created_at" DESC);
CREATE INDEX "notifications_created_at_idx"
  ON "notifications"("created_at" DESC);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
