import { prisma } from '@/lib/prisma';
import { getDefaultWatchlist } from '@/lib/auth';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';

export type WatchlistSignal = 'NONE' | 'BUY' | 'SELL' | 'BOTH';

export type WatchlistAssetRow = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  marketCap: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  latestSnapshot: {
    currentPrice: number | null;
    dailyChangePct: number | null;
    dailyHigh: number | null;
    dailyLow: number | null;
    signalState: WatchlistSignal;
  } | null;
};

export type WatchlistRow = { id: string; name: string; isDefault: boolean; assetIds: string[] };

export type WatchlistsPageData = { assets: WatchlistAssetRow[]; lists: WatchlistRow[] };

/**
 * Server-side loader for the watchlists page. Replaces the old client-side
 * waterfall (two no-store fetches, each re-running auth + getDefaultWatchlist).
 * One auth upstream, then assets + lists in parallel.
 */
export async function getWatchlistsPageData(profileId: string): Promise<WatchlistsPageData> {
  await getDefaultWatchlist(profileId); // guarantee the member has at least one list

  const [assets, lists] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true, isMacro: false },
      select: {
        id: true,
        symbol: true,
        name: true,
        assetType: true,
        currency: true,
        marketCap: true,
        rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
          select: { currentPrice: true, dailyChangePct: true, dailyHigh: true, dailyLow: true },
        },
      },
      orderBy: { symbol: 'asc' },
    }),
    prisma.userWatchlist.findMany({
      where: { profileId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { items: { select: { assetId: true } } },
    }),
  ]);

  const assetRows: WatchlistAssetRow[] = assets.map((a) => {
    const snap = a.snapshots[0];
    const computed = computeSignalState({
      dailyLow: snap?.dailyLow ?? null,
      dailyHigh: snap?.dailyHigh ?? null,
      targetEntry: a.rule?.targetEntry ?? null,
      targetExit: a.rule?.targetExit ?? null,
    });
    const signalState = effectiveSignalState(computed, a.rule?.signalOverride) as WatchlistSignal;
    return {
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      assetType: a.assetType,
      currency: a.currency,
      marketCap: a.marketCap,
      targetEntry: a.rule?.targetEntry ?? null,
      targetExit: a.rule?.targetExit ?? null,
      latestSnapshot: snap
        ? {
            currentPrice: snap.currentPrice,
            dailyChangePct: snap.dailyChangePct,
            dailyHigh: snap.dailyHigh,
            dailyLow: snap.dailyLow,
            signalState,
          }
        : null,
    };
  });

  const listRows: WatchlistRow[] = lists.map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.isDefault,
    assetIds: l.items.map((i) => i.assetId),
  }));

  return { assets: assetRows, lists: listRows };
}
