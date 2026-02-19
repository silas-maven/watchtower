import { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { APP_TIMEZONE } from '@/lib/env';
import { startOfDayInTimeZone } from '@/lib/time';
import { computeSignalState, isBuyLike, isSellLike } from '@/lib/signals/engine';

export type ActiveSignalRow = {
  assetId: string;
  symbol: string;
  name: string;
  state: SignalState;
  currentPrice: number | null;
  dailyChangePct: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  capturedAt: string;
};

export async function getActiveSignals(): Promise<ActiveSignalRow[]> {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
  });

  return assets
    .map((asset) => {
      const snapshot = asset.snapshots[0];
      const state = computeSignalState({
        dailyLow: snapshot?.dailyLow ?? null,
        dailyHigh: snapshot?.dailyHigh ?? null,
        targetEntry: asset.rule?.targetEntry ?? null,
        targetExit: asset.rule?.targetExit ?? null,
      });
      return {
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        state,
        currentPrice: snapshot?.currentPrice ?? null,
        dailyChangePct: snapshot?.dailyChangePct ?? null,
        targetEntry: asset.rule?.targetEntry ?? null,
        targetExit: asset.rule?.targetExit ?? null,
        capturedAt: snapshot?.capturedAt.toISOString() ?? new Date(0).toISOString(),
      };
    })
    .filter((row) => row.state !== SignalState.NONE)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function getDailySignalSummary(date?: string) {
  const baseDate = date ? new Date(`${date}T12:00:00.000Z`) : new Date();
  const dayStart = startOfDayInTimeZone(baseDate, APP_TIMEZONE);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
  });

  const activeBuy: string[] = [];
  const activeSell: string[] = [];
  const changeRows: Array<{ symbol: string; assetType: string; changePct: number }> = [];
  const byAssetType = new Map<string, { total: number; activeSignals: number; buySignals: number; sellSignals: number }>();
  let activeSignals = 0;
  let advancers = 0;
  let decliners = 0;
  let flat = 0;

  for (const asset of assets) {
    const snapshot = asset.snapshots[0];
    const state = computeSignalState({
      dailyLow: snapshot?.dailyLow ?? null,
      dailyHigh: snapshot?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
    const key = asset.assetType;
    const prev = byAssetType.get(key) ?? { total: 0, activeSignals: 0, buySignals: 0, sellSignals: 0 };
    prev.total += 1;

    if (isBuyLike(state)) activeBuy.push(asset.symbol);
    if (isSellLike(state)) activeSell.push(asset.symbol);
    if (state !== SignalState.NONE) {
      activeSignals += 1;
      prev.activeSignals += 1;
      if (state === SignalState.BUY || state === SignalState.BOTH) prev.buySignals += 1;
      if (state === SignalState.SELL || state === SignalState.BOTH) prev.sellSignals += 1;
    }

    const change = snapshot?.dailyChangePct;
    if (change != null) {
      changeRows.push({ symbol: asset.symbol, assetType: key, changePct: change });
      if (change > 0.05) advancers += 1;
      else if (change < -0.05) decliners += 1;
      else flat += 1;
    } else {
      flat += 1;
    }

    byAssetType.set(key, prev);
  }

  const events = await prisma.signalEvent.findMany({
    where: {
      occurredAt: { gte: dayStart, lt: dayEnd },
    },
    include: { asset: true },
  });

  const newToday = new Set<string>();
  const droppedOff = new Set<string>();

  for (const e of events) {
    if (e.toState === SignalState.BUY || e.toState === SignalState.SELL || e.toState === SignalState.BOTH) {
      newToday.add(e.asset.symbol);
    }
    if (e.toState === SignalState.NONE && e.fromState !== SignalState.NONE) {
      droppedOff.add(e.asset.symbol);
    }
  }

  const topGainers = [...changeRows].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
  const topLosers = [...changeRows].sort((a, b) => a.changePct - b.changePct).slice(0, 3);
  const avgChangePct = changeRows.length > 0 ? changeRows.reduce((acc, row) => acc + row.changePct, 0) / changeRows.length : 0;

  return {
    date: dayStart.toISOString().slice(0, 10),
    buy: activeBuy.sort(),
    sell: activeSell.sort(),
    newToday: [...newToday].sort(),
    droppedOff: [...droppedOff].sort(),
    market: {
      totalAssets: assets.length,
      activeSignals,
      advancers,
      decliners,
      flat,
      avgChangePct,
      topGainers,
      topLosers,
      byAssetType: [...byAssetType.entries()].map(([assetType, values]) => ({
        assetType,
        ...values,
      })),
    },
  };
}
