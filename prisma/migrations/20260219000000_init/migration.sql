-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "watchtower_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "watchtower_subscription_status" AS ENUM ('ACTIVE', 'OVERDUE', 'PAUSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "watchtower_asset_type" AS ENUM ('STOCK', 'ETF', 'CRYPTO', 'COMMODITY', 'FOREX', 'INDEX', 'OTHER');

-- CreateEnum
CREATE TYPE "watchtower_signal_state" AS ENUM ('NONE', 'BUY', 'SELL', 'BOTH');

-- CreateEnum
CREATE TYPE "watchtower_signal_event_type" AS ENUM ('ENTER_BUY', 'EXIT_BUY', 'ENTER_SELL', 'EXIT_SELL', 'ENTER_BOTH', 'EXIT_BOTH');

-- CreateTable
CREATE TABLE "watchtower_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "watchtower_role" NOT NULL DEFAULT 'MEMBER',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "watchtower_subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "dueAt" TIMESTAMP(3),
    "lastPaidAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "overdueStage" INTEGER NOT NULL DEFAULT 0,
    "lastOverdueNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT,
    "assetType" "watchtower_asset_type" NOT NULL DEFAULT 'STOCK',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sourceRow" INTEGER,
    "brokerEntryPrice" DOUBLE PRECISION,
    "averageEntryPrice" DOUBLE PRECISION,
    "shares" DOUBLE PRECISION,
    "currentCostGBP" DOUBLE PRECISION,
    "currentValueGBP" DOUBLE PRECISION,
    "weightPct" DOUBLE PRECISION,
    "returnPct" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "low52" DOUBLE PRECISION,
    "high52" DOUBLE PRECISION,
    "volumeAvg" DOUBLE PRECISION,
    "pe" DOUBLE PRECISION,
    "dataDelay" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "closeYest" DOUBLE PRECISION,
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_asset_rules" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "targetEntry" DOUBLE PRECISION,
    "targetExit" DOUBLE PRECISION,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_asset_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_asset_snapshots" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPrice" DOUBLE PRECISION,
    "dailyChangePct" DOUBLE PRECISION,
    "dailyChange" DOUBLE PRECISION,
    "dailyHigh" DOUBLE PRECISION,
    "dailyLow" DOUBLE PRECISION,
    "closeYest" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "low52" DOUBLE PRECISION,
    "high52" DOUBLE PRECISION,
    "volumeAvg" DOUBLE PRECISION,
    "pe" DOUBLE PRECISION,
    "dataDelay" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "signalState" "watchtower_signal_state" NOT NULL DEFAULT 'NONE',
    "source" TEXT,
    "raw" JSONB,

    CONSTRAINT "watchtower_asset_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_signal_events" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "eventType" "watchtower_signal_event_type" NOT NULL,
    "fromState" "watchtower_signal_state" NOT NULL,
    "toState" "watchtower_signal_state" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "watchtower_signal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_personal_watches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_personal_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_daily_briefs" (
    "id" TEXT NOT NULL,
    "briefDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "buy" JSONB NOT NULL,
    "sell" JSONB NOT NULL,
    "newToday" JSONB NOT NULL,
    "droppedOff" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_daily_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" "watchtower_role",
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_mock_email_logs" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_mock_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_import_runs" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "assetCount" INTEGER NOT NULL DEFAULT 0,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_users_email_key" ON "watchtower_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_sessions_tokenHash_key" ON "watchtower_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "watchtower_sessions_userId_idx" ON "watchtower_sessions"("userId");

-- CreateIndex
CREATE INDEX "watchtower_sessions_expiresAt_idx" ON "watchtower_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_subscriptions_userId_key" ON "watchtower_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "watchtower_subscriptions_status_idx" ON "watchtower_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_assets_symbol_key" ON "watchtower_assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_asset_rules_assetId_key" ON "watchtower_asset_rules"("assetId");

-- CreateIndex
CREATE INDEX "watchtower_asset_snapshots_assetId_capturedAt_idx" ON "watchtower_asset_snapshots"("assetId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_signal_events_assetId_occurredAt_idx" ON "watchtower_signal_events"("assetId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_signal_events_occurredAt_idx" ON "watchtower_signal_events"("occurredAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_personal_watches_userId_idx" ON "watchtower_personal_watches"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_personal_watches_userId_assetId_key" ON "watchtower_personal_watches"("userId", "assetId");

-- CreateIndex
CREATE INDEX "watchtower_daily_briefs_briefDate_idx" ON "watchtower_daily_briefs"("briefDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_daily_briefs_briefDate_timezone_key" ON "watchtower_daily_briefs"("briefDate", "timezone");

-- CreateIndex
CREATE INDEX "watchtower_notifications_userId_createdAt_idx" ON "watchtower_notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_notifications_role_createdAt_idx" ON "watchtower_notifications"("role", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_mock_email_logs_createdAt_idx" ON "watchtower_mock_email_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "watchtower_sessions" ADD CONSTRAINT "watchtower_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "watchtower_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_subscriptions" ADD CONSTRAINT "watchtower_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "watchtower_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_asset_rules" ADD CONSTRAINT "watchtower_asset_rules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_asset_snapshots" ADD CONSTRAINT "watchtower_asset_snapshots_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_signal_events" ADD CONSTRAINT "watchtower_signal_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_personal_watches" ADD CONSTRAINT "watchtower_personal_watches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "watchtower_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_personal_watches" ADD CONSTRAINT "watchtower_personal_watches_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_notifications" ADD CONSTRAINT "watchtower_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "watchtower_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

