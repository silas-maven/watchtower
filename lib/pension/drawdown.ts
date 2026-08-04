// UK pension drawdown projection.
//
// Pure arithmetic, no data dependency, so the numbers can be tested directly
// against published HMRC examples rather than eyeballed in a chart. Same shape as
// lib/growth.ts and lib/stressTest.ts: the deterministic layer computes, the UI
// renders, and nothing in here knows about React or Prisma.
//
// Every rate and allowance comes from lib/pension/config.ts. Nothing tax-related
// is hardcoded below, because these figures change every April and a constant
// buried in a loop is how a calculator quietly goes stale.

import {
  INCOME_TAX_BANDS,
  LUMP_SUM_ALLOWANCE,
  MAX_TAX_FREE_CASH_PCT,
  PERSONAL_ALLOWANCE,
  PERSONAL_ALLOWANCE_TAPER_RATE,
  PERSONAL_ALLOWANCE_TAPER_THRESHOLD,
  WITHDRAWAL_STRATEGIES,
  type StrategyKey,
} from '@/lib/pension/config';

export type WithdrawalStrategy =
  | { kind: 'preset'; preset: StrategyKey }
  /** A fixed cash amount each year. */
  | { kind: 'amount'; annualAmount: number }
  /** A percentage of the STARTING drawdown fund, taken each year. */
  | { kind: 'percent'; annualPct: number };

export type TaxFreeCashChoice =
  | { kind: 'none' }
  | { kind: 'max' }
  | { kind: 'percent'; pct: number }
  | { kind: 'amount'; amount: number };

export type DrawdownInput = {
  currentAge: number;
  retirementAge: number;
  potValue: number;
  taxFreeCash: TaxFreeCashChoice;
  growthPct: number;
  feesPct: number;
  inflationPct: number;
  endAge: number;
  statePensionAnnual: number;
  statePensionAge: number;
  otherTaxableIncome: number;
  withdrawal: WithdrawalStrategy;
  targetInheritance?: number;
  /** Lump Sum Allowance already used by earlier pensions. */
  lumpSumAllowanceUsed?: number;
};

export type DrawdownYear = {
  age: number;
  /** Fund at the start of the year, before growth. */
  openingFund: number;
  growth: number;
  fees: number;
  /** What actually came out. Less than the target if the fund ran short. */
  withdrawal: number;
  statePension: number;
  otherIncome: number;
  grossIncome: number;
  tax: number;
  netIncome: number;
  closingFund: number;
  /** Closing fund expressed in today's money. */
  closingFundReal: number;
};

export type DrawdownResult = {
  taxFreeCash: number;
  /** Tax-free cash the member asked for but could not have, and why. */
  taxFreeCashCappedBy: 'none' | 'twenty-five-percent' | 'lump-sum-allowance';
  drawdownFund: number;
  /** Year one figures, which is what the headline results show. */
  grossAnnualIncome: number;
  netAnnualIncome: number;
  netMonthlyIncome: number;
  annualTax: number;
  /** Age the fund is exhausted, or null if it lasts past endAge. */
  fundExhaustedAtAge: number | null;
  /** Age the projection ran to. */
  projectedToAge: number;
  remainingFund: number;
  remainingFundReal: number;
  /** Set when a target inheritance was supplied. */
  inheritanceTarget: number | null;
  inheritanceShortfall: number | null;
  years: DrawdownYear[];
};

