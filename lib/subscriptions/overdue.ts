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
  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
      dueAt: { not: null },
    },
    include: { user: true },
  });

  let flagged = 0;
  let notifications = 0;

  for (const sub of subs) {
    const dueAt = sub.dueAt;
    if (!dueAt) continue;
    const stage = computeOverdueStage(dueAt, now);

    if (stage === 0) {
      if (sub.status === SubscriptionStatus.OVERDUE) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.ACTIVE, overdueStage: 0 },
        });
      }
      continue;
    }

    flagged += 1;
    const shouldNotify =
      stage > sub.overdueStage || (stage >= 3 && shouldSendWeeklyReminder(sub.lastOverdueNotifiedAt, now));

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.OVERDUE,
        overdueStage: stage,
      },
    });

    if (!shouldNotify) continue;

    const days = daysBetween(dueAt, now);
    const title = `Subscription overdue: ${sub.user.email}`;
    const body = `${sub.user.email} is overdue by ${days} day(s). Stage D+${days}.`;

    await prisma.notification.createMany({
      data: [
        {
          role: Role.OWNER,
          type: 'subscription_overdue',
          title,
          body,
          metadata: { userId: sub.userId, stage, dueAt: dueAt.toISOString() },
        },
        {
          role: Role.ADMIN,
          type: 'subscription_overdue',
          title,
          body,
          metadata: { userId: sub.userId, stage, dueAt: dueAt.toISOString() },
        },
      ],
    });

    await prisma.mockEmailLog.create({
      data: {
        toEmail: 'admin@watchtower.demo',
        subject: title,
        body,
        metadata: { userId: sub.userId, stage },
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { lastOverdueNotifiedAt: now },
    });

    notifications += 1;
  }

  return {
    scanned: subs.length,
    flagged,
    notifications,
  };
}
