-- DB-04 — Skills + Skill Categories

CREATE TYPE "skill_proficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "skill_type" AS ENUM ('OFFERING', 'SEEKING');

CREATE TABLE "skill_categories" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "parent_id" INTEGER,
  "slug" VARCHAR(120) NOT NULL,
  "icon" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_categories_slug_key" ON "skill_categories"("slug");
CREATE INDEX "skill_categories_parent_id_idx" ON "skill_categories"("parent_id");
CREATE INDEX "skill_categories_is_active_idx" ON "skill_categories"("is_active");

ALTER TABLE "skill_categories"
  ADD CONSTRAINT "skill_categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "skill_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "skills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL,
  "category_id" INTEGER,
  "proficiency" "skill_proficiency" NOT NULL,
  "type" "skill_type" NOT NULL,
  "point_rate" INTEGER NOT NULL DEFAULT 10,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skills_point_rate_positive" CHECK ("point_rate" > 0)
);

CREATE INDEX "skills_user_id_is_active_idx" ON "skills"("user_id", "is_active");
CREATE INDEX "skills_category_id_is_active_idx" ON "skills"("category_id", "is_active");
CREATE INDEX "skills_category_id_idx" ON "skills"("category_id");

ALTER TABLE "skills"
  ADD CONSTRAINT "skills_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skills"
  ADD CONSTRAINT "skills_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
