// Market-cap classification per the academy's course table (client feedback
// image 02). UK-listed names use the £ bands, everything else the $ bands.
// Values are in the listing currency's units as reported by Yahoo (GBX names
// report cap in GBP).

export type MarketCapBand = 'Small' | 'Mid' | 'Large' | 'Mega';

const UK_BANDS: Array<{ min: number; band: MarketCapBand }> = [
  { min: 20_000_000_000, band: 'Mega' },
  { min: 500_000_000, band: 'Large' },
  { min: 50_000_000, band: 'Mid' },
  { min: 30_000_000, band: 'Small' },
];

const US_BANDS: Array<{ min: number; band: MarketCapBand }> = [
  { min: 100_000_000_000, band: 'Mega' },
  { min: 10_000_000_000, band: 'Large' },
  { min: 2_000_000_000, band: 'Mid' },
  { min: 300_000_000, band: 'Small' },
];

export function isUkCurrency(currency: string | null | undefined): boolean {
  const c = (currency ?? '').toUpperCase();
  return c === 'GBP' || c === 'GBX';
}

/** Band for a market cap, or null when below the smallest band or missing. */
export function marketCapBand(marketCap: number | null | undefined, currency: string | null | undefined): MarketCapBand | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  const bands = isUkCurrency(currency) ? UK_BANDS : US_BANDS;
  for (const { min, band } of bands) {
    if (marketCap >= min) return band;
  }
  return null;
}

/** Compact human figure, e.g. 1_940_000_000_000 -> "$1.94tn", GBP 750_000_000 -> "£750m". */
export function formatMarketCap(marketCap: number | null | undefined, currency: string | null | undefined): string {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) return '—';
  const symbol = isUkCurrency(currency) ? '£' : currency === 'EUR' ? '€' : '$';
  const abs = Math.abs(marketCap);
  const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  if (abs >= 1e12) return `${symbol}${fmt(marketCap / 1e12)}tn`;
  if (abs >= 1e9) return `${symbol}${fmt(marketCap / 1e9)}bn`;
  if (abs >= 1e6) return `${symbol}${fmt(marketCap / 1e6)}m`;
  return `${symbol}${Math.round(marketCap).toLocaleString()}`;
}

/** "£750m (Large)" style label for the Key fields card and filters. */
export function marketCapLabel(marketCap: number | null | undefined, currency: string | null | undefined): string {
  const figure = formatMarketCap(marketCap, currency);
  if (figure === '—') return figure;
  const band = marketCapBand(marketCap, currency);
  return band ? `${figure} (${band})` : figure;
}
