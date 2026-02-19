import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { computeSignalState } from '@/lib/signals/engine';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET() {
  try {
    const user = await requireUser();

    const assets = await prisma.asset.findMany({
      where: { isActive: true },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
        watches: { where: { userId: user.id }, select: { id: true } },
      },
      orderBy: { symbol: 'asc' },
    });

    return ok({
      assets: assets.map((a) => ({
        latestSnapshot: a.snapshots[0]
          ? {
              ...a.snapshots[0],
              signalState: computeSignalState({
                dailyLow: a.snapshots[0].dailyLow,
                dailyHigh: a.snapshots[0].dailyHigh,
                targetEntry: a.rule?.targetEntry ?? null,
                targetExit: a.rule?.targetExit ?? null,
              }),
            }
          : null,
        id: a.id,
        symbol: a.symbol,
        name: a.name,
        reason: a.reason,
        assetType: a.assetType,
        currency: a.currency,
        targetEntry: a.rule?.targetEntry ?? null,
        targetExit: a.rule?.targetExit ?? null,
        watched: a.watches.length > 0,
      })),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
