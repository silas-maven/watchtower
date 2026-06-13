import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { persistWeeklyDigest } from '@/lib/ai/weeklyDigest';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const digest = await persistWeeklyDigest();
    return ok({ digest });
  } catch (error) {
    return fromCaughtError(error);
  }
}
