import YahooFinance from 'yahoo-finance2';
import type { QuoteResult } from '@/lib/market/equities';

export type YahooQuote = QuoteResult & {
  quoteCurrency: string | null;
  nextEarningsDate: Date | null;
};

let client: InstanceType<typeof YahooFinance> | null = null;

function getClient(): InstanceType<typeof YahooFinance> {
  if (!client) {
    client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  }
  return client;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Yahoo reports 0 for day high/low/close outside trading hours; treat as missing.
function positive(value: unknown): number | null {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Yahoo timestamps are epoch seconds.
    return new Date(value < 10_000_000_000 ? value * 1000 : value);
  }
  return null;
}

export function normaliseCurrency(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed === 'GBp' || trimmed.toUpperCase() === 'GBX') return 'GBX';
  return trimmed.toUpperCase();
}

/**
 * Batch quote fetch. Returns a map keyed by the requested symbol; symbols Yahoo
 * does not recognise are simply absent. Throws only when the whole request fails.
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return out;

  const yf = getClient();
  const results = await yf.quote(unique, {}, { validateResult: false });
  const rows = Array.isArray(results) ? results : [results];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const symbol = typeof record.symbol === 'string' ? record.symbol.toUpperCase() : null;
    if (!symbol) continue;

    const currentPrice = num(record.regularMarketPrice);
    const closeYest = positive(record.regularMarketPreviousClose);

    out.set(symbol, {
      currentPrice,
      dailyHigh: positive(record.regularMarketDayHigh),
      dailyLow: positive(record.regularMarketDayLow),
      closeYest,
      dailyChange: num(record.regularMarketChange),
      dailyChangePct: num(record.regularMarketChangePercent),
      beta: num(record.beta),
      low52: positive(record.fiftyTwoWeekLow),
      high52: positive(record.fiftyTwoWeekHigh),
      volumeAvg: num(record.averageDailyVolume3Month) ?? num(record.averageDailyVolume10Day),
      pe: num(record.trailingPE),
      marketCap: num(record.marketCap),
      dataDelay: num(record.exchangeDataDelayedBy),
      source: 'yahoo',
      quoteCurrency: normaliseCurrency(typeof record.currency === 'string' ? record.currency : null),
      nextEarningsDate: asDate(record.earningsTimestamp),
    });
  }

  return out;
}
