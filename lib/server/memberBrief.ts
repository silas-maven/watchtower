import { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeSignalState, effectiveSignalState, isBuyLike, isSellLike } from '@/lib/signals/engine';

export type MemberBriefAsset = {
  symbol: string;
  name: string;
  signalState: SignalState;
  isManualSignal: boolean;
  currentPrice: number | null;
  dailyChangePct: number | null;
};

export type MemberBrief = {
  generatedAt: string;
  trackedCount: number;
  watchlists: Array<{ id: string; name: string; isDefault: boolean; itemCount: number; activeSignals: number }>;
  buy: MemberBriefAsset[];
  sell: MemberBriefAsset[];
  movers: { gainers: MemberBriefAsset[]; losers: MemberBriefAsset[] };
  holdings: {
    count: number;
    investedGBP: number;
    valueGBP: number;
    returnPct: number | null;
    inSignal: MemberBriefAsset[];
  };
  headline: string;
};

type AssetRow = {
  id: string;
  symbol: string;
  name: string;
  rule: { targetEntry: number | null; targetExit: number | null; signalOverride: import('@prisma/client').SignalOverride | null } | null;
  snapshots: Array<{ dailyLow: number | null; dailyHigh: number | null; currentPrice: number | null; dailyChangePct: number | null }>;
};

function resolveAsset(asset: AssetRow): MemberBriefAsset {
  const snap = asset.snapshots[0];
  const computed = computeSignalState({
    dailyLow: snap?.dailyLow ?? null,
    dailyHigh: snap?.dailyHigh ?? null,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
  });
  return {
    symbol: asset.symbol,
    name: asset.name,
    signalState: effectiveSignalState(computed, asset.rule?.signalOverride),
    isManualSignal: asset.rule?.signalOverride != null,
    currentPrice: snap?.currentPrice ?? null,
    dailyChangePct: snap?.dailyChangePct ?? null,
  };
}

/**
 * Deterministic per-member summary across the sublists they track and the
 * holdings they hold. No model call: it is cheap, private, and reproducible.
 */
export async function getMemberBrief(profileId: string): Promise<MemberBrief> {
  const [watchlists, holdings] = await Promise.all([
    prisma.userWatchlist.findMany({
      where: { profileId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        items: {
          include: {
            asset: {
              include: {
                rule: true,
                snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    }),
    prisma.userHolding.findMany({
      where: { profileId },
      include: {
        asset: {
          include: {
            rule: true,
            snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        },
      },
    }),
  ]);

  const trackedById = new Map<string, MemberBriefAsset>();
  const watchlistSummaries = watchlists.map((wl) => {
    let activeSignals = 0;
    for (const item of wl.items) {
      const resolved = resolveAsset(item.asset as AssetRow);
      trackedById.set(item.asset.id, resolved);
      if (resolved.signalState !== SignalState.NONE) activeSignals += 1;
    }
    return { id: wl.id, name: wl.name, isDefault: wl.isDefault, itemCount: wl.items.length, activeSignals };
  });

  const tracked = [...trackedById.values()];
  const buy = tracked.filter((a) => isBuyLike(a.signalState)).sort((a, b) => a.symbol.localeCompare(b.symbol));
  const sell = tracked.filter((a) => isSellLike(a.signalState)).sort((a, b) => a.symbol.localeCompare(b.symbol));

  const withChange = tracked.filter((a) => a.dailyChangePct != null);
  const gainers = [...withChange].sort((a, b) => (b.dailyChangePct ?? 0) - (a.dailyChangePct ?? 0)).slice(0, 3);
  const losers = [...withChange].sort((a, b) => (a.dailyChangePct ?? 0) - (b.dailyChangePct ?? 0)).slice(0, 3);

  let investedGBP = 0;
  let valueGBP = 0;
  const holdingSignals: MemberBriefAsset[] = [];
  for (const holding of holdings) {
    investedGBP += holding.investedGBP ?? 0;
    valueGBP += holding.currentValueGBP ?? 0;
    const resolved = resolveAsset(holding.asset as AssetRow);
    if (resolved.signalState !== SignalState.NONE) holdingSignals.push(resolved);
  }
  const returnPct = investedGBP > 0 ? (valueGBP / investedGBP - 1) * 100 : null;

  const headline = buildHeadline({ trackedCount: tracked.length, buyCount: buy.length, sellCount: sell.length, holdingsCount: holdings.length, returnPct });

  return {
    generatedAt: new Date().toISOString(),
    trackedCount: tracked.length,
    watchlists: watchlistSummaries,
    buy,
    sell,
    movers: { gainers, losers },
    holdings: {
      count: holdings.length,
      investedGBP,
      valueGBP,
      returnPct,
      inSignal: holdingSignals,
    },
    headline,
  };
}

function buildHeadline(input: {
  trackedCount: number;
  buyCount: number;
  sellCount: number;
  holdingsCount: number;
  returnPct: number | null;
}): string {
  if (input.trackedCount === 0) {
    return 'You are not tracking any assets yet. Add some from the master watchlist to start receiving signals.';
  }
  const parts: string[] = [];
  if (input.buyCount > 0) parts.push(`${input.buyCount} buy ${input.buyCount === 1 ? 'signal' : 'signals'}`);
  if (input.sellCount > 0) parts.push(`${input.sellCount} sell ${input.sellCount === 1 ? 'signal' : 'signals'}`);
  const signalLine = parts.length > 0 ? parts.join(' and ') : 'no active signals';
  const holdingLine =
    input.holdingsCount > 0 && input.returnPct != null
      ? ` Your ${input.holdingsCount} ${input.holdingsCount === 1 ? 'holding is' : 'holdings are'} ${input.returnPct >= 0 ? 'up' : 'down'} ${Math.abs(input.returnPct).toFixed(1)}% overall.`
      : '';
  return `Across ${input.trackedCount} tracked ${input.trackedCount === 1 ? 'asset' : 'assets'} you have ${signalLine} right now.${holdingLine}`;
}
