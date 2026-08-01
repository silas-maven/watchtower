import { describe, expect, it } from 'vitest';
import { cagr, compoundInterest, totalReturnPct, yearsToTarget } from '@/lib/growth';

describe('compoundInterest', () => {
  it('matches the textbook annual case', () => {
    // 1000 at 10% for 3 years, compounded annually = 1331.
    const r = compoundInterest({ principal: 1000, annualRatePct: 10, years: 3, compoundsPerYear: 1 });
    expect(r.finalBalance).toBe(1331);
    expect(r.totalInterest).toBe(331);
    expect(r.totalContributions).toBe(0);
  });

  it('matches the textbook monthly case', () => {
    // 1000 at 12% for 1 year, compounded monthly = 1000 * (1.01)^12 = 1126.83.
    const r = compoundInterest({ principal: 1000, annualRatePct: 12, years: 1, compoundsPerYear: 12 });
    expect(r.finalBalance).toBeCloseTo(1126.83, 2);
  });

  it('adds regular contributions at the end of each period', () => {
    // 0 start, 100/month for 1 year at 12% compounded monthly: an ordinary
    // annuity, 100 * ((1.01^12 - 1) / 0.01) = 1268.25.
    const r = compoundInterest({
      principal: 0,
      annualRatePct: 12,
      years: 1,
      compoundsPerYear: 12,
      contribution: 100,
      contributionsPerYear: 12,
      contributionTiming: 'end',
    });
    expect(r.finalBalance).toBeCloseTo(1268.25, 2);
    expect(r.totalContributions).toBe(1200);
  });

  it('is worth more when contributions land at the start of each period', () => {
    const base = { principal: 0, annualRatePct: 12, years: 1, compoundsPerYear: 12, contribution: 100, contributionsPerYear: 12 } as const;
    const end = compoundInterest({ ...base, contributionTiming: 'end' });
    const start = compoundInterest({ ...base, contributionTiming: 'start' });
    // An annuity due earns one extra period of interest on every deposit.
    expect(start.finalBalance).toBeCloseTo(end.finalBalance * 1.01, 2);
  });

  it('handles monthly deposits against quarterly compounding without folding them together', () => {
    const r = compoundInterest({
      principal: 0,
      annualRatePct: 8,
      years: 2,
      compoundsPerYear: 4,
      contribution: 50,
      contributionsPerYear: 12,
    });
    expect(r.totalContributions).toBe(1200);
    // Deposits made between compounding dates still earn interest afterwards,
    // so the balance must exceed the money paid in.
    expect(r.finalBalance).toBeGreaterThan(1200);
  });

  it('reports a year-by-year schedule that reconciles', () => {
    const r = compoundInterest({
      principal: 1000,
      annualRatePct: 6,
      years: 3,
      compoundsPerYear: 12,
      contribution: 100,
      contributionsPerYear: 12,
    });
    expect(r.schedule).toHaveLength(3);
    for (const row of r.schedule) {
      expect(row.closingBalance).toBeCloseTo(row.openingBalance + row.contributions + row.interest, 1);
    }
    expect(r.schedule.at(-1)!.closingBalance).toBeCloseTo(r.finalBalance, 2);
    expect(r.finalBalance).toBeCloseTo(r.totalPaidIn + r.totalInterest, 1);
  });

  it('returns the principal untouched for a zero-year horizon', () => {
    const r = compoundInterest({ principal: 500, annualRatePct: 10, years: 0, compoundsPerYear: 12 });
    expect(r.finalBalance).toBe(500);
    expect(r.schedule).toHaveLength(0);
  });
});

describe('cagr', () => {
  it('computes the standard case', () => {
    // 1000 to 2000 over 5 years is about 14.87% a year.
    expect(cagr(1000, 2000, 5)).toBeCloseTo(14.8698, 3);
  });

  it('agrees with compounding in the other direction', () => {
    const rate = cagr(1000, 2000, 5)!;
    const grown = compoundInterest({ principal: 1000, annualRatePct: rate, years: 5, compoundsPerYear: 1 });
    expect(grown.finalBalance).toBeCloseTo(2000, 1);
  });

  it('handles a loss', () => {
    expect(cagr(1000, 500, 2)).toBeCloseTo(-29.2893, 3);
  });

  it('refuses cases where the answer would be meaningless rather than inventing one', () => {
    // A CAGR from nothing is infinite, and a zero-length period has no rate.
    expect(cagr(0, 1000, 5)).toBeNull();
    expect(cagr(-100, 1000, 5)).toBeNull();
    expect(cagr(1000, 2000, 0)).toBeNull();
    expect(cagr(1000, -5, 3)).toBeNull();
  });
});

describe('totalReturnPct and yearsToTarget', () => {
  it('reports total growth over the period', () => {
    expect(totalReturnPct(1000, 2000)).toBe(100);
    expect(totalReturnPct(1000, 500)).toBe(-50);
    expect(totalReturnPct(0, 500)).toBeNull();
  });

  it('says how long a target takes at a given rate', () => {
    // Doubling at 10% a year takes about 7.27 years.
    expect(yearsToTarget(1000, 2000, 10)).toBeCloseTo(7.2725, 3);
    expect(yearsToTarget(1000, 500, 10)).toBe(0);
    expect(yearsToTarget(1000, 2000, 0)).toBeNull();
  });
});
