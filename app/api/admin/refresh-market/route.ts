import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { refreshMarketData } from '@/lib/jobs/refreshMarket';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const result = await refreshMarketData({ force: true });
    return ok({ result });
  } catch (error) {
    return fromCaughtError(error);
  }
}
