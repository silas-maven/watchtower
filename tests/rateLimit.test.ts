import { beforeEach, describe, expect, it } from 'vitest';
import { hit, RATE_LIMITS, __resetRateLimits, type RateLimitBucket } from '@/lib/rateLimit';

// The limiter is the outer guard on every mutating endpoint, so its edges matter:
// off-by-one on the limit either lets an extra request through or rejects a
// legitimate one, and a window that never resets locks a member out for good.
describe('rate limiter', () => {
  beforeEach(() => __resetRateLimits());

  it('allows exactly the limit and rejects the next one', () => {
    const { limit } = RATE_LIMITS.write;
    for (let i = 0; i < limit; i++) {
      expect(hit('write', 'profile-a').allowed, `request ${i + 1} of ${limit}`).toBe(true);
    }
    expect(hit('write', 'profile-a').allowed).toBe(false);
  });

  it('counts down remaining accurately', () => {
    const { limit } = RATE_LIMITS.model;
    expect(hit('model', 'profile-a').remaining).toBe(limit - 1);
    expect(hit('model', 'profile-a').remaining).toBe(limit - 2);
  });

  it('keeps members separate', () => {
    const { limit } = RATE_LIMITS.report;
    for (let i = 0; i < limit; i++) hit('report', 'profile-a');
    // profile-a is spent. profile-b must be untouched, or one noisy member could
    // deny the feature to everybody else.
    expect(hit('report', 'profile-a').allowed).toBe(false);
    expect(hit('report', 'profile-b').allowed).toBe(true);
  });

  it('keeps buckets separate', () => {
    const { limit } = RATE_LIMITS.report;
    for (let i = 0; i < limit + 1; i++) hit('report', 'profile-a');
    expect(hit('report', 'profile-a').allowed).toBe(false);
    // Exhausting reports must not stop the same member editing their portfolio.
    expect(hit('write', 'profile-a').allowed).toBe(true);
  });

  it('resets once the window passes', () => {
    const now = 1_000_000;
    const { limit, windowMs } = RATE_LIMITS.model;
    for (let i = 0; i < limit; i++) hit('model', 'profile-a', now);
    expect(hit('model', 'profile-a', now).allowed).toBe(false);

    // One millisecond before the window ends is still blocked.
    expect(hit('model', 'profile-a', now + windowMs - 1).allowed).toBe(false);
    // At the boundary it opens again.
    expect(hit('model', 'profile-a', now + windowMs).allowed).toBe(true);
  });

  it('reports a sane Retry-After', () => {
    const now = 1_000_000;
    const { limit, windowMs } = RATE_LIMITS.report;
    for (let i = 0; i < limit + 1; i++) hit('report', 'profile-a', now);

    const halfway = hit('report', 'profile-a', now + windowMs / 2);
    expect(halfway.allowed).toBe(false);
    // Never zero or negative: a client told to retry after 0 retries immediately
    // and makes the thing it is being throttled for worse.
    expect(halfway.retryAfterSeconds).toBeGreaterThan(0);
    expect(halfway.retryAfterSeconds).toBeLessThanOrEqual(windowMs / 1000);
  });

  it('defines a positive limit and window for every bucket', () => {
    for (const [name, rule] of Object.entries(RATE_LIMITS)) {
      expect(rule.limit, name).toBeGreaterThan(0);
      expect(rule.windowMs, name).toBeGreaterThan(0);
      expect(hit(name as RateLimitBucket, `probe-${name}`).allowed, name).toBe(true);
    }
  });

  it('keeps the money-spending bucket tighter than ordinary writes', () => {
    // Not a style preference: a model call costs real money and an ordinary write
    // does not, so if this ever inverts it is a mistake worth failing the build.
    expect(RATE_LIMITS.model.limit).toBeLessThan(RATE_LIMITS.write.limit);
    expect(RATE_LIMITS.report.limit).toBeLessThan(RATE_LIMITS.write.limit);
  });
});
