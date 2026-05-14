import { Role, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { daysBetween } from '@/lib/time';

export function computeOverdueStage(dueAt: Date, now = new Date()): number {
  const days = daysBetween(dueAt, now);
  if (days < 1) return 0;
  if (days < 3) return 1;
  if (days < 10) return 2;
  return 3;
}

function shouldSendWeeklyReminder(lastSentAt: Date | null, now = new Date()): boolean {
  if (!lastSentAt) return true;
  return daysBetween(lastSentAt, now) >= 7;
}

export async function runOverdueCheck(now = new Date()) {
  const subs = await prisma.subscriptionMirror.findMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
      currentPeriodEnd: { not: null },
    },
    include: { profile: true },
  });

  let flagged = 0;
  let notifications = 0;

  for (const sub of subs) {
    const dueAt = sub.currentPeriodEnd;
    if (!dueAt) continue;
    const stage = computeOverdueStage(dueAt, now);

    if (stage === 0) {
      if (sub.status === SubscriptionStatus.OVERDUE) {
        await prisma.subscriptionMirror.update({ where: { id: sub.id }, data: { status: SubscriptionStatus.ACTIVE } });
      }
      continue;
    }

    flagged += 1;
    const previous = await prisma.billingAlert.findFirst({
      where: { profileId: sub.profileId, type: 'payment_overdue' },
      orderBy: { createdAt: 'desc' },
    });
    const shouldNotify = !previous || shouldSendWeeklyReminder(previous.createdAt, now);

    await prisma.subscriptionMirror.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.OVERDUE, lastPaymentFailedAt: sub.lastPaymentFailedAt ?? now },
    });

    if (!shouldNotify) continue;

    const days = daysBetween(dueAt, now);
    const title = `Payment overdue: ${sub.profile.email}`;
    const body = `${sub.profile.email} is overdue by ${days} day(s). Admin review required; access is not changed automatically.`;

    await prisma.billingAlert.create({
      data: {
        profileId: sub.profileId,
        type: 'payment_overdue',
        title,
        body,
        metadata: { profileId: sub.profileId, stage, dueAt: dueAt.toISOString() },
      },
    });

    await prisma.notification.createMany({
      data: [Role.OWNER, Role.ADMIN].map((role) => ({
        role,
        type: 'subscription_overdue',
        title,
        body,
        metadata: { profileId: sub.profileId, stage, dueAt: dueAt.toISOString() },
      })),
    });

    await prisma.mockEmailLog.create({
      data: {
        toEmail: 'admin@watchtower.demo',
        subject: title,
        body,
        metadata: { profileId: sub.profileId, stage },
      },
    });

    notifications += 1;
  }

  return { scanned: subs.length, flagged, notifications };
}
