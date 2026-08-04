-- Two additive changes, both driven by the same realisation: this app is about
-- to have hundreds of members rather than four, so anything whose only defence
-- was "nobody would bother" now needs a real one.
--
-- Nothing existing is dropped or rewritten. There are zero rows with
-- reportCount > 0 today, so the new table starts consistent with the counter and
-- needs no backfill.

-- 1. ONE REPORT PER MEMBER PER POST.
--
-- reportCount was a bare increment on an endpoint any signed-in member could
-- call in a loop, and the moderation queue sorts by that count. One member could
-- therefore push any post to the top of the queue and bury every genuine report
-- beneath it. A rate limit slows that down; only a uniqueness constraint makes
-- the second report from the same person meaningless, which is the property the
-- queue actually depends on.
--
-- Same shape as the likes table, deliberately: the composite primary key makes
-- the operation idempotent at the database rather than in a read-then-write that
-- races itself.
CREATE TABLE "watchtower_spa_community_post_reports" (
  "postId"    TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "watchtower_spa_community_post_reports_pkey" PRIMARY KEY ("postId", "profileId")
);

-- Supports "has this member reported anything recently", and makes the cascade
-- from a deleted profile an index scan rather than a sequential one.
CREATE INDEX "watchtower_spa_community_post_reports_profileId_idx"
  ON "watchtower_spa_community_post_reports"("profileId");

ALTER TABLE "watchtower_spa_community_post_reports"
  ADD CONSTRAINT "watchtower_spa_community_post_reports_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "watchtower_spa_community_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "watchtower_spa_community_post_reports"
  ADD CONSTRAINT "watchtower_spa_community_post_reports_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. A REPORT KIND FOR THE ASSET INSIGHT ENDPOINT.
--
-- /api/ai-insight calls a language model and is reachable by any signed-in
-- profile, including a free one. It persisted nothing, so there was no row for
-- the per-day quota to count and an in-process rate limiter was the only guard.
-- That limiter is per lambda instance, so its real ceiling is the limit
-- multiplied by however many instances are warm: fine at four members, not fine
-- at five hundred. Giving the endpoint a report kind lets it be metered in the
-- database like every other model-backed feature.
--
-- Safe inside a transaction on PostgreSQL 12+ (this database is 17.6) because
-- the new value is added here and not used until a later statement.
ALTER TYPE "watchtower"."watchtower_spa_ai_report_kind" ADD VALUE IF NOT EXISTS 'ASSET_INSIGHT';
