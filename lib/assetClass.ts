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

/**
 * Cap-band filter value for an asset the provider gives no market cap for.
 *
 * This is a real and sizeable group, not an edge case: 264 of the 814
 * member-facing assets have no cap figure. 76 are ETFs, which correctly have no
 * market cap at all (they report assets under management), but 188 are ordinary
 * stocks where the provider simply does not supply one. The old single-select
 * cap filter dropped every one of them the moment a band was chosen, with
 * nothing on screen to say so. Making it a tickable option means the gap is
 * visible and searchable instead of silent.
 */
export const NO_CAP_DATA = 'NO_DATA';

export type CapBandFilter = MarketCapBand | typeof NO_CAP_DATA;

export type AssetFilters = {
  signal: SignalFilter;
  currency: string; // 'ALL' or a code
  /** Empty means every band. Multi-select, so Small + Mid is expressible. */
  capBands: CapBandFilter[];
  /** Empty means every product. Values are AssetType keys, e.g. STOCK, CRYPTO. */
  products: string[];
  query: string;
};

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  signal: 'ALL',
  currency: 'ALL',
  capBands: [],
  products: [],
  query: '',
};

export type FilterableAssetRow = {
  symbol: string;
  name: string;
  currency: string;
  assetType: string;
  signalState: string;
  marketCap: number | null;
};

export function matchesAssetFilters(row: FilterableAssetRow, filters: AssetFilters): boolean {
  if (filters.signal === 'BUY' && row.signalState !== 'BUY') return false;
  if (filters.signal === 'SELL' && row.signalState !== 'SELL') return false;
  if (filters.signal === 'BOTH_ONLY' && row.signalState !== 'BOTH') return false;
  if (filters.signal === 'ANY_ALERT' && row.signalState === 'NONE') return false;
  if (filters.currency !== 'ALL' && row.currency.toUpperCase() !== filters.currency) return false;
  if (filters.products.length > 0 && !filters.products.includes(row.assetType)) return false;
  if (filters.capBands.length > 0) {
    const band = marketCapBand(row.marketCap, row.currency) ?? NO_CAP_DATA;
    if (!filters.capBands.includes(band)) return false;
  }
  const q = filters.query.trim().toLowerCase();
  if (q && !row.symbol.toLowerCase().includes(q) && !row.name.toLowerCase().includes(q)) return false;
  return true;
}

/**
 * Cap-band and product options built from the rows actually on screen, with
 * counts. Offering the full taxonomy would list REIT, FX and Index on a universe
 * that holds none of them, so every one of those ticks would return an empty
 * table and read as a broken filter.
 */
export function filterOptionsFor(rows: FilterableAssetRow[]) {
  const capCounts = new Map<CapBandFilter, number>();
  const productCounts = new Map<string, number>();
  for (const row of rows) {
    const band = marketCapBand(row.marketCap, row.currency) ?? NO_CAP_DATA;
    capCounts.set(band, (capCounts.get(band) ?? 0) + 1);
    productCounts.set(row.assetType, (productCounts.get(row.assetType) ?? 0) + 1);
  }

  const capOrder: CapBandFilter[] = ['Mega', 'Large', 'Mid', 'Small', NO_CAP_DATA];
  const capBands = capOrder
    .filter((band) => capCounts.has(band))
    .map((band) => ({
      value: band,
      label: band === NO_CAP_DATA ? 'No cap data' : `${band} cap`,
      count: capCounts.get(band) ?? 0,
    }));

  const products = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ value: type, label: productLabel(type), count }));

  return { capBands, products };
}
