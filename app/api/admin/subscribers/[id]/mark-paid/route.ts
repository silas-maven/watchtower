import { Role, SubscriptionStatus } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return fail('Subscriber not found', 404, 'NOT_FOUND');

    const now = new Date();
    const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscriptionMirror.upsert({
      where: { profileId: id },
      update: {
        status: SubscriptionStatus.ACTIVE,
        lastPaidAt: now,
        currentPeriodEnd: nextDue,
        lastPaymentFailedAt: null,
      },
      create: {
        profileId: id,
        status: SubscriptionStatus.ACTIVE,
        lastPaidAt: now,
        currentPeriodEnd: nextDue,
      },
    });

    await prisma.billingAlert.updateMany({
      where: { profileId: id, status: 'OPEN' },
      data: { status: 'RESOLVED', resolvedAt: now },
    });

    await prisma.notification.create({
      data: {
        profileId: actor.id,
        role: Role.ADMIN,
        type: 'subscription_mark_paid',
        title: 'Subscriber marked as paid',
        body: `${profile.email} was marked paid by admin.`,
        metadata: { profileId: id },
      },
    });

    return ok({ subscription: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
