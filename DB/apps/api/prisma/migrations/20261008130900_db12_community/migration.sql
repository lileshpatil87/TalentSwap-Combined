-- DB-12 — Community Posts

CREATE TYPE "community_post_type" AS ENUM ('REQUEST', 'OFFER', 'EVENT');

CREATE TABLE "community_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "author_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "post_type" "community_post_type" NOT NULL,
  "skill_category_id" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_posts_author_id_created_at_idx"
  ON "community_posts"("author_id", "created_at" DESC);
CREATE INDEX "community_posts_skill_category_id_idx"
  ON "community_posts"("skill_category_id");
CREATE INDEX "community_posts_post_type_created_at_idx"
  ON "community_posts"("post_type", "created_at" DESC);
CREATE INDEX "community_posts_is_active_created_at_idx"
  ON "community_posts"("is_active", "created_at" DESC);

ALTER TABLE "community_posts"
  ADD CONSTRAINT "community_posts_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "community_posts"
  ADD CONSTRAINT "community_posts_skill_category_id_fkey"
  FOREIGN KEY ("skill_category_id") REFERENCES "skill_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
