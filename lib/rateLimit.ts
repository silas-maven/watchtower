// Request rate limiting.
//
// WHAT THIS IS, AND HONESTLY WHAT IT IS NOT
//
// A fixed-window counter held in the memory of one serverless instance. It stops
// the abuse that actually happens to an app like this: a runaway client loop, a
// stuck retry, a tab left hammering an endpoint, somebody poking at an API with
// curl in a for-loop. Those all come from one caller and land on a warm instance,
// and this catches them at near zero cost.
//
// It does NOT stop a determined distributed attacker. Vercel runs many instances,
// each with its own memory, so the effective ceiling is the limit multiplied by
// however many instances are warm. Anyone who tells you an in-process limiter is
// a security boundary is selling something.
//
// It is used here anyway, and deliberately, because of how the layers divide:
//
//   THIS MODULE          burst control. Cheap, immediate, best effort.
//   DATABASE QUOTAS      the real limit on anything that costs money or has to
//                        be true. Counted in rows, so they survive instance
//                        recycling and cannot be reset by hitting a cold lambda.
//   DATABASE CONSTRAINTS the real limit on anything that has to be exactly once.
//
// Every endpoint that spends money on a model call is metered in the DATABASE by
// counting AiReport rows (lib/entitlements.ts: checkPitchQuota,
// checkDailyAiQuota), including /api/ai-insight, which needed a report kind added
// to be countable. Reporting a post is capped by a composite primary key on
// CommunityPostReport, not by a counter anyone can increment in a loop. Those are
// the guards that hold; this one buys time in front of them.
//
// SIZING NOTE (2026-08-04). Written when the app had four members, revised when
// it became clear it launches to a waiting community of several hundred and is
// expected in four figures within six months. That changed one thing and not
// another. It did NOT change the reasoning above, because the money and integrity
// paths were moved to durable guards rather than left to this one. It DOES change
// when the store below stops being adequate: with many warm instances a single
// caller's effective ceiling is the limit multiplied by the number of instances
// they happen to land on, so treat these numbers as an order of magnitude rather
// than a promise.
//
// Replace the store with Redis or Upstash when either becomes true: a limit here
// is load-bearing for something other than noise, or the logs show a caller
// exceeding a bucket materially because they spread across instances. The call
// sites do not change; only `hit()` does.

export type RateLimitRule = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until the window resets, for the Retry-After header. */
  retryAfterSeconds: number;
};

/**
 * The named budgets. Defined in one place so limits can be reasoned about
 * together rather than guessed at each call site, and so a tightening is one
 * edit rather than a search.
 *
 * The tiers are set by what a request COSTS us, not by how sensitive it feels:
 *
 *   model    a real spend per call, on top of the DB quota that already caps it
 *   write    a database write, cheap but not free, and abusable in a loop
 *   burst    generous, for things a normal session does repeatedly and quickly
 */
export const RATE_LIMITS = {
  /**
   * Model-backed endpoints. Deliberately tight. This is the outer guard; the
   * inner one is the per-day DB quota, which is what actually controls spend.
   */
  model: { limit: 10, windowMs: 60_000 },

  /**
   * Ordinary authenticated writes: holdings, plans, watchlists, profile.
   * A member editing a portfolio quickly will not come close to this.
   */
  write: { limit: 60, windowMs: 60_000 },

  /**
   * Community writes. Posting already has a durable 20-a-day cap in the DB
   * (overPostingLimit); this stops the per-second hammering that cap cannot see.
   */
  community: { limit: 20, windowMs: 60_000 },

  /**
   * Reporting a post. Low by design: reporting is not something a person does
   * in volume, and the moderation queue sorts by report count, so unbounded
   * reporting lets one member bury everyone else's reports.
   */
  report: { limit: 5, windowMs: 60 * 60_000 },

  /** Analytics pings. High volume by nature, but not unbounded. */
  track: { limit: 120, windowMs: 60_000 },

  /** Anything that talks to Stripe, so we cannot be used to spam their API. */
  billing: { limit: 5, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/**
 * Drop expired entries so a long-lived instance does not accumulate a key per
 * member per bucket forever. Called opportunistically rather than on a timer,
 * because a timer would keep a serverless instance alive.
 */
function evictExpired(now: number): void {
  if (store.size < 1000) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * Count one request against a bucket.
 *
 * `identity` should be the profile id for authenticated routes. It is the right
 * key because every rate-limited route here requires a session, so there is a
 * real identity to attribute to, and keying on IP would punish everyone behind
 * one corporate NAT while doing nothing about a signed-in abuser.
 */
export function hit(bucket: RateLimitBucket, identity: string, now = Date.now()): RateLimitResult {
  const rule = RATE_LIMITS[bucket];
  const key = `${bucket}:${identity}`;
  evictExpired(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: Math.ceil(rule.windowMs / 1000) };
  }

  entry.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > rule.limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: rule.limit - entry.count, retryAfterSeconds };
}

/** Test seam: clear all counters so one test cannot leak into the next. */
export function __resetRateLimits(): void {
  store.clear();
}
