-- DB-17 — Index corrections identified during the final indexing review.
-- Forward-only: no prior migration is rewritten.
-- Prisma 5.19 cannot express PostgreSQL WHERE predicates on @@index, so the
-- partial predicates are maintained in this raw SQL migration.

DROP INDEX IF EXISTS "skills_user_id_is_active_idx";
CREATE INDEX "skills_user_id_is_active_idx"
  ON "skills"("user_id", "is_active")
  WHERE "is_active" = true;

DROP INDEX IF EXISTS "notifications_user_id_is_read_idx";
CREATE INDEX "notifications_user_id_is_read_idx"
  ON "notifications"("user_id", "is_read")
  WHERE "is_read" = false;
