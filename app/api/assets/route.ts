import { ok } from '@/lib/api';
import { getDefaultWatchlist, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { computeSignalState } from '@/lib/signals/engine';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET() {
  try {
    const user = await requireUser();
    const watchlist = await getDefaultWatchlist(user.id);

    const assets = await prisma.asset.findMany({
      where: { isActive: true, isMacro: false },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
        watchlistItems: { where: { watchlistId: watchlist.id }, select: { id: true } },
      },
      orderBy: { symbol: 'asc' },
    });

    return ok({
      assets: assets.map((a) => {
        const snapshot = a.snapshots[0];
        const signalState = computeSignalState({
          dailyLow: snapshot?.dailyLow ?? null,
          dailyHigh: snapshot?.dailyHigh ?? null,
          targetEntry: a.rule?.targetEntry ?? null,
          targetExit: a.rule?.targetExit ?? null,
        });
        return {
          latestSnapshot: snapshot ? { ...snapshot, signalState } : null,
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          reason: a.reason,
          assetType: a.assetType,
          currency: a.currency,
          targetEntry: a.rule?.targetEntry ?? null,
          targetExit: a.rule?.targetExit ?? null,
          watched: a.watchlistItems.length > 0,
        };
      }),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
