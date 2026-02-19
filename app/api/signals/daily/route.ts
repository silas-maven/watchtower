import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { getDailySignalSummary } from '@/lib/server/signals';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? undefined;
    const summary = await getDailySignalSummary(date);
    return ok({ summary });
  } catch (error) {
    return fromCaughtError(error);
  }
}
