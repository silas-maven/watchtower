import { cache } from 'react';
import { AccessState, Role, type Profile } from '@prisma/client';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { trackEvent } from '@/lib/server/trackEvent';

export type SessionUser = Pick<Profile, 'id' | 'email' | 'name' | 'role' | 'accessState'> & {
  clerkUserId: string;
};

type ClaimBag = Record<string, unknown>;

function envList(name: string): Set<string> {
  return new Set((process.env[name] ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function roleForEmail(email: string, existingRole?: Role | null): Role {
  const normalized = email.toLowerCase();
  if (envList('SPA_OWNER_EMAIL_ALLOWLIST').has(normalized)) return Role.OWNER;
  if (envList('SPA_ADMIN_EMAIL_ALLOWLIST').has(normalized)) return Role.ADMIN;
  if (existingRole === Role.OWNER || existingRole === Role.ADMIN) return existingRole;
  return Role.MEMBER;
}

function claimString(claims: ClaimBag, keys: string[]): string | null {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function emailFromClaims(claims: ClaimBag): string | null {
  const direct = claimString(claims, ['email', 'email_address', 'primary_email', 'primaryEmailAddress']);
  if (direct) return direct.toLowerCase();
  const nested = claims.publicMetadata;
  if (nested && typeof nested === 'object') {
    return claimString(nested as ClaimBag, ['email', 'email_address'])?.toLowerCase() ?? null;
  }
  return null;
}

function nameFromClaims(claims: ClaimBag, fallback?: string | null): string {
  const full = claimString(claims, ['name', 'full_name']);
  if (full) return full;
  const first = claimString(claims, ['first_name', 'given_name']);
  const last = claimString(claims, ['last_name', 'family_name']);
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || fallback || 'SPA Member';
}

function sessionUser(profile: Profile): SessionUser {
  return {
    id: profile.id,
    clerkUserId: profile.clerkUserId,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    accessState: profile.accessState,
  };
}

async function fallbackClerkIdentity(): Promise<{ email: string | null; name: string | null }> {
  try {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
    const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() || email;
    return { email, name: name ?? null };
  } catch {
    return { email: null, name: null };
  }
}

async function resolveSessionUser(): Promise<SessionUser | null> {
  const authState = await auth();
  const userId = authState.userId;
  if (!userId) return null;

  const byClerk = await prisma.profile.findUnique({ where: { clerkUserId: userId } });
  if (byClerk) return sessionUser(byClerk);

  const claims = (authState.sessionClaims ?? {}) as ClaimBag;
  const fallback = await fallbackClerkIdentity();
  const email = emailFromClaims(claims) ?? fallback.email;
  if (!email) return null;

  const name = fallback.name ?? nameFromClaims(claims, email);
  const byEmail = await prisma.profile.findUnique({ where: { email } });
  if (byEmail) {
    try {
      const updated = await prisma.profile.update({
        where: { id: byEmail.id },
        data: {
          clerkUserId: userId,
          name,
          role: roleForEmail(email, byEmail.role),
          lastSeenAt: new Date(),
        },
      });
      trackEvent(updated.id, 'SIGN_IN', { method: 'returning' });
      return sessionUser(updated);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        const raced = await prisma.profile.findUnique({ where: { clerkUserId: userId } });
        if (raced) return sessionUser(raced);
      }
      throw error;
    }
  }

  const profile = await prisma.profile.create({
    data: {
      clerkUserId: userId,
      email,
      name,
      role: roleForEmail(email),
      accessState: AccessState.ACTIVE,
      lastSeenAt: new Date(),
      watchlists: { create: { name: 'My Watchlist', isDefault: true } },
      subscriptionMirror: { create: { status: 'ACTIVE' } },
    },
  });

  trackEvent(profile.id, 'SIGN_IN', { method: 'first_login' });
  return sessionUser(profile);
}

export const getSessionUser = cache(resolveSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  if (user.accessState !== AccessState.ACTIVE) throw new Error('ACCESS_SUSPENDED');
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export async function getDefaultWatchlist(profileId: string) {
  const existing = await prisma.userWatchlist.findFirst({
    where: { profileId, isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  return prisma.userWatchlist.create({ data: { profileId, name: 'My Watchlist', isDefault: true } });
}
