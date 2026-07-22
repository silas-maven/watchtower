// Deterministic Monte Carlo scenario analysis over a member's personal
// finances (the "CFO check-up"). Same house rule as the portfolio stress test:
// every number is computed here under documented assumptions with a seeded
// PRNG; the AI layer only narrates.

export type DebtInput = { name: string; balance: number; aprPct: number };

export type FinanceInputs = {
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  investments: number;
  pension: number;
  debts: DebtInput[];
  homeValue: number | null;
  monthlyInvesting: number;
  goalTargetAmount: number | null; // optional structured goal
  goalTargetAge: number | null;
};

export type FinanceResult = {
  emergencyMonths: number;
  savingRatePct: number;
  totalDebt: number;
  weightedDebtAprPct: number | null;
  probNeverRunOut: number;
  probRetireBy60: number; // wealth >= 25x annual expenses by age 60 (4% rule)
  probGoal: number | null; // structured goal, when provided
  medianFiAge: number | null; // median age reaching 25x expenses; null if rarely reached
  wealthAt60PercentilesGBP: { p10: number; p50: number; p90: number };
  paths: number;
  horizonYears: number;
  assumptions: {
    inflationPct: number;
    salaryGrowthPct: number;
    investmentReturnPct: number;
    investmentVolPct: number;
    shockChancePerMonthPct: number;
  };
};

// Documented assumptions (annual unless stated).
const INFLATION = 0.025;
const SALARY_GROWTH = 0.03;
const INVEST_RETURN = 0.065;
const INVEST_VOL = 0.12;
const CASH_RETURN = 0.02;
const SHOCK_CHANCE = 0.02; // per month
const SHOCK_COST_MULTIPLE = 2; // x monthly expenses when a shock hits
const FI_MULTIPLE = 25; // 4% rule
const PATHS = 2000;
const SEED = 1337;
const END_AGE = 90;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

export function runFinanceSimulation(inputs: FinanceInputs): FinanceResult {
  const horizonYears = Math.max(5, Math.min(END_AGE - inputs.age, 45));
  const months = horizonYears * 12;
  const rand = mulberry32(SEED);

  const totalDebt = inputs.debts.reduce((s, d) => s + Math.max(0, d.balance), 0);
  const weightedApr =
    totalDebt > 0 ? inputs.debts.reduce((s, d) => s + Math.max(0, d.balance) * d.aprPct, 0) / totalDebt : null;

  const emergencyMonths = inputs.monthlyExpenses > 0 ? inputs.savings / inputs.monthlyExpenses : Infinity;
  const savingRatePct =
    inputs.monthlyIncome > 0
      ? ((inputs.monthlyIncome - inputs.monthlyExpenses) / inputs.monthlyIncome) * 100
      : 0;

  const wealthAt60: number[] = [];
  const fiAges: number[] = [];
  let neverRanOut = 0;
  let retiredBy60 = 0;
  let goalMet = 0;
  const hasGoal = inputs.goalTargetAmount != null && inputs.goalTargetAmount > 0;
  const goalAge = inputs.goalTargetAge ?? 60;

  for (let p = 0; p < PATHS; p += 1) {
    let cash = inputs.savings;
    let invested = inputs.investments + inputs.pension;
    let income = inputs.monthlyIncome;
    let expenses = inputs.monthlyExpenses;
    let debt = totalDebt;
    const apr = (weightedApr ?? 0) / 100;
    let ranOut = false;
    let fiAge: number | null = null;
    let w60: number | null = null;
    let goalHitThisPath = false;

    for (let m = 1; m <= months; m += 1) {
      const age = inputs.age + m / 12;

      // Monthly investment return (lognormal around the assumed drift).
      const r = INVEST_RETURN / 12 - (INVEST_VOL * INVEST_VOL) / 24 + (INVEST_VOL / Math.sqrt(12)) * gaussian(rand);
      invested *= Math.exp(r);
      cash *= 1 + CASH_RETURN / 12;

      // Debt: interest accrues; repay interest plus 2% of the balance monthly.
      let debtPayment = 0;
      if (debt > 0) {
        const interest = debt * (apr / 12);
        debtPayment = interest + debt * 0.02;
        debt = Math.max(0, debt + interest - debtPayment);
      }

      // Cash flow for the month.
      let flow = income - expenses - debtPayment - inputs.monthlyInvesting;
      invested += inputs.monthlyInvesting;
      if (rand() < SHOCK_CHANCE) flow -= expenses * SHOCK_COST_MULTIPLE;
      cash += flow;

      // Cover cash shortfalls from investments; if both are empty, we ran out.
      if (cash < 0 && invested > 0) {
        const cover = Math.min(invested, -cash);
        invested -= cover;
        cash += cover;
      }
      if (cash < 0 && invested <= 0) ranOut = true;

      // Annual drift on income and expenses.
      if (m % 12 === 0) {
        income *= 1 + SALARY_GROWTH;
        expenses *= 1 + INFLATION;
      }

      const netWealth = cash + invested - debt;
      if (fiAge == null && netWealth >= expenses * 12 * FI_MULTIPLE) fiAge = age;
      if (w60 == null && age >= 60) w60 = netWealth;
      if (hasGoal && !goalHitThisPath && age <= goalAge && netWealth >= (inputs.goalTargetAmount ?? 0)) {
        goalHitThisPath = true;
      }
    }

    if (!ranOut) neverRanOut += 1;
    if (fiAge != null) fiAges.push(fiAge);
    if (fiAge != null && fiAge <= 60) retiredBy60 += 1;
    if (goalHitThisPath) goalMet += 1;
    wealthAt60.push(w60 ?? cash + invested - debt);
  }

  wealthAt60.sort((a, b) => a - b);
  fiAges.sort((a, b) => a - b);

  return {
    emergencyMonths: Number.isFinite(emergencyMonths) ? Math.round(emergencyMonths * 10) / 10 : 999,
    savingRatePct: Math.round(savingRatePct * 10) / 10,
    totalDebt,
    weightedDebtAprPct: weightedApr == null ? null : Math.round(weightedApr * 10) / 10,
    probNeverRunOut: neverRanOut / PATHS,
    probRetireBy60: retiredBy60 / PATHS,
    probGoal: hasGoal ? goalMet / PATHS : null,
    medianFiAge: fiAges.length >= PATHS / 10 ? Math.round(percentile(fiAges, 50) * 10) / 10 : null,
    wealthAt60PercentilesGBP: {
      p10: percentile(wealthAt60, 10),
      p50: percentile(wealthAt60, 50),
      p90: percentile(wealthAt60, 90),
    },
    paths: PATHS,
    horizonYears,
    assumptions: {
      inflationPct: INFLATION * 100,
      salaryGrowthPct: SALARY_GROWTH * 100,
      investmentReturnPct: INVEST_RETURN * 100,
      investmentVolPct: INVEST_VOL * 100,
      shockChancePerMonthPct: SHOCK_CHANCE * 100,
    },
  };
}
