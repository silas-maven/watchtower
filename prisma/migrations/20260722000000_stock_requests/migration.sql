-- Member stock-request queue (2026-07-22 feedback). Additive only.
CREATE TABLE "watchtower_spa_stock_requests" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watchtower_spa_stock_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "watchtower_spa_stock_requests_status_createdAt_idx" ON "watchtower_spa_stock_requests"("status", "createdAt" DESC);
CREATE INDEX "watchtower_spa_stock_requests_profileId_idx" ON "watchtower_spa_stock_requests"("profileId");
ALTER TABLE "watchtower_spa_stock_requests"
  ADD CONSTRAINT "watchtower_spa_stock_requests_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
