-- Widen the member request queue from "a stock" to "any security", and record
-- the admin's decision rather than only its outcome (2026-08-01 feedback).
-- Additive only: every column is nullable or defaulted, so existing rows stay
-- valid and the previous form keeps working.
--
-- The table name is unchanged. Renaming it would need a data migration for no
-- functional gain; only the concept widened.

-- What kind of security is being asked for. Mirrors the AssetType values used
-- across the app so an approved request can be created without translation.
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'STOCK';

-- Member-supplied identification. A ticker alone is genuinely ambiguous across
-- exchanges: "BARC" is Barclays on the LSE and an unrelated instrument
-- elsewhere, which is exactly how 83 assets came to be priced as the wrong
-- thing. Asking for the name and where it trades makes the request checkable.
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "name" TEXT;
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "market" TEXT;

-- The decision trail, so "who declined this and why" survives the status flip.
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "decidedAt" TIMESTAMP(3);
ALTER TABLE "watchtower_spa_stock_requests" ADD COLUMN "decidedById" TEXT;

ALTER TABLE "watchtower_spa_stock_requests"
  ADD CONSTRAINT "watchtower_spa_stock_requests_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "watchtower_spa_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The admin queue groups by symbol to spot the same security asked for by
-- several members, which is the strongest signal for what to add next.
CREATE INDEX "watchtower_spa_stock_requests_symbol_idx" ON "watchtower_spa_stock_requests"("symbol");
