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

export async function getAssetsForDashboard(): Promise<AssetWithLatest[]> {
  // Only the latest snapshot is needed; pull the minimum columns rather than the
  // last 30 rows per asset (which was building an unused sparkline).
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    select: {
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
    },
    orderBy: { symbol: 'asc' },
  });

  return assets.map((asset) => {
    const latest = asset.snapshots[0];
    const computed = computeSignalState({
      dailyLow: latest?.dailyLow ?? null,
      dailyHigh: latest?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
    const state = effectiveSignalState(computed, asset.rule?.signalOverride);
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
  });
}