/** Personal allowance after the taper for high earners. */
export function personalAllowanceFor(totalIncome: number): number {
  if (totalIncome <= PERSONAL_ALLOWANCE_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  const excess = totalIncome - PERSONAL_ALLOWANCE_TAPER_THRESHOLD;
  return Math.max(0, PERSONAL_ALLOWANCE - excess / PERSONAL_ALLOWANCE_TAPER_RATE);
}

/**
 * Income tax on a total annual income.
 *
 * The allowance is taken off first, then the bands are applied to what remains.
 * The band bounds in config are on TAXABLE income for that reason: the familiar
 * £50,270 higher-rate threshold is a total-income figure that only holds while
 * the allowance is untouched, and it slides down as the allowance tapers.
 * Modelling it the other way under-taxes six-figure incomes and flattens the 60%
 * taper zone; both are covered by tests against published figures.
 */
export function incomeTax(totalIncome: number): number {
  if (totalIncome <= 0) return 0;
  const allowance = personalAllowanceFor(totalIncome);
  const taxable = Math.max(0, totalIncome - allowance);

  let tax = 0;
  let lowerBound = 0;

  for (const band of INCOME_TAX_BANDS) {
    const upper = band.upperBound ?? Infinity;
    if (taxable <= lowerBound) break;
    const inBand = Math.min(taxable, upper) - lowerBound;
    if (inBand > 0) tax += inBand * (band.ratePct / 100);
    lowerBound = upper;
  }

  return tax;
}

/** Tax-free cash, capped at 25% of the pot and at the remaining allowance. */
export function computeTaxFreeCash(
  potValue: number,
  choice: TaxFreeCashChoice,
  allowanceUsed = 0,
): { amount: number; cappedBy: DrawdownResult['taxFreeCashCappedBy'] } {
  const requested =
    choice.kind === 'none'
      ? 0
      : choice.kind === 'max'
        ? potValue * (MAX_TAX_FREE_CASH_PCT / 100)
        : choice.kind === 'percent'
          ? potValue * (choice.pct / 100)
          : choice.amount;

  const quarterCap = potValue * (MAX_TAX_FREE_CASH_PCT / 100);
  const allowanceCap = Math.max(0, LUMP_SUM_ALLOWANCE - allowanceUsed);

  const amount = Math.max(0, Math.min(requested, quarterCap, allowanceCap));
  const cappedBy =
    amount < requested - 0.005
      ? allowanceCap < quarterCap
        ? 'lump-sum-allowance'
        : 'twenty-five-percent'
      : 'none';

  return { amount, cappedBy };
}

/** The target annual withdrawal, before the fund is checked for whether it can pay it. */
function targetWithdrawal(strategy: WithdrawalStrategy, drawdownFund: number): number {
  switch (strategy.kind) {
    case 'preset':
      return drawdownFund * (WITHDRAWAL_STRATEGIES[strategy.preset].pct / 100);
    case 'percent':
      return drawdownFund * (strategy.annualPct / 100);
    case 'amount':
      return strategy.annualAmount;
  }
}

/**
 * Project a pension from retirement to the end age.
 *
 * Order of operations inside each year matters and follows the spec: growth is
 * applied, then fees are deducted, then the withdrawal is taken. Taking the
 * withdrawal first would flatter the projection by leaving less invested for a
 * shorter time; taking fees on the post-withdrawal balance would understate
 * them. Neither is wrong in the abstract, but they give different answers, so
 * the order is fixed here and stated in the UI assumptions.
 */
export function projectDrawdown(input: DrawdownInput): DrawdownResult {
  const {
    retirementAge,
    potValue,
    growthPct,
    feesPct,
    inflationPct,
    endAge,
    statePensionAnnual,
    statePensionAge,
    otherTaxableIncome,
    withdrawal,
    targetInheritance,
    lumpSumAllowanceUsed = 0,
  } = input;

  const cash = computeTaxFreeCash(potValue, input.taxFreeCash, lumpSumAllowanceUsed);
  const drawdownFund = Math.max(0, potValue - cash.amount);
  const target = Math.max(0, targetWithdrawal(withdrawal, drawdownFund));

  const years: DrawdownYear[] = [];
  let fund = drawdownFund;
  let exhaustedAt: number | null = null;

  const lastAge = Math.max(retirementAge, endAge);

  for (let age = retirementAge; age <= lastAge; age++) {
    const openingFund = fund;

    const growth = openingFund * (growthPct / 100);
    const afterGrowth = openingFund + growth;
    const fees = afterGrowth * (feesPct / 100);
    const available = Math.max(0, afterGrowth - fees);

    // Never withdraw more than is there. A projection that lets the fund go
    // negative is not modelling anything real.
    const taken = Math.min(target, available);
    const closingFund = available - taken;

    const statePension = age >= statePensionAge ? statePensionAnnual : 0;
    const grossIncome = taken + statePension + otherTaxableIncome;
    const tax = incomeTax(grossIncome);

    // Year 0 of the projection is retirement, so discount from there.
    const yearsFromNow = age - retirementAge;
    const deflator = Math.pow(1 + inflationPct / 100, yearsFromNow);

    years.push({
      age,
      openingFund,
      growth,
      fees,
      withdrawal: taken,
      statePension,
      otherIncome: otherTaxableIncome,
      grossIncome,
      tax,
      netIncome: grossIncome - tax,
      closingFund,
      closingFundReal: deflator === 0 ? closingFund : closingFund / deflator,
    });

    fund = closingFund;

    // Exhausted means it could not pay the target in full and there is nothing
    // left, not merely that it hit zero at the end of the final year.
    if (exhaustedAt == null && closingFund <= 0 && taken < target - 0.005) {
      exhaustedAt = age;
    }
  }

  const first = years[0];
  const last = years[years.length - 1];

  const remainingFund = last?.closingFund ?? drawdownFund;
  const inheritanceTarget = targetInheritance != null && targetInheritance > 0 ? targetInheritance : null;

  return {
    taxFreeCash: cash.amount,
    taxFreeCashCappedBy: cash.cappedBy,
    drawdownFund,
    grossAnnualIncome: first?.grossIncome ?? 0,
    netAnnualIncome: first?.netIncome ?? 0,
    netMonthlyIncome: (first?.netIncome ?? 0) / 12,
    annualTax: first?.tax ?? 0,
    fundExhaustedAtAge: exhaustedAt,
    projectedToAge: last?.age ?? retirementAge,
    remainingFund,
    remainingFundReal: last?.closingFundReal ?? remainingFund,
    inheritanceTarget,
    inheritanceShortfall:
      inheritanceTarget == null ? null : Math.max(0, inheritanceTarget - remainingFund),
    years,
  };
}
