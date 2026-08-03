import { MemberTier, Role, type AiReportKind } from '@prisma/client';
import { getSessionUser, requireUser, type SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Single source of truth for freemium entitlement. Gating decisions live HERE,
// never inline in routes, so the free/paid boundary can be reasoned about in one
// place. Server-side only: pages redirect, API routes throw PAYWALL.
//
//   - Owners and admins always have full access (they run the academy).
//   - A MEMBER tier profile is a paying academy member.
//   - A FREE tier profile is a taster.
//
// Tier is upgraded automatically on payment (Stripe webhook / admin mark-paid),
// and withdrawn automatically when a subscription lapses (lib/subscriptions).
//
// WHERE THE LINE SITS (owner's instruction, 2 August 2026). The watchlist and
// the tools are lead generation; the signals and the alerting are the product.
// Free profiles get, in full:
//
//   - the master watchlist and the Asset Centre list, minus the signal state
//   - every asset's price, fundamentals and price history (line or candles)
//   - Personal Finance and the calculators (compound interest, CAGR)
//   - the earnings section of the daily brief
//   - one trade pitch a month
//
// Anything in MEMBER_FEATURES below is the paid side. Add to that map rather
// than writing a bare isPaidUser() check at a call site: a boundary that is
// declared in one place is a boundary that can be moved in one place.

/** Free profiles get one trade pitch per calendar month. */
export const FREE_PITCH_PER_MONTH = 1;

// Generous daily ceiling for paid members on AI-cost features, so a runaway loop
// or a shared login cannot turn into an unbounded API bill at universe scale.
export const PAID_PITCH_DAILY_LIMIT = 25;

// The named parts of the paid product, and their upgrade copy. Defined in a
// dependency-free module so client components can render the copy without
// pulling Prisma into the browser bundle; re-exported here so server callers
// have one import for "what is paid" and "may this person use it".
export { MEMBER_FEATURES, type MemberFeature } from '@/lib/memberFeatures';
import { MEMBER_FEATURES, type MemberFeature } from '@/lib/memberFeatures';

export function isPaidUser(user: Pick<SessionUser, 'role' | 'tier'> & { previewFreeTier?: boolean }): boolean {
  // An admin previewing the free experience is treated as free everywhere, which
  // is the whole point: the paywalls they are checking are the ones a real free
  // member hits. This is checked FIRST so it also applies to owners and admins,
  // who would otherwise short-circuit to paid on the next line.
  if (user.previewFreeTier) return false;
  if (user.role === Role.OWNER || user.role === Role.ADMIN) return true;
  return user.tier === MemberTier.MEMBER;
}

/**
 * Whether this profile may use a named part of the paid product. Every feature
 * currently resolves to the same paid/free predicate; the indirection exists so
 * that a future tier split (or a per-feature trial) changes this function rather
 * than a hundred call sites.
 */
export function canUse(
  user: (Pick<SessionUser, 'role' | 'tier'> & { previewFreeTier?: boolean }) | null,
  feature: MemberFeature,
): boolean {
  // Fail closed on an unrecognised feature name rather than granting access to
  // something the boundary has never been reasoned about.
  if (!(feature in MEMBER_FEATURES)) return false;
  return user != null && isPaidUser(user);
}

export async function getEntitlements() {
  const user = await getSessionUser();
  if (!user) return { user: null, paid: false, tier: MemberTier.FREE as MemberTier, previewing: false };
  return {
    user,
    paid: isPaidUser(user),
    // The tier a free preview is standing in for, so the UI shows what the
    // member would see rather than the admin's own stored tier.
    tier: user.previewFreeTier ? MemberTier.FREE : user.tier,
    previewing: user.previewFreeTier === true,
  };
}

// API-route guard. Mirrors requireRole: returns the user or throws a coded error
// that fromCaughtError maps to 402 Payment Required.
export async function requirePaid(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isPaidUser(user)) throw new Error('PAYWALL');
  return user;
}

/** requirePaid, named after the thing being protected. Prefer this in routes. */
export async function requireFeature(feature: MemberFeature): Promise<SessionUser> {
  const user = await requireUser();
  if (!canUse(user, feature)) throw new Error('PAYWALL');
  return user;
}

/**
 * Daily ceiling on an AI-cost feature that is otherwise free to use.
 *
 * Personal Finance is on the free side of the line, and each run makes a real
 * model call. "Free" cannot mean "unmetered" or one script turns the giveaway
 * into an unbounded bill, so free profiles get a few runs a day and paid
 * profiles get the generous ceiling. The deterministic simulation underneath is
 * not metered; only the narrative that costs money is.
 */
export async function checkDailyAiQuota(
  user: SessionUser,
  kind: AiReportKind,
  { free, paid }: { free: number; paid: number },
): Promise<{ allowed: boolean; reason?: string }> {
  const limit = isPaidUser(user) ? paid : free;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiReport.count({ where: { profileId: user.id, kind, createdAt: { gte: since } } });
  if (used >= limit) {
    return {
      allowed: false,
      reason: isPaidUser(user)
        ? `Daily limit reached (${limit}). Try again tomorrow.`
        : `The free plan includes ${limit} of these a day. Try again tomorrow, or upgrade for more.`,
    };
  }
  return { allowed: true };
}

/** Start of the current calendar month, used for the free pitch allowance. */
function monthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Pitch metering. Counts prior PITCH reports for this profile and decides whether
// another is allowed. Free profiles get one a calendar month; paid, one a day.
export async function checkPitchQuota(user: SessionUser): Promise<{ allowed: boolean; reason?: string }> {
  const paid = isPaidUser(user);
  if (paid) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await prisma.aiReport.count({
      where: { profileId: user.id, kind: 'PITCH', createdAt: { gte: since } },
    });
    if (today >= PAID_PITCH_DAILY_LIMIT) {
      return { allowed: false, reason: `Daily pitch limit reached (${PAID_PITCH_DAILY_LIMIT}). Try again tomorrow.` };
    }
    return { allowed: true };
  }
  const used = await prisma.aiReport.count({
    where: { profileId: user.id, kind: 'PITCH', createdAt: { gte: monthStart() } },
  });
  if (used >= FREE_PITCH_PER_MONTH) {
    const next = new Date(monthStart());
    next.setMonth(next.getMonth() + 1);
    const when = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return {
      allowed: false,
      reason: `The free plan includes one trade pitch a month. Your next one unlocks on ${when}, or upgrade for pitches on demand.`,
    };
  }
  return { allowed: true };
}
