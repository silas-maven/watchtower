import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshMarketData } from '@/lib/jobs/refreshMarket';

const STALE_MS = 5 * 60 * 1000;

/**
 * On-view freshness: when a member opens a data page and the newest snapshot is
 * older than five minutes, kick a refresh after the response is sent. The JobRun
 * check throttles to at most one attempt per window even with no snapshots
 * being produced (for example when every market is closed).
 */
export async function ensureFreshMarketData(): Promise<void> {
  try {
    const windowStart = new Date(Date.now() - STALE_MS);
    const [latestSnapshot, recentRun] = await Promise.all([
      prisma.assetSnapshot.findFirst({
        orderBy: { capturedAt: 'desc' },
        select: { capturedAt: true },
      }),
      prisma.jobRun.findFirst({
        where: { job: 'refresh-market', startedAt: { gte: windowStart } },
        select: { id: true },
      }),
    ]);

    if (recentRun) return;
    if (latestSnapshot && Date.now() - latestSnapshot.capturedAt.getTime() < STALE_MS) return;

    after(async () => {
      try {
        await refreshMarketData();
      } catch (error) {
        console.error('[marketFreshness] background refresh failed:', error);
      }
    });
  } catch (error) {
    console.error('[marketFreshness] freshness check failed:', error);
  }
}
