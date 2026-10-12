-- Phase 4: developer API credentials and reputation-gated community governance.
CREATE TABLE IF NOT EXISTS "developer_api_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "key_hash" VARCHAR(64) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "last_used_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "developer_api_keys_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_keys_key_hash_key" ON "developer_api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "developer_api_keys_owner_user_id_created_at_idx" ON "developer_api_keys"("owner_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "developer_api_keys_revoked_at_expires_at_idx" ON "developer_api_keys"("revoked_at", "expires_at");

CREATE TYPE "governance_proposal_status" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'CLOSED');
CREATE TYPE "governance_vote_choice" AS ENUM ('YES', 'NO', 'ABSTAIN');
CREATE TABLE "governance_proposals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "author_id" UUID NOT NULL, "title" VARCHAR(160) NOT NULL,
  "description" TEXT NOT NULL, "status" "governance_proposal_status" NOT NULL DEFAULT 'OPEN',
  "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "governance_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "governance_proposals_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "governance_proposals_status_ends_at_idx" ON "governance_proposals"("status", "ends_at");
CREATE INDEX "governance_proposals_author_id_created_at_idx" ON "governance_proposals"("author_id", "created_at" DESC);
CREATE TABLE "governance_votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "proposal_id" UUID NOT NULL, "voter_id" UUID NOT NULL,
  "choice" "governance_vote_choice" NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "governance_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "governance_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "governance_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "governance_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "governance_votes_proposal_id_voter_id_key" ON "governance_votes"("proposal_id", "voter_id");
CREATE INDEX "governance_votes_voter_id_created_at_idx" ON "governance_votes"("voter_id", "created_at" DESC);
