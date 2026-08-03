import { describe, expect, it } from 'vitest';
import { EARNINGS_WINDOW_DAYS, EXTREME_RANGE_PCT, UNAVAILABLE_REASONS, earningsWindow } from '@/lib/server/briefHighlights';

// The extreme-range rule from the 2026-07-24 feedback:
//   intraday range % = (high - low) / previous close x 100
// plus the data-quality guards added after real provider data produced a
// "553,400,848% range" from a previous close of 3.9e-14.
const MAX_PLAUSIBLE_RANGE_PCT = 300;
const MIN_PLAUSIBLE_PRICE = 1e-6;
const MIN_LOW_VS_PREV_CLOSE = 0.1;

function qualifies(high: number, low: number, prevClose: number): boolean {
  if (!(high >= low)) return false;
  if (!(prevClose >= MIN_PLAUSIBLE_PRICE) || !(low >= MIN_PLAUSIBLE_PRICE)) return false;
  if (!(low >= prevClose * MIN_LOW_VS_PREV_CLOSE)) return false;
  const pct = ((high - low) / prevClose) * 100;
  return pct > EXTREME_RANGE_PCT && pct <= MAX_PLAUSIBLE_RANGE_PCT;
}

describe('extreme daily range detection', () => {
  it('uses the specified formula', () => {
    expect(((1.7 - 0.6469) / 0.92) * 100).toBeCloseTo(114.47, 1);
  });

  it('flags a genuine wide range', () => {
    expect(qualifies(1.7, 0.6469, 0.92)).toBe(true);
  });

  it('ignores a normal day', () => {
    expect(qualifies(101, 99, 100)).toBe(false);
  });

  it('rejects a near-zero previous close (the 553,400,848% case)', () => {
    expect(qualifies(2.189e-7, 3.85e-14, 3.955e-14)).toBe(false);
  });

  it('rejects a bad-tick low against a flat close (the SECO case)', () => {
    // Closed ~flat at 1918 but reported a low of 1.86: a data error.
    expect(qualifies(1932.68, 1.8596, 1918.21)).toBe(false);
  });

  it('rejects an implausibly large range', () => {
    expect(qualifies(500, 50, 100)).toBe(false);
  });

  it('names the three things it must never claim', () => {
    const joined = UNAVAILABLE_REASONS.join(' ').toLowerCase();
    expect(joined).toContain('dividend');
    expect(joined).toContain('rights');
    expect(joined).toContain('all-time low');
  });
});

// The earnings window used to run from the most recent Monday, so a brief read
// on a Sunday listed the Monday and Tuesday just gone. The 2 August 2026 brief
// showed earnings dated 27 and 28 July, both already reported. The window is
// now forward-only.
describe('earnings window', () => {
  const TZ = 'Europe/London';

  it('starts today and never looks backwards', () => {
    // A Sunday: the old rule would have started six days earlier, on the Monday.
    const sunday = new Date('2026-08-02T09:00:00Z');
    const { from, to } = earningsWindow(sunday, TZ);
    expect(from.getTime()).toBeLessThanOrEqual(sunday.getTime());
    // Nothing before today can fall inside it.
    const lastMonday = new Date('2026-07-27T12:00:00Z');
    expect(lastMonday >= from).toBe(false);
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });

  it('spans exactly the configured number of days', () => {
    const { from, to } = earningsWindow(new Date('2026-08-02T09:00:00Z'), TZ);
    expect((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)).toBe(EARNINGS_WINDOW_DAYS);
  });

  it('includes a date later today and excludes one just past the end', () => {
    const now = new Date('2026-08-02T09:00:00Z');
    const { from, to } = earningsWindow(now, TZ);
    const laterToday = new Date('2026-08-02T20:00:00Z');
    const justPast = new Date(to.getTime() + 60 * 1000);
    expect(laterToday >= from && laterToday < to).toBe(true);
    expect(justPast >= from && justPast < to).toBe(false);
  });
});
