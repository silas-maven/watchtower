-- Product v2 foundation: signal overrides, platform settings, weekly digests,
-- virtual portfolios, per-asset quote symbols, job runs.
-- NOTE: intentionally does NOT drop the stray "dossier_visitors" table that
-- lives in this schema; it belongs to another project and is not Prisma-managed here.

-- CreateEnum
CREATE TYPE "watchtower_spa_signal_override" AS ENUM ('FORCE_BUY', 'FORCE_SELL', 'SUPPRESS');

-- CreateEnum
CREATE TYPE "watchtower_spa_portfolio_kind" AS ENUM ('REAL', 'VIRTUAL');

-- DropIndex
DROP INDEX "watchtower_spa_user_holdings_profileId_assetId_key";

-- AlterTable
ALTER TABLE "watchtower_spa_asset_rules" ADD COLUMN     "overrideNote" TEXT,
ADD COLUMN     "overrideSetAt" TIMESTAMP(3),
ADD COLUMN     "overrideSetById" TEXT,
ADD COLUMN     "signalOverride" "watchtower_spa_signal_override";

-- AlterTable
ALTER TABLE "watchtower_spa_asset_snapshots" ADD COLUMN     "fetchError" TEXT;

-- AlterTable
ALTER TABLE "watchtower_spa_assets" ADD COLUMN     "nextEarningsDate" TIMESTAMP(3),
ADD COLUMN     "quoteSymbol" TEXT;

-- AlterTable
ALTER TABLE "watchtower_spa_average_plans" ADD COLUMN     "targetPriceFour" DOUBLE PRECISION,
ADD COLUMN     "tradeFourGBP" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "watchtower_spa_daily_briefs" ADD COLUMN     "generationError" TEXT;

-- AlterTable
ALTER TABLE "watchtower_spa_user_holdings" ADD COLUMN     "portfolioId" TEXT;

-- AlterTable
ALTER TABLE "watchtower_spa_user_portfolios" ADD COLUMN     "budgetPerStockGBP" DOUBLE PRECISION,
ADD COLUMN     "kind" "watchtower_spa_portfolio_kind" NOT NULL DEFAULT 'REAL',
ADD COLUMN     "minEntryGBP" DOUBLE PRECISION,
ADD COLUMN     "targetHoldingsCount" INTEGER;

-- CreateTable
CREATE TABLE "watchtower_spa_weekly_digests" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "generationError" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchtower_spa_weekly_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchtower_spa_platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "watchtower_spa_job_runs" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,

    CONSTRAINT "watchtower_spa_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchtower_spa_weekly_digests_weekStart_idx" ON "watchtower_spa_weekly_digests"("weekStart" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_weekly_digests_weekStart_timezone_key" ON "watchtower_spa_weekly_digests"("weekStart", "timezone");

-- CreateIndex
CREATE INDEX "watchtower_spa_job_runs_job_startedAt_idx" ON "watchtower_spa_job_runs"("job", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_user_holdings_portfolioId_idx" ON "watchtower_spa_user_holdings"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "watchtower_spa_user_holdings_profileId_assetId_portfolioId_key" ON "watchtower_spa_user_holdings"("profileId", "assetId", "portfolioId");

-- CreateIndex
CREATE INDEX "watchtower_spa_user_portfolios_profileId_kind_idx" ON "watchtower_spa_user_portfolios"("profileId", "kind");

-- AddForeignKey
ALTER TABLE "watchtower_spa_user_holdings" ADD CONSTRAINT "watchtower_spa_user_holdings_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "watchtower_spa_user_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
