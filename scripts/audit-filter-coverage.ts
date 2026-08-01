// Read-only: how much of the member-facing universe can actually be filtered by
// market-cap band and by product type. Filters are only useful if the underlying
// fields are populated, so check before building the UI.
//   npx tsx --env-file=.env scripts/audit-filter-coverage.ts
import { prisma } from '../lib/prisma';
import { marketCapBand } from '../lib/marketCap';

async function main() {
  const assets = await prisma.asset.findMany({
    where: { isMacro: false, isActive: true },
    select: {
      symbol: true,
      currency: true,
      assetType: true,
      marketCap: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1, select: { marketCap: true } },
    },
  });

  const byType = new Map<string, number>();
  const byBand = new Map<string, number>();

  for (const a of assets) {
    byType.set(a.assetType, (byType.get(a.assetType) ?? 0) + 1);
    const cap = a.snapshots[0]?.marketCap ?? a.marketCap;
    const band = marketCapBand(cap, a.currency) ?? 'no data';
    byBand.set(band, (byBand.get(band) ?? 0) + 1);
  }

  console.log(`member-facing assets: ${assets.length}\n`);
  console.log('by product type:');
  for (const [k, v] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${String(v).padStart(4)}  ${((v / assets.length) * 100).toFixed(1)}%`);
  }
  console.log('\nby market-cap band:');
  for (const [k, v] of [...byBand].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${String(v).padStart(4)}  ${((v / assets.length) * 100).toFixed(1)}%`);
  }

  // A cap filter hides everything with no cap figure, so it matters how much of
  // that gap is legitimate (an ETF has no market cap, it has assets under
  // management) versus a genuine data hole in the equities.
  const noCap = assets.filter((a) => marketCapBand(a.snapshots[0]?.marketCap ?? a.marketCap, a.currency) == null);
  const noCapByType = new Map<string, number>();
  for (const a of noCap) noCapByType.set(a.assetType, (noCapByType.get(a.assetType) ?? 0) + 1);
  console.log('\nthe "no data" group, by product type:');
  for (const [k, v] of [...noCapByType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${String(v).padStart(4)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
