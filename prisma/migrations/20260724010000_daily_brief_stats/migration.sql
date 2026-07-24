-- Persist market breadth alongside the brief narrative (2026-07-24 feedback).
-- The narrative bakes these numbers in at generation time, so the page must
-- render this snapshot instead of recomputing live, which made the prose and the
-- stat cards contradict each other. Additive + nullable: existing briefs simply
-- have no stats and fall back to the live summary.
ALTER TABLE "watchtower_spa_daily_briefs" ADD COLUMN "stats" JSONB;
