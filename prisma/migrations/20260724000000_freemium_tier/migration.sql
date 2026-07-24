-- Freemium entitlement tier (2026-07-24 feedback). Additive only.
-- Distinct from billing health (subscription_status) and access (access_state).
CREATE TYPE "watchtower_spa_member_tier" AS ENUM ('FREE', 'MEMBER');

ALTER TABLE "watchtower_spa_profiles"
  ADD COLUMN "tier" "watchtower_spa_member_tier" NOT NULL DEFAULT 'FREE';

-- Backfill: every profile that exists today is part of the current paying
-- cohort, so grant them MEMBER. Only NEW signups from here default to FREE.
UPDATE "watchtower_spa_profiles" SET "tier" = 'MEMBER';
