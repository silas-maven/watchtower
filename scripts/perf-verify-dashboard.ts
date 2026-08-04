/**
 * Equivalence check for the Dashboard query narrowing. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/perf-verify-dashboard.ts dotenv_config_path=.env
 *
 * getDashboardAssets() filters candidates in SQL instead of loading all 815
 * active assets and narrowing in JavaScript. That is only a safe change if the
 * two lists the page actually renders come out identical, so this rebuilds both
 * of them the way app/app/page.tsx does and compares them per profile.
 */
import { PrismaClient } from '@prisma/client';
import { getAssetsForDashboard, getDashboardAssets, type AssetWithLatest } from '@/lib/server/dashboard';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';

const prisma = new PrismaClient();

/** Exactly the derivation in app/app/page.tsx. */
function derive(rows: AssetWithLatest[], trackedAssetIds: Set<string>) {
  return {
    tracked: rows.filter((r) => trackedAssetIds.has(r.id)).map((r) => r.symbol),
    opportunities: rows
      .filter((r) => (r.signalState === 'BUY' || r.signalState === 'BOTH') && !trackedAssetIds.has(r.id))
      .map((r) => r.symbol),
  };
}

async function main() {
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true } });
  console.log(`Comparing old and new Dashboard derivation for ${profiles.length} profiles.\n`);

  const before = await getAssetsForDashboard();
  console.log(`  whole universe:  ${before.length} rows, ${(JSON.stringify(before).length / 1024).toFixed(0)} KB`);

  let failures = 0;

  for (const profile of profiles) {
    const [live, watchItems] = await Promise.all([
      getLivePortfolioView(profile.id).catch(() => null),
      prisma.userWatchlistItem.findMany({
        where: { watchlist: { profileId: profile.id } },
        select: { assetId: true },
      }),
    ]);
    const tracked = new Set([
      ...(live?.holdings ?? []).map((h) => h.assetId),
      ...watchItems.map((w) => w.assetId),
    ]);

    const after = await getDashboardAssets(profile.id);
    const a = derive(before, tracked);
    const b = derive(after, tracked);

    const same =
      JSON.stringify(a.tracked) === JSON.stringify(b.tracked) &&
      JSON.stringify(a.opportunities) === JSON.stringify(b.opportunities);
    if (!same) failures += 1;

    console.log(
      `  ${same ? 'PASS' : 'FAIL'}  ${profile.email.padEnd(34)} ` +
        `candidates ${String(after.length).padStart(3)}/${before.length}  ` +
        `tracked ${a.tracked.length}->${b.tracked.length}  ` +
        `opportunities ${a.opportunities.length}->${b.opportunities.length}  ` +
        `${(JSON.stringify(after).length / 1024).toFixed(0)} KB`,
    );
    if (!same) {
      console.log(`        tracked  old: ${a.tracked.join(',')}`);
      console.log(`        tracked  new: ${b.tracked.join(',')}`);
      const missing = a.opportunities.filter((s) => !b.opportunities.includes(s));
      const extra = b.opportunities.filter((s) => !a.opportunities.includes(s));
      if (missing.length) console.log(`        DROPPED opportunities: ${missing.join(',')}`);
      if (extra.length) console.log(`        EXTRA   opportunities: ${extra.join(',')}`);
    }
  }

  console.log(
    failures === 0
      ? '\nRESULT: the narrowed query renders exactly the same two lists for every profile.'
      : `\nRESULT: ${failures} profile(s) differ. Do not ship.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
