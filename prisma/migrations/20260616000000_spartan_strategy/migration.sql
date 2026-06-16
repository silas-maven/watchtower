-- Spartan Strategy: per-holding averaging plans (price-based, executable tranches),
-- holding <-> plan link, and the Spartan toggle. Additive only — the legacy
-- AveragePlan budget/target columns are left in place (unused) for safety.

-- AveragePlan: price-based plan reference + target sell
ALTER TABLE "watchtower_spa_average_plans"
  ADD COLUMN "basePrice" DOUBLE PRECISION,
  ADD COLUMN "targetSellPrice" DOUBLE PRECISION;

-- Variable-count, individually-executable tranches
CREATE TABLE "watchtower_spa_average_plan_tranches" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "budgetGBP" DOUBLE PRECISION,
  "executed" BOOLEAN NOT NULL DEFAULT false,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watchtower_spa_average_plan_tranches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "watchtower_spa_average_plan_tranches_planId_orderIndex_key" ON "watchtower_spa_average_plan_tranches"("planId", "orderIndex");
CREATE INDEX "watchtower_spa_average_plan_tranches_planId_idx" ON "watchtower_spa_average_plan_tranches"("planId");
ALTER TABLE "watchtower_spa_average_plan_tranches"
  ADD CONSTRAINT "watchtower_spa_average_plan_tranches_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "watchtower_spa_average_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserHolding: Spartan toggle, plan link (1:1), and manual overrides
ALTER TABLE "watchtower_spa_user_holdings"
  ADD COLUMN "spartanEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "averagePlanId" TEXT,
  ADD COLUMN "manualNextBuyPrice" DOUBLE PRECISION,
  ADD COLUMN "manualSellTarget" DOUBLE PRECISION;
CREATE UNIQUE INDEX "watchtower_spa_user_holdings_averagePlanId_key" ON "watchtower_spa_user_holdings"("averagePlanId");
ALTER TABLE "watchtower_spa_user_holdings"
  ADD CONSTRAINT "watchtower_spa_user_holdings_averagePlanId_fkey"
  FOREIGN KEY ("averagePlanId") REFERENCES "watchtower_spa_average_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
