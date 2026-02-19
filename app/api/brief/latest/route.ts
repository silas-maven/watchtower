import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET() {
  try {
    await requireUser();
    const brief = await prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } });
    return ok({ brief });
  } catch (error) {
    return fromCaughtError(error);
  }
}
