import { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeSignalState } from '@/lib/signals/engine';

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
  currentPrice: number | null;
  dailyChangePct: number | null;
  series30d: { day: number; price: number }[];
};

function buildSeries(points: { currentPrice: number | null }[]): { day: number; price: number }[] {
  return points
    .map((p, idx) => ({ day: idx + 1, price: p.currentPrice ?? 0 }))
    .filter((p) => p.price > 0);
}

export async function getAssetsForDashboard(): Promise<AssetWithLatest[]> {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 30 },
    },
    orderBy: { symbol: 'asc' },
  });

  return assets.map((asset) => {
    const latest = asset.snapshots[0];
    const state = computeSignalState({
      dailyLow: latest?.dailyLow ?? null,
      dailyHigh: latest?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
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
      currentPrice: latest?.currentPrice ?? null,
      dailyChangePct: latest?.dailyChangePct ?? null,
      series30d: buildSeries([...asset.snapshots].reverse()),
    };
  });
}

export async function getPortfolioSummary() {
  const assets = await prisma.asset.findMany({ where: { isActive: true } });

  const portfolioSize = 5000;
  const invested = assets.reduce((acc, a) => acc + (a.currentCostGBP ?? 0), 0);
  const value = assets.reduce((acc, a) => acc + (a.currentValueGBP ?? 0), 0);
  const cash = portfolioSize - invested;
  const retPct = portfolioSize ? ((value - invested) / portfolioSize) * 100 : 0;

  return {
    portfolioSize,
    invested,
    value,
    cash,
    retPct,
  };
}

export async function getAssetById(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 30 },
    },
  });
}
