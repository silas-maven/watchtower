// Deterministic Monte Carlo stress test over a member's portfolio.
// House rule: all numbers here are computed deterministically (seeded PRNG);
// the AI layer only narrates the results in plain English.
//
// Model: portfolio-level geometric Brownian motion with monthly steps.
// Expected return per holding via CAPM (rf + beta * equity risk premium);
// portfolio volatility combines the beta-driven systematic component with
// weight-scaled idiosyncratic vol. Assumptions are documented constants below,
// not model output.

export type StressHolding = {
  symbol: string;
  valueGBP: number;
  beta: number | null;
  currency: string;
};

export type StressInputs = {
  holdings: StressHolding[];
  cashGBP: number;
  targetValueGBP: number | null;
  horizonYears: number;
};

export type StressResult = {
  startValueGBP: number;
  horizonYears: number;
  paths: number;
  probMeetingGoal: number | null; // null when no goal was given
  finalValuePercentilesGBP: { p5: number; p25: number; p50: number; p75: number; p95: number };
  maxDrawdownPct: { median: number; p90: number };
  annualisedAssumptions: { expectedReturnPct: number; volatilityPct: number; riskFreePct: number };
  concentration: {
    topHolding: { symbol: string; weightPct: number } | null;
    topCurrency: { currency: string; weightPct: number } | null;
    cashWeightPct: number;
    portfolioBeta: number;
    holdingsCount: number;
  };
};

// Documented capital-market assumptions (annual).
const RISK_FREE = 0.02;
const EQUITY_PREMIUM = 0.05;
const MARKET_VOL = 0.15;
const IDIO_VOL = 0.2;
const DEFAULT_BETA = 1;
const PATHS = 2000;
const SEED = 42;

// mulberry32: small deterministic PRNG so the same portfolio always produces
// the same stress result.
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

function gaussianPair(rand: () => number): [number, number] {
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const r = Math.sqrt(-2 * Math.log(u));
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

export function runStressTest(inputs: StressInputs): StressResult {
  const holdings = inputs.holdings.filter((h) => h.valueGBP > 0);
  const holdingsValue = holdings.reduce((s, h) => s + h.valueGBP, 0);
  const cash = Math.max(0, inputs.cashGBP);
  const total = holdingsValue + cash;
  const horizonYears = Math.max(1, Math.min(40, inputs.horizonYears));

  const weights = holdings.map((h) => (holdingsValue > 0 ? h.valueGBP / total : 0));
  const betas = holdings.map((h) => h.beta ?? DEFAULT_BETA);
  const portfolioBeta = weights.reduce((s, w, i) => s + w * betas[i], 0);
  const cashWeight = total > 0 ? cash / total : 0;

  // Annual expected return: CAPM on the invested slice, risk-free on cash.
  const mu = RISK_FREE * cashWeight + weights.reduce((s, w, i) => s + w * (RISK_FREE + betas[i] * EQUITY_PREMIUM), 0);
  // Annual vol: systematic (beta-weighted) + independent idiosyncratic terms.
  const systematic = portfolioBeta * MARKET_VOL;
  const idio = Math.sqrt(weights.reduce((s, w) => s + w * w * IDIO_VOL * IDIO_VOL, 0));
  const vol = Math.sqrt(systematic * systematic + idio * idio);

  const months = Math.round(horizonYears * 12);
  const muM = mu / 12;
  const volM = vol / Math.sqrt(12);
  const rand = mulberry32(SEED);

  const finals: number[] = [];
  const drawdowns: number[] = [];
  let met = 0;
  const goal = inputs.targetValueGBP;

  for (let p = 0; p < PATHS; p += 1) {
    let value = total;
    let peak = total;
    let maxDd = 0;
    for (let m = 0; m < months; m += 2) {
      const [z1, z2] = gaussianPair(rand);
      for (const z of m + 1 < months ? [z1, z2] : [z1]) {
        value *= Math.exp(muM - (volM * volM) / 2 + volM * z);
        if (value > peak) peak = value;
        const dd = peak > 0 ? (peak - value) / peak : 0;
        if (dd > maxDd) maxDd = dd;
      }
    }
    finals.push(value);
    drawdowns.push(maxDd);
    if (goal != null && value >= goal) met += 1;
  }

  finals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);

  const byCurrency = new Map<string, number>();
  for (const h of holdings) {
    const c = h.currency.toUpperCase() === 'GBX' ? 'GBP' : h.currency.toUpperCase();
    byCurrency.set(c, (byCurrency.get(c) ?? 0) + h.valueGBP);
  }
  const topCurrencyEntry = [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topHoldingEntry = holdings.length
    ? holdings.reduce((best, h) => (h.valueGBP > best.valueGBP ? h : best))
    : null;

  return {
    startValueGBP: total,
    horizonYears,
    paths: PATHS,
    probMeetingGoal: goal != null && goal > 0 ? met / PATHS : null,
    finalValuePercentilesGBP: {
      p5: percentile(finals, 5),
      p25: percentile(finals, 25),
      p50: percentile(finals, 50),
      p75: percentile(finals, 75),
      p95: percentile(finals, 95),
    },
    maxDrawdownPct: {
      median: percentile(drawdowns, 50) * 100,
      p90: percentile(drawdowns, 90) * 100,
    },
    annualisedAssumptions: {
      expectedReturnPct: mu * 100,
      volatilityPct: vol * 100,
      riskFreePct: RISK_FREE * 100,
    },
    concentration: {
      topHolding: topHoldingEntry ? { symbol: topHoldingEntry.symbol, weightPct: (topHoldingEntry.valueGBP / total) * 100 } : null,
      topCurrency: topCurrencyEntry ? { currency: topCurrencyEntry[0], weightPct: (topCurrencyEntry[1] / total) * 100 } : null,
      cashWeightPct: cashWeight * 100,
      portfolioBeta,
      holdingsCount: holdings.length,
    },
  };
}
