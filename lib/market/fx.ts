import { fetchYahooQuotes } from '@/lib/market/yahoo';

export type FxRates = {
  USD: number;
  EUR: number;
  CAD: number;
};

const FALLBACK_RATES: FxRates = {
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.84,
};

async function fromYahoo(): Promise<FxRates | null> {
  const quotes = await fetchYahooQuotes(['GBPUSD=X', 'GBPEUR=X', 'GBPCAD=X']);
  const usd = quotes.get('GBPUSD=X')?.currentPrice;
  const eur = quotes.get('GBPEUR=X')?.currentPrice;
  const cad = quotes.get('GBPCAD=X')?.currentPrice;
  if (usd && eur && cad) return { USD: usd, EUR: eur, CAD: cad };
  return null;
}

async function fromFrankfurter(): Promise<FxRates | null> {
  const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD,EUR,CAD', {
    next: { revalidate: 600 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { rates?: Partial<FxRates> };
  if (json.rates?.USD && json.rates?.EUR && json.rates?.CAD) {
    return { USD: json.rates.USD, EUR: json.rates.EUR, CAD: json.rates.CAD };
  }
  return null;
}

export async function fetchFxRates(): Promise<FxRates> {
  try {
    const yahoo = await fromYahoo();
    if (yahoo) return yahoo;
  } catch {
    // fall through to the next source
  }
  try {
    const frankfurter = await fromFrankfurter();
    if (frankfurter) return frankfurter;
  } catch {
    // fall through to the static fallback
  }
  return FALLBACK_RATES;
}

export function toGbp(value: number | null, currency: string, rates: FxRates): number | null {
  if (value == null) return null;
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return value;
  if (ccy === 'GBX') return value / 100;
  if (ccy === 'USD') return value / rates.USD;
  if (ccy === 'EUR') return value / rates.EUR;
  if (ccy === 'CAD') return value / rates.CAD;
  return value;
}
