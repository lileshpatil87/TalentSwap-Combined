-- TalentSwap — "DB-02 — Core Database Schema"
-- Adds: users, refresh_tokens (ADR-0003), profiles (ADR-0004).
--
-- PROVENANCE NOTE: this file was authored by hand rather than produced by
-- `prisma migrate dev`. The sandbox this migration was built in has no
-- network access to `binaries.prisma.sh` (the Prisma query/schema-engine
-- binary host) — confirmed via the same failure this repository's own
-- docs/architecture/MERGE_NOTES.md §3.5 already documented for
-- `prisma generate` during the prior Foundation merge. The DDL below was
-- written to match exactly what Prisma would generate from
-- `prisma/schema.prisma` as of this migration (table/column/index/
-- constraint names follow Prisma's default naming algorithm precisely),
-- plus the CHECK constraints appended in the final section (Prisma
-- Schema Language has no declarative `@check`/`@@check` syntax in the
-- Prisma version pinned by this project — DB-CON-v1.0 §31/§43 require
-- these constraints to exist regardless, so they are added as raw SQL
-- here, which is the documented, approved mechanism for exactly this
-- situation, DB-CON-v1.0 §3/§20).
--
-- REQUIRED FOLLOW-UP before this is trusted as "applied": run
-- `pnpm --filter @talentswap/api exec prisma migrate dev` (or, in
-- CI/staging/production, `prisma migrate deploy`) from a machine with
-- normal network access. Prisma will compute the diff between this file
-- and `schema.prisma`; because the two were authored to match exactly,
-- the expected result is "already in sync, nothing to do" — if Prisma
-- proposes any further change, that is a real drift introduced by hand-
-- authoring and must be resolved before this module is marked Approved
-- (see docs/database/DB-02-implementation-notes.md, "Validation status").

-- ============================================================
-- CreateEnum
-- ============================================================

CREATE TYPE "user_role" AS ENUM ('USER', 'VERIFIED_USER', 'MODERATOR', 'ADMIN');

CREATE TYPE "experience_level" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'CHAMPION');

-- ============================================================
-- CreateTable: users
-- ============================================================

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "oauth_provider" VARCHAR(50),
    "oauth_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_oauth_id_key" ON "users"("oauth_id");

-- ============================================================
-- CreateTable: refresh_tokens (ADR-0003)
-- ============================================================

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "family_id" UUID NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "replaced_by_token_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_family_id_idx" ON "refresh_tokens"("user_id", "family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_replaced_by_token_id_idx" ON "refresh_tokens"("replaced_by_token_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- CreateTable: profiles (ADR-0004)
-- ============================================================

CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "bio" TEXT,
    "avatar_url" VARCHAR(500),
    "location" VARCHAR(150),
    "skill_points" INTEGER NOT NULL DEFAULT 0,
    "reputation_score" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "total_exchanges" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_badge" VARCHAR(50),
    "experience_level" "experience_level" NOT NULL DEFAULT 'BRONZE',
    "experience_points" INTEGER NOT NULL DEFAULT 0,
    "last_active_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_reputation_score_idx" ON "profiles"("reputation_score" DESC);

-- CreateIndex
CREATE INDEX "profiles_last_active_at_idx" ON "profiles"("last_active_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- CHECK constraints
--
-- Hand-added: Prisma Schema Language (as pinned by this project,
-- prisma@^5.19.1) has no declarative syntax for database CHECK
-- constraints, so these cannot be expressed in schema.prisma itself.
-- DB-CON-v1.0 §20 explicitly sanctions editing a freshly generated,
-- not-yet-applied migration file to add raw SQL Prisma cannot express
-- (its own examples: the future trg_sync_skill_points trigger,
-- pg_advisory_xact_lock calls) — this is that same, documented
-- exception, applied to CHECK constraints instead.
-- ============================================================

-- profiles.skill_points must never go negative (Technology Specification
-- §4.1.2; DB-CON-v1.0 §31, §43). Last-line-of-defense backstop behind the
-- pre-deduction escrow design (Technology Specification §3.4) — the
-- column's sole application write path (the trg_sync_skill_points
-- trigger, ADR-0004) does not exist until the future DB-04 module ships,
-- so in practice every row currently sits at its default of 0; the
-- constraint is added now so it is already in place before DB-04 ever
-- needs it, per this table's initial-migration indexing/constraint
-- discipline (DB-CON-v1.0 §20, §29).
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_skill_points_non_negative" CHECK ("skill_points" >= 0);

-- profiles.reputation_score is a documented 0.00-5.00 bounded average
-- (Technology Specification §4.1.2) — DB-CON-v1.0 §31's "a rating 1-5"
-- business-defined-range example, applied to this column's own stated
-- bounds.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_reputation_score_range" CHECK ("reputation_score" >= 0.00 AND "reputation_score" <= 5.00);

-- Non-negative counters — defensive backstops per DB-CON-v1.0 §1
-- priority 1 ("a schema decision that ... permits an invalid state ...
-- is rejected"). A negative exchange count or XP total is never a valid
-- state regardless of what a future application-code bug might attempt.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_total_exchanges_non_negative" CHECK ("total_exchanges" >= 0);

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_experience_points_non_negative" CHECK ("experience_points" >= 0);
