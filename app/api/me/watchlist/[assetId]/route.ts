import { fail, ok } from '@/lib/api';
import { getDefaultWatchlist, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function POST(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await requireUser();
    const { assetId } = await params;

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    const watchlist = await getDefaultWatchlist(user.id);
    await prisma.userWatchlistItem.upsert({
      where: { watchlistId_assetId: { watchlistId: watchlist.id, assetId } },
      update: {},
      create: { watchlistId: watchlist.id, assetId },
    });

    await prisma.usageEvent.create({ data: { profileId: user.id, type: 'WATCHLIST_ADD', metadata: { assetId } } }).catch(() => null);
    return ok({ watched: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await requireUser();
    const { assetId } = await params;
    const watchlist = await getDefaultWatchlist(user.id);

    await prisma.userWatchlistItem.deleteMany({ where: { watchlistId: watchlist.id, assetId } });
    await prisma.usageEvent.create({ data: { profileId: user.id, type: 'WATCHLIST_REMOVE', metadata: { assetId } } }).catch(() => null);
    return ok({ watched: false });
  } catch (error) {
    return fromCaughtError(error);
  }
}
