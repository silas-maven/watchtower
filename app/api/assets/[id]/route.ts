import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { canUse } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { trackEvent } from '@/lib/server/trackEvent';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    trackEvent(user.id, 'ASSET_VIEW', { assetId: id });

    const [asset, holdings, plan, lastEvent] = await Promise.all([
      prisma.asset.findUnique({
        where: { id },
        include: {
          rule: true,
          snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
        },
      }),
      prisma.userHolding.findMany({
        where: { profileId: user.id, assetId: id },
        include: { portfolio: { select: { kind: true } } },
      }),
      prisma.averagePlan.findFirst({
        where: { profileId: user.id, assetId: id },
        orderBy: { updatedAt: 'desc' },
        include: { tranches: { orderBy: { orderIndex: 'asc' } } },
      }),
      prisma.signalEvent.findFirst({
        where: { assetId: id },
        orderBy: { occurredAt: 'desc' },
      }),
    ]);

    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const latest = asset.snapshots[0] ?? null;
    const computed = computeSignalState({
      dailyLow: latest?.dailyLow ?? null,
      dailyHigh: latest?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
    const signalState = effectiveSignalState(computed, asset.rule?.signalOverride);

    // The asset itself is open to everyone: price, fundamentals, history. The
    // academy's call on it (the signal, and the entry/exit prices the signal is
    // derived from) is the paid product and is left out of the payload entirely
    // rather than hidden in the UI, which would leave it readable in the JSON.
    const paid = canUse(user, 'signals');

    return ok({
      paid,
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        reason: asset.reason,
        assetType: asset.assetType,
        currency: asset.currency,
        isMacro: asset.isMacro,
        brokerEntryPrice: asset.brokerEntryPrice,
        averageEntryPrice: asset.averageEntryPrice,
        shares: asset.shares,
        targetEntry: paid ? asset.rule?.targetEntry ?? null : null,
        targetExit: paid ? asset.rule?.targetExit ?? null : null,
        signalState: paid ? signalState : null,
        signalOverride: paid ? asset.rule?.signalOverride ?? null : null,
        snapshots: asset.snapshots.map((s) => ({ ...s, signalState: paid ? s.signalState : null })),
        stats: {
          beta: asset.beta,
          low52: asset.low52,
          high52: asset.high52,
          pe: asset.pe,
          volumeAvg: asset.volumeAvg,
          marketCap: asset.marketCap,
          ma50: asset.ma50,
          ma200: asset.ma200,
          dividendYield: asset.dividendYield,
          quickRatio: asset.quickRatio,
          currentRatio: asset.currentRatio,
          debtToEquity: asset.debtToEquity,
          sectorPE: asset.sectorPE,
          nextEarningsDate: asset.nextEarningsDate,
        },
      },
      position: {
        holdings: holdings.map((h) => ({
          id: h.id,
          portfolioKind: h.portfolio?.kind ?? 'REAL',
          shares: h.shares,
          averagePrice: h.averagePrice,
          investedGBP: h.investedGBP,
          spartanEnabled: h.spartanEnabled,
        })),
        plan: plan
          ? {
              id: plan.id,
              basePrice: plan.basePrice,
              targetSellPrice: plan.targetSellPrice,
              currency: plan.currency,
              tranches: plan.tranches.map((t) => ({
                orderIndex: t.orderIndex,
                price: t.price,
                budgetGBP: t.budgetGBP,
                executed: t.executed,
              })),
            }
          : null,
        lastSignalEvent: lastEvent
          ? {
              eventType: lastEvent.eventType,
              toState: lastEvent.toState,
              occurredAt: lastEvent.occurredAt,
              price: (lastEvent.metadata as { price?: number | null } | null)?.price ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
