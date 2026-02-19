import { describe, expect, it } from 'vitest';
import { computeSpreadsheetDerived } from '@/lib/formulas';

describe('computeSpreadsheetDerived', () => {
  it('matches spreadsheet-style core calculations', () => {
    const result = computeSpreadsheetDerived({
      symbol: 'ABC',
      name: 'Asset ABC',
      currency: 'USD',
      portfolioSize: 5000,
      shares: 10,
      entryPrice: 100,
      currentPrice: 120,
      closeYest: 110,
      dailyHigh: 125,
      dailyLow: 105,
      low52: 80,
      targetEntry: 115,
      targetExit: 122,
      fx: { USD: 1.25, EUR: 1.15 },
    });

    expect(result.currentCostGBP).toBeCloseTo(800, 4);
    expect(result.currentValueGBP).toBeCloseTo(960, 4);
    expect(result.weightPct).toBeCloseTo(16, 4);
    expect(result.returnPct).toBeCloseTo(20, 4);
    expect(result.dailyChange).toBeCloseTo(10, 4);
    expect(result.dailyChangePct).toBeCloseTo(9.090909, 3);
    expect(result.rangeVsYClosePct).toBeCloseTo(18.181818, 3);
    expect(result.priceVsYearLowPct).toBeCloseTo(50, 3);
    expect(result.signalState).toBe('BOTH');
    expect(result.tradeAlertText.includes('TRADE ALERT')).toBe(true);
  });

  it('handles GBX conversion path', () => {
    const result = computeSpreadsheetDerived({
      symbol: 'GBX1',
      name: 'Pence Asset',
      currency: 'GBX',
      portfolioSize: 5000,
      shares: 100,
      entryPrice: 250,
      currentPrice: 300,
      closeYest: 295,
      dailyHigh: 301,
      dailyLow: 292,
      low52: 200,
      targetEntry: 299,
      targetExit: 300,
      fx: { USD: 1.25, EUR: 1.15 },
    });

    expect(result.currentCostGBP).toBeCloseTo(250, 5);
    expect(result.currentValueGBP).toBeCloseTo(300, 5);
  });
});
