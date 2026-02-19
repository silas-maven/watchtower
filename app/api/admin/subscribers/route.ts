import { Role, SubscriptionStatus } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const users = await prisma.user.findMany({
      where: { role: Role.MEMBER },
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    });

    return ok({
      subscribers: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.subscription?.status ?? SubscriptionStatus.ACTIVE,
        dueAt: u.subscription?.dueAt ?? null,
        overdueStage: u.subscription?.overdueStage ?? 0,
      })),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const body = (await req.json().catch(() => null)) as null | {
      userId?: string;
      status?: SubscriptionStatus;
    };
    if (!body?.userId || !body.status) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const subscription = await prisma.subscription.findUnique({ where: { userId: body.userId } });
    if (!subscription) return fail('Subscriber not found', 404, 'NOT_FOUND');

    const updated = await prisma.subscription.update({
      where: { userId: body.userId },
      data: { status: body.status },
    });

    return ok({ subscription: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
