import { describe, expect, it } from 'vitest';
import { runStressTest, type StressInputs } from '@/lib/stressTest';

const base: StressInputs = {
  holdings: [
    { symbol: 'AAA', valueGBP: 6000, beta: 1.2, currency: 'USD' },
    { symbol: 'BBB', valueGBP: 3000, beta: 0.8, currency: 'GBP' },
  ],
  cashGBP: 1000,
  targetValueGBP: 15000,
  horizonYears: 10,
};

describe('runStressTest', () => {
  it('is deterministic for identical inputs', () => {
    const a = runStressTest(base);
    const b = runStressTest(base);
    expect(a).toEqual(b);
  });

  it('reports sane distribution shape', () => {
    const r = runStressTest(base);
    expect(r.startValueGBP).toBe(10000);
    const p = r.finalValuePercentilesGBP;
    expect(p.p5).toBeLessThan(p.p25);
    expect(p.p25).toBeLessThan(p.p50);
    expect(p.p50).toBeLessThan(p.p75);
    expect(p.p75).toBeLessThan(p.p95);
    expect(r.maxDrawdownPct.median).toBeGreaterThan(0);
    expect(r.maxDrawdownPct.p90).toBeGreaterThanOrEqual(r.maxDrawdownPct.median);
    expect(r.probMeetingGoal).toBeGreaterThan(0);
    expect(r.probMeetingGoal).toBeLessThan(1);
  });

  it('a higher goal is harder to hit', () => {
    const easy = runStressTest({ ...base, targetValueGBP: 11000 });
    const hard = runStressTest({ ...base, targetValueGBP: 40000 });
    expect(easy.probMeetingGoal!).toBeGreaterThan(hard.probMeetingGoal!);
  });

  it('no goal means no probability', () => {
    expect(runStressTest({ ...base, targetValueGBP: null }).probMeetingGoal).toBeNull();
  });

  it('computes concentration and beta', () => {
    const r = runStressTest(base);
    expect(r.concentration.topHolding).toEqual({ symbol: 'AAA', weightPct: 60 });
    expect(r.concentration.topCurrency!.currency).toBe('USD');
    expect(r.concentration.cashWeightPct).toBeCloseTo(10, 5);
    expect(r.concentration.portfolioBeta).toBeCloseTo(0.6 * 1.2 + 0.3 * 0.8, 5);
  });

  it('an all-cash portfolio barely draws down', () => {
    const r = runStressTest({ holdings: [], cashGBP: 10000, targetValueGBP: null, horizonYears: 5 });
    expect(r.maxDrawdownPct.p90).toBeLessThan(1);
    expect(r.finalValuePercentilesGBP.p50).toBeGreaterThan(10000);
  });
});
