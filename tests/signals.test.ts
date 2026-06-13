import { describe, expect, it } from 'vitest';
import { SignalOverride, SignalState } from '@prisma/client';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';

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

describe('effectiveSignalState', () => {
  it('returns the computed state when no override is set', () => {
    expect(effectiveSignalState(SignalState.BUY, null)).toBe(SignalState.BUY);
    expect(effectiveSignalState(SignalState.NONE, undefined)).toBe(SignalState.NONE);
  });

  it('forces BUY/SELL regardless of the calculation', () => {
    expect(effectiveSignalState(SignalState.NONE, SignalOverride.FORCE_BUY)).toBe(SignalState.BUY);
    expect(effectiveSignalState(SignalState.BUY, SignalOverride.FORCE_SELL)).toBe(SignalState.SELL);
  });

  it('suppresses a calculated signal to NONE', () => {
    expect(effectiveSignalState(SignalState.BUY, SignalOverride.SUPPRESS)).toBe(SignalState.NONE);
    expect(effectiveSignalState(SignalState.BOTH, SignalOverride.SUPPRESS)).toBe(SignalState.NONE);
  });
});
