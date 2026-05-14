import { ok } from '@/lib/api';
import { getDefaultWatchlist, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET() {
  try {
    const user = await requireUser();
    const watchlist = await getDefaultWatchlist(user.id);
    const watches = await prisma.userWatchlistItem.findMany({
      where: { watchlistId: watchlist.id },
      include: {
        asset: {
          include: {
            rule: true,
            snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok({
      watchlist: watches.map((w) => ({
        assetId: w.assetId,
        symbol: w.asset.symbol,
        name: w.asset.name,
        targetEntry: w.asset.rule?.targetEntry ?? null,
        targetExit: w.asset.rule?.targetExit ?? null,
        latestSnapshot: w.asset.snapshots[0] ?? null,
      })),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
