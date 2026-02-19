import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { persistDailyBrief } from '@/lib/ai/dailyBrief';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const brief = await persistDailyBrief();
    return ok({ brief });
  } catch (error) {
    return fromCaughtError(error);
  }
}
