import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { persistDailyBrief } from '@/lib/ai/dailyBrief';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { trackEvent } from '@/lib/server/trackEvent';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const user = await requireRole([Role.OWNER, Role.ADMIN]);
    const brief = await persistDailyBrief();
    trackEvent(user.id, 'AI_BRIEF_GENERATE', { model: brief.model });
    return ok({ brief });
  } catch (error) {
    return fromCaughtError(error);
  }
}
