// Client-safe macro tile types, layout constants and formatting. Server-side
// tile assembly lives in lib/market/macro.ts (which imports prisma).

export type MacroTile = {
  key: string;
  label: string;
  kind: 'live' | 'static';
  assetId: string | null;
  value: number | null;
  changePct: number | null;
  precision: number;
  suffix: string;
  asOf: string | null;
};

// The Market Snapshot layout from the client mockup: rows 1+2 visible by
// default, row 3 behind "View full market dashboard".
export const SNAPSHOT_ROWS: string[][] = [
  ['gbpusd', 'sp500', 'gold', 'bitcoin', 'silver'],
  ['boe', 'gilt10y', 'itraxx', 'vix', 'dxy'],
  ['eurusd', 'nasdaq', 'oil', 'natgas', 'ftse100'],
];

export const TICKER_ORDER: string[] = [
  'gbpusd', 'sp500', 'gold', 'bitcoin', 'silver', 'boe', 'gilt10y', 'itraxx', 'vix', 'dxy',
  'eurusd', 'nasdaq', 'oil', 'natgas', 'ftse100',
];

export function formatMacroValue(tile: Pick<MacroTile, 'value' | 'precision' | 'suffix'>): string {
  if (tile.value == null) return '—';
  return `${tile.value.toLocaleString(undefined, { minimumFractionDigits: tile.precision, maximumFractionDigits: tile.precision })}${tile.suffix}`;
}
