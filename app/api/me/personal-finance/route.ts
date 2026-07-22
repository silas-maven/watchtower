import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

/** Saved personal-finance inputs for prefilling the form. */
export async function GET() {
  try {
    const user = await requireUser();
    const saved = await prisma.personalFinanceInput.findUnique({ where: { profileId: user.id } });
    return ok({ inputs: saved });
  } catch (error) {
    return fromCaughtError(error);
  }
}
