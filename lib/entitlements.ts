import { MemberTier, Role } from '@prisma/client';
import { getSessionUser, requireUser, type SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Single source of truth for freemium entitlement. Gating decisions live HERE,
// never inline in routes, so the free/paid boundary can be reasoned about in one
// place. Server-side only: pages redirect, API routes throw PAYWALL.
//
//   - Owners and admins always have full access (they run the academy).
//   - A MEMBER tier profile is a paying academy member.
//   - A FREE tier profile is a taster: market data, generic feed, a small free
//     asset set, the site-wide brief headline, and ONE trade pitch.
//
// Tier is upgraded automatically on payment (Stripe webhook / admin mark-paid)
// and only ever downgraded manually (academy rule: never auto-cut access).

// Free users get this many trade-pitch generations, then the paywall. AI pitches
// cost a real API call, so even paid members should stay metered (see PAID_*).
export const FREE_PITCH_LIMIT = 1;

// Generous daily ceiling for paid members on AI-cost features, so a runaway loop
// or a shared login cannot turn into an unbounded API bill at universe scale.
export const PAID_PITCH_DAILY_LIMIT = 25;

export function isPaidUser(user: Pick<SessionUser, 'role' | 'tier'> & { previewFreeTier?: boolean }): boolean {
  // An admin previewing the free experience is treated as free everywhere, which
  // is the whole point: the paywalls they are checking are the ones a real free
  // member hits. This is checked FIRST so it also applies to owners and admins,
  // who would otherwise short-circuit to paid on the next line.
  if (user.previewFreeTier) return false;
  if (user.role === Role.OWNER || user.role === Role.ADMIN) return true;
  return user.tier === MemberTier.MEMBER;
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

// Pitch metering. Counts prior PITCH reports for this profile and decides whether
// another is allowed. Free users are capped for life (beta); paid users per day.
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
  const used = await prisma.aiReport.count({ where: { profileId: user.id, kind: 'PITCH' } });
  if (used >= FREE_PITCH_LIMIT) {
    return { allowed: false, reason: 'Free plan includes one trade pitch. Upgrade for unlimited pitches.' };
  }
  return { allowed: true };
}
