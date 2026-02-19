import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await requireUser();
    const { assetId } = await params;

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    await prisma.personalWatch.upsert({
      where: { userId_assetId: { userId: user.id, assetId } },
      update: {},
      create: { userId: user.id, assetId },
    });

    return ok({ watched: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await requireUser();
    const { assetId } = await params;

    await prisma.personalWatch.deleteMany({ where: { userId: user.id, assetId } });
    return ok({ watched: false });
  } catch (error) {
    return fromCaughtError(error);
  }
}
