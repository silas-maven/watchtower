-- Daily-brief additions + opt-in email delivery (2026-07-24 feedback, sections
-- 6 and 7). Additive only.

-- Section 6: persist the deterministic brief additions with the narrative.
ALTER TABLE "watchtower_spa_daily_briefs" ADD COLUMN "highlights" JSONB;

-- Section 7: per-member opt-in for the daily brief email, plus a stable
-- unsubscribe token so one-click unsubscribe needs no login.
ALTER TABLE "watchtower_spa_profiles"
  ADD COLUMN "dailyBriefEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailUnsubToken" TEXT;

CREATE UNIQUE INDEX "watchtower_spa_profiles_emailUnsubToken_key"
  ON "watchtower_spa_profiles"("emailUnsubToken");

-- Section 7: delivery log, so sends are observable and retryable.
CREATE TABLE "watchtower_spa_email_deliveries" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  -- The brief day this send belongs to, so one member gets at most one send per
  -- day even if the job runs twice.
  "sendDate" TIMESTAMP(3) NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerId" TEXT,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watchtower_spa_email_deliveries_pkey" PRIMARY KEY ("id")
);

-- One send per member per kind per brief day; the send job relies on this to
-- stay idempotent if it runs twice.
CREATE UNIQUE INDEX "watchtower_spa_email_deliveries_profile_kind_day_key"
  ON "watchtower_spa_email_deliveries"("profileId", "kind", "sendDate");
CREATE INDEX "watchtower_spa_email_deliveries_status_createdAt_idx"
  ON "watchtower_spa_email_deliveries"("status", "createdAt" DESC);

ALTER TABLE "watchtower_spa_email_deliveries"
  ADD CONSTRAINT "watchtower_spa_email_deliveries_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
