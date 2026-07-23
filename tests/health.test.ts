import { describe, expect, it } from 'vitest';
import { scoreFinancialHealth, type HealthFundamentals } from '@/lib/finance/health';

// Loosely modelled on the live Yahoo values probed for these tickers.
const disney: HealthFundamentals = {
  profitMargin: 0.1154,
  returnOnEquity: 0.1101,
  operatingMargin: 0.155,
  revenueGrowth: 0.065,
  earningsGrowth: -0.298,
  freeCashflow: 3_751_375_104,
  operatingCashflow: 15_792_000_000,
  totalCash: 5_681_999_872,
  totalDebt: 47_358_001_152,
  ebitda: 19_719_999_488,
  debtToEquity: 0.41,
  quickRatio: 0.554,
  currentRatio: 0.679,
};

const jumia: HealthFundamentals = {
  profitMargin: -0.30788,
  returnOnEquity: -1.547,
  operatingMargin: -0.258,
  revenueGrowth: 0.394,
  earningsGrowth: null,
  freeCashflow: -25_725_876,
  operatingCashflow: -39_202_000,
  totalCash: 62_567_000,
  totalDebt: 9_665_000,
  ebitda: -54_539_000,
  debtToEquity: 0.77,
  quickRatio: 0.863,
  currentRatio: 1.022,
};

describe('scoreFinancialHealth', () => {
  it('rates a profitable, cash-generative company higher than a loss-making one', () => {
    const dis = scoreFinancialHealth(disney);
    const jmia = scoreFinancialHealth(jumia);
    expect(dis.score).toBeGreaterThan(jmia.score);
  });

  it('flags a loss-making, cash-burning company as red overall', () => {
    const jmia = scoreFinancialHealth(jumia);
    expect(jmia.overall).toBe('red');
    const profitability = jmia.dimensions.find((d) => d.key === 'profitability');
    expect(profitability?.rating).toBe('red');
    const cash = jmia.dimensions.find((d) => d.key === 'cashGeneration');
    expect(cash?.rating).toBe('red');
  });

  it('marks positive free cash flow as green cash generation', () => {
    const dis = scoreFinancialHealth(disney);
    expect(dis.dimensions.find((d) => d.key === 'cashGeneration')?.rating).toBe('green');
  });

  it('always emits a bankruptcy-risk dimension', () => {
    expect(scoreFinancialHealth(disney).dimensions.some((d) => d.key === 'bankruptcyRisk')).toBe(true);
    const jmia = scoreFinancialHealth(jumia);
    expect(jmia.dimensions.find((d) => d.key === 'bankruptcyRisk')?.rating).not.toBe('green');
  });

  it('skips dimensions with no data instead of guessing', () => {
    const empty: HealthFundamentals = {
      profitMargin: null, returnOnEquity: null, operatingMargin: null, revenueGrowth: null,
      earningsGrowth: null, freeCashflow: null, operatingCashflow: null, totalCash: null,
      totalDebt: null, ebitda: null, debtToEquity: null, quickRatio: null, currentRatio: null,
    };
    const s = scoreFinancialHealth(empty);
    // Only bankruptcy-risk (which always emits) should be present.
    expect(s.dimensions.map((d) => d.key)).toEqual(['bankruptcyRisk']);
  });
});
