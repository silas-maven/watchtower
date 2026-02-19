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

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  beta?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  averageDailyVolume3Month?: number;
  trailingPE?: number;
  marketCap?: number;
};

export async function fetchEquityQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Yahoo quote request failed: ${res.status}`);

    const json = (await res.json()) as {
      quoteResponse?: { result?: YahooQuote[] };
    };
    const quote = json.quoteResponse?.result?.[0];
    if (!quote) return null;

    const currentPrice = quote.regularMarketPrice ?? null;
    const closeYest = quote.regularMarketPreviousClose ?? null;
    const dailyChange = currentPrice != null && closeYest != null ? currentPrice - closeYest : null;
    const dailyChangePct = currentPrice != null && closeYest ? (currentPrice / closeYest - 1) * 100 : null;

    return {
      currentPrice,
      dailyHigh: quote.regularMarketDayHigh ?? null,
      dailyLow: quote.regularMarketDayLow ?? null,
      closeYest,
      dailyChange,
      dailyChangePct,
      beta: quote.beta ?? null,
      low52: quote.fiftyTwoWeekLow ?? null,
      high52: quote.fiftyTwoWeekHigh ?? null,
      volumeAvg: quote.averageDailyVolume3Month ?? null,
      pe: quote.trailingPE ?? null,
      marketCap: quote.marketCap ?? null,
      dataDelay: 0,
      source: 'yahoo-http',
    };
  } catch {
    return null;
  }
}
