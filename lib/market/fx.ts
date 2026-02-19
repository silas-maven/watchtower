export type FxRates = {
  USD: number;
  EUR: number;
};

const FALLBACK_RATES: FxRates = {
  USD: 1.27,
  EUR: 1.17,
};

export async function fetchFxRates(): Promise<FxRates> {
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=GBP&symbols=USD,EUR', {
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`FX request failed: ${res.status}`);
    const json = (await res.json()) as { rates?: Partial<FxRates> };
    if (!json.rates?.USD || !json.rates?.EUR) throw new Error('Missing FX rates');
    return {
      USD: json.rates.USD,
      EUR: json.rates.EUR,
    };
  } catch {
    return FALLBACK_RATES;
  }
}

export function toGbp(value: number | null, currency: string, rates: FxRates): number | null {
  if (value == null) return null;
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return value;
  if (ccy === 'GBX') return value / 100;
  if (ccy === 'USD') return value / rates.USD;
  if (ccy === 'EUR') return value / rates.EUR;
  return value;
}
