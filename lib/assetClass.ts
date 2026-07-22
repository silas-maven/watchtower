import { marketCapBand, type MarketCapBand } from '@/lib/marketCap';

// Display taxonomy for the Asset Centre / watchlist tables (client feedback):
// Asset Class groups products into Equities / Commodities / Crypto etc, while
// Product is the instrument type itself.

const ASSET_CLASS: Record<string, string> = {
  STOCK: 'Equities',
  ETF: 'Equities',
  REIT: 'Equities',
  CRYPTO: 'Crypto',
  COMMODITY: 'Commodities',
  FOREX: 'FX',
  INDEX: 'Index',
  OTHER: 'Other',
};

const PRODUCT_LABEL: Record<string, string> = {
  STOCK: 'Stock',
  ETF: 'ETF',
  REIT: 'REIT',
  CRYPTO: 'Crypto',
  COMMODITY: 'Commodity',
  FOREX: 'FX',
  INDEX: 'Index',
  OTHER: 'Other',
};

export function assetClassLabel(assetType: string): string {
  return ASSET_CLASS[assetType] ?? 'Other';
}

export function productLabel(assetType: string): string {
  return PRODUCT_LABEL[assetType] ?? 'Other';
}

export type SignalFilter = 'ALL' | 'BUY' | 'SELL' | 'BOTH_ONLY' | 'ANY_ALERT';

export type AssetFilters = {
  signal: SignalFilter;
  currency: string; // 'ALL' or a code
  capBand: MarketCapBand | 'ALL';
  query: string;
};

export const DEFAULT_ASSET_FILTERS: AssetFilters = { signal: 'ALL', currency: 'ALL', capBand: 'ALL', query: '' };

export type FilterableAssetRow = {
  symbol: string;
  name: string;
  currency: string;
  signalState: string;
  marketCap: number | null;
};

export function matchesAssetFilters(row: FilterableAssetRow, filters: AssetFilters): boolean {
  if (filters.signal === 'BUY' && row.signalState !== 'BUY') return false;
  if (filters.signal === 'SELL' && row.signalState !== 'SELL') return false;
  if (filters.signal === 'BOTH_ONLY' && row.signalState !== 'BOTH') return false;
  if (filters.signal === 'ANY_ALERT' && row.signalState === 'NONE') return false;
  if (filters.currency !== 'ALL' && row.currency.toUpperCase() !== filters.currency) return false;
  if (filters.capBand !== 'ALL' && marketCapBand(row.marketCap, row.currency) !== filters.capBand) return false;
  const q = filters.query.trim().toLowerCase();
  if (q && !row.symbol.toLowerCase().includes(q) && !row.name.toLowerCase().includes(q)) return false;
  return true;
}
