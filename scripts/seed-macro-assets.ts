// Seed (or update) the macro instruments behind the ticker strip, Market
// Snapshot and Weather Outside. Idempotent: upserts on Asset.symbol.
// Run: npx tsx --env-file=.env scripts/seed-macro-assets.ts
import { AssetType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { MACRO_INSTRUMENTS } from '../lib/market/macro';

async function main() {
  for (const inst of MACRO_INSTRUMENTS) {
    const asset = await prisma.asset.upsert({
      where: { symbol: inst.symbol },
      update: {
        quoteSymbol: inst.quoteSymbol,
        name: inst.label,
        assetType: inst.assetType as AssetType,
        currency: inst.currency,
        isMacro: true,
        isActive: true,
      },
      create: {
        symbol: inst.symbol,
        quoteSymbol: inst.quoteSymbol,
        name: inst.label,
        assetType: inst.assetType as AssetType,
        currency: inst.currency,
        isMacro: true,
        isActive: true,
      },
    });
    console.log(`${inst.symbol.padEnd(8)} ${inst.label.padEnd(14)} -> ${asset.id}`);
  }
  const count = await prisma.asset.count({ where: { isMacro: true } });
  console.log(`Macro assets in DB: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
