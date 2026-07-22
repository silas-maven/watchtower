import YahooFinance from 'yahoo-finance2';
import type { QuoteResult } from '@/lib/market/equities';

export type YahooQuote = QuoteResult & {
  quoteCurrency: string | null;
  nextEarningsDate: Date | null;
  ma50: number | null;
  ma200: number | null;
  dividendYield: number | null;
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

export type ChartPoint = { date: string; close: number };
export type OhlcPoint = { date: string; open: number; high: number; low: number; close: number };

const RANGE_DAYS: Record<string, number> = { '1mo': 30, '3mo': 92, '6mo': 183, '1y': 366, '2y': 731, '5y': 1827 };

export type ChartInterval = '1d' | '1wk' | '1mo';
export type ChartRange = keyof typeof RANGE_DAYS;

/**
 * Historical daily closes for a symbol over the given range. Used for the asset
 * detail chart. Returns an empty array if Yahoo has no series for the symbol.
 */
export async function fetchYahooChart(symbol: string, range: ChartRange = '3mo'): Promise<ChartPoint[]> {
  const points = await fetchYahooOhlc(symbol, range, '1d');
  return points.map(({ date, close }) => ({ date, close }));
}

/**
 * Historical OHLC candles for a symbol. Interval drives the indicator timeframe
 * (Daily/Weekly/Monthly); the range must be long enough for 200-period
 * indicators, which callers control via the range parameter.
 */
export async function fetchYahooOhlc(
  symbol: string,
  range: ChartRange = '3mo',
  interval: ChartInterval = '1d',
): Promise<OhlcPoint[]> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return [];
  const days = RANGE_DAYS[range] ?? 92;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const yf = getClient();
    const result = await yf.chart(sym, { period1, interval });
    const quotes = (result?.quotes ?? []) as Array<{
      date?: Date | string;
      open?: number | null;
      high?: number | null;
      low?: number | null;
      close?: number | null;
    }>;
    const points: OhlcPoint[] = [];
    for (const q of quotes) {
      const close = num(q.close);
      const date = asDate(q.date);
      if (close == null || close <= 0 || !date) continue;
      // Yahoo occasionally emits null OHL on sparse rows; fall back to close so
      // candles stay renderable without inventing a range.
      points.push({
        date: date.toISOString().slice(0, 10),
        open: positive(q.open) ?? close,
        high: positive(q.high) ?? close,
        low: positive(q.low) ?? close,
        close,
      });
    }
    return points;
  } catch {
    return [];
  }
}

export type YahooFundamentals = {
  quickRatio: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  sector: string | null;
};

/**
 * Balance-sheet ratios plus the sector via quoteSummary (one request per
 * symbol, so callers should throttle). Yahoo reports debtToEquity as a
 * percentage; normalise to a plain ratio (e.g. 54.3 -> 0.543) to match how the
 * academy reads D/E. Sector feeds the sector-P/E benchmark (lib/market/sectorPE).
 */
export async function fetchYahooFundamentals(symbol: string): Promise<YahooFundamentals | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  try {
    const yf = getClient();
    const result = await yf.quoteSummary(sym, { modules: ['financialData', 'summaryProfile'] });
    const data = (result?.financialData ?? null) as Record<string, unknown> | null;
    const profile = (result?.summaryProfile ?? null) as Record<string, unknown> | null;
    if (!data && !profile) return null;
    const rawDe = num(data?.debtToEquity);
    return {
      quickRatio: num(data?.quickRatio),
      currentRatio: num(data?.currentRatio),
      debtToEquity: rawDe != null ? rawDe / 100 : null,
      sector: typeof profile?.sector === 'string' ? profile.sector : null,
    };
  } catch {
    return null;
  }
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
      ma50: positive(record.fiftyDayAverage),
      ma200: positive(record.twoHundredDayAverage),
      // quote() exposes dividendYield as a percentage figure where available;
      // trailingAnnualDividendYield is a fraction, so scale it to match.
      dividendYield:
        num(record.dividendYield) ??
        (num(record.trailingAnnualDividendYield) != null ? num(record.trailingAnnualDividendYield)! * 100 : null),
    });
  }

  return out;
}
