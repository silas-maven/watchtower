-- Rename existing POC namespace from watchtower_* to watchtower_spa_*.
ALTER TYPE "watchtower_role" RENAME TO "watchtower_spa_role";
ALTER TYPE "watchtower_subscription_status" RENAME TO "watchtower_spa_subscription_status";
ALTER TYPE "watchtower_asset_type" RENAME TO "watchtower_spa_asset_type";
ALTER TYPE "watchtower_signal_state" RENAME TO "watchtower_spa_signal_state";
ALTER TYPE "watchtower_signal_event_type" RENAME TO "watchtower_spa_signal_event_type";

ALTER TABLE "watchtower_users" RENAME TO "watchtower_spa_users";
ALTER TABLE "watchtower_sessions" RENAME TO "watchtower_spa_sessions";
ALTER TABLE "watchtower_subscriptions" RENAME TO "watchtower_spa_subscriptions";
ALTER TABLE "watchtower_assets" RENAME TO "watchtower_spa_assets";
ALTER TABLE "watchtower_asset_rules" RENAME TO "watchtower_spa_asset_rules";
ALTER TABLE "watchtower_asset_snapshots" RENAME TO "watchtower_spa_asset_snapshots";
ALTER TABLE "watchtower_signal_events" RENAME TO "watchtower_spa_signal_events";
ALTER TABLE "watchtower_personal_watches" RENAME TO "watchtower_spa_personal_watches";
ALTER TABLE "watchtower_daily_briefs" RENAME TO "watchtower_spa_daily_briefs";
ALTER TABLE "watchtower_notifications" RENAME TO "watchtower_spa_notifications";
ALTER TABLE "watchtower_mock_email_logs" RENAME TO "watchtower_spa_mock_email_logs";
ALTER TABLE "watchtower_import_runs" RENAME TO "watchtower_spa_import_runs";

ALTER TABLE "watchtower_spa_users" RENAME CONSTRAINT "watchtower_users_pkey" TO "watchtower_spa_users_pkey";
ALTER TABLE "watchtower_spa_sessions" RENAME CONSTRAINT "watchtower_sessions_pkey" TO "watchtower_spa_sessions_pkey";
ALTER TABLE "watchtower_spa_subscriptions" RENAME CONSTRAINT "watchtower_subscriptions_pkey" TO "watchtower_spa_subscriptions_pkey";
ALTER TABLE "watchtower_spa_assets" RENAME CONSTRAINT "watchtower_assets_pkey" TO "watchtower_spa_assets_pkey";
ALTER TABLE "watchtower_spa_asset_rules" RENAME CONSTRAINT "watchtower_asset_rules_pkey" TO "watchtower_spa_asset_rules_pkey";
ALTER TABLE "watchtower_spa_asset_snapshots" RENAME CONSTRAINT "watchtower_asset_snapshots_pkey" TO "watchtower_spa_asset_snapshots_pkey";
ALTER TABLE "watchtower_spa_signal_events" RENAME CONSTRAINT "watchtower_signal_events_pkey" TO "watchtower_spa_signal_events_pkey";
ALTER TABLE "watchtower_spa_personal_watches" RENAME CONSTRAINT "watchtower_personal_watches_pkey" TO "watchtower_spa_personal_watches_pkey";
ALTER TABLE "watchtower_spa_daily_briefs" RENAME CONSTRAINT "watchtower_daily_briefs_pkey" TO "watchtower_spa_daily_briefs_pkey";
ALTER TABLE "watchtower_spa_notifications" RENAME CONSTRAINT "watchtower_notifications_pkey" TO "watchtower_spa_notifications_pkey";
ALTER TABLE "watchtower_spa_mock_email_logs" RENAME CONSTRAINT "watchtower_mock_email_logs_pkey" TO "watchtower_spa_mock_email_logs_pkey";
ALTER TABLE "watchtower_spa_import_runs" RENAME CONSTRAINT "watchtower_import_runs_pkey" TO "watchtower_spa_import_runs_pkey";

