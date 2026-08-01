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

  it('returns SELL when the whole day traded above the exit target', () => {
    // The mirror of the case above. A holding that gaps up through its exit and
    // keeps climbing must still raise a sell; previously it returned NONE.
    expect(
      computeSignalState({
        dailyLow: 190,
        dailyHigh: 210,
        targetEntry: null,
        targetExit: 150,
      }),
    ).toBe('SELL');
  });

  it('stays quiet while the price sits between the two targets', () => {
    expect(
      computeSignalState({
        dailyLow: 115,
        dailyHigh: 125,
        targetEntry: 100,
        targetExit: 150,
      }),
    ).toBe('NONE');
  });

  it('treats the boundaries as inclusive on the range and exclusive on the gap', () => {
    // Exit exactly at the low is a crossing, so SELL either way.
    expect(computeSignalState({ dailyLow: 150, dailyHigh: 160, targetEntry: null, targetExit: 150 })).toBe('SELL');
    // Entry exactly at the high is a crossing too.
    expect(computeSignalState({ dailyLow: 90, dailyHigh: 100, targetEntry: 100, targetExit: null })).toBe('BUY');
  });

  it('is symmetric: mirroring the prices mirrors the signal', () => {
    const buy = computeSignalState({ dailyLow: 45, dailyHigh: 55, targetEntry: 100, targetExit: null });
    const sell = computeSignalState({ dailyLow: 145, dailyHigh: 155, targetEntry: null, targetExit: 100 });
    expect(buy).toBe('BUY');
    expect(sell).toBe('SELL');
  });

  it('pins an inverted target pair to BOTH, which is why the importer rejects them', () => {
    // exit below entry: the price is simultaneously "cheap enough to buy" and
    // "high enough to sell". Documented here so the guard in the import script
    // is not mistaken for excessive caution.
    expect(
      computeSignalState({
        dailyLow: 115,
        dailyHigh: 125,
        targetEntry: 150,
        targetExit: 100,
      }),
    ).toBe('BOTH');
  });

  it('needs a day range before it will call anything', () => {
    expect(computeSignalState({ dailyLow: null, dailyHigh: null, targetEntry: 100, targetExit: 150 })).toBe('NONE');
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
