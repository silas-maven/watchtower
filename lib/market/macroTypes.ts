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

/**
 * How many tiles the Dashboard shows before handing over to Market Pulse.
 *
 * The owner asked on 5 August for the Dashboard cards to be condensed with a
 * "View more" instead of the full board. Six is not arbitrary: on 4 August he
 * drew a line across the mobile Dashboard directly under SILVER and BOE RATE,
 * and those are tiles five and six of the flat order. So the condensed set is
 * exactly what sat above his own mark, and it drops UK 10Y GILT and ITRAXX 5Y,
 * which render as "—" on that screenshot because neither has a live feed.
 *
 * Six also lands cleanly on both breakpoints: three rows on a phone's two
 * columns, one row on a desktop's six.
 */
export const DASHBOARD_TILE_LIMIT = 6;

export const TICKER_ORDER: string[] = [
  'gbpusd', 'sp500', 'gold', 'bitcoin', 'silver', 'boe', 'gilt10y', 'itraxx', 'vix', 'dxy',
  'eurusd', 'nasdaq', 'oil', 'natgas', 'ftse100',
];

export function formatMacroValue(tile: Pick<MacroTile, 'value' | 'precision' | 'suffix'>): string {
  if (tile.value == null) return '—';
  return `${tile.value.toLocaleString(undefined, { minimumFractionDigits: tile.precision, maximumFractionDigits: tile.precision })}${tile.suffix}`;
}
