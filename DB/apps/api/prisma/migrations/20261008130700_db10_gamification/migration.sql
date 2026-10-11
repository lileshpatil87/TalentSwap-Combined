-- DB-10 — Badges, User Badges, Activity Streaks

CREATE TABLE "badges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT NOT NULL,
  "icon_url" VARCHAR(500),
  "xp_reward" INTEGER NOT NULL DEFAULT 0,
  "condition_type" VARCHAR(80) NOT NULL,
  "condition_value" JSONB,
  CONSTRAINT "badges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "badges_xp_reward_non_negative" CHECK ("xp_reward" >= 0)
);

CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");
CREATE INDEX "badges_condition_type_idx" ON "badges"("condition_type");

CREATE TABLE "user_badges" (
  "user_id" UUID NOT NULL,
  "badge_id" UUID NOT NULL,
  "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id")
);

CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");
CREATE INDEX "user_badges_badge_id_idx" ON "user_badges"("badge_id");

ALTER TABLE "user_badges"
  ADD CONSTRAINT "user_badges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges"
  ADD CONSTRAINT "user_badges_badge_id_fkey"
  FOREIGN KEY ("badge_id") REFERENCES "badges"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "activity_streaks" (
  "user_id" UUID NOT NULL,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "longest_streak" INTEGER NOT NULL DEFAULT 0,
  "last_active_date" DATE,
  CONSTRAINT "activity_streaks_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "activity_streaks_current_non_negative" CHECK ("current_streak" >= 0),
  CONSTRAINT "activity_streaks_longest_non_negative" CHECK ("longest_streak" >= 0)
);

CREATE INDEX "activity_streaks_current_streak_idx"
  ON "activity_streaks"("current_streak" DESC);

ALTER TABLE "activity_streaks"
  ADD CONSTRAINT "activity_streaks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
