import { fetchYahooQuotes } from '@/lib/market/yahoo';

export type QuoteResult = {
  currentPrice: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  closeYest: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  beta: number | null;
  low52: number | null;
  high52: number | null;
  volumeAvg: number | null;
  pe: number | null;
  marketCap: number | null;
  dataDelay: number | null;
  source: string;
};

/** Single-symbol convenience wrapper over the batched Yahoo provider. */
export async function fetchEquityQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const quotes = await fetchYahooQuotes([symbol]);
    return quotes.get(symbol.trim().toUpperCase()) ?? null;
  } catch {
    return null;
  }
}
