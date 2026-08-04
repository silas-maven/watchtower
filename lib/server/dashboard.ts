import { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';

export type AssetWithLatest = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: string;
  currency: string;
  targetEntry: number | null;
  targetExit: number | null;
  signalState: SignalState;
  isManualSignal: boolean;
  currentPrice: number | null;
  dailyChangePct: number | null;
};

const SELECT = {
  id: true,
  symbol: true,
  name: true,
  reason: true,
  assetType: true,
  currency: true,
  rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
  snapshots: {
    orderBy: { capturedAt: 'desc' },
    take: 1,
    select: { currentPrice: true, dailyChangePct: true, dailyLow: true, dailyHigh: true },
  },
} as const;

type Row = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: string;
  currency: string;
  rule: { targetEntry: number | null; targetExit: number | null; signalOverride: unknown } | null;
  snapshots: Array<{ currentPrice: number | null; dailyChangePct: number | null; dailyLow: number | null; dailyHigh: number | null }>;
};

function toAsset(asset: Row): AssetWithLatest {
  const latest = asset.snapshots[0];
  const computed = computeSignalState({
    dailyLow: latest?.dailyLow ?? null,
    dailyHigh: latest?.dailyHigh ?? null,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
  });
  const state = effectiveSignalState(computed, asset.rule?.signalOverride as never);
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    reason: asset.reason,
    assetType: asset.assetType,
    currency: asset.currency,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
    signalState: state ?? SignalState.NONE,
    isManualSignal: asset.rule?.signalOverride != null,
    currentPrice: latest?.currentPrice ?? null,
    dailyChangePct: latest?.dailyChangePct ?? null,
  };
}

/**
 * The assets the Dashboard can actually render, filtered in SQL.
 *
 * The page shows two lists: what this member tracks, and untracked assets
 * sitting in a buy zone. It used to load every active asset (815 rows, 207 KB)
 * and narrow that to a handful in JavaScript, which was free at 14 assets and is
 * not at universe scale.
 *
 * The filter below is the exact set that can produce a row, so the rendered
 * output is unchanged:
 *
 *   - anything this member holds or has on a watchlist (the tracked list), and
 *   - anything that could carry a signal at all, which means an entry target, an
 *     exit target, or an owner override. An asset with no rule computes to NONE
 *     and could never have appeared under Market Opportunities.
 *
 * The override clause matters: FORCE_BUY pins a signal on an asset that has no
 * price targets at all, so filtering on targets alone would silently drop the
 * owner's own manual calls off the Dashboard.
 */
export async function getDashboardAssets(profileId: string): Promise<AssetWithLatest[]> {
  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      isMacro: false,
      OR: [
        { watchlistItems: { some: { watchlist: { profileId } } } },
        { holdings: { some: { profileId } } },
        { rule: { targetEntry: { not: null } } },
        { rule: { targetExit: { not: null } } },
        { rule: { signalOverride: { not: null } } },
      ],
    },
    select: SELECT,
    orderBy: { symbol: 'asc' },
  });

  return (assets as Row[]).map(toAsset);
}

/**
 * Every active member-facing asset. Still used where the whole universe really
 * is the subject (the academy-wide signal summary and the brief), rather than on
 * a page that renders a handful of rows.
 */
export async function getAssetsForDashboard(): Promise<AssetWithLatest[]> {
  const assets = await prisma.asset.findMany({
    where: { isActive: true, isMacro: false },
    select: SELECT,
    orderBy: { symbol: 'asc' },
  });

  return (assets as Row[]).map(toAsset);
}
