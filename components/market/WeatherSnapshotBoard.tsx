'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, CloudLightning, CloudSun, Info, Snowflake, Sun } from 'lucide-react';
import { formatMacroValue, type MacroTile } from '@/lib/market/macroTypes';
import type { WeatherReading } from '@/lib/market/weather';

const WEATHER_STYLES = {
  SUNNY: { icon: Sun, accent: 'text-emerald-500', chip: 'border-emerald-500/30 bg-emerald-500/10' },
  MIXED: { icon: CloudSun, accent: 'text-amber-500', chip: 'border-amber-500/30 bg-amber-500/10' },
  STORMY: { icon: CloudLightning, accent: 'text-rose-500', chip: 'border-rose-500/30 bg-rose-500/10' },
  FROSTY: { icon: Snowflake, accent: 'text-blue-500', chip: 'border-blue-500/30 bg-blue-500/10' },
} as const;

function Tile({ tile }: { tile: MacroTile }) {
  const up = tile.changePct != null && tile.changePct >= 0;
  const isStatic = tile.kind === 'static';
  const body = (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition hover:bg-muted/40">
      <div className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{tile.label}</div>
      <div className="mt-1 font-mono text-sm font-bold text-foreground">{formatMacroValue(tile)}</div>
      <div className={`mt-0.5 font-mono text-[11px] ${isStatic || tile.changePct == null ? 'text-muted-foreground' : up ? 'text-emerald-500' : 'text-rose-500'}`}>
        {tile.changePct == null ? '—' : `${isStatic ? '' : up ? '▲ ' : '▼ '}${Math.abs(tile.changePct).toFixed(2)}%`}
      </div>
    </div>
  );
  return tile.assetId ? <Link href={`/assets/${tile.assetId}`}>{body}</Link> : body;
}

/**
 * Weather Outside panel + Market Snapshot grid (client feedback section F):
 * rows 1+2 visible by default, "View full market dashboard" reveals row 3.
 * Every live tile opens the instrument in the Asset Centre.
 */
export function WeatherSnapshotBoard({
  weather,
  tiles,
  rows,
}: {
  weather: WeatherReading;
  tiles: Record<string, MacroTile>;
  rows: string[][];
}) {
  const [expanded, setExpanded] = useState(false);
  const style = WEATHER_STYLES[weather.state];
  const Icon = style.icon;
  const visibleRows = expanded ? rows : rows.slice(0, 2);

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
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/40"
        >
          {expanded ? 'Show less' : 'View full market dashboard'}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {visibleRows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {row.map((key) => {
              const tile = tiles[key];
              return tile ? <Tile key={key} tile={tile} /> : null;
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>All prices delayed by up to 15 minutes.</span>
        <span>Tap any item to view in the Asset Centre.</span>
      </div>
    </div>
  );
}
