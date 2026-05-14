-- CreateTable
CREATE TABLE "watchtower_spa_closed_positions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION,
    "investmentValueGBP" DOUBLE PRECISION,
    "averageEntryPrice" DOUBLE PRECISION,
    "exitPrice" DOUBLE PRECISION,
    "returnPct" DOUBLE PRECISION,
    "profitGBP" DOUBLE PRECISION,
    "reason" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchtower_spa_closed_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchtower_spa_closed_positions_profileId_closedAt_idx" ON "watchtower_spa_closed_positions"("profileId", "closedAt" DESC);

-- CreateIndex
CREATE INDEX "watchtower_spa_closed_positions_assetId_idx" ON "watchtower_spa_closed_positions"("assetId");

-- AddForeignKey
ALTER TABLE "watchtower_spa_closed_positions" ADD CONSTRAINT "watchtower_spa_closed_positions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchtower_spa_closed_positions" ADD CONSTRAINT "watchtower_spa_closed_positions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "watchtower_spa_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
