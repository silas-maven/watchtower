'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatMacroValue, type MacroTile } from '@/lib/market/macroTypes';

type TickerPayload = { tiles: Record<string, MacroTile>; tickerOrder: string[] };

const POLL_MS = 60_000;

function Move({ tile }: { tile: MacroTile }) {
  if (tile.kind === 'static' || tile.changePct == null) {
    return <span className="font-mono text-[11px] text-muted-foreground">{tile.changePct == null ? '—' : `${tile.changePct.toFixed(2)}%`}</span>;
  }
  const up = tile.changePct >= 0;
  return (
    <span className={`font-mono text-[11px] ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(tile.changePct).toFixed(2)}%
    </span>
  );
}

function TickerItem({ tile }: { tile: MacroTile }) {
  const body = (
    <>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tile.label}</span>
      <span className="font-mono text-xs font-semibold text-foreground">{formatMacroValue(tile)}</span>
      <Move tile={tile} />
    </>
  );
  const className = 'flex shrink-0 items-center gap-2 px-4 py-1.5';
  if (tile.assetId) {
    return (
      <Link href={`/assets/${tile.assetId}`} className={`${className} transition hover:bg-muted/40`}>
        {body}
      </Link>
    );
  }
  return <span className={className}>{body}</span>;
}

/**
 * Always-visible market tape under the app header. Scrolls continuously
 * (pauses on hover); on small screens it also side-scrolls by touch. Live
 * items open the instrument in the Asset Centre.
 */
export function TickerStrip() {
  const [payload, setPayload] = useState<TickerPayload | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/market/ticker', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setPayload({ tiles: j.data.tiles, tickerOrder: j.data.tickerOrder });
    } catch {
      /* keep last good tape */
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const id = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [load]);

  if (!payload) return null;

  const tiles = payload.tickerOrder
    .map((key) => payload.tiles[key])
    .filter((t): t is MacroTile => Boolean(t) && t.value != null);
  if (tiles.length === 0) return null;

  return (
    <div className="mk-ticker overflow-hidden border-t border-border bg-card/60">
      <div className="mk-ticker-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1}>
            {tiles.map((tile) => (
              <TickerItem key={`${copy}-${tile.key}`} tile={tile} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
