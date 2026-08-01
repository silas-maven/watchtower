import { Role, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { applyAccessDecision, decideFromOverdueStage } from '@/lib/subscriptions/access';
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
  let revoked = 0;

  for (const sub of subs) {
    const dueAt = sub.currentPeriodEnd;
    if (!dueAt) continue;
    const stage = computeOverdueStage(dueAt, now);

    if (stage === 0) {
      if (sub.status === SubscriptionStatus.OVERDUE) {
        await prisma.subscriptionMirror.update({ where: { id: sub.id }, data: { status: SubscriptionStatus.ACTIVE } });
        // Paid up again, so give the membership back without waiting for a
        // human. The Stripe webhook normally gets here first; this covers a
        // renewal we only learned about from the period end moving.
        await applyAccessDecision(sub.profileId, 'GRANT', 'The subscription is paid up to date again.').catch(() => undefined);
      }
      continue;
    }

    flagged += 1;

    // Withdraw the paid tier once the account is far enough past due that
    // Stripe's retries have had their run. Idempotent: applyAccessDecision does
    // nothing if the profile is already on the free tier, so the sweep can run
    // nightly without repeatedly alerting about the same person.
    const outcome = await applyAccessDecision(
      sub.profileId,
      decideFromOverdueStage(stage),
      `Payment has been outstanding for ${daysBetween(dueAt, now)} days.`,
    ).catch(() => 'unchanged' as const);
    if (outcome === 'revoked') revoked += 1;
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
    const body =
      decideFromOverdueStage(stage) === 'REVOKE'
        ? `${sub.profile.email} is overdue by ${days} day(s) and has been moved to the free tier automatically. They can still sign in and pay; paying restores the membership on its own.`
        : `${sub.profile.email} is overdue by ${days} day(s). Access is unchanged for now and will be withdrawn automatically if it stays unpaid.`;

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

    notifications += 1;
  }

  return { scanned: subs.length, flagged, notifications, revoked };
}
