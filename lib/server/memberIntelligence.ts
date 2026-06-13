import { prisma } from '@/lib/prisma';

export type MemberIntelligence = {
  totals: {
    members: number;
    activeAccess: number;
    declaredPortfolioGBP: number;
    holdingsValueGBP: number;
    holdingsInvestedGBP: number;
    holdingsCount: number;
    activeLast7d: number;
    newLast30d: number;
  };
  topHeldAssets: Array<{ symbol: string; name: string; holders: number; totalValueGBP: number }>;
  recentClosedPositions: Array<{
    member: string;
    symbol: string;
    returnPct: number | null;
    profitGBP: number | null;
    closedAt: string;
  }>;
  watchlistLeaders: Array<{ symbol: string; name: string; watchers: number }>;
};

/**
 * Aggregated, owner-facing read of how members are using the platform: declared
 * portfolio size, real holdings value, what is most held and most watched, and
 * recent realised trades. This is the "how are they trading" view the owner asked
 * for, kept to aggregates rather than exposing any single member's full book.
 */
export async function getMemberIntelligence(): Promise<MemberIntelligence> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [profiles, holdings, watchItems, closed] = await Promise.all([
    prisma.profile.findMany({
      where: { role: 'MEMBER' },
      select: { id: true, accessState: true, declaredPortfolioGBP: true, lastSeenAt: true, createdAt: true },
    }),
    prisma.userHolding.findMany({
      select: { profileId: true, currentValueGBP: true, investedGBP: true, asset: { select: { symbol: true, name: true } } },
    }),
    prisma.userWatchlistItem.findMany({
      select: { asset: { select: { symbol: true, name: true } } },
    }),
    prisma.closedPosition.findMany({
      orderBy: { closedAt: 'desc' },
      take: 10,
      select: {
        returnPct: true,
        profitGBP: true,
        closedAt: true,
        asset: { select: { symbol: true } },
        profile: { select: { name: true } },
      },
    }),
  ]);

  const byAsset = new Map<string, { name: string; holders: Set<string>; totalValueGBP: number }>();
  let holdingsValueGBP = 0;
  let holdingsInvestedGBP = 0;
  for (const h of holdings) {
    holdingsValueGBP += h.currentValueGBP ?? 0;
    holdingsInvestedGBP += h.investedGBP ?? 0;
    const entry = byAsset.get(h.asset.symbol) ?? { name: h.asset.name, holders: new Set<string>(), totalValueGBP: 0 };
    entry.holders.add(h.profileId);
    entry.totalValueGBP += h.currentValueGBP ?? 0;
    byAsset.set(h.asset.symbol, entry);
  }

  const watchByAsset = new Map<string, { name: string; watchers: number }>();
  for (const w of watchItems) {
    const entry = watchByAsset.get(w.asset.symbol) ?? { name: w.asset.name, watchers: 0 };
    entry.watchers += 1;
    watchByAsset.set(w.asset.symbol, entry);
  }

  return {
    totals: {
      members: profiles.length,
      activeAccess: profiles.filter((p) => p.accessState === 'ACTIVE').length,
      declaredPortfolioGBP: profiles.reduce((acc, p) => acc + (p.declaredPortfolioGBP ?? 0), 0),
      holdingsValueGBP,
      holdingsInvestedGBP,
      holdingsCount: holdings.length,
      activeLast7d: profiles.filter((p) => p.lastSeenAt && p.lastSeenAt >= weekAgo).length,
      newLast30d: profiles.filter((p) => p.createdAt >= monthAgo).length,
    },
    topHeldAssets: [...byAsset.entries()]
      .map(([symbol, v]) => ({ symbol, name: v.name, holders: v.holders.size, totalValueGBP: v.totalValueGBP }))
      .sort((a, b) => b.holders - a.holders || b.totalValueGBP - a.totalValueGBP)
      .slice(0, 8),
    recentClosedPositions: closed.map((c) => ({
      member: c.profile.name,
      symbol: c.asset.symbol,
      returnPct: c.returnPct,
      profitGBP: c.profitGBP,
      closedAt: c.closedAt.toISOString().slice(0, 10),
    })),
    watchlistLeaders: [...watchByAsset.entries()]
      .map(([symbol, v]) => ({ symbol, name: v.name, watchers: v.watchers }))
      .sort((a, b) => b.watchers - a.watchers)
      .slice(0, 8),
  };
}
