import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshMarketData } from '@/lib/jobs/refreshMarket';

const STALE_MS = 5 * 60 * 1000;

/**
 * On-view freshness: when a member opens a data page and the newest snapshot is
 * older than five minutes, refresh the market data. The JobRun check throttles to
 * at most one attempt per window even when no snapshots are being produced (for
 * example when every market is closed).
 *
 * NOTHING here runs before the response. The refresh itself was always deferred
 * with after(), but the two freshness queries that decide whether to refresh were
 * not: they ran inline, awaited, at the top of three of the busiest pages, and
 * their result is never used by the page. That put a database round trip in front
 * of every one of those renders to answer a question the reader does not care
 * about. Both the check and the work now happen after the response is sent.
 *
 * Deliberately returns void rather than a promise, so a caller cannot put it back
 * on the critical path by awaiting it.
 */
export function ensureFreshMarketData(): void {
  after(async () => {
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

      await refreshMarketData();
    } catch (error) {
      console.error('[marketFreshness] background refresh failed:', error);
    }
  });
}
