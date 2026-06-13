import { describe, expect, it } from 'vitest';
import {
  computeAveragingPlan,
  computePortfolioSummary,
  gbpToLocal,
  halvingBudgets,
  localToGbp,
} from '@/lib/portfolio';

const fx = { USD: 1.25, EUR: 1.15, CAD: 1.84 };

describe('currency helpers', () => {
  it('converts GBP to local and back symmetrically', () => {
    expect(gbpToLocal(100, 'USD', fx)).toBeCloseTo(125, 5);
    expect(localToGbp(125, 'USD', fx)).toBeCloseTo(100, 5);
    expect(gbpToLocal(100, 'GBX', fx)).toBeCloseTo(10000, 5);
    expect(localToGbp(10000, 'GBX', fx)).toBeCloseTo(100, 5);
  });
});

describe('computePortfolioSummary', () => {
  it('computes invested, value, profit, return, cash, liquidation', () => {
    const s = computePortfolioSummary(
      [
        { costGBP: 1000, valueGBP: 1500, beta: 1.2 },
        { costGBP: 500, valueGBP: 400, beta: 0.8 },
      ],
      5000,
    );
    expect(s.investedGBP).toBe(1500);
    expect(s.valueGBP).toBe(1900);
    expect(s.profitGBP).toBe(400);
    expect(s.cashGBP).toBe(3500); // size - invested
    expect(s.liquidationValueGBP).toBe(5400); // size + profit
    expect(s.returnPct).toBeCloseTo(8, 5); // 400 / 5000
  });

  it('weights beta by share of liquidation value', () => {
    const s = computePortfolioSummary([{ costGBP: 1000, valueGBP: 2000, beta: 1.5 }], 4000);
    // single position beta weighting -> weight*beta where weight = value/liquidation
    expect(s.portfolioBeta).not.toBeNull();
    expect(s.portfolioBeta!).toBeGreaterThan(0);
  });

  it('returns null beta when no position reports beta', () => {
    const s = computePortfolioSummary([{ costGBP: 100, valueGBP: 120, beta: null }], 1000);
    expect(s.portfolioBeta).toBeNull();
  });
});

describe('computeAveragingPlan', () => {
  it('rounds shares per tranche and blends the average price (USD)', () => {
    const r = computeAveragingPlan(
      [
        { budgetGBP: 800, targetPrice: 100 }, // local 1000 / 100 = 10 shares
        { budgetGBP: 400, targetPrice: 50 }, // local 500 / 50 = 10 shares
      ],
      'USD',
      fx,
    );
    expect(r.rows[0].shares).toBe(10);
    expect(r.rows[1].shares).toBe(10);
    expect(r.totalShares).toBe(20);
    // total local cost = 10*100 + 10*50 = 1500 -> /20 = 75
    expect(r.averagePrice).toBeCloseTo(75, 5);
  });

  it('handles GBX pricing', () => {
    const r = computeAveragingPlan([{ budgetGBP: 100, targetPrice: 500 }], 'GBX', fx);
    // local budget = 10000 pence / 500 = 20 shares
    expect(r.rows[0].shares).toBe(20);
    expect(r.averagePrice).toBeCloseTo(500, 5);
  });

  it('ignores empty or invalid tranches', () => {
    const r = computeAveragingPlan(
      [
        { budgetGBP: 0, targetPrice: 100 },
        { budgetGBP: 500, targetPrice: 0 },
      ],
      'USD',
      fx,
    );
    expect(r.rows).toHaveLength(0);
    expect(r.averagePrice).toBeNull();
  });
});

describe('halvingBudgets', () => {
  it('halves each tranche and assigns the remainder to the last', () => {
    expect(halvingBudgets(1000, 4)).toEqual([500, 250, 125, 125]);
  });
});
