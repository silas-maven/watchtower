import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { refreshMarketData } from '@/lib/jobs/refreshMarket';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const result = await refreshMarketData();
    return ok({ result });
  } catch (error) {
    return fromCaughtError(error);
  }
}
