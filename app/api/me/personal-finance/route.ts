import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

/**
 * Saved personal-finance inputs for prefilling the form. Open to every signed-in
 * profile: Personal Finance is free (owner, 2 Aug 2026), and these are the
 * member's own numbers being read back to them.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const saved = await prisma.personalFinanceInput.findUnique({ where: { profileId: user.id } });
    return ok({ inputs: saved });
  } catch (error) {
    return fromCaughtError(error);
  }
}
