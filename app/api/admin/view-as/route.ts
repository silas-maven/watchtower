import { Role } from '@prisma/client';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole, VIEW_AS_FREE_COOKIE } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

const Schema = z.object({ view: z.enum(['free', 'full']) });

/**
 * Switch the signed-in admin between the full experience and the free-member
 * one, so the paywalls can be checked without a second account.
 *
 * The cookie only ever takes entitlement away (see isPaidUser), and role is left
 * untouched, so the admin pages and this endpoint stay reachable while the
 * preview is on. That matters: if the preview also dropped the role, there would
 * be no way back out.
 */
export async function POST(req: Request) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Expected view: free or full', 400, 'INVALID_PAYLOAD');

    const jar = await cookies();
    if (parsed.data.view === 'free') {
      jar.set(VIEW_AS_FREE_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Session-length on purpose: a preview left on for weeks would have the
        // owner quietly looking at a crippled app and wondering what broke.
      });
    } else {
      jar.delete(VIEW_AS_FREE_COOKIE);
    }

    return ok({ view: parsed.data.view });
  } catch (error) {
    return fromCaughtError(error);
  }
}
