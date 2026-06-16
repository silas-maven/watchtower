import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const plan = await prisma.averagePlan.findFirst({
      where: { id, profileId: user.id },
      include: { tranches: { orderBy: { orderIndex: 'asc' } }, asset: { select: { symbol: true, name: true, currency: true } } },
    });
    if (!plan) return fail('Plan not found', 404, 'NOT_FOUND');
    return ok({ plan });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const plan = await prisma.averagePlan.findFirst({ where: { id, profileId: user.id } });
    if (!plan) return fail('Plan not found', 404, 'NOT_FOUND');
    // FK on UserHolding.averagePlanId is ON DELETE SET NULL, so any linked holding is unlinked.
    await prisma.averagePlan.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}
