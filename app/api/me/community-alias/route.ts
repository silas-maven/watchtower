import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireFeature } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { checkAlias } from '@/lib/community';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({ alias: z.string().max(60) });

/** The member's current alias, so the composer knows whether to prompt for one. */
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { communityAlias: true },
    });
    return ok({ alias: profile?.communityAlias ?? null });
  } catch (error) {
    return fromCaughtError(error);
  }
}

/**
 * Set the alias. Once only: after this it takes an admin to change it.
 *
 * Free renaming would defeat the moderation. A member who earns a reputation,
 * good or bad, could shed it whenever it suited them, and the trail on an older
 * post would stop matching the person who wrote it.
 */
export async function POST(req: Request) {
  try {
    const user = await requireFeature('communityPost');

    const parsed = Schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const check = checkAlias(parsed.data.alias);
    if (!check.ok) return fail(check.reason, 400, 'INVALID_ALIAS');

    const existing = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { communityAlias: true },
    });
    if (existing?.communityAlias) {
      return fail('Your display name is already set. Ask the academy if you need it changed.', 409, 'ALIAS_SET');
    }

    // Case-insensitive uniqueness. The database index is case sensitive on its
    // own, so without this "Kyser" and "kyser" would both be allowed and the
    // whole point of a unique alias would be lost.
    const taken = await prisma.profile.findFirst({
      where: { communityAlias: { equals: check.value, mode: 'insensitive' } },
      select: { id: true },
    });
    if (taken) return fail('That name is taken. Try another.', 409, 'ALIAS_TAKEN');

    try {
      await prisma.profile.update({ where: { id: user.id }, data: { communityAlias: check.value } });
    } catch {
      // Two members submitting the same name at the same moment: the unique
      // index is the real arbiter, and the loser is told plainly.
      return fail('That name is taken. Try another.', 409, 'ALIAS_TAKEN');
    }

    return ok({ alias: check.value });
  } catch (error) {
    return fromCaughtError(error);
  }
}
