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

/**
 * How long a rate is reused before refetching.
 *
 * Ten minutes, matching the revalidate already set on the Frankfurter call. FX
 * moves in the fourth decimal place over that window and these rates only convert
 * a portfolio total for display, so this is well inside the tolerance the code
 * already accepted for its fallback source.
 */
const FX_TTL_MS = 10 * 60 * 1000;

let cached: { rates: FxRates; at: number } | null = null;
let inFlight: Promise<FxRates> | null = null;

/**
 * Ask each provider in turn. Returns null when they all fail, rather than
 * quietly substituting FALLBACK_RATES.
 *
 * The distinction matters now that the result is cached. If this returned the
 * hardcoded fallback on failure, the caller could not tell a real rate from a
 * guess, would store the guess, and would then serve it for the full TTL even if
 * the provider recovered a second later.
 */
async function loadFxRates(): Promise<FxRates | null> {
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
    // fall through
  }
  return null;
}

/**
 * Live FX with a short in-process cache.
 *
 * This sits on the critical path of the Dashboard, through getLivePortfolioView,
 * and it was making an uncached HTTP call to Yahoo on every single page view.
 * Measured at ~1.4s and it was the slowest thing on the busiest page. Only the
 * Frankfurter fallback was cached, so the primary source, the one this project
 * already knows rate-limits, was the one hit every time.
 *
 * Two things are cached here. The rates themselves for FX_TTL_MS, and the
 * in-flight promise, so that six concurrent callers in one render make one
 * request between them rather than six. On a stale cache with a failing provider
 * the last known rates are preferred over the static fallback: slightly old real
 * rates beat hardcoded ones.
 */
export async function fetchFxRates(): Promise<FxRates> {
  if (cached && Date.now() - cached.at < FX_TTL_MS) return cached.rates;
  if (inFlight) return inFlight;

  inFlight = loadFxRates()
    .then((rates) => {
      if (rates) {
        cached = { rates, at: Date.now() };
        return rates;
      }
      // Every provider failed. Serve the last known real rates if there are any,
      // and deliberately do NOT cache the hardcoded fallback, so the next caller
      // retries instead of being served a guess until the TTL expires.
      return cached?.rates ?? FALLBACK_RATES;
    })
    .catch(() => cached?.rates ?? FALLBACK_RATES)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Test seam: drop the cache so a test is not served a previous run's rates. */
export function __resetFxCache(): void {
  cached = null;
  inFlight = null;
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
