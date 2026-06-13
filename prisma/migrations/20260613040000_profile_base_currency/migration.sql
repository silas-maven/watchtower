-- Add per-member base currency for app-wide value display.
ALTER TABLE "watchtower_spa_profiles" ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'GBP';
