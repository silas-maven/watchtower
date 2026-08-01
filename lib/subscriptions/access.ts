import { MemberTier } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Whether a billing event should grant, withdraw, or leave the paid membership
 * alone. Kept pure and in one place so the Stripe webhook and the nightly
 * overdue sweep cannot disagree about who is a paying member.
 *
 * POLICY CHANGE (2026-08-02, owner's decision). Access used to be withdrawn only
 * by hand: a failed payment raised an alert and nothing else. It is now
 * automatic, and automatically restored when payment goes through.
 *
 * WHAT "REMOVE ACCESS" MEANS HERE: the profile drops to the FREE tier, so the
 * member loses the watchlist, alerts and the paid tools but can still sign in,
 * see the taster, and pay again. It does NOT set accessState to PAUSED or
 * REMOVED, because that locks them out of the app entirely, including out of the
 * page that would let them fix the payment. Ejecting somebody from the academy
 * stays a deliberate manual act on the Members page.
 */
export type AccessDecision = 'GRANT' | 'REVOKE' | 'HOLD';

/**
 * Days past due before the paid tier is withdrawn.
 *
 * Not on the first failure. Stripe retries a failed card for roughly two weeks,
 * and most recoveries happen in that window, so cutting on day one would punish
 * people whose payment was about to succeed. Stage 3 of the existing overdue
 * ladder is 10 days, which is past the bulk of retries while still being prompt.
 */
export const REVOKE_AT_OVERDUE_STAGE = 3;

/** Stripe statuses that mean the subscription is finished, not merely late. */
const DEAD_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired']);
const LIVE_STATUSES = new Set(['active', 'trialing']);

export function decideFromSubscriptionEvent(input: {
  eventType: string;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
}): AccessDecision {
  const status = (input.status ?? '').toLowerCase();

  // A live subscription pays for access, including one already set to cancel at
  // the end of the period: that member has paid through to the period end and
  // keeps everything until Stripe actually ends it.
  if (LIVE_STATUSES.has(status)) return 'GRANT';

  if (input.eventType === 'customer.subscription.deleted') return 'REVOKE';
  if (DEAD_STATUSES.has(status)) return 'REVOKE';

  // past_due and incomplete mean Stripe is still trying. The overdue sweep
  // decides, on the clock, rather than the first failed attempt doing it.
  return 'HOLD';
}

export function decideFromOverdueStage(stage: number): AccessDecision {
  return stage >= REVOKE_AT_OVERDUE_STAGE ? 'REVOKE' : 'HOLD';
}

/**
 * Apply a decision to a profile's tier, and leave a trail.
 *
 * Only ever moves between FREE and MEMBER, and only when it actually changes
 * something, so a repeated webhook does not spam alerts. Owners and admins are
 * never downgraded: their access comes from their role, not from a subscription.
 */
export async function applyAccessDecision(
  profileId: string,
  decision: AccessDecision,
  reason: string,
): Promise<'granted' | 'revoked' | 'unchanged'> {
  if (decision === 'HOLD') return 'unchanged';

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, email: true, tier: true, role: true },
  });
  if (!profile) return 'unchanged';
  if (profile.role === 'OWNER' || profile.role === 'ADMIN') return 'unchanged';

  const nextTier = decision === 'GRANT' ? MemberTier.MEMBER : MemberTier.FREE;
  if (profile.tier === nextTier) return 'unchanged';

  await prisma.profile.update({ where: { id: profileId }, data: { tier: nextTier } });

  await prisma.billingAlert
    .create({
      data: {
        profileId,
        type: decision === 'GRANT' ? 'access_restored' : 'access_withdrawn',
        title: decision === 'GRANT' ? `Membership restored: ${profile.email}` : `Membership withdrawn: ${profile.email}`,
        body:
          decision === 'GRANT'
            ? `${reason} ${profile.email} is back on the paid tier automatically.`
            : `${reason} ${profile.email} has been moved to the free tier automatically. They can still sign in and pay again. Reinstate from the Members page if you want them back sooner.`,
        // A restore closes the matter; a withdrawal is something the owner may
        // want to act on, so it stays open in the queue.
        status: decision === 'GRANT' ? 'RESOLVED' : 'OPEN',
        resolvedAt: decision === 'GRANT' ? new Date() : null,
      },
    })
    .catch(() => undefined);

  return decision === 'GRANT' ? 'granted' : 'revoked';
}