ALTER TABLE "watchtower_spa_sessions" RENAME CONSTRAINT "watchtower_sessions_userId_fkey" TO "watchtower_spa_sessions_userId_fkey";
ALTER TABLE "watchtower_spa_subscriptions" RENAME CONSTRAINT "watchtower_subscriptions_userId_fkey" TO "watchtower_spa_subscriptions_userId_fkey";
ALTER TABLE "watchtower_spa_asset_rules" RENAME CONSTRAINT "watchtower_asset_rules_assetId_fkey" TO "watchtower_spa_asset_rules_assetId_fkey";
ALTER TABLE "watchtower_spa_asset_snapshots" RENAME CONSTRAINT "watchtower_asset_snapshots_assetId_fkey" TO "watchtower_spa_asset_snapshots_assetId_fkey";
ALTER TABLE "watchtower_spa_signal_events" RENAME CONSTRAINT "watchtower_signal_events_assetId_fkey" TO "watchtower_spa_signal_events_assetId_fkey";
ALTER TABLE "watchtower_spa_personal_watches" RENAME CONSTRAINT "watchtower_personal_watches_userId_fkey" TO "watchtower_spa_personal_watches_userId_fkey";
ALTER TABLE "watchtower_spa_personal_watches" RENAME CONSTRAINT "watchtower_personal_watches_assetId_fkey" TO "watchtower_spa_personal_watches_assetId_fkey";
ALTER TABLE "watchtower_spa_notifications" RENAME CONSTRAINT "watchtower_notifications_userId_fkey" TO "watchtower_spa_notifications_userId_fkey";

