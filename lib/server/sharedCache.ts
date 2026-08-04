import { revalidateTag, unstable_cache } from 'next/cache';

// Cross-request caching for reads that are IDENTICAL FOR EVERY MEMBER.
//
// THE PROBLEM THIS SOLVES. Every member page is force-dynamic, and several of the
// calls behind them take no user argument at all: the academy-wide signal
// summary, the macro tiles, the featured posts, the platform settings. They
// return exactly the same bytes for everyone, and they were being recomputed from
// scratch on every single request.
//
// At four members that is invisible. Measured against the real database at
// rising concurrency, getDailySignalSummary (a full 815-asset scan plus a signal
// recomputation) behaved like this:
//
//     1 concurrent    p95 1,327ms
//    10 concurrent    p95 1,402ms
//    25 concurrent    p95 1,672ms
//    50 concurrent    p95 3,089ms
//
// Fifty people opening Daily Checks meant fifty identical full scans, and they
// queue behind each other. That is the three seconds, and it gets worse
// linearly. Nothing about it is inherent: it is the same answer computed fifty
// times.
//
// WHY THESE TTLs ARE SAFE. The underlying data cannot change faster than the
// market refresh job produces it, and that runs at most once every five minutes
// (lib/server/marketFreshness.ts) with a daily cron behind it. A sixty second
// cache is therefore well inside the rate at which the numbers can actually
// move. It is not trading correctness for speed; it is declining to recompute
// something that has not changed.
//
// WHAT IS DELIBERATELY NOT CACHED. Anything taking a profileId. A per-member
// cache keyed carelessly is how one member gets served another member's
// portfolio, and no amount of speed is worth that. If you add something here,
// the test is simple: could two different members ever receive different bytes
// from this function? If yes, it does not belong in this file.

/** Market-derived reads. Bounded by how often the refresh job can run. */
const MARKET_TTL_SECONDS = 60;

/** Platform settings. Short, so an admin edit shows up promptly. */
const SETTINGS_TTL_SECONDS = 30;

/** Community reads. The feed itself is live; only the Dashboard slot is cached. */
const COMMUNITY_TTL_SECONDS = 60;

/**
 * Cache tags, so a write can invalidate the read it affects instead of everyone
 * waiting out the TTL. Use with revalidateTag from next/cache.
 */
export const CACHE_TAGS = {
  market: 'shared:market',
  settings: 'shared:settings',
  community: 'shared:community',
} as const;

type Loader<T> = () => Promise<T>;

/**
 * unstable_cache THROWS when there is no request context, with
 * "Invariant: incrementalCache missing in unstable_cache". That is not
 * hypothetical here: these functions are also called from the weekly digest, the
 * daily brief generator, the pitch builder and several maintenance scripts, none
 * of which run inside a request.
 *
 * Caching is an optimisation. An optimisation that turns a working script into a
 * crash is a bug, so a missing cache context falls through to the uncached
 * loader rather than propagating.
 */
function isMissingCacheContext(error: unknown): boolean {
  return error instanceof Error && /incrementalCache|static generation store/i.test(error.message);
}

function shared<T>(key: string, tag: string, ttl: number, loader: Loader<T>): Loader<T> {
  const cached = unstable_cache(loader, [key], { revalidate: ttl, tags: [tag] });
  return async () => {
    try {
      return await cached();
    } catch (error) {
      if (isMissingCacheContext(error)) return loader();
      throw error;
    }
  };
}

/** Market-derived, identical for every member. */
export function sharedMarket<T>(key: string, loader: Loader<T>): Loader<T> {
  return shared(key, CACHE_TAGS.market, MARKET_TTL_SECONDS, loader);
}

/** Platform settings, identical for every member. */
export function sharedSettings<T>(key: string, loader: Loader<T>): Loader<T> {
  return shared(key, CACHE_TAGS.settings, SETTINGS_TTL_SECONDS, loader);
}

/** Community reads that are the same for every member. */
export function sharedCommunity<T>(key: string, loader: Loader<T>): Loader<T> {
  return shared(key, CACHE_TAGS.community, COMMUNITY_TTL_SECONDS, loader);
}

/**
 * Expire a tag now, so a write is visible immediately instead of waiting out the
 * TTL. An admin who saves a setting and does not see it change assumes the save
 * failed, and the next thing they do is save it again.
 *
 * The two-argument form and the `{ expire: 0 }` profile are Next 16's signature,
 * kept here so the call sites do not each have to know about it. Safe to call
 * from anywhere: outside a request scope (cron routes, scripts, jobs) Next
 * throws, and the TTL expires on its own regardless, so a failure here is never
 * a correctness problem.
 */
export function invalidateShared(...tags: Array<(typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]>): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // No request scope, or revalidation is unavailable here. The TTL covers it.
    }
  }
}
