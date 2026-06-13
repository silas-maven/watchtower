import { prisma } from '@/lib/prisma';
import { fetchFxRates } from '@/lib/market/fx';
import { computePortfolioSummary, localToGbp, type PortfolioSummary } from '@/lib/portfolio';
import { getDisplayContext } from '@/lib/server/displayCurrency';

export type LiveHolding = {
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

export type LivePortfolioView = {
  hasData: boolean;
  declaredSizeGBP: number | null;
  holdings: LiveHolding[];
  summary: PortfolioSummary;
  displayCurrency: string;
  gbpRate: number;
};

/**
 * Values a member's REAL holdings (portfolioId is null) against live prices. This
 * is the member's own book, not the academy master list. Empty when the member
 * has not added any holdings, so the dashboard can show an honest empty state
 * instead of fabricated totals.
 */
export async function getLivePortfolioView(profileId: string): Promise<LivePortfolioView> {
  const [profile, holdings, display] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId }, select: { declaredPortfolioGBP: true } }),
    prisma.userHolding.findMany({
      where: { profileId, portfolioId: null },
      include: { asset: { include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } } } },
      orderBy: { createdAt: 'asc' },
    }),
    getDisplayContext(profileId),
  ]);

  const fx = holdings.length > 0 ? await fetchFxRates() : { USD: 1.27, EUR: 1.17, CAD: 1.84 };

  const rows: LiveHolding[] = holdings.map((h) => {
    const snap = h.asset.snapshots[0];
    const currency = h.asset.currency;
    const currentPrice = snap?.currentPrice ?? null;
    const shares = h.shares ?? null;
    const avg = h.averagePrice ?? null;
    const costGBP = shares != null && avg != null ? localToGbp(shares * avg, currency, fx) : h.investedGBP ?? null;
    const valueGBP = shares != null && currentPrice != null ? localToGbp(shares * currentPrice, currency, fx) : h.currentValueGBP ?? null;
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

  const declaredSizeGBP = profile?.declaredPortfolioGBP ?? null;
  const invested = rows.reduce((acc, r) => acc + (r.costGBP ?? 0), 0);
  // Portfolio size for return maths: the member's declared size, else their invested cost.
  const sizeGBP = declaredSizeGBP ?? invested;
  const summary = computePortfolioSummary(
    rows.map((r) => ({ costGBP: r.costGBP, valueGBP: r.valueGBP, beta: null })),
    sizeGBP,
  );

  return {
    hasData: rows.length > 0,
    declaredSizeGBP,
    holdings: rows,
    summary,
    displayCurrency: display.currency,
    gbpRate: display.gbpRate,
  };
}
