/**
 * Correctness check for the relationJoins preview feature. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/perf-verify-parity.ts dotenv_config_path=.env
 *
 * Enabling relationJoins changes how EVERY relation in the app is loaded, from a
 * second query to a LATERAL JOIN. It is a large speed win but it is a preview
 * feature, so the only responsible way to adopt it is to prove the rows come
 * back identical rather than merely faster.
 *
 * With the feature on, relationLoadStrategy can be set per query, so the old and
 * new paths can be run against the same live data and deep-compared.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let failures = 0;

function compare(label: string, a: unknown, b: unknown) {
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  // Report rows and bytes, not rounded KB: "0 KB" on a small-but-present result
  // reads as "empty", and a parity check that silently compares two empty arrays
  // proves nothing while printing PASS.
  const rows = Array.isArray(a) ? a.length : 1;
  if (ja === jb) {
    const warn = rows === 0 ? '   <-- EMPTY, proves nothing' : '';
    console.log(`  PASS  ${label.padEnd(42)} ${String(rows).padStart(4)} rows, ${String(ja.length).padStart(7)} bytes identical${warn}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`);
  console.log(`        query strategy: ${ja.length} bytes`);
  console.log(`        join  strategy: ${jb.length} bytes`);
  // Find the first differing row to make the failure actionable.
  const arrA = Array.isArray(a) ? a : [a];
  const arrB = Array.isArray(b) ? b : [b];
  for (let i = 0; i < Math.max(arrA.length, arrB.length); i++) {
    const x = JSON.stringify(arrA[i]);
    const y = JSON.stringify(arrB[i]);
    if (x !== y) {
      console.log(`        first difference at index ${i}:`);
      console.log(`          query: ${x?.slice(0, 300)}`);
      console.log(`          join : ${y?.slice(0, 300)}`);
      break;
    }
  }
}

async function bothWays<T>(label: string, run: (strategy: 'query' | 'join') => Promise<T>) {
  const viaQuery = await run('query');
  const viaJoin = await run('join');
  compare(label, viaQuery, viaJoin);
}

async function main() {
  console.log('=== ROW-FOR-ROW PARITY: query strategy vs join strategy ===\n');

  // 1. The dashboard loader, the heaviest and the one with nested take:1.
  await bothWays('getAssetsForDashboard shape (815 assets)', (relationLoadStrategy) =>
    prisma.asset.findMany({
      relationLoadStrategy,
      where: { isActive: true, isMacro: false },
      select: {
        id: true, symbol: true, name: true, reason: true, assetType: true, currency: true,
        rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
        snapshots: {
          orderBy: { capturedAt: 'desc' }, take: 1,
          select: { currentPrice: true, dailyChangePct: true, dailyLow: true, dailyHigh: true },
        },
      },
      orderBy: { symbol: 'asc' },
    }),
  );

  // 2. The Asset Centre / briefHighlights shape: full include, every column.
  await bothWays('assets page shape, full include', (relationLoadStrategy) =>
    prisma.asset.findMany({
      relationLoadStrategy,
      where: { isActive: true, isMacro: false },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
      orderBy: { symbol: 'asc' },
    }),
  );

  // 3. The watchlists loader, including the user's own lists with nested items.
  //
  // Pick profiles that actually HAVE the data, not just the first row: comparing
  // two empty arrays passes without exercising anything. The watchlist fixture is
  // whoever owns the most list items, and the community fixture is the author of
  // an actual post.
  const busiest = await prisma.userWatchlistItem.groupBy({
    by: ['watchlistId'],
    _count: true,
    orderBy: { _count: { watchlistId: 'desc' } },
    take: 1,
  });
  const busiestList = busiest[0]
    ? await prisma.userWatchlist.findUnique({ where: { id: busiest[0].watchlistId }, select: { profileId: true } })
    : null;
  const poster = await prisma.communityPost.findFirst({ select: { profileId: true } });
  const anyProfile =
    (busiestList ? { id: busiestList.profileId } : null) ??
    (poster ? { id: poster.profileId } : null) ??
    (await prisma.profile.findFirst({ select: { id: true } }));

  console.log(
    `  (fixtures: watchlist owner ${busiestList?.profileId ?? 'none'} with ${busiest[0]?._count ?? 0} items, ` +
      `post author ${poster?.profileId ?? 'none'})\n`,
  );

  if (anyProfile) {
    await bothWays('userWatchlist + nested items', (relationLoadStrategy) =>
      prisma.userWatchlist.findMany({
        relationLoadStrategy,
        where: { profileId: anyProfile.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: { items: { select: { assetId: true } } },
      }),
    );

    // 4. The community feed: nested replies with a filter, plus a filtered
    //    to-many (likes) scoped to the viewer. The riskiest shape in the app.
    await bothWays('community feed, nested replies + likes', (relationLoadStrategy) => {
      const visible = { OR: [{ status: 'PUBLISHED' }, { profileId: anyProfile.id }] };
      return prisma.communityPost.findMany({
        relationLoadStrategy,
        where: { parentId: null, ...visible },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          replies: { where: visible, orderBy: { createdAt: 'asc' }, take: 20 },
          likes: { where: { profileId: anyProfile.id }, select: { postId: true } },
        },
      });
    });

    // 5. Holdings joined to portfolio and asset: the portfolio view path.
    await bothWays('holdings + portfolio + asset', (relationLoadStrategy) =>
      prisma.userHolding.findMany({
        relationLoadStrategy,
        where: { profileId: anyProfile.id },
        include: {
          portfolio: { select: { kind: true } },
          asset: { include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } } },
        },
      }),
    );
  }

  // 6. Average plans with ordered child tranches: nested orderBy on a to-many.
  await bothWays('average plans + ordered tranches', (relationLoadStrategy) =>
    prisma.averagePlan.findMany({
      relationLoadStrategy,
      take: 25,
      include: { tranches: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
  );

  // 7. Admin moderation queue: three relations at once, one of them self-referential.
  await bothWays('admin community queue', (relationLoadStrategy) =>
    prisma.communityPost.findMany({
      relationLoadStrategy,
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        profile: { select: { id: true, name: true, email: true, tier: true } },
        moderatedBy: { select: { name: true } },
        parent: { select: { id: true, alias: true, body: true } },
      },
    }),
  );

  // 8. Subscription mirrors with profile: the billing sweep path.
  await bothWays('subscription mirrors + profile', (relationLoadStrategy) =>
    prisma.subscriptionMirror.findMany({
      relationLoadStrategy,
      where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
      include: { profile: true },
    }),
  );

  console.log(
    failures === 0
      ? '\nRESULT: every shape identical between strategies.'
      : `\nRESULT: ${failures} shape(s) DIFFER. Do not ship relationJoins.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error('PARITY CHECK FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
