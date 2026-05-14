import { AccessState, Role } from '@prisma/client';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { ok, fail } from '@/lib/api';
import { optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ClerkEmail = { email_address?: string; id?: string };
type ClerkUserPayload = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string;
};

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

function nameFrom(payload: ClerkUserPayload, email: string) {
  return [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || email;
}

export async function POST(req: Request) {
  const secret = optionalEnv('CLERK_WEBHOOK_SECRET');
  if (!secret) return fail('Missing CLERK_WEBHOOK_SECRET', 500, 'MISSING_ENV');

  const headerPayload = await headers();
  const wh = new Webhook(secret);
  const body = await req.text();

  let event: { type: string; data: ClerkUserPayload };
  try {
    event = wh.verify(body, {
      'svix-id': headerPayload.get('svix-id') ?? '',
      'svix-timestamp': headerPayload.get('svix-timestamp') ?? '',
      'svix-signature': headerPayload.get('svix-signature') ?? '',
    }) as { type: string; data: ClerkUserPayload };
  } catch {
    return fail('Invalid Clerk webhook signature', 400, 'INVALID_SIGNATURE');
  }

  if (event.type === 'user.deleted') {
    await prisma.profile.updateMany({ where: { clerkUserId: event.data.id }, data: { accessState: AccessState.REMOVED } });
    return ok({ received: true });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const primary = event.data.email_addresses?.find((e) => e.id === event.data.primary_email_address_id) ?? event.data.email_addresses?.[0];
    const email = primary?.email_address?.toLowerCase();
    if (!email) return ok({ received: true, skipped: 'no-email' });

    const byClerk = await prisma.profile.findUnique({ where: { clerkUserId: event.data.id } });
    const byEmail = byClerk ? null : await prisma.profile.findUnique({ where: { email } });
    const existing = byClerk ?? byEmail;
    const role = roleForEmail(email, existing?.role);

    if (existing) {
      await prisma.profile.update({
        where: { id: existing.id },
        data: { clerkUserId: event.data.id, email, name: nameFrom(event.data, email), role },
      });
    } else {
      await prisma.profile.create({
        data: {
          clerkUserId: event.data.id,
          email,
          name: nameFrom(event.data, email),
          role,
          accessState: AccessState.ACTIVE,
          watchlists: { create: { name: 'My Watchlist', isDefault: true } },
          subscriptionMirror: { create: { status: 'ACTIVE' } },
        },
      });
    }
  }

  return ok({ received: true });
}
