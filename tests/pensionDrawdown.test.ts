import { describe, expect, it } from 'vitest';
import {
  computeTaxFreeCash,
  incomeTax,
  personalAllowanceFor,
  projectDrawdown,
  type DrawdownInput,
} from '@/lib/pension/drawdown';
import { LUMP_SUM_ALLOWANCE, PERSONAL_ALLOWANCE, STATE_PENSION_AGE } from '@/lib/pension/config';

// The tax cases below are checked against PUBLISHED 2025/26 figures for England,
// Wales and Northern Ireland, not against this implementation's own output. A
// calculator that agrees with itself proves nothing; the whole point is that a
// member could check these against HMRC and get the same answer.

describe('income tax, 2025/26 England/Wales/NI', () => {
  it('charges nothing inside the personal allowance', () => {
    expect(incomeTax(0)).toBe(0);
    expect(incomeTax(12_570)).toBe(0);
  });

  it('charges 20% on the first pound above the allowance', () => {
    expect(incomeTax(12_571)).toBeCloseTo(0.2, 2);
  });

  it('matches the published figure at the top of the basic rate band', () => {
    // £50,270 total: (50,270 - 12,570) x 20% = £7,540
    expect(incomeTax(50_270)).toBeCloseTo(7_540, 2);
  });

  it('matches the published figure for a £60,000 income', () => {
    // £7,540 basic + (60,000 - 50,270) x 40% = £3,892  ->  £11,432
    expect(incomeTax(60_000)).toBeCloseTo(11_432, 2);
  });

  it('matches the published figure for a £130,000 income', () => {
    // Allowance fully tapered away. 7,540 + 87,440 x 40% + 4,860 x 45% = £44,703
    expect(incomeTax(130_000)).toBeCloseTo(44_703, 2);
  });

  it('applies the 60% effective marginal rate in the taper zone', () => {
    // Between 100k and 125,140 each extra £1 is taxed at 40% and costs 50p of
    // allowance, itself taxed at 40%. So £1,000 more income costs £600 more tax.
    const step = incomeTax(101_000) - incomeTax(100_000);
    expect(step).toBeCloseTo(600, 2);
  });
});

describe('personal allowance taper', () => {
  it('is untouched at or below the threshold', () => {
    expect(personalAllowanceFor(100_000)).toBe(PERSONAL_ALLOWANCE);
  });

  it('loses £1 for every £2 above it', () => {
    expect(personalAllowanceFor(110_000)).toBeCloseTo(PERSONAL_ALLOWANCE - 5_000, 2);
  });

  it('reaches exactly zero at £125,140 and never goes negative', () => {
    expect(personalAllowanceFor(125_140)).toBeCloseTo(0, 2);
    expect(personalAllowanceFor(200_000)).toBe(0);
  });
});

describe('tax-free cash', () => {
  it('caps at 25% of the pot', () => {
    const { amount, cappedBy } = computeTaxFreeCash(400_000, { kind: 'percent', pct: 40 });
    expect(amount).toBe(100_000);
    expect(cappedBy).toBe('twenty-five-percent');
  });

  it('caps at the Lump Sum Allowance on a very large pot', () => {
    // 25% of £2m is £500,000, well above the £268,275 allowance.
    const { amount, cappedBy } = computeTaxFreeCash(2_000_000, { kind: 'max' });
    expect(amount).toBe(LUMP_SUM_ALLOWANCE);
    expect(cappedBy).toBe('lump-sum-allowance');
  });

  it('accounts for allowance already used by an earlier pension', () => {
    const { amount, cappedBy } = computeTaxFreeCash(2_000_000, { kind: 'max' }, 200_000);
    expect(amount).toBeCloseTo(LUMP_SUM_ALLOWANCE - 200_000, 2);
    expect(cappedBy).toBe('lump-sum-allowance');
  });

  it('reports no cap when the request fits', () => {
    const { amount, cappedBy } = computeTaxFreeCash(400_000, { kind: 'percent', pct: 10 });
    expect(amount).toBe(40_000);
    expect(cappedBy).toBe('none');
  });

  it('honours a zero choice', () => {
    expect(computeTaxFreeCash(400_000, { kind: 'none' }).amount).toBe(0);
  });
});

const BASE: DrawdownInput = {
  currentAge: 55,
  retirementAge: 65,
  potValue: 400_000,
  taxFreeCash: { kind: 'max' },
  growthPct: 5,
  feesPct: 0.75,
  inflationPct: 2.5,
  endAge: 90,
  statePensionAnnual: 11_973,
  statePensionAge: STATE_PENSION_AGE,
  otherTaxableIncome: 0,
  withdrawal: { kind: 'preset', preset: 'balanced' },
};

