/**
 * Page-level timing for the heaviest member pages. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/perf-pages.ts dotenv_config_path=.env
 *
 * perf-audit.ts times individual queries in isolation. This times a whole page's
 * server-side data gather, two ways, because the two numbers answer different
 * questions and reading the wrong one is how you optimise the wrong thing:
 *
 *   SEQUENTIAL  each call alone, nothing else in flight. This is the honest cost
 *               of that call. Use it to find which call to fix.
 *   PARALLEL    all of them in one Promise.all, as the page actually runs them.
 *               This is what the member waits for. It is usually MORE than the
 *               slowest sequential call rather than equal to it, because
 *               concurrent queries contend for connection slots in the pooler.
 *
 * A call that looks fast sequentially and slow in parallel is not a slow query,
 * it is a queueing problem, and the fix is fewer round trips rather than a better
 * index.
 */
import { PrismaClient } from '@prisma/client';
import { getDashboardAssets, getAssetsForDashboard } from '@/lib/server/dashboard';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';
import { getWatchlistsPageData } from '@/lib/server/watchlists';
import { getMemberBrief } from '@/lib/server/memberBrief';
import { getBriefHighlights } from '@/lib/server/briefHighlights';
import { getDailySignalSummary } from '@/lib/server/signals';
import { getFeaturedPosts } from '@/lib/server/community';
import { getMacroTiles } from '@/lib/market/macro';
import { getSettings } from '@/lib/server/settings';

const prisma = new PrismaClient();

type Call = { label: string; run: () => Promise<unknown> };

async function page(name: string, calls: Call[]) {
  console.log(`\n=== ${name} ===`);
  console.log('  sequential (each call alone):');
  for (const c of calls) {
    const t = performance.now();
    const out = await c.run();
    const kb = out ? JSON.stringify(out).length / 1024 : 0;
    console.log(`    ${c.label.padEnd(32)} ${(performance.now() - t).toFixed(0).padStart(5)}ms  ${kb.toFixed(0).padStart(5)} KB`);
  }
  const t = performance.now();
  await Promise.all(calls.map((c) => c.run()));
  console.log(`  PARALLEL WALL CLOCK (what a member waits): ${(performance.now() - t).toFixed(0)}ms`);
}

async function main() {
  // Worst case: the profile with the most tracked assets.
  const busiest = await prisma.userWatchlistItem.groupBy({
    by: ['watchlistId'], _count: true, orderBy: { _count: { watchlistId: 'desc' } }, take: 1,
  });
  const list = busiest[0]
    ? await prisma.userWatchlist.findUnique({ where: { id: busiest[0].watchlistId }, select: { profileId: true } })
    : null;
  const profile = list
    ? await prisma.profile.findUnique({ where: { id: list.profileId }, select: { id: true, email: true } })
    : await prisma.profile.findFirst({ select: { id: true, email: true } });
  if (!profile) throw new Error('no profiles');
  console.log(`Profile under test: ${profile.email}`);

  await prisma.$queryRaw`SELECT 1`; // warm the pool, do not time it

  const trackedIds = [
    ...new Set(
      (await prisma.userWatchlistItem.findMany({
        where: { watchlist: { profileId: profile.id } }, select: { assetId: true },
      })).map((t) => t.assetId),
    ),
  ];

  await page('/app  DASHBOARD', [
    { label: 'getLivePortfolioView', run: () => getLivePortfolioView(profile.id).catch(() => null) },
    { label: 'getDashboardAssets', run: () => getDashboardAssets(profile.id).catch(() => []) },
    { label: 'watchlist items', run: () => prisma.userWatchlistItem.findMany({ where: { watchlist: { profileId: profile.id } }, select: { assetId: true } }) },
    { label: 'getSettings', run: () => getSettings() },
    { label: 'getMacroTiles', run: () => getMacroTiles().catch(() => new Map()) },
    { label: 'getFeaturedPosts', run: () => getFeaturedPosts().catch(() => []) },
  ]);

  await page('/app/watchlists', [
    { label: 'getWatchlistsPageData', run: () => getWatchlistsPageData(profile.id, { includeSignals: true }) },
  ]);

  await page('/app/daily-checks', [
    { label: 'getMemberBrief', run: () => getMemberBrief(profile.id, 'live').catch(() => null) },
    { label: 'dailyBrief.findFirst', run: () => prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }) },
    { label: 'getDailySignalSummary', run: () => getDailySignalSummary().catch(() => null) },
    { label: 'getBriefHighlights', run: () => getBriefHighlights(new Date(), trackedIds).catch(() => null) },
  ]);

  console.log('\n=== reference: the whole-universe call the Dashboard no longer makes ===');
  const t = performance.now();
  const all = await getAssetsForDashboard();
  console.log(`  getAssetsForDashboard  ${(performance.now() - t).toFixed(0)}ms  ${all.length} rows  ${(JSON.stringify(all).length / 1024).toFixed(0)} KB`);
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