ALTER INDEX "watchtower_users_email_key" RENAME TO "watchtower_spa_users_email_key";
ALTER INDEX "watchtower_sessions_tokenHash_key" RENAME TO "watchtower_spa_sessions_tokenHash_key";
ALTER INDEX "watchtower_sessions_userId_idx" RENAME TO "watchtower_spa_sessions_userId_idx";
ALTER INDEX "watchtower_sessions_expiresAt_idx" RENAME TO "watchtower_spa_sessions_expiresAt_idx";
ALTER INDEX "watchtower_subscriptions_userId_key" RENAME TO "watchtower_spa_subscriptions_userId_key";
ALTER INDEX "watchtower_subscriptions_status_idx" RENAME TO "watchtower_spa_subscriptions_status_idx";
ALTER INDEX "watchtower_assets_symbol_key" RENAME TO "watchtower_spa_assets_symbol_key";
ALTER INDEX "watchtower_asset_rules_assetId_key" RENAME TO "watchtower_spa_asset_rules_assetId_key";
ALTER INDEX "watchtower_asset_snapshots_assetId_capturedAt_idx" RENAME TO "watchtower_spa_asset_snapshots_assetId_capturedAt_idx";
ALTER INDEX "watchtower_signal_events_assetId_occurredAt_idx" RENAME TO "watchtower_spa_signal_events_assetId_occurredAt_idx";
ALTER INDEX "watchtower_signal_events_occurredAt_idx" RENAME TO "watchtower_spa_signal_events_occurredAt_idx";
ALTER INDEX "watchtower_personal_watches_userId_idx" RENAME TO "watchtower_spa_personal_watches_userId_idx";
ALTER INDEX "watchtower_personal_watches_userId_assetId_key" RENAME TO "watchtower_spa_personal_watches_userId_assetId_key";
ALTER INDEX "watchtower_daily_briefs_briefDate_idx" RENAME TO "watchtower_spa_daily_briefs_briefDate_idx";
ALTER INDEX "watchtower_daily_briefs_briefDate_timezone_key" RENAME TO "watchtower_spa_daily_briefs_briefDate_timezone_key";
ALTER INDEX "watchtower_notifications_userId_createdAt_idx" RENAME TO "watchtower_spa_notifications_userId_createdAt_idx";
ALTER INDEX "watchtower_notifications_role_createdAt_idx" RENAME TO "watchtower_spa_notifications_role_createdAt_idx";
ALTER INDEX "watchtower_mock_email_logs_createdAt_idx" RENAME TO "watchtower_spa_mock_email_logs_createdAt_idx";
-- CreateEnum
CREATE TYPE "watchtower_spa_access_state" AS ENUM ('ACTIVE', 'PAUSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "watchtower_spa_billing_alert_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "watchtower_spa_usage_event_type" AS ENUM ('SIGN_IN', 'PAGE_VIEW', 'ASSET_VIEW', 'WATCHLIST_ADD', 'WATCHLIST_REMOVE', 'ALERT_OPEN', 'AI_BRIEF_GENERATE', 'AVERAGE_PLAN_CREATE', 'DUE_DILIGENCE_UPDATE');

-- AlterTable
ALTER TABLE "watchtower_spa_notifications" ADD COLUMN     "profileId" TEXT;

-- CreateTable
CREATE TABLE "watchtower_spa_profiles" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "watchtower_spa_role" NOT NULL DEFAULT 'MEMBER',
    "accessState" "watchtower_spa_access_state" NOT NULL DEFAULT 'ACTIVE',
    "accessNote" TEXT,
    "declaredPortfolioGBP" DOUBLE PRECISION,
    "averageInvestmentGBP" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_stripe_customers" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_subscription_mirrors" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "watchtower_spa_subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "stripeStatus" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "lastPaidAt" TIMESTAMP(3),
    "lastPaymentFailedAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_subscription_mirrors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_payment_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripeObjectId" TEXT,
    "type" TEXT NOT NULL,
    "profileId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "status" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_billing_alerts" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "watchtower_spa_billing_alert_status" NOT NULL DEFAULT 'OPEN',
    "stripeEventId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "watchtower_spa_billing_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_user_portfolios" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Portfolio',
    "declaredValueGBP" DOUBLE PRECISION,
    "investedAmountGBP" DOUBLE PRECISION,
    "cashAmountGBP" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_user_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_user_holdings" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION,
    "averagePrice" DOUBLE PRECISION,
    "investedGBP" DOUBLE PRECISION,
    "currentValueGBP" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_user_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_user_watchlists" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Watchlist',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_user_watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_user_watchlist_items" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_user_watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_average_plans" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "tradeOneGBP" DOUBLE PRECISION,
    "tradeTwoGBP" DOUBLE PRECISION,
    "tradeThreeGBP" DOUBLE PRECISION,
    "targetPriceOne" DOUBLE PRECISION,
    "targetPriceTwo" DOUBLE PRECISION,
    "targetPriceThree" DOUBLE PRECISION,
    "calculatedAveragePrice" DOUBLE PRECISION,
    "calculatedShares" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_average_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_due_diligence_records" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "notes" TEXT,
    "score" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_due_diligence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_usage_events" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "type" "watchtower_spa_usage_event_type" NOT NULL,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_analytics_rollups" (
    "id" TEXT NOT NULL,
    "rollupDate" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_analytics_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_admin_access_actions" (
    "id" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "actorProfileId" TEXT,
    "fromState" "watchtower_spa_access_state",
    "toState" "watchtower_spa_access_state" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_admin_access_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_admin_asset_actions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actorProfileId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_admin_asset_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_profiles_clerkUserId_key" ON "watchtower_spa_profiles"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_profiles_email_key" ON "watchtower_spa_profiles"("email");

-- CreateIndex
CREATE INDEX "watchtower_spa_profiles_role_accessState_idx" ON "watchtower_spa_profiles"("role", "accessState");

-- CreateIndex
CREATE INDEX "watchtower_spa_profiles_lastSeenAt_idx" ON "watchtower_spa_profiles"("lastSeenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_stripe_customers_profileId_key" ON "watchtower_spa_stripe_customers"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_stripe_customers_stripeCustomerId_key" ON "watchtower_spa_stripe_customers"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_subscription_mirrors_profileId_key" ON "watchtower_spa_subscription_mirrors"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_subscription_mirrors_stripeSubscriptionId_key" ON "watchtower_spa_subscription_mirrors"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "watchtower_spa_subscription_mirrors_status_currentPeriodEnd_idx" ON "watchtower_spa_subscription_mirrors"("status", "currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_payment_events_stripeEventId_key" ON "watchtower_spa_payment_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "watchtower_spa_payment_events_profileId_createdAt_idx" ON "watchtower_spa_payment_events"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_payment_events_type_createdAt_idx" ON "watchtower_spa_payment_events"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_billing_alerts_status_createdAt_idx" ON "watchtower_spa_billing_alerts"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_billing_alerts_profileId_createdAt_idx" ON "watchtower_spa_billing_alerts"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_user_portfolios_profileId_measuredAt_idx" ON "watchtower_spa_user_portfolios"("profileId", "measuredAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_user_holdings_assetId_idx" ON "watchtower_spa_user_holdings"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_user_holdings_profileId_assetId_key" ON "watchtower_spa_user_holdings"("profileId", "assetId");

-- CreateIndex
CREATE INDEX "watchtower_spa_user_watchlists_profileId_isDefault_idx" ON "watchtower_spa_user_watchlists"("profileId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_user_watchlists_profileId_name_key" ON "watchtower_spa_user_watchlists"("profileId", "name");

-- CreateIndex
CREATE INDEX "watchtower_spa_user_watchlist_items_assetId_idx" ON "watchtower_spa_user_watchlist_items"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_user_watchlist_items_watchlistId_assetId_key" ON "watchtower_spa_user_watchlist_items"("watchlistId", "assetId");

-- CreateIndex
CREATE INDEX "watchtower_spa_average_plans_profileId_createdAt_idx" ON "watchtower_spa_average_plans"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_average_plans_assetId_idx" ON "watchtower_spa_average_plans"("assetId");

-- CreateIndex
CREATE INDEX "watchtower_spa_due_diligence_records_assetId_idx" ON "watchtower_spa_due_diligence_records"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_due_diligence_records_profileId_assetId_key" ON "watchtower_spa_due_diligence_records"("profileId", "assetId");

-- CreateIndex
CREATE INDEX "watchtower_spa_usage_events_profileId_createdAt_idx" ON "watchtower_spa_usage_events"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_usage_events_type_createdAt_idx" ON "watchtower_spa_usage_events"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_analytics_rollups_key_rollupDate_idx" ON "watchtower_spa_analytics_rollups"("key", "rollupDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_analytics_rollups_rollupDate_key_key" ON "watchtower_spa_analytics_rollups"("rollupDate", "key");

-- CreateIndex
CREATE INDEX "watchtower_spa_admin_access_actions_targetProfileId_created_idx" ON "watchtower_spa_admin_access_actions"("targetProfileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_admin_asset_actions_assetId_createdAt_idx" ON "watchtower_spa_admin_asset_actions"("assetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_admin_asset_actions_actorProfileId_createdAt_idx" ON "watchtower_spa_admin_asset_actions"("actorProfileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_notifications_profileId_createdAt_idx" ON "watchtower_spa_notifications"("profileId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "watchtower_spa_stripe_customers" ADD CONSTRAINT "watchtower_spa_stripe_customers_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_subscription_mirrors" ADD CONSTRAINT "watchtower_spa_subscription_mirrors_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_billing_alerts" ADD CONSTRAINT "watchtower_spa_billing_alerts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_portfolios" ADD CONSTRAINT "watchtower_spa_user_portfolios_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_holdings" ADD CONSTRAINT "watchtower_spa_user_holdings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_holdings" ADD CONSTRAINT "watchtower_spa_user_holdings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_watchlists" ADD CONSTRAINT "watchtower_spa_user_watchlists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_watchlist_items" ADD CONSTRAINT "watchtower_spa_user_watchlist_items_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchtower_spa_user_watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_watchlist_items" ADD CONSTRAINT "watchtower_spa_user_watchlist_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_average_plans" ADD CONSTRAINT "watchtower_spa_average_plans_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_average_plans" ADD CONSTRAINT "watchtower_spa_average_plans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_due_diligence_records" ADD CONSTRAINT "watchtower_spa_due_diligence_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_due_diligence_records" ADD CONSTRAINT "watchtower_spa_due_diligence_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_usage_events" ADD CONSTRAINT "watchtower_spa_usage_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_notifications" ADD CONSTRAINT "watchtower_spa_notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_admin_access_actions" ADD CONSTRAINT "watchtower_spa_admin_access_actions_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_admin_access_actions" ADD CONSTRAINT "watchtower_spa_admin_access_actions_actorProfileId_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_admin_asset_actions" ADD CONSTRAINT "watchtower_spa_admin_asset_actions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_admin_asset_actions" ADD CONSTRAINT "watchtower_spa_admin_asset_actions_actorProfileId_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
