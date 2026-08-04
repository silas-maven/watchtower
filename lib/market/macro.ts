import { prisma } from '@/lib/prisma';
import { getSettings, type ManualMacroValue } from '@/lib/server/settings';
import { sharedMarket } from '@/lib/server/sharedCache';
import type { WeatherInputs } from '@/lib/market/weather';
import type { MacroTile } from '@/lib/market/macroTypes';

// The macro instruments behind the ticker strip, Market Snapshot and Weather
// Outside. Yahoo-backed rows are seeded as isMacro Assets (scripts/
// seed-macro-assets.ts) so they ride the normal market refresh and get asset
// detail pages; the three manual rows read admin-maintained platform settings
// until a real data source is wired in.

export type MacroInstrument = {
  key: string;
  label: string;
  symbol: string; // Asset.symbol for seeded instruments
  quoteSymbol: string;
  assetType: 'FOREX' | 'INDEX' | 'COMMODITY' | 'CRYPTO';
  currency: string;
  precision: number;
  suffix?: string;
};

export const MACRO_INSTRUMENTS: MacroInstrument[] = [
  { key: 'gbpusd', label: 'GBP/USD', symbol: 'GBPUSD', quoteSymbol: 'GBPUSD=X', assetType: 'FOREX', currency: 'USD', precision: 4 },
  { key: 'eurusd', label: 'EUR/USD', symbol: 'EURUSD', quoteSymbol: 'EURUSD=X', assetType: 'FOREX', currency: 'USD', precision: 4 },
  { key: 'sp500', label: 'S&P 500', symbol: 'SPX500', quoteSymbol: '^GSPC', assetType: 'INDEX', currency: 'USD', precision: 2 },
  { key: 'nasdaq', label: 'NASDAQ', symbol: 'NASDAQ', quoteSymbol: '^IXIC', assetType: 'INDEX', currency: 'USD', precision: 2 },
  { key: 'ftse100', label: 'FTSE 100', symbol: 'FTSE100', quoteSymbol: '^FTSE', assetType: 'INDEX', currency: 'GBP', precision: 2 },
  { key: 'gold', label: 'Gold', symbol: 'GOLD', quoteSymbol: 'GC=F', assetType: 'COMMODITY', currency: 'USD', precision: 2 },
  { key: 'silver', label: 'Silver', symbol: 'SILVER', quoteSymbol: 'SI=F', assetType: 'COMMODITY', currency: 'USD', precision: 2 },
  { key: 'oil', label: 'Oil (WTI)', symbol: 'OILWTI', quoteSymbol: 'CL=F', assetType: 'COMMODITY', currency: 'USD', precision: 2 },
  { key: 'natgas', label: 'Nat Gas', symbol: 'NATGAS', quoteSymbol: 'NG=F', assetType: 'COMMODITY', currency: 'USD', precision: 2 },
  { key: 'bitcoin', label: 'Bitcoin (BTC)', symbol: 'BTCUSD', quoteSymbol: 'BTC-USD', assetType: 'CRYPTO', currency: 'USD', precision: 0 },
  { key: 'vix', label: 'VIX', symbol: 'VIX', quoteSymbol: '^VIX', assetType: 'INDEX', currency: 'USD', precision: 2 },
  { key: 'dxy', label: 'DXY', symbol: 'DXY', quoteSymbol: 'DX-Y.NYB', assetType: 'INDEX', currency: 'USD', precision: 2 },
];

const MANUAL_TILES: Array<{ key: string; label: string; setting: 'macro_boe_base_rate' | 'macro_uk_10y_gilt' | 'macro_itraxx_5y'; precision: number; suffix?: string }> = [
  { key: 'boe', label: 'BOE Rate', setting: 'macro_boe_base_rate', precision: 2, suffix: '%' },
  { key: 'gilt10y', label: 'UK 10Y Gilt', setting: 'macro_uk_10y_gilt', precision: 3, suffix: '%' },
  { key: 'itraxx', label: 'iTraxx 5Y', setting: 'macro_itraxx_5y', precision: 1 },
];

