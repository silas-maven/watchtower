import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { trackEvent } from '@/lib/server/trackEvent';
import type { UsageEventType } from '@prisma/client';

export const runtime = 'nodejs';

const ALLOWED_TYPES: Set<string> = new Set([
  'PAGE_VIEW',
  'AVERAGE_PLAN_CREATE',
  'DUE_DILIGENCE_UPDATE',
  'ALERT_OPEN',
]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { type?: string; metadata?: Record<string, unknown>; path?: string };
    if (!body.type || !ALLOWED_TYPES.has(body.type)) {
      return fail('Invalid event type', 400, 'INVALID_EVENT_TYPE');
    }
    trackEvent(user.id, body.type as UsageEventType, body.metadata, body.path);
    return ok({ tracked: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}
