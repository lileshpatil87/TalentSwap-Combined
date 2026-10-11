-- DB-11 — Ratings

CREATE TABLE "ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id" UUID,
  "rater_id" UUID NOT NULL,
  "ratee_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "feedback_text" TEXT,
  "transaction_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_value_range" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "ratings_distinct_users" CHECK ("rater_id" <> "ratee_id")
);

CREATE UNIQUE INDEX "ratings_transaction_id_rater_id_key"
  ON "ratings"("transaction_id", "rater_id");
CREATE INDEX "ratings_ratee_id_created_at_idx"
  ON "ratings"("ratee_id", "created_at" DESC);
CREATE INDEX "ratings_rater_id_idx" ON "ratings"("rater_id");
CREATE INDEX "ratings_transaction_id_idx" ON "ratings"("transaction_id");

ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_rater_id_fkey"
  FOREIGN KEY ("rater_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_ratee_id_fkey"
  FOREIGN KEY ("ratee_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
