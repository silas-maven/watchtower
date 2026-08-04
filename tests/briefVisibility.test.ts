import { describe, expect, it } from 'vitest';
import { freeSummary, insightsFor, isFreeSafeInsight, statsFor } from '@/lib/briefVisibility';

// The fixture is the REAL persisted brief from 3 August 2026, copied verbatim out
// of the database. It is the one that was actually being shown to free profiles,
// so these tests fail if the specific leak that happened ever comes back.
const LIVE_BRIEF_SUMMARY =
  'Daily brief: 77 buy-side and 20 sell-side active signals across the watchlist. 97 total active signals out of 815 assets.';

const LIVE_BRIEF_INSIGHTS = [
  'Active BUY signals: 77. Active SELL signals: 20.',
  'New sell alerts since yesterday: ALTO, BARC.L, BBOX.L, CMCX.L, ELVN, GILD, GLEN, GS, HUT, INCY, MA, MELI, MKS.L, NAT, NET, PRPO, TALK.',
  'Extreme daily ranges (over 40% of the previous close): MBRX (74.2%).',
  'Reporting earnings this week: DDD (2026-08-03), GRAB (2026-08-03), IIPR (2026-08-03).',
  'Market breadth: 327 advancing, 424 declining, 64 flat. Avg change 0.05%.',
  'Top gainers: OTRK (358.19%), NXMH (94.37%), IESC (30.27%).',
];

const STATS = { totalAssets: 815, activeSignals: 97, advancers: 327, decliners: 424, flat: 64, avgChangePct: 0.05 };

describe('brief visibility, free profiles', () => {
  it('withholds the two insights that gave the product away', () => {
    const free = insightsFor('free', LIVE_BRIEF_INSIGHTS);
    expect(free).not.toContain(LIVE_BRIEF_INSIGHTS[0]); // active buy/sell counts
    expect(free).not.toContain(LIVE_BRIEF_INSIGHTS[1]); // seventeen named sell tickers
  });

  it('keeps the market facts a free profile is entitled to', () => {
    const free = insightsFor('free', LIVE_BRIEF_INSIGHTS);
    expect(free).toContain(LIVE_BRIEF_INSIGHTS[2]); // extreme ranges
    expect(free).toContain(LIVE_BRIEF_INSIGHTS[3]); // earnings, owner said this is fine
    expect(free).toContain(LIVE_BRIEF_INSIGHTS[4]); // breadth
    expect(free).toContain(LIVE_BRIEF_INSIGHTS[5]); // top gainers
  });

  it('leaks no ticker that was tied to a signal', () => {
    const text = insightsFor('free', LIVE_BRIEF_INSIGHTS).join(' ');
    for (const ticker of ['ALTO', 'BARC.L', 'BBOX.L', 'CMCX.L', 'GILD', 'GLEN', 'MELI', 'TALK']) {
      expect(text, `${ticker} leaked`).not.toContain(ticker);
    }
  });

  it('never shows a free profile the model-written summary', () => {
    const free = freeSummary(STATS);
    expect(free).not.toBe(LIVE_BRIEF_SUMMARY);
    for (const leak of ['77', '20', '97', 'buy-side', 'sell-side', 'active signals']) {
      expect(free.toLowerCase(), `"${leak}" leaked`).not.toContain(leak.toLowerCase());
    }
  });

  it('still says something true and useful in the free summary', () => {
    const free = freeSummary(STATS);
    expect(free).toContain('815');
    expect(free).toContain('327');
    expect(free).toContain('424');
    expect(free).toContain('more fallers than risers');
  });

  it('strips the active-signal count from the stat payload', () => {
    const free = statsFor('free', STATS);
    expect(free).not.toHaveProperty('activeSignals');
    expect(free).toMatchObject({ totalAssets: 815, advancers: 327 });
  });

  it('gives a paid profile everything, untouched', () => {
    expect(insightsFor('paid', LIVE_BRIEF_INSIGHTS)).toEqual(LIVE_BRIEF_INSIGHTS);
    expect(statsFor('paid', STATS)).toEqual(STATS);
  });
});

describe('the allowlist fails closed', () => {
  it('withholds an unrecognised insight rather than showing it', () => {
    // The whole point of the design: something added later is private by
    // default, and somebody has to decide to open it.
    expect(isFreeSafeInsight('Some new insight type nobody has classified yet.')).toBe(false);
    expect(insightsFor('free', ['Brand new line from a future release.'])).toEqual([]);
  });

  it('withholds signal talk even when it wears a safe prefix', () => {
    // Belt and braces. A safe-looking prefix must not be a way through.
    expect(isFreeSafeInsight('Market breadth: 12 assets entered the buy zone.')).toBe(false);
    expect(isFreeSafeInsight('Top gainers: NVDA hit its entry target.')).toBe(false);
    expect(isFreeSafeInsight('Reporting earnings this week: LLY, now showing a sell signal.')).toBe(false);
  });

  it.each([
    'Active BUY signals: 3.',
    'New buy alerts since yesterday: AAPL.',
    'Dropped from signal zones today: TSLA.',
    'Most active class: STOCK with 12 active signals out of 400 tracked.',
    'New signal entries today: MSFT.',
  ])('withholds %s', (line) => {
    expect(isFreeSafeInsight(line)).toBe(false);
  });

  it('handles an empty or missing brief without throwing', () => {
    expect(insightsFor('free', [])).toEqual([]);
    expect(statsFor('free', null)).toBeNull();
    expect(freeSummary(null)).toContain('paid membership');
  });
});
