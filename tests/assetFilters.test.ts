import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ASSET_FILTERS,
  NO_CAP_DATA,
  filterOptionsFor,
  matchesAssetFilters,
  type AssetFilters,
  type FilterableAssetRow,
} from '../lib/assetClass';

function row(over: Partial<FilterableAssetRow> = {}): FilterableAssetRow {
  return {
    symbol: 'AAPL',
    name: 'Apple Inc',
    currency: 'USD',
    assetType: 'STOCK',
    signalState: 'NONE',
    marketCap: 3.2e12,
    ...over,
  };
}

function filters(over: Partial<AssetFilters> = {}): AssetFilters {
  return { ...DEFAULT_ASSET_FILTERS, ...over };
}

describe('matchesAssetFilters', () => {
  it('lets everything through by default', () => {
    expect(matchesAssetFilters(row(), filters())).toBe(true);
    expect(matchesAssetFilters(row({ marketCap: null, assetType: 'ETF' }), filters())).toBe(true);
  });

  it('accepts any of several cap bands, not just one', () => {
    const f = filters({ capBands: ['Mega', 'Small'] });
    expect(matchesAssetFilters(row({ marketCap: 3.2e12 }), f)).toBe(true); // Mega
    expect(matchesAssetFilters(row({ marketCap: 5e8 }), f)).toBe(true); // Small (US band)
    expect(matchesAssetFilters(row({ marketCap: 5e9 }), f)).toBe(false); // Mid
  });

  it('treats a missing market cap as its own band rather than silently dropping it', () => {
    const noData = row({ marketCap: null });
    // The whole point of NO_CAP_DATA: 264 of 814 assets have no cap figure, so
    // they must be findable rather than invisible.
    expect(matchesAssetFilters(noData, filters({ capBands: [NO_CAP_DATA] }))).toBe(true);
    expect(matchesAssetFilters(noData, filters({ capBands: ['Mega'] }))).toBe(false);
    expect(matchesAssetFilters(noData, filters({ capBands: [] }))).toBe(true);
  });

  it('filters by product type, and stocks exclude ETFs', () => {
    const f = filters({ products: ['STOCK'] });
    expect(matchesAssetFilters(row({ assetType: 'STOCK' }), f)).toBe(true);
    expect(matchesAssetFilters(row({ assetType: 'ETF' }), f)).toBe(false);
    expect(matchesAssetFilters(row({ assetType: 'CRYPTO' }), f)).toBe(false);
  });

  it('accepts several product types at once', () => {
    const f = filters({ products: ['STOCK', 'CRYPTO'] });
    expect(matchesAssetFilters(row({ assetType: 'STOCK' }), f)).toBe(true);
    expect(matchesAssetFilters(row({ assetType: 'CRYPTO' }), f)).toBe(true);
    expect(matchesAssetFilters(row({ assetType: 'ETF' }), f)).toBe(false);
  });

  it('applies cap and product together as an AND', () => {
    const f = filters({ products: ['CRYPTO'], capBands: ['Mega'] });
    expect(matchesAssetFilters(row({ assetType: 'CRYPTO', marketCap: 1.3e12 }), f)).toBe(true);
    expect(matchesAssetFilters(row({ assetType: 'CRYPTO', marketCap: 5e9 }), f)).toBe(false);
    expect(matchesAssetFilters(row({ assetType: 'STOCK', marketCap: 1.3e12 }), f)).toBe(false);
  });

  it('uses the UK bands for GBX listings', () => {
    // 240m is Mid on the UK table but below Small on the US one, so getting the
    // currency wrong would move the row between bands.
    const uk = row({ currency: 'GBX', marketCap: 2.4e8 });
    expect(matchesAssetFilters(uk, filters({ capBands: ['Mid'] }))).toBe(true);
    expect(matchesAssetFilters(uk, filters({ capBands: [NO_CAP_DATA] }))).toBe(false);
  });

  it('still honours signal, currency and query alongside the new filters', () => {
    expect(matchesAssetFilters(row({ signalState: 'BUY' }), filters({ signal: 'BUY' }))).toBe(true);
    expect(matchesAssetFilters(row({ signalState: 'NONE' }), filters({ signal: 'ANY_ALERT' }))).toBe(false);
    expect(matchesAssetFilters(row({ currency: 'GBX' }), filters({ currency: 'USD' }))).toBe(false);
    expect(matchesAssetFilters(row(), filters({ query: 'appl' }))).toBe(true);
    expect(matchesAssetFilters(row(), filters({ query: 'tesla' }))).toBe(false);
  });
});

describe('filterOptionsFor', () => {
  const rows = [
    row({ symbol: 'AAPL', marketCap: 3.2e12, assetType: 'STOCK' }), // Mega
    row({ symbol: 'MSFT', marketCap: 2.9e12, assetType: 'STOCK' }), // Mega
    row({ symbol: 'SMALL', marketCap: 5e8, assetType: 'STOCK' }), // Small
    row({ symbol: 'VUSA', marketCap: null, assetType: 'ETF' }), // no data
    row({ symbol: 'BTC', marketCap: 1.3e12, assetType: 'CRYPTO' }), // Mega
  ];

  it('only offers bands that some row actually has', () => {
    const { capBands } = filterOptionsFor(rows);
    expect(capBands.map((b) => b.value)).toEqual(['Mega', 'Small', NO_CAP_DATA]);
    // No 'Large' or 'Mid' option, because ticking one would return an empty
    // table and read as a broken filter.
    expect(capBands.map((b) => b.count)).toEqual([3, 1, 1]);
  });

  it('only offers product types that some row actually has, commonest first', () => {
    const { products } = filterOptionsFor(rows);
    expect(products.map((p) => p.value)).toEqual(['STOCK', 'ETF', 'CRYPTO']);
    expect(products[0]).toMatchObject({ label: 'Stock', count: 3 });
  });

  it('produces options that all match at least one row', () => {
    const { capBands, products } = filterOptionsFor(rows);
    for (const band of capBands) {
      const hits = rows.filter((r) => matchesAssetFilters(r, filters({ capBands: [band.value] })));
      expect(hits.length).toBe(band.count);
    }
    for (const product of products) {
      const hits = rows.filter((r) => matchesAssetFilters(r, filters({ products: [product.value] })));
      expect(hits.length).toBe(product.count);
    }
  });
});
