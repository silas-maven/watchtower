import { Prisma, SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchCryptoQuote } from '@/lib/market/crypto';
import { fetchFxRates, toGbp } from '@/lib/market/fx';
import { toQuoteSymbol } from '@/lib/market/symbols';
import { fetchYahooQuotes, type YahooQuote } from '@/lib/market/yahoo';
import { computeSignalState, effectiveSignalState, eventTypeForTransition } from '@/lib/signals/engine';
import { computeSpreadsheetDerived } from '@/lib/formulas';
import { isMarketOpenForAsset } from '@/lib/time';
import { dispatchSignalAlerts, type SignalAlert } from '@/lib/alerts/dispatch';

export type RefreshMarketResult = {
  processed: number;
  refreshed: number;
  updated: number;
  skipped: number;
  failed: number;
  eventsCreated: number;
  jobRunId: string;
};

const DEFAULT_PORTFOLIO_SIZE_GBP = 5000;

// If an asset has not been snapshotted in this long, refresh it even with its
// market closed so closing values and 52-week context stay current.
const STALE_SAFETY_MS = 18 * 60 * 60 * 1000;

async function portfolioSizeGbp(): Promise<number> {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: 'portfolio_size_gbp' } });
    const value = Number(setting?.value);
    if (Number.isFinite(value) && value > 0) return value;
  } catch {
    // settings are optional; fall through
  }
  return DEFAULT_PORTFOLIO_SIZE_GBP;
}

export async function refreshMarketData(options: { force?: boolean } = {}): Promise<RefreshMarketResult> {
  const jobRun = await prisma.jobRun.create({ data: { job: 'refresh-market', status: 'running' } });
  try {
    const result = await runRefresh(options.force === true, jobRun.id);
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: { status: 'success', finishedAt: new Date(), stats: result as unknown as Prisma.InputJsonValue },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.jobRun
      .update({ where: { id: jobRun.id }, data: { status: 'error', finishedAt: new Date(), error: message } })
      .catch(() => undefined);
    throw error;
  }
}

async function runRefresh(force: boolean, jobRunId: string): Promise<RefreshMarketResult> {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: {
      rule: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
  });

  const now = Date.now();
  const due = assets.filter((asset) => {
    if (force) return true;
    if (isMarketOpenForAsset(asset.assetType, asset.currency)) return true;
    const last = asset.snapshots[0]?.capturedAt.getTime() ?? 0;
    return now - last > STALE_SAFETY_MS;
  });

  const result: RefreshMarketResult = {
    processed: assets.length,
    refreshed: 0,
    updated: 0,
    skipped: assets.length - due.length,
    failed: 0,
    eventsCreated: 0,
    jobRunId,
  };
  if (due.length === 0) return result;

  const [fx, portfolioSize] = await Promise.all([fetchFxRates(), portfolioSizeGbp()]);
  const newAlerts: SignalAlert[] = [];

  const symbolByAssetId = new Map(due.map((asset) => [asset.id, toQuoteSymbol(asset)]));
  let quotes = new Map<string, YahooQuote>();
  let batchError: string | null = null;
  try {
    quotes = await fetchYahooQuotes([...symbolByAssetId.values()]);
  } catch (error) {
    batchError = error instanceof Error ? error.message : String(error);
  }

  for (const asset of due) {
    const previous = asset.snapshots[0];
    const quoteSymbol = symbolByAssetId.get(asset.id) ?? asset.symbol;
    let quote: YahooQuote | null = quotes.get(quoteSymbol) ?? null;
    let fetchError: string | null = null;

    if (!quote && asset.assetType === 'CRYPTO') {
      const cg = await fetchCryptoQuote(asset.symbol);
      if (cg) quote = { ...cg, quoteCurrency: 'USD', nextEarningsDate: null };
    }

    // A currency clash between a validly-stored currency and the quote means the
    // bare symbol resolved to a different listing on Yahoo. Reject the quote and
    // surface the fix (set asset.quoteSymbol) instead of ingesting wrong prices.
    const storedCurrency = (asset.currency ?? '').toUpperCase();
    const storedCurrencyValid = /^[A-Z]{3}$/.test(storedCurrency);
    if (
      quote?.quoteCurrency &&
      storedCurrencyValid &&
      quote.quoteCurrency !== storedCurrency &&
      !asset.quoteSymbol
    ) {
      fetchError = `Currency mismatch for ${quoteSymbol}: stored ${storedCurrency}, quote ${quote.quoteCurrency}. Set an explicit quote symbol.`;
      quote = null;
    }

    if (!quote && !fetchError) {
      fetchError = batchError ?? `No quote for ${quoteSymbol}`;
    }
    if (!quote) result.failed += 1;

    // Otherwise Yahoo is authoritative for the trading currency; the spreadsheet
    // import left some assets with #N/A placeholders.
    const currency = quote?.quoteCurrency && quote.quoteCurrency !== asset.currency ? quote.quoteCurrency : asset.currency;

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

    const computed = computeSignalState({
      dailyLow: merged.dailyLow,
      dailyHigh: merged.dailyHigh,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
    const signalState = effectiveSignalState(computed, asset.rule?.signalOverride);

    const parity = computeSpreadsheetDerived({
      symbol: asset.symbol,
      name: asset.name,
      currency,
      portfolioSize,
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
        fetchError,
        raw: {
          quoteSymbol,
          jobRunId,
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

    // Price-driven transitions are suspended while an owner override pins the
    // state; the admin override route emits its own SignalEvent instead.
    if (!asset.rule?.signalOverride) {
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
        result.eventsCreated += 1;
        if (created.signalState !== SignalState.NONE) {
          newAlerts.push({ assetId: asset.id, symbol: asset.symbol, toState: created.signalState, price: created.currentPrice });
        }
      }
    }

    const price = created.currentPrice;
    const shares = asset.shares;
    const fallbackCurrentValueGBP = price != null && shares != null ? toGbp(price * shares, currency, fx) : null;
    const currentCostGBP = parity.currentCostGBP ?? asset.currentCostGBP;
    const currentValueGBP = parity.currentValueGBP ?? fallbackCurrentValueGBP;
    const returnPct =
      parity.returnPct ??
      (currentValueGBP != null && currentCostGBP ? (currentValueGBP / currentCostGBP - 1) * 100 : asset.returnPct);

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        currency,
        closeYest: merged.closeYest,
        beta: merged.beta,
        low52: merged.low52,
        high52: merged.high52,
        volumeAvg: merged.volumeAvg,
        pe: merged.pe,
        dataDelay: merged.dataDelay,
        marketCap: merged.marketCap,
        nextEarningsDate: quote?.nextEarningsDate ?? asset.nextEarningsDate,
        currentCostGBP,
        currentValueGBP,
        weightPct: parity.weightPct ?? asset.weightPct,
        returnPct,
      },
    });

    result.refreshed += 1;
    if (quote) result.updated += 1;
  }

  // Inert unless alert delivery is explicitly enabled (off by default).
  await dispatchSignalAlerts(newAlerts).catch((error) => console.error('[refreshMarket] alert dispatch failed:', error));

  return result;
}
