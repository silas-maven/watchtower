// Deterministic growth maths for the compound interest and CAGR calculators.
//
// Pure functions with no data dependency, kept out of the components so the
// numbers can be tested directly. Nothing here is advice or a projection of a
// real holding: it is arithmetic on figures the member types in.

export type CompoundContributionTiming = 'start' | 'end';

export type CompoundInput = {
  /** Starting amount. */
  principal: number;
  /** Nominal annual rate as a percentage, e.g. 7 for 7%. */
  annualRatePct: number;
  years: number;
  /** How many times a year interest is applied. */
  compoundsPerYear: number;
  /** Regular deposit, added at the contribution frequency. */
  contribution?: number;
  /** How many times a year the contribution is made. */
  contributionsPerYear?: number;
  /** Deposit at the start of each period (annuity due) or the end. */
  contributionTiming?: CompoundContributionTiming;
};

export type CompoundYearRow = {
  year: number;
  openingBalance: number;
  contributions: number;
  interest: number;
  closingBalance: number;
};

export type CompoundResult = {
  finalBalance: number;
  totalContributions: number;
  totalInterest: number;
  /** Principal plus every contribution, i.e. the money actually put in. */
  totalPaidIn: number;
  schedule: CompoundYearRow[];
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compound a balance with optional regular contributions.
 *
 * Stepped period by period rather than using a closed-form annuity formula, so
 * that a contribution frequency which does not line up with the compounding
 * frequency (monthly deposits, quarterly compounding) is still handled exactly
 * rather than approximated.
 */
export function compoundInterest(input: CompoundInput): CompoundResult {
  const {
    principal,
    annualRatePct,
    years,
    compoundsPerYear,
    contribution = 0,
    contributionsPerYear = 12,
    contributionTiming = 'end',
  } = input;

  const schedule: CompoundYearRow[] = [];
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePct) || years <= 0) {
    return { finalBalance: round2(principal || 0), totalContributions: 0, totalInterest: 0, totalPaidIn: round2(principal || 0), schedule };
  }

  const compounds = Math.max(1, Math.round(compoundsPerYear));
  const deposits = contribution > 0 ? Math.max(1, Math.round(contributionsPerYear)) : 0;

  // Work on the finest grid the two frequencies share, so each event lands on
  // its own step instead of being folded into the other's period.
  const stepsPerYear = deposits > 0 ? lcm(compounds, deposits) : compounds;
  const ratePerCompound = annualRatePct / 100 / compounds;

  let balance = principal;
  let totalContributions = 0;
  let totalInterest = 0;

  const totalSteps = Math.round(years * stepsPerYear);

  let yearOpening = balance;
  let yearContributions = 0;
  let yearInterest = 0;
  let currentYear = 1;

  for (let step = 1; step <= totalSteps; step += 1) {
    const isDepositStep = deposits > 0 && (step * deposits) % stepsPerYear === 0;
    const isCompoundStep = (step * compounds) % stepsPerYear === 0;

    if (isDepositStep && contributionTiming === 'start') {
      balance += contribution;
      totalContributions += contribution;
      yearContributions += contribution;
    }

    if (isCompoundStep) {
      const interest = balance * ratePerCompound;
      balance += interest;
      totalInterest += interest;
      yearInterest += interest;
    }

    if (isDepositStep && contributionTiming === 'end') {
      balance += contribution;
      totalContributions += contribution;
      yearContributions += contribution;
    }

    const finishedYear = step % stepsPerYear === 0;
    if (finishedYear || step === totalSteps) {
      schedule.push({
        year: currentYear,
        openingBalance: round2(yearOpening),
        contributions: round2(yearContributions),
        interest: round2(yearInterest),
        closingBalance: round2(balance),
      });
      currentYear += 1;
      yearOpening = balance;
      yearContributions = 0;
      yearInterest = 0;
    }
  }

  return {
    finalBalance: round2(balance),
    totalContributions: round2(totalContributions),
    totalInterest: round2(totalInterest),
    totalPaidIn: round2(principal + totalContributions),
    schedule,
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/**
 * Compound annual growth rate, as a percentage.
 *
 * Returns null where the maths has no meaning rather than a misleading number:
 * a zero or negative starting value, a negative ending value, or no time
 * elapsed. A CAGR from a starting value of zero is infinite, not impressive.
 */
export function cagr(beginningValue: number, endingValue: number, years: number): number | null {
  if (!Number.isFinite(beginningValue) || !Number.isFinite(endingValue) || !Number.isFinite(years)) return null;
  if (beginningValue <= 0 || endingValue < 0 || years <= 0) return null;
  return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
}

/** Total growth over the whole period, as a percentage. */
export function totalReturnPct(beginningValue: number, endingValue: number): number | null {
  if (!Number.isFinite(beginningValue) || !Number.isFinite(endingValue) || beginningValue <= 0) return null;
  return ((endingValue - beginningValue) / beginningValue) * 100;
}

/** Years needed to reach a target at a given annual growth rate. */
export function yearsToTarget(beginningValue: number, targetValue: number, annualRatePct: number): number | null {
  if (beginningValue <= 0 || targetValue <= 0 || annualRatePct <= 0) return null;
  if (targetValue <= beginningValue) return 0;
  return Math.log(targetValue / beginningValue) / Math.log(1 + annualRatePct / 100);
}