export { SNAPSHOT_ROWS, TICKER_ORDER, formatMacroValue } from '@/lib/market/macroTypes';
export type { MacroTile } from '@/lib/market/macroTypes';

/**
 * All macro tiles keyed by instrument key, ready for the ticker/snapshot/weather.
 *
 * The Map is built here rather than inside the cache, because the data cache
 * serialises what it stores and a Map does not survive that round trip: it would
 * come back as an empty object and every tile would silently read as missing.
 * The cached layer therefore returns a plain array of entries, and this rebuilds
 * the Map from it.
 */
export async function getMacroTiles(): Promise<Map<string, MacroTile>> {
  return new Map(await sharedMarket('macroTiles', computeMacroTileEntries)());
}

/** The cacheable half: a plain array, which the data cache can round-trip. */
async function computeMacroTileEntries(): Promise<Array<[string, MacroTile]>> {
  const tiles = new Map<string, MacroTile>();

  // One round trip for the instruments, one for every setting they need.
  //
  // This used to read the settings one at a time: an await for the BOE auto
  // value, then another inside the MANUAL_TILES loop, which is a sequential
  // round trip per tile. Five trips to build a strip of tiles, and because this
  // runs on the Dashboard it was the slowest thing in that page's Promise.all
  // while looking like a single call. getSettings() reads them all at once.
  const [assets, settings] = await Promise.all([
    prisma.asset.findMany({
      where: { isMacro: true, isActive: true },
      select: {
        id: true,
        symbol: true,
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
          select: { currentPrice: true, dailyChangePct: true, capturedAt: true },
        },
      },
    }),
    getSettings(),
  ]);
  const bySymbol = new Map(assets.map((a) => [a.symbol, a]));

  for (const inst of MACRO_INSTRUMENTS) {
    const asset = bySymbol.get(inst.symbol) ?? null;
    const snap = asset?.snapshots[0] ?? null;
    tiles.set(inst.key, {
      key: inst.key,
      label: inst.label,
      kind: 'live',
      assetId: asset?.id ?? null,
      value: snap?.currentPrice ?? null,
      changePct: snap?.dailyChangePct ?? null,
      precision: inst.precision,
      suffix: inst.suffix ?? '',
      asOf: snap?.capturedAt.toISOString() ?? null,
    });
  }

  // The BOE rate auto-updates from the BoE feed; the admin's manual value, when
  // set, overrides the auto value.
  const boeAuto = settings.macro_boe_base_rate_auto as ManualMacroValue;

  for (const manual of MANUAL_TILES) {
    const setting = settings[manual.setting] as ManualMacroValue;
    const effective =
      manual.key === 'boe' && setting.value == null && boeAuto.value != null ? boeAuto : setting;
    tiles.set(manual.key, {
      key: manual.key,
      label: manual.label,
      kind: 'static',
      assetId: null,
      value: effective.value,
      changePct: effective.changePct,
      precision: manual.precision,
      suffix: manual.suffix ?? '',
      asOf: effective.asOf,
    });
  }

  return [...tiles.entries()];
}

export function weatherInputsFromTiles(tiles: Map<string, MacroTile>): WeatherInputs {
  const change = (key: string) => tiles.get(key)?.changePct ?? null;
  return {
    sp500ChangePct: change('sp500'),
    nasdaqChangePct: change('nasdaq'),
    bitcoinChangePct: change('bitcoin'),
    vixLevel: tiles.get('vix')?.value ?? null,
    vixChangePct: change('vix'),
    dxyChangePct: change('dxy'),
    giltChangePct: change('gilt10y'),
    creditChangePct: change('itraxx'),
    goldChangePct: change('gold'),
    oilChangePct: change('oil'),
  };
}

