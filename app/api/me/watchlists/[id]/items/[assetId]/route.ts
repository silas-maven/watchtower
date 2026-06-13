import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

async function ownedList(profileId: string, id: string) {
  return prisma.userWatchlist.findFirst({ where: { id, profileId } });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await requireUser();
    const { id, assetId } = await params;

    const list = await ownedList(user.id, id);
    if (!list) return fail('List not found', 404, 'NOT_FOUND');

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    await prisma.userWatchlistItem.upsert({
      where: { watchlistId_assetId: { watchlistId: id, assetId } },
      update: {},
      create: { watchlistId: id, assetId },
    });
    await prisma.usageEvent.create({ data: { profileId: user.id, type: 'WATCHLIST_ADD', metadata: { assetId, watchlistId: id } } }).catch(() => null);

    return ok({ watched: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await requireUser();
    const { id, assetId } = await params;

    const list = await ownedList(user.id, id);
    if (!list) return fail('List not found', 404, 'NOT_FOUND');

    await prisma.userWatchlistItem.deleteMany({ where: { watchlistId: id, assetId } });
    await prisma.usageEvent.create({ data: { profileId: user.id, type: 'WATCHLIST_REMOVE', metadata: { assetId, watchlistId: id } } }).catch(() => null);

    return ok({ watched: false });
  } catch (error) {
    return fromCaughtError(error);
  }
}
