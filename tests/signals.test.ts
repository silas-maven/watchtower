import { describe, expect, it } from 'vitest';
import { computeSignalState } from '@/lib/signals/engine';

describe('computeSignalState', () => {
  it('returns BUY when entry target is inside day range', () => {
    expect(
      computeSignalState({
        dailyLow: 90,
        dailyHigh: 110,
        targetEntry: 100,
        targetExit: 150,
      }),
    ).toBe('BUY');
  });

  it('returns SELL when exit target is inside day range', () => {
    expect(
      computeSignalState({
        dailyLow: 90,
        dailyHigh: 110,
        targetEntry: 10,
        targetExit: 100,
      }),
    ).toBe('SELL');
  });

  it('returns BOTH when entry and exit are both hit', () => {
    expect(
      computeSignalState({
        dailyLow: 90,
        dailyHigh: 110,
        targetEntry: 95,
        targetExit: 105,
      }),
    ).toBe('BOTH');
  });

  it('supports spreadsheet parity when targetEntry is above daily high', () => {
    expect(
      computeSignalState({
        dailyLow: 90,
        dailyHigh: 100,
        targetEntry: 120,
        targetExit: null,
      }),
    ).toBe('BUY');
  });
});
