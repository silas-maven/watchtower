// Portfolio-level maths ported from the Portfolio Blotter workbook.
// - Live Portfolio summary row (invested, value, profit, return, cash,
//   liquidation, portfolio beta).
// - Average Price Calculator tabs (staged tranches with halving defaults,
//   GBX/USD/EUR/CAD handling).

export type FxRates = { USD: number; EUR: number; CAD?: number };

function rateFor(currency: string, fx: FxRates): number | null {
  const ccy = currency.toUpperCase();
  if (ccy === 'USD') return fx.USD;
  if (ccy === 'EUR') return fx.EUR;
  if (ccy === 'CAD') return fx.CAD ?? null;
  return null;
}

/** Convert a GBP amount into the asset's quote currency (pence for GBX). */
export function gbpToLocal(amountGBP: number, currency: string, fx: FxRates): number | null {
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return amountGBP;
  if (ccy === 'GBX') return amountGBP * 100;
  const rate = rateFor(ccy, fx);
  return rate == null ? null : amountGBP * rate;
}

/** Convert a quote-currency amount back into GBP (pence for GBX). */
export function localToGbp(amountLocal: number, currency: string, fx: FxRates): number | null {
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return amountLocal;
  if (ccy === 'GBX') return amountLocal / 100;
  const rate = rateFor(ccy, fx);
  return rate == null ? null : amountLocal / rate;
}

export type PortfolioPosition = {
  costGBP: number | null;
  valueGBP: number | null;
  beta: number | null;
};

export type PortfolioSummary = {
  portfolioSizeGBP: number;
  investedGBP: number;
  valueGBP: number;
  profitGBP: number;
  returnPct: number;
  cashGBP: number;
  liquidationValueGBP: number;
  portfolioBeta: number | null;
};

export function computePortfolioSummary(positions: PortfolioPosition[], portfolioSizeGBP: number): PortfolioSummary {
  const investedGBP = positions.reduce((acc, p) => acc + (p.costGBP ?? 0), 0);
  const valueGBP = positions.reduce((acc, p) => acc + (p.valueGBP ?? 0), 0);
  const profitGBP = valueGBP - investedGBP;
  const cashGBP = portfolioSizeGBP - investedGBP;
  const liquidationValueGBP = portfolioSizeGBP + profitGBP;
  const returnPct = portfolioSizeGBP > 0 ? (profitGBP / portfolioSizeGBP) * 100 : 0;

  // Beta weighted by each position's share of liquidation value, matching the
  // workbook's SUMPRODUCT(weight, beta) over positions that report a beta.
  let weightedBeta = 0;
  let betaWeight = 0;
  for (const p of positions) {
    if (p.beta == null || p.valueGBP == null || liquidationValueGBP <= 0) continue;
    const weight = p.valueGBP / liquidationValueGBP;
    weightedBeta += weight * p.beta;
    betaWeight += weight;
  }

  return {
    portfolioSizeGBP,
    investedGBP,
    valueGBP,
    profitGBP,
    returnPct,
    cashGBP,
    liquidationValueGBP,
    portfolioBeta: betaWeight > 0 ? weightedBeta : null,
  };
}

export type AveragingTranche = { budgetGBP: number; targetPrice: number };

export type AveragingResult = {
  rows: Array<{ budgetGBP: number; targetPrice: number; shares: number; costGBP: number }>;
  totalShares: number;
  totalCostGBP: number;
  averagePrice: number | null; // in the asset's quote currency
};

/**
 * Stage a budget across price tranches and derive the blended average entry.
 * Shares per tranche = round(localBudget / targetPrice), matching the workbook's
 * round(G7/D7, 0). Prices are in the asset's quote currency; budgets are GBP.
 */
export function computeAveragingPlan(tranches: AveragingTranche[], currency: string, fx: FxRates): AveragingResult {
  const rows = tranches
    .filter((t) => t.budgetGBP > 0 && t.targetPrice > 0)
    .map((t) => {
      const localBudget = gbpToLocal(t.budgetGBP, currency, fx) ?? 0;
      const shares = Math.round(localBudget / t.targetPrice);
      const costLocal = shares * t.targetPrice;
      const costGBP = localToGbp(costLocal, currency, fx) ?? 0;
      return { budgetGBP: t.budgetGBP, targetPrice: t.targetPrice, shares, costGBP };
    });

  const totalShares = rows.reduce((acc, r) => acc + r.shares, 0);
  const totalCostGBP = rows.reduce((acc, r) => acc + r.costGBP, 0);
  const totalCostLocal = gbpToLocal(totalCostGBP, currency, fx);
  const averagePrice = totalShares > 0 && totalCostLocal != null ? totalCostLocal / totalShares : null;

  return { rows, totalShares, totalCostGBP, averagePrice };
}

/** Halving ladder used as the workbook's default tranche split (D8 = D7 * 0.5). */
export function halvingBudgets(totalBudgetGBP: number, tranches = 4): number[] {
  const out: number[] = [];
  let remaining = totalBudgetGBP;
  for (let i = 0; i < tranches; i += 1) {
    if (i === tranches - 1) {
      out.push(Math.max(remaining, 0));
    } else {
      const half = remaining / 2;
      out.push(half);
      remaining -= half;
    }
  }
  return out;
}
