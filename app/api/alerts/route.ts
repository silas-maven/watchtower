import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { getActiveSignals } from '@/lib/server/signals';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireUser();
    const alerts = await getActiveSignals();
    return ok({ alerts });
  } catch (error) {
    return fromCaughtError(error);
  }
}
