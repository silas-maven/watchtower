-- Client feedback round foundation (2026-07-19 feedback). Additive only.
-- 1) Expanded asset metrics for the Key fields card + filters
-- 2) Macro instrument flag for the ticker strip / Weather Outside
-- 3) REIT product type
-- 4) AiReport persistence for the AI tools (pitch / stress test / personal finance)
-- 5) PersonalFinanceInput per-member form storage

-- REIT product type (PG12+: allowed in a transaction as long as the value is
-- not used before commit, which this migration does not do)
ALTER TYPE "watchtower_spa_asset_type" ADD VALUE IF NOT EXISTS 'REIT';

-- Expanded asset metrics + macro flag
ALTER TABLE "watchtower_spa_assets"
  ADD COLUMN "ma50" DOUBLE PRECISION,
  ADD COLUMN "ma200" DOUBLE PRECISION,
  ADD COLUMN "dividendYield" DOUBLE PRECISION,
  ADD COLUMN "quickRatio" DOUBLE PRECISION,
  ADD COLUMN "currentRatio" DOUBLE PRECISION,
  ADD COLUMN "debtToEquity" DOUBLE PRECISION,
  ADD COLUMN "sectorPE" DOUBLE PRECISION,
  ADD COLUMN "fundamentalsAt" TIMESTAMP(3),
  ADD COLUMN "isMacro" BOOLEAN NOT NULL DEFAULT false;

-- AI report kind + table
CREATE TYPE "watchtower_spa_ai_report_kind" AS ENUM ('PITCH', 'STRESS_TEST', 'PERSONAL_FINANCE');

CREATE TABLE "watchtower_spa_ai_reports" (
  "id" TEXT NOT NULL,
  "kind" "watchtower_spa_ai_report_kind" NOT NULL,
  "profileId" TEXT,
  "assetId" TEXT,
  "inputs" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "model" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "watchtower_spa_ai_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "watchtower_spa_ai_reports_profileId_kind_createdAt_idx"
  ON "watchtower_spa_ai_reports"("profileId", "kind", "createdAt" DESC);
CREATE INDEX "watchtower_spa_ai_reports_assetId_kind_createdAt_idx"
  ON "watchtower_spa_ai_reports"("assetId", "kind", "createdAt" DESC);
ALTER TABLE "watchtower_spa_ai_reports"
  ADD CONSTRAINT "watchtower_spa_ai_reports_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchtower_spa_ai_reports"
  ADD CONSTRAINT "watchtower_spa_ai_reports_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Personal finance inputs (one row per member)
CREATE TABLE "watchtower_spa_personal_finance_inputs" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "age" INTEGER,
  "monthlyIncome" DOUBLE PRECISION,
  "monthlyExpenses" DOUBLE PRECISION,
  "savings" DOUBLE PRECISION,
  "investments" DOUBLE PRECISION,
  "pension" DOUBLE PRECISION,
  "debts" JSONB,
  "homeValue" DOUBLE PRECISION,
  "monthlyInvesting" DOUBLE PRECISION,
  "goal" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watchtower_spa_personal_finance_inputs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "watchtower_spa_personal_finance_inputs_profileId_key"
  ON "watchtower_spa_personal_finance_inputs"("profileId");
ALTER TABLE "watchtower_spa_personal_finance_inputs"
  ADD CONSTRAINT "watchtower_spa_personal_finance_inputs_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
