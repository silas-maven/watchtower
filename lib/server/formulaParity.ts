import { fetchFxRates } from '@/lib/market/fx';
import { prisma } from '@/lib/prisma';
import { FORMULA_COVERAGE, computeSpreadsheetDerived } from '@/lib/formulas';

export async function getFormulaParityProof() {
  const asset = await prisma.asset.findFirst({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
    orderBy: { symbol: 'asc' },
  });

  if (!asset) {
    return {
      sampleAsset: null,
      formulas: FORMULA_COVERAGE.map((f) => ({
        ...f,
        implemented: true,
        sampleValue: 'No asset sample loaded',
      })),
    };
  }

  const snapshot = asset.snapshots[0];
  const fx = await fetchFxRates();

  const derived = computeSpreadsheetDerived({
    symbol: asset.symbol,
    name: asset.name,
    currency: asset.currency,
    portfolioSize: 5000,
    shares: asset.shares,
    entryPrice: asset.brokerEntryPrice,
    currentPrice: snapshot?.currentPrice ?? null,
    closeYest: snapshot?.closeYest ?? asset.closeYest,
    dailyHigh: snapshot?.dailyHigh ?? null,
    dailyLow: snapshot?.dailyLow ?? null,
    low52: snapshot?.low52 ?? asset.low52,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
    fx,
  });

  return {
    sampleAsset: {
      symbol: asset.symbol,
      name: asset.name,
    },
    formulas: FORMULA_COVERAGE.map((f) => {
      const value = derived[f.output as keyof typeof derived];
      return {
        ...f,
        implemented: true,
        sampleValue: typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
      };
    }),
  };
}
