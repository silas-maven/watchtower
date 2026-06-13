import { PortfolioKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchFxRates } from '@/lib/market/fx';
import { computePortfolioSummary, localToGbp, type PortfolioSummary } from '@/lib/portfolio';
import { getDisplayContext } from '@/lib/server/displayCurrency';

const DEFAULT_VIRTUAL_SIZE_GBP = 5000;

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
  signalState: string;
};

export type VirtualPortfolioView = {
  id: string;
  name: string;
  sizeGBP: number;
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
      declaredValueGBP: DEFAULT_VIRTUAL_SIZE_GBP,
      budgetPerStockGBP: 1000,
      minEntryGBP: 300,
      targetHoldingsCount: 5,
    },
  });
}

export async function getVirtualPortfolioView(profileId: string): Promise<VirtualPortfolioView> {
  const portfolio = await getOrCreateVirtualPortfolio(profileId);
  const [holdings, fx, display] = await Promise.all([
    prisma.userHolding.findMany({
      where: { profileId, portfolioId: portfolio.id },
      include: {
        asset: {
          include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    fetchFxRates(),
    getDisplayContext(profileId),
  ]);

  const rows: VirtualHolding[] = holdings.map((h) => {
    const snap = h.asset.snapshots[0];
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
      signalState: snap?.signalState ?? 'NONE',
    };
  });

  const sizeGBP = portfolio.declaredValueGBP ?? DEFAULT_VIRTUAL_SIZE_GBP;
  const summary = computePortfolioSummary(
    rows.map((r) => ({ costGBP: r.costGBP, valueGBP: r.valueGBP, beta: null })),
    sizeGBP,
  );

  return {
    id: portfolio.id,
    name: portfolio.name,
    sizeGBP,
    budgetPerStockGBP: portfolio.budgetPerStockGBP,
    minEntryGBP: portfolio.minEntryGBP,
    targetHoldingsCount: portfolio.targetHoldingsCount,
    holdings: rows,
    summary,
    displayCurrency: display.currency,
    gbpRate: display.gbpRate,
  };
}
