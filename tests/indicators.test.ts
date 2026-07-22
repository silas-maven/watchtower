import { describe, expect, it } from 'vitest';
import { bollinger, latestStochasticK, sma, stochastic } from '@/lib/indicators';

describe('sma', () => {
  it('averages over the window and is null before it fills', () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });
});

describe('bollinger', () => {
  it('computes middle band and symmetric envelopes', () => {
    const closes = [2, 4, 6, 8, 10];
    const out = bollinger(closes, 5, 2);
    expect(out.slice(0, 4)).toEqual([null, null, null, null]);
    const last = out[4]!;
    expect(last.middle).toBe(6);
    // population std dev of [2,4,6,8,10] = sqrt(8)
    const sd = Math.sqrt(8);
    expect(last.upper).toBeCloseTo(6 + 2 * sd, 10);
    expect(last.lower).toBeCloseTo(6 - 2 * sd, 10);
  });

  it('constant series has zero-width bands', () => {
    const out = bollinger([5, 5, 5, 5], 4, 2);
    expect(out[3]).toEqual({ middle: 5, upper: 5, lower: 5 });
  });
});

describe('stochastic', () => {
  const bar = (close: number, high = close + 1, low = close - 1) => ({ close, high, low });

  it('needs kPeriod + kSmoothing + dPeriod - 2 bars before emitting', () => {
    const points = Array.from({ length: 20 }, (_, i) => bar(10 + i));
    const out = stochastic(points, 8, 5, 5);
    // raw fills at index 7, slow K at 11, D at 15
    expect(out[14]).toBeNull();
    expect(out[15]).not.toBeNull();
  });

  it('pins %K near 100 in a steady uptrend and near 0 in a downtrend', () => {
    const up = Array.from({ length: 30 }, (_, i) => bar(10 + i));
    const upOut = stochastic(up, 8, 5, 5);
    expect(upOut[29]!.k).toBeGreaterThan(80);

    const down = Array.from({ length: 30 }, (_, i) => bar(100 - i));
    const downOut = stochastic(down, 8, 5, 5);
    expect(downOut[29]!.k).toBeLessThan(20);
  });

  it('flat series returns 50', () => {
    const flat = Array.from({ length: 30 }, () => ({ close: 10, high: 10, low: 10 }));
    const out = stochastic(flat, 8, 5, 5);
    expect(out[29]!.k).toBe(50);
    expect(out[29]!.d).toBe(50);
  });

  it('latestStochasticK returns the last defined slow %K', () => {
    const up = Array.from({ length: 30 }, (_, i) => bar(10 + i));
    expect(latestStochasticK(up)).toBeGreaterThan(80);
    expect(latestStochasticK(up.slice(0, 5))).toBeNull();
  });
});
