import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertCronSecret } from '@/lib/security';
import { fromCaughtError } from '@/lib/route';
import { getDailySignalSummary } from '@/lib/server/signals';
import { getMacroTiles } from '@/lib/market/macro';
import { getSettings } from '@/lib/server/settings';
import { getFeaturedPosts } from '@/lib/server/community';
import { getDashboardAssets } from '@/lib/server/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const maxDuration = 60;

/**
 * Timings from INSIDE a deployed function.
 *
 * Every performance number this project has recorded so far was measured from a
 * laptop in London against a database in Zurich. That is the wrong journey: it
 * misses the region the functions actually run in, the cold start, and the
 * pooler behaviour under the deployment's own connection pattern. The August
 * handover flagged this explicitly and nobody had a way to answer it. This is
 * the way to answer it.
 *
 * GUARDED BY THE CRON SECRET, not left open. It returns no market data, no
 * member data and no configuration, only durations and row counts, but an
 * unauthenticated endpoint that runs a full universe scan is a free denial of
 * service and the shape of the response is nobody else's business either.
 *
 *   curl -s -H "x-cron-secret: $CRON_SECRET" https://<host>/api/diagnostics/perf
 *
 * Safe to keep. It is the only way to tell whether a future slowdown is the
 * database, the region, or the code, without guessing.
 */
export async function GET() {
  try {
    await assertCronSecret();

    const started = Date.now();
    const times: Record<string, number> = {};
    const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
      const t = performance.now();
      const out = await fn();
      times[label] = Math.round(performance.now() - t);
      return out;
    };

    // Raw round trip: the network plus pooler cost with no query behind it.
    await time('dbRoundTrip', () => prisma.$queryRaw`SELECT 1`);

    // The shared reads. First call in a cold instance populates the cache;
    // repeat calls should be ~0ms once it is warm, which is the whole point.
    const signals = await time('sharedSignalSummary', () => getDailySignalSummary());
    await time('sharedSignalSummaryRepeat', () => getDailySignalSummary());
    await time('sharedMacroTiles', () => getMacroTiles());
    await time('sharedMacroTilesRepeat', () => getMacroTiles());
    await time('sharedSettings', () => getSettings());
    await time('sharedFeaturedPosts', () => getFeaturedPosts());

    // Fifty concurrent requests for the shared summary, which is what fifty
    // members opening Daily Checks at once used to cost fifty times over.
    await time('fiftyConcurrentSharedSummary', () =>
      Promise.all(Array.from({ length: 50 }, () => getDailySignalSummary())),
    );

    // A per-member read, which is NOT cached and never will be.
    const profile = await prisma.profile.findFirst({ select: { id: true } });
    const dashboardRows = profile
      ? (await time('perMemberDashboardQuery', () => getDashboardAssets(profile.id))).length
      : 0;

    return NextResponse.json({
      ok: true,
      // Vercel sets these; they say where this actually ran.
      region: process.env.VERCEL_REGION ?? 'unknown',
      env: process.env.VERCEL_ENV ?? 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
      times,
      totalMs: Date.now() - started,
      counts: {
        activeSignals: signals?.market?.activeSignals ?? null,
        dashboardCandidateRows: dashboardRows,
      },
      note: 'Durations in ms. *Repeat entries should be ~0 once the shared cache is warm.',
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
