import { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchEquityQuote } from '@/lib/market/equities';
import { fetchCryptoQuote } from '@/lib/market/crypto';
import { fetchFxRates, toGbp } from '@/lib/market/fx';
import { computeSignalState, eventTypeForTransition } from '@/lib/signals/engine';
import { computeSpreadsheetDerived } from '@/lib/formulas';

export type RefreshMarketResult = {
  processed: number;
  updated: number;
  skipped: number;
  eventsCreated: number;
};

async function fetchQuoteForAsset(symbol: string, assetType: string) {
  if (assetType === 'CRYPTO') {
    return fetchCryptoQuote(symbol);
  }
  return fetchEquityQuote(symbol);
}

export async function refreshMarketData(): Promise<RefreshMarketResult> {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
  });

  const fx = await fetchFxRates();
  let updated = 0;
  let skipped = 0;
  let eventsCreated = 0;

  for (const asset of assets) {
    const previous = asset.snapshots[0];
    const quote = await fetchQuoteForAsset(asset.symbol, asset.assetType);

    if (!quote && !previous) {
      skipped += 1;
      continue;
    }

    const merged = {
      currentPrice: quote?.currentPrice ?? previous?.currentPrice ?? null,
      dailyHigh: quote?.dailyHigh ?? previous?.dailyHigh ?? null,
      dailyLow: quote?.dailyLow ?? previous?.dailyLow ?? null,
      closeYest: quote?.closeYest ?? previous?.closeYest ?? asset.closeYest ?? null,
      dailyChange: quote?.dailyChange ?? previous?.dailyChange ?? null,
      dailyChangePct: quote?.dailyChangePct ?? previous?.dailyChangePct ?? null,
      beta: quote?.beta ?? previous?.beta ?? asset.beta ?? null,
      low52: quote?.low52 ?? previous?.low52 ?? asset.low52 ?? null,
      high52: quote?.high52 ?? previous?.high52 ?? asset.high52 ?? null,
      volumeAvg: quote?.volumeAvg ?? previous?.volumeAvg ?? asset.volumeAvg ?? null,
      pe: quote?.pe ?? previous?.pe ?? asset.pe ?? null,
      marketCap: quote?.marketCap ?? previous?.marketCap ?? asset.marketCap ?? null,
      dataDelay: quote?.dataDelay ?? previous?.dataDelay ?? asset.dataDelay ?? null,
      source: quote?.source ?? 'fallback-previous',
    };

    const signalState = computeSignalState({
      dailyLow: merged.dailyLow,
      dailyHigh: merged.dailyHigh,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });

    const parity = computeSpreadsheetDerived({
      symbol: asset.symbol,
      name: asset.name,
      currency: asset.currency,
      portfolioSize: 5000,
      shares: asset.shares,
      entryPrice: asset.brokerEntryPrice,
      currentPrice: merged.currentPrice,
      closeYest: merged.closeYest,
      dailyHigh: merged.dailyHigh,
      dailyLow: merged.dailyLow,
      low52: merged.low52,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
      fx,
    });

    const created = await prisma.assetSnapshot.create({
      data: {
        assetId: asset.id,
        capturedAt: new Date(),
        currentPrice: merged.currentPrice,
        dailyHigh: merged.dailyHigh,
        dailyLow: merged.dailyLow,
        closeYest: merged.closeYest,
        dailyChange: merged.dailyChange ?? parity.dailyChange,
        dailyChangePct: merged.dailyChangePct ?? parity.dailyChangePct,
        beta: merged.beta,
        low52: merged.low52,
        high52: merged.high52,
        volumeAvg: merged.volumeAvg,
        pe: merged.pe,
        marketCap: merged.marketCap,
        dataDelay: merged.dataDelay,
        signalState,
        source: merged.source,
        raw: {
          formulaParity: {
            currentCostGBP: parity.currentCostGBP,
            currentValueGBP: parity.currentValueGBP,
            weightPct: parity.weightPct,
            returnPct: parity.returnPct,
            rangeVsYClosePct: parity.rangeVsYClosePct,
            priceVsYearLowPct: parity.priceVsYearLowPct,
            tradeAlertText: parity.tradeAlertText,
          },
        },
      },
    });

    const fromState = previous?.signalState ?? SignalState.NONE;
    const eventType = eventTypeForTransition(fromState, created.signalState);
    if (eventType) {
      await prisma.signalEvent.create({
        data: {
          assetId: asset.id,
          eventType,
          fromState,
          toState: created.signalState,
          metadata: {
            symbol: asset.symbol,
            price: created.currentPrice,
            targetEntry: asset.rule?.targetEntry,
            targetExit: asset.rule?.targetExit,
          },
        },
      });
      eventsCreated += 1;
    }

    const price = created.currentPrice;
    const shares = asset.shares;
    const fallbackCurrentValueGBP = price != null && shares != null ? toGbp(price * shares, asset.currency, fx) : null;
    const currentCostGBP = parity.currentCostGBP ?? asset.currentCostGBP;
    const currentValueGBP = parity.currentValueGBP ?? fallbackCurrentValueGBP;
    const returnPct =
      parity.returnPct ??
      (currentValueGBP != null && currentCostGBP ? (currentValueGBP / currentCostGBP - 1) * 100 : asset.returnPct);

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        closeYest: merged.closeYest,
        beta: merged.beta,
        low52: merged.low52,
        high52: merged.high52,
        volumeAvg: merged.volumeAvg,
        pe: merged.pe,
        dataDelay: merged.dataDelay,
        marketCap: merged.marketCap,
        currentCostGBP,
        currentValueGBP,
        weightPct: parity.weightPct ?? asset.weightPct,
        returnPct,
      },
    });

    updated += 1;
  }

  return {
    processed: assets.length,
    updated,
    skipped,
    eventsCreated,
  };
}
