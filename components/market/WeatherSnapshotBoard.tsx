'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowRight, ChevronRight, CloudLightning, CloudSun, Info, Snowflake, Sun } from 'lucide-react';
import { formatMacroValue, type MacroTile } from '@/lib/market/macroTypes';
import type { WeatherReading } from '@/lib/market/weather';

const WEATHER_STYLES = {
  SUNNY: { icon: Sun, accent: 'text-emerald-500', chip: 'border-emerald-500/30 bg-emerald-500/10' },
  MIXED: { icon: CloudSun, accent: 'text-amber-500', chip: 'border-amber-500/30 bg-amber-500/10' },
  STORMY: { icon: CloudLightning, accent: 'text-rose-500', chip: 'border-rose-500/30 bg-rose-500/10' },
  FROSTY: { icon: Snowflake, accent: 'text-blue-500', chip: 'border-blue-500/30 bg-blue-500/10' },
} as const;

/**
 * One market tile. Deliberately dense (owner, 2 Aug 2026: "can we make this
 * smaller to fit more"): label on its own line, then value and change side by
 * side rather than stacked, which is what buys back the vertical space.
 */
function Tile({ tile }: { tile: MacroTile }) {
  const up = tile.changePct != null && tile.changePct >= 0;
  const isStatic = tile.kind === 'static';
  const body = (
    <div className="rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm transition hover:bg-muted/40">
      {/* Label and change share the top line, both short. The value then gets
          the full width of the tile, which is what keeps a price like 4,127.60
          from truncating once ten tiles sit across the panel. */}
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{tile.label}</span>
        <span className={`shrink-0 font-mono text-[9px] ${isStatic || tile.changePct == null ? 'text-muted-foreground' : up ? 'text-emerald-500' : 'text-rose-500'}`}>
          {tile.changePct == null ? '—' : `${isStatic ? '' : up ? '▲' : '▼'}${Math.abs(tile.changePct).toFixed(2)}%`}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-foreground">{formatMacroValue(tile)}</div>
    </div>
  );
  return tile.assetId ? <Link href={`/assets/${tile.assetId}`}>{body}</Link> : body;
}

/**
 * Weather Outside panel + Market Snapshot grid (client feedback section F).
 *
 * Two shapes, chosen by whether `viewMoreHref` is passed:
 *
 * - **Condensed** (Dashboard). A capped set of tiles ending in a "View more"
 *   link out to the full board. No expander, because the destination is a page
 *   rather than the rest of this grid.
 * - **Full** (Market Pulse). Every row, with the inline expander for anything
 *   past the first two rows.
 *
 * Every live tile opens the instrument in the Asset Centre either way.
 */
export function WeatherSnapshotBoard({
  weather,
  tiles,
  rows,
  maxTiles,
  viewMoreHref,
  defaultExpanded = false,
  interleave,
}: {
  weather: WeatherReading;
  tiles: Record<string, MacroTile>;
  rows: string[][];
  /** Cap the tiles shown. Ignored when the board is expanded. */
  maxTiles?: number;
  /**
   * Turns the panel into the condensed shape: the expander is replaced by a
   * full-width link to the full board (owner, 5 Aug 2026, "condense the cards
   * and have a View More option").
   */
  viewMoreHref?: string;
  /** Open with every row already showing. The full-board destination wants this. */
  defaultExpanded?: boolean;
  /**
   * Rendered between the tiles and the "View more" link.
   *
   * The owner drew a line on the mobile Dashboard directly under the SILVER /
   * BOE RATE row and asked for Market Pulse there. Those are the last two tiles
   * of the condensed set, so "after the tiles" and "on his line" are now the
   * same place. On wider screens the right-hand rail already carries the feed,
   * so the caller hides this.
   */
  interleave?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const style = WEATHER_STYLES[weather.state];
  const Icon = style.icon;
  const flatKeys = (expanded ? rows : rows.slice(0, 2)).flat();
  const visibleKeys = maxTiles != null && !expanded ? flatKeys.slice(0, maxTiles) : flatKeys;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Weather Outside
            <span title="Before you pick a stock, understand the weather outside.">
              <Info className="h-3 w-3" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${style.chip}`}>
              <Icon className={`h-6 w-6 ${style.accent}`} />
            </span>
            <div>
              <div className={`text-2xl font-black tracking-tight ${style.accent}`}>{weather.title}</div>
              <div className="text-sm text-muted-foreground">{weather.line1} {weather.line2}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Market Mood: <span className={`font-bold ${style.accent}`}>{weather.mood}</span>
          </div>
        </div>
        {!viewMoreHref && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/40"
          >
            {expanded ? 'Show less' : 'View full market dashboard'}
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* One flat grid rather than one grid per row of five. The rows are only a
          fixed ordering, not a grouping, so flattening lets a wide screen fit
          ten across instead of five and keeps the panel short. Breakpoints
          allow for the 288px sidebar: xl is ~1000px of usable width, not 1280. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {visibleKeys.map((key) => {
          const tile = tiles[key];
          return tile ? <Tile key={key} tile={tile} /> : null;
        })}
      </div>

      {/* Closes the tiles, so it must sit above anything interleaved. Below the
          news card it reads as if "tap any item" meant the headlines. */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>All prices delayed by up to 15 minutes.</span>
        <span>Tap any item to view in the Asset Centre.</span>
      </div>

      {interleave && <div className="mt-4">{interleave}</div>}

      {viewMoreHref && (
        <Link
          href={viewMoreHref}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-muted/60"
        >
          View more <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
