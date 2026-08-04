import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toGbp, fetchFxRates, __resetFxCache } from '@/lib/market/fx';
import { fetchYahooQuotes } from '@/lib/market/yahoo';

// The upstream provider is mocked rather than called. These tests are about the
// caching, and a unit suite that reaches the real Yahoo endpoint is slow, is
// affected by whether that endpoint is rate-limiting today, and cannot count how
// many requests were actually made, which is the only thing worth asserting.
vi.mock('@/lib/market/yahoo', () => ({
  fetchYahooQuotes: vi.fn(),
}));

const quotes = vi.mocked(fetchYahooQuotes);

function yahooReturning(usd: number) {
  return new Map([
    ['GBPUSD=X', { currentPrice: usd }],
    ['GBPEUR=X', { currentPrice: 1.17 }],
    ['GBPCAD=X', { currentPrice: 1.84 }],
  ]);
}

// fetchFxRates sits on the Dashboard's critical path through getLivePortfolioView.
// It used to make an uncached HTTP call on every page view, measured at ~677ms,
// and getDisplayContext asked for rates a second time in the same render. A cache
// that silently stops working is invisible until someone re-measures, so the
// request count is asserted directly.
describe('fetchFxRates caching', () => {
  beforeEach(() => {
    __resetFxCache();
    quotes.mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quotes.mockResolvedValue(yahooReturning(1.25) as any);
  });

  afterEach(() => {
    __resetFxCache();
  });

  it('fetches once and serves the rest from cache', async () => {
    const first = await fetchFxRates();
    const second = await fetchFxRates();
    const third = await fetchFxRates();

    expect(quotes).toHaveBeenCalledTimes(1);
    expect(first.USD).toBe(1.25);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('collapses concurrent callers into a single request', async () => {
    // Six concurrent callers is what one Dashboard render produced: the portfolio
    // view and the display context both want rates, on top of the page's own
    // parallel loads. They must share one request rather than make six.
    const all = await Promise.all(Array.from({ length: 6 }, () => fetchFxRates()));

    expect(quotes).toHaveBeenCalledTimes(1);
    for (const rates of all) expect(rates).toEqual(all[0]);
  });

  it('refetches once the cache is dropped', async () => {
    await fetchFxRates();
    __resetFxCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quotes.mockResolvedValue(yahooReturning(1.4) as any);

    expect((await fetchFxRates()).USD).toBe(1.4);
    expect(quotes).toHaveBeenCalledTimes(2);
  });

  it('falls back to usable rates when every provider fails', async () => {
    quotes.mockRejectedValue(new Error('rate limited'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const rates = await fetchFxRates();

    // Never null, never zero: these divide portfolio values, so a bad rate is
    // worse than a stale one.
    for (const key of ['USD', 'EUR', 'CAD'] as const) {
      expect(rates[key]).toBeGreaterThan(0);
      expect(Number.isFinite(rates[key])).toBe(true);
    }
    vi.unstubAllGlobals();
  });

  it('prefers the last known rates over the static fallback when a refresh fails', async () => {
    // Time is faked so the cache genuinely EXPIRES rather than being reset.
    // Those are different paths: a reset cache has nothing to fall back to, an
    // expired one still holds the last good rates, and only the second can
    // demonstrate that stale real rates beat the hardcoded ones.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-03T09:00:00Z'));
      expect((await fetchFxRates()).USD).toBe(1.25);

      // Past the ten minute TTL, so the next call tries to refresh and fails.
      vi.setSystemTime(new Date('2026-08-03T09:15:00Z'));
      quotes.mockRejectedValue(new Error('rate limited'));
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const after = await fetchFxRates();

      // 1.25 is the stale cached rate. 1.27 is the hardcoded FALLBACK_RATES
      // constant. Getting 1.25 back is the whole point of the assertion.
      expect(after.USD).toBe(1.25);
      expect(quotes).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('toGbp', () => {
  const rates = { USD: 1.25, EUR: 1.15, CAD: 1.84 };

  it('converts USD to GBP', () => {
    expect(toGbp(125, 'USD', rates)).toBeCloseTo(100, 5);
  });

  it('converts EUR to GBP', () => {
    expect(toGbp(115, 'EUR', rates)).toBeCloseTo(100, 5);
  });

  it('converts CAD to GBP', () => {
    expect(toGbp(184, 'CAD', rates)).toBeCloseTo(100, 5);
  });

  it('converts GBX to GBP by dividing by 100', () => {
    expect(toGbp(250, 'GBX', rates)).toBeCloseTo(2.5, 5);
  });
});