describe('drawdown projection', () => {
  it('splits the pot into tax-free cash and a drawdown fund', () => {
    const r = projectDrawdown(BASE);
    expect(r.taxFreeCash).toBe(100_000);
    expect(r.drawdownFund).toBe(300_000);
  });

  it('takes 4% of the drawdown fund on the balanced strategy', () => {
    const r = projectDrawdown(BASE);
    expect(r.years[0].withdrawal).toBeCloseTo(12_000, 2);
  });

  it('applies growth, then fees, then the withdrawal, in that order', () => {
    const r = projectDrawdown(BASE);
    const y = r.years[0];
    expect(y.growth).toBeCloseTo(300_000 * 0.05, 2); // 15,000
    expect(y.fees).toBeCloseTo((300_000 + 15_000) * 0.0075, 2); // 2,362.50
    expect(y.closingFund).toBeCloseTo(300_000 + 15_000 - 2_362.5 - 12_000, 2);
  });

  it('excludes the State Pension before the State Pension age', () => {
    const r = projectDrawdown(BASE);
    expect(r.years[0].age).toBe(65);
    expect(r.years[0].statePension).toBe(0);
    const atSpa = r.years.find((y) => y.age === STATE_PENSION_AGE)!;
    expect(atSpa.statePension).toBeCloseTo(11_973, 2);
  });

  it('taxes the first year correctly with no State Pension yet', () => {
    // £12,000 gross, personal allowance £12,570, so no tax at all.
    const r = projectDrawdown(BASE);
    expect(r.grossAnnualIncome).toBeCloseTo(12_000, 2);
    expect(r.annualTax).toBeCloseTo(0, 2);
    expect(r.netAnnualIncome).toBeCloseTo(12_000, 2);
    expect(r.netMonthlyIncome).toBeCloseTo(1_000, 2);
  });

  it('starts taxing once the State Pension pushes income over the allowance', () => {
    const r = projectDrawdown(BASE);
    const atSpa = r.years.find((y) => y.age === STATE_PENSION_AGE)!;
    expect(atSpa.grossIncome).toBeCloseTo(12_000 + 11_973, 2);
    expect(atSpa.tax).toBeCloseTo(incomeTax(23_973), 2);
    expect(atSpa.tax).toBeGreaterThan(0);
  });

  it('never lets the fund go negative, and reports exhaustion', () => {
    // A £50k pot taking £30k a year cannot last.
    const r = projectDrawdown({
      ...BASE,
      potValue: 50_000,
      taxFreeCash: { kind: 'none' },
      withdrawal: { kind: 'amount', annualAmount: 30_000 },
    });
    expect(r.fundExhaustedAtAge).not.toBeNull();
    for (const y of r.years) {
      expect(y.closingFund).toBeGreaterThanOrEqual(0);
      expect(y.withdrawal).toBeGreaterThanOrEqual(0);
    }
    expect(r.remainingFund).toBeCloseTo(0, 2);
  });

  it('reports no exhaustion when growth outpaces withdrawals', () => {
    const r = projectDrawdown({
      ...BASE,
      growthPct: 7,
      withdrawal: { kind: 'preset', preset: 'conservative' },
    });
    expect(r.fundExhaustedAtAge).toBeNull();
    expect(r.remainingFund).toBeGreaterThan(0);
  });

  it('projects one row per year through to the end age', () => {
    const r = projectDrawdown(BASE);
    expect(r.years[0].age).toBe(65);
    expect(r.projectedToAge).toBe(90);
    expect(r.years).toHaveLength(90 - 65 + 1);
  });

  it('reports the real value as lower than the nominal one', () => {
    const r = projectDrawdown(BASE);
    // Same money, discounted 25 years of inflation.
    expect(r.remainingFundReal).toBeLessThan(r.remainingFund);
    expect(r.years[0].closingFundReal).toBeCloseTo(r.years[0].closingFund, 2);
  });

  it('measures a shortfall against a target inheritance', () => {
    const r = projectDrawdown({ ...BASE, targetInheritance: 1_000_000 });
    expect(r.inheritanceTarget).toBe(1_000_000);
    expect(r.inheritanceShortfall).toBeCloseTo(1_000_000 - r.remainingFund, 2);
  });

  it('reports no shortfall when the target is met', () => {
    const r = projectDrawdown({ ...BASE, targetInheritance: 1 });
    expect(r.inheritanceShortfall).toBe(0);
  });

  it('leaves the inheritance fields null when no target is given', () => {
    const r = projectDrawdown(BASE);
    expect(r.inheritanceTarget).toBeNull();
    expect(r.inheritanceShortfall).toBeNull();
  });

  it('handles retiring at the end age without dividing by zero', () => {
    const r = projectDrawdown({ ...BASE, retirementAge: 90, endAge: 90 });
    expect(r.years).toHaveLength(1);
    expect(Number.isFinite(r.netMonthlyIncome)).toBe(true);
  });

  it('adds other taxable income to the tax calculation', () => {
    const withOther = projectDrawdown({ ...BASE, otherTaxableIncome: 20_000 });
    expect(withOther.grossAnnualIncome).toBeCloseTo(32_000, 2);
    expect(withOther.annualTax).toBeCloseTo(incomeTax(32_000), 2);
    expect(withOther.annualTax).toBeGreaterThan(0);
  });
});
