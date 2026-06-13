import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { getFinanceNews } from '@/lib/news/aggregator';
import { getSetting } from '@/lib/server/settings';
import { DEFAULT_X_HANDLE } from '@/lib/news/sources';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  try {
    await requireUser();
    const [items, xHandle] = await Promise.all([
      getFinanceNews(),
      getSetting('news_x_handle').catch(() => DEFAULT_X_HANDLE),
    ]);
    return ok({ items, xHandle: xHandle || DEFAULT_X_HANDLE, generatedAt: new Date().toISOString() });
  } catch (error) {
    return fromCaughtError(error);
  }
}
