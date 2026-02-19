import type { QuoteResult } from '@/lib/market/equities';

const SYMBOL_TO_CG_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  RNDR: 'render-token',
  NEAR: 'near',
};

export async function fetchCryptoQuote(symbol: string): Promise<QuoteResult | null> {
  const id = SYMBOL_TO_CG_ID[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}&price_change_percentage=24h`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
    const json = (await res.json()) as Array<Record<string, number>>;
    const coin = json[0];
    if (!coin) return null;

    const currentPrice = Number(coin.current_price ?? null);
    const low = Number(coin.low_24h ?? null);
    const high = Number(coin.high_24h ?? null);
    const changePct = Number(coin.price_change_percentage_24h ?? null);

    return {
      currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
      dailyHigh: Number.isFinite(high) ? high : null,
      dailyLow: Number.isFinite(low) ? low : null,
      closeYest: null,
      dailyChange: null,
      dailyChangePct: Number.isFinite(changePct) ? changePct : null,
      beta: null,
      low52: null,
      high52: null,
      volumeAvg: Number.isFinite(Number(coin.total_volume)) ? Number(coin.total_volume) : null,
      pe: null,
      marketCap: Number.isFinite(Number(coin.market_cap)) ? Number(coin.market_cap) : null,
      dataDelay: 0,
      source: 'coingecko',
    };
  } catch {
    return null;
  }
}
