// Deterministic financial-health scoring for the trade pitch. House rule: the
// score is computed here from real fundamentals; the AI only narrates it. Each
// dimension gets a red/amber/green rating from documented thresholds, and the
// overall band is the aggregate. This is educational analysis, not advice.

export type Rating = 'green' | 'amber' | 'red';

export type HealthFundamentals = {
  profitMargin: number | null; // 0.11 = 11%
  returnOnEquity: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  ebitda: number | null;
  debtToEquity: number | null; // plain ratio, e.g. 0.41
  quickRatio: number | null;
  currentRatio: number | null;
};

export type HealthDimension = {
  key: 'profitability' | 'growth' | 'leverage' | 'liquidity' | 'cashGeneration' | 'bankruptcyRisk';
  label: string;
  rating: Rating;
  detail: string;
};

export type HealthScore = {
  overall: Rating;
  score: number; // 0-100
  dimensions: HealthDimension[];
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const RATING_POINTS: Record<Rating, number> = { green: 100, amber: 55, red: 15 };

function rate(value: number | null, greenAtOrAbove: number, amberAtOrAbove: number): Rating | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= greenAtOrAbove) return 'green';
  if (value >= amberAtOrAbove) return 'amber';
  return 'red';
}

// D/E and debt/EBITDA are "lower is better", so invert the comparison.
function rateInverse(value: number | null, greenAtOrBelow: number, amberAtOrBelow: number): Rating | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value <= greenAtOrBelow) return 'green';
  if (value <= amberAtOrBelow) return 'amber';
  return 'red';
}

export function scoreFinancialHealth(f: HealthFundamentals): HealthScore {
  const dims: HealthDimension[] = [];

  // Profitability: net margin + ROE.
  {
    const marginR = rate(f.profitMargin, 0.1, 0);
    const roeR = rate(f.returnOnEquity, 0.15, 0.05);
    const rating = worst(marginR, roeR);
    if (rating) {
      dims.push({
        key: 'profitability',
        label: 'Profitability',
        rating,
        detail: `Net margin ${f.profitMargin == null ? 'n/a' : pct(f.profitMargin)}, ROE ${f.returnOnEquity == null ? 'n/a' : pct(f.returnOnEquity)}.`,
      });
    }
  }

  // Growth: revenue + earnings growth.
  {
    const revR = rate(f.revenueGrowth, 0.08, 0);
    const earnR = rate(f.earningsGrowth, 0.05, -0.1);
    const rating = worst(revR, earnR);
    if (rating) {
      dims.push({
        key: 'growth',
        label: 'Growth',
        rating,
        detail: `Revenue growth ${f.revenueGrowth == null ? 'n/a' : pct(f.revenueGrowth)}, earnings growth ${f.earningsGrowth == null ? 'n/a' : pct(f.earningsGrowth)}.`,
      });
    }
  }

  // Leverage: D/E plus net-debt/EBITDA.
  {
    const deR = rateInverse(f.debtToEquity, 1, 2);
    const netDebt = f.totalDebt != null && f.totalCash != null ? f.totalDebt - f.totalCash : null;
    const ndEbitda = netDebt != null && f.ebitda != null && f.ebitda > 0 ? netDebt / f.ebitda : null;
    const ndR = rateInverse(ndEbitda, 2, 4);
    const rating = worst(deR, ndR);
    if (rating) {
      dims.push({
        key: 'leverage',
        label: 'Leverage',
        rating,
        detail: `Debt/equity ${f.debtToEquity == null ? 'n/a' : f.debtToEquity.toFixed(2)}${ndEbitda != null ? `, net debt/EBITDA ${ndEbitda.toFixed(1)}x` : ''}.`,
      });
    }
  }

  // Liquidity: current + quick ratio.
  {
    const currR = rate(f.currentRatio, 1.5, 1);
    const quickR = rate(f.quickRatio, 1, 0.7);
    const rating = worst(currR, quickR);
    if (rating) {
      dims.push({
        key: 'liquidity',
        label: 'Liquidity',
        rating,
        detail: `Current ratio ${f.currentRatio == null ? 'n/a' : f.currentRatio.toFixed(2)}, quick ratio ${f.quickRatio == null ? 'n/a' : f.quickRatio.toFixed(2)}.`,
      });
    }
  }

  // Cash generation: free cash flow.
  {
    const rating: Rating | null =
      f.freeCashflow == null ? null : f.freeCashflow > 0 ? 'green' : f.operatingCashflow != null && f.operatingCashflow > 0 ? 'amber' : 'red';
    if (rating) {
      dims.push({
        key: 'cashGeneration',
        label: 'Cash generation',
        rating,
        detail: `Free cash flow ${f.freeCashflow == null ? 'n/a' : money(f.freeCashflow)}${f.operatingCashflow != null ? `, operating cash flow ${money(f.operatingCashflow)}` : ''}.`,
      });
    }
  }

  // Bankruptcy risk: red flags = negative margins, negative FCF, heavy leverage,
  // thin liquidity. Two or more together signals genuine distress.
  {
    const flags = [
      f.profitMargin != null && f.profitMargin < 0,
      f.freeCashflow != null && f.freeCashflow < 0,
      f.debtToEquity != null && f.debtToEquity > 2,
      f.currentRatio != null && f.currentRatio < 1,
    ].filter(Boolean).length;
    const rating: Rating = flags >= 2 ? 'red' : flags === 1 ? 'amber' : 'green';
    dims.push({
      key: 'bankruptcyRisk',
      label: 'Bankruptcy risk',
      rating,
      detail:
        flags === 0
          ? 'No major distress flags (positive margins and cash flow, contained leverage).'
          : `${flags} distress flag${flags === 1 ? '' : 's'} present (e.g. negative margin or cash flow, high leverage, or thin liquidity).`,
    });
  }

  // Profitability, cash generation and distress risk carry more weight, so a
  // loss-making, cash-burning company cannot be rescued by strong growth alone.
  const totalWeight = dims.reduce((s, d) => s + DIMENSION_WEIGHT[d.key], 0);
  const score = totalWeight
    ? Math.round(dims.reduce((s, d) => s + RATING_POINTS[d.rating] * DIMENSION_WEIGHT[d.key], 0) / totalWeight)
    : 0;
  const overall: Rating = score >= 70 ? 'green' : score >= 45 ? 'amber' : 'red';
  return { overall, score, dimensions: dims };
}

const DIMENSION_WEIGHT: Record<HealthDimension['key'], number> = {
  profitability: 1.5,
  cashGeneration: 1.25,
  bankruptcyRisk: 1.5,
  leverage: 1,
  liquidity: 1,
  growth: 0.75,
};

function worst(...ratings: Array<Rating | null>): Rating | null {
  const present = ratings.filter((r): r is Rating => r != null);
  if (present.length === 0) return null;
  if (present.includes('red')) return 'red';
  if (present.includes('amber')) return 'amber';
  return 'green';
}

function money(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}bn`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}m`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export const RATING_LABEL: Record<Rating, string> = { green: 'Strong', amber: 'Mixed', red: 'Weak' };
