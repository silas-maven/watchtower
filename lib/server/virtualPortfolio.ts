import { PortfolioKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchFxRates } from '@/lib/market/fx';
import { computePortfolioSummary, localToGbp, type PortfolioSummary } from '@/lib/portfolio';
import { effectiveNextBuy, effectiveSellTarget, toPlanLite } from '@/lib/spartan';
import { getDisplayContext } from '@/lib/server/displayCurrency';

export type VirtualHolding = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  currency: string;
  shares: number | null;
  averagePrice: number | null;
  currentPrice: number | null;
  costGBP: number | null;
  valueGBP: number | null;
  profitGBP: number | null;
  returnPct: number | null;
  weightPct: number | null;
  beta: number | null;
  nextBuyPrice: number | null;
  sellTarget: number | null;
  spartanEnabled: boolean;
  averagePlanId: string | null;
  hasPlan: boolean;
  signalState: string;
};

export type VirtualPortfolioView = {
  id: string;
  name: string;
  sizeGBP: number;
  declaredValueGBP: number | null;
  budgetPerStockGBP: number | null;
  minEntryGBP: number | null;
  targetHoldingsCount: number | null;
  holdings: VirtualHolding[];
  summary: PortfolioSummary;
  displayCurrency: string;
  gbpRate: number;
};

export async function getOrCreateVirtualPortfolio(profileId: string) {
  const existing = await prisma.userPortfolio.findFirst({
    where: { profileId, kind: PortfolioKind.VIRTUAL },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  return prisma.userPortfolio.create({
    data: {
      profileId,
      kind: PortfolioKind.VIRTUAL,
      name: 'Virtual Portfolio',
      // Self-input: the member sets their starting value and budgets; no demo defaults.
    },
  });
}

export async function getVirtualPortfolioView(profileId: string): Promise<VirtualPortfolioView> {
  const portfolio = await getOrCreateVirtualPortfolio(profileId);
  const [holdings, fx, display] = await Promise.all([
    prisma.userHolding.findMany({
      where: { profileId, portfolioId: portfolio.id },
      include: {
        asset: { include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } } },
        averagePlan: { include: { tranches: { orderBy: { orderIndex: 'asc' } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    fetchFxRates(),
    getDisplayContext(profileId),
  ]);

  const rows: VirtualHolding[] = holdings.map((h) => {
    const snap = h.asset.snapshots[0];
    const plan = toPlanLite(h.averagePlan);
    const currency = h.asset.currency;
    const currentPrice = snap?.currentPrice ?? null;
    const shares = h.shares ?? null;
    const avg = h.averagePrice ?? null;

    const costGBP = shares != null && avg != null ? localToGbp(shares * avg, currency, fx) : null;
    const valueGBP = shares != null && currentPrice != null ? localToGbp(shares * currentPrice, currency, fx) : null;
    const profitGBP = costGBP != null && valueGBP != null ? valueGBP - costGBP : null;
    const returnPct = costGBP && valueGBP != null ? (valueGBP / costGBP - 1) * 100 : null;

    return {
      id: h.id,
      assetId: h.assetId,
      symbol: h.asset.symbol,
      name: h.asset.name,
      currency,
      shares,
      averagePrice: avg,
      currentPrice,
      costGBP,
      valueGBP,
      profitGBP,
      returnPct,
      weightPct: null,
      beta: snap?.beta ?? h.asset.beta ?? null,
      nextBuyPrice: effectiveNextBuy(h, plan),
      sellTarget: effectiveSellTarget(h, plan),
      spartanEnabled: h.spartanEnabled,
      averagePlanId: h.averagePlanId,
      hasPlan: plan != null,
      signalState: snap?.signalState ?? 'NONE',
    };
  });

  const invested = rows.reduce((acc, r) => acc + (r.costGBP ?? 0), 0);
  const sizeGBP = portfolio.declaredValueGBP ?? invested;
  const summary = computePortfolioSummary(
    rows.map((r) => ({ costGBP: r.costGBP, valueGBP: r.valueGBP, beta: r.beta })),
    sizeGBP,
  );

  // Weight % uses (holdings value + cash) as the denominator, cash as its own slice.
  const denom = summary.valueGBP + summary.cashGBP;
  for (const r of rows) {
    r.weightPct = r.valueGBP != null && denom > 0 ? (r.valueGBP / denom) * 100 : null;
  }

  return {
    id: portfolio.id,
    name: portfolio.name,
    sizeGBP,
    declaredValueGBP: portfolio.declaredValueGBP,
    budgetPerStockGBP: portfolio.budgetPerStockGBP,
    minEntryGBP: portfolio.minEntryGBP,
    targetHoldingsCount: portfolio.targetHoldingsCount,
    holdings: rows,
    summary,
    displayCurrency: display.currency,
    gbpRate: display.gbpRate,
  };
}
