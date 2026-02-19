import { Role, SubscriptionStatus } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({ where: { userId: id } });
    if (!subscription) return fail('Subscriber not found', 404, 'NOT_FOUND');

    const now = new Date();
    const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { userId: id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        lastPaidAt: now,
        dueAt: nextDue,
        overdueStage: 0,
        lastOverdueNotifiedAt: null,
      },
    });

    await prisma.notification.create({
      data: {
        role: Role.ADMIN,
        type: 'subscription_mark_paid',
        title: 'Subscriber marked as paid',
        body: `Subscription for user ${id} was marked paid by admin.`,
        metadata: { userId: id },
      },
    });

    return ok({ subscription: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
