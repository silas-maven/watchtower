'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { GeneratePitchButton } from '@/components/assets/GeneratePitch';
import { DEFAULT_ASSET_FILTERS, assetClassLabel, matchesAssetFilters, productLabel, type AssetFilters } from '@/lib/assetClass';
import { formatMarketCap } from '@/lib/marketCap';

export type LibraryRow = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  ownerCall: boolean;
  currentPrice: number | null;
  dailyChangePct: number | null;
  dailyLow: number | null;
  dailyHigh: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  low52: number | null;
  high52: number | null;
  marketCap: number | null;
};

function fmt(n: number | null | undefined) {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function tone(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export function AssetLibraryTable({ rows }: { rows: LibraryRow[] }) {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_ASSET_FILTERS);

  const currencies = useMemo(() => [...new Set(rows.map((r) => r.currency.toUpperCase()))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((r) => matchesAssetFilters(r, filters)), [rows, filters]);

  return (
    <div className="space-y-4">
      <AssetFilterBar filters={filters} onChange={setFilters} currencies={currencies} />

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No assets match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Asset</th>
                <th className="py-3 pr-4">Asset Class</th>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Signal</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Market Cap</th>
                <th className="py-3 pr-4">Day range</th>
                <th className="py-3 pr-4">Targets</th>
                <th className="py-3 pr-4">52w</th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/50 align-top transition hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <Link href={`/assets/${row.id}`} className="font-semibold text-foreground hover:text-primary">{row.symbol}</Link>
                    <div className="text-xs text-muted-foreground">{row.name}</div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{assetClassLabel(row.assetType)}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{productLabel(row.assetType)}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={tone(row.signalState)}>{row.signalState}</Badge>
                    {row.ownerCall && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Owner call</div>}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-mono font-semibold text-foreground">{fmt(row.currentPrice)} {row.currency}</div>
                    <div className={`font-mono text-xs ${row.dailyChangePct == null ? 'text-muted-foreground' : row.dailyChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.dailyChangePct == null ? '—' : `${row.dailyChangePct >= 0 ? '+' : ''}${fmt(row.dailyChangePct)}%`}
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{formatMarketCap(row.marketCap, row.currency)}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{fmt(row.dailyLow)} - {fmt(row.dailyHigh)}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">Entry {fmt(row.targetEntry)} · Exit {fmt(row.targetExit)}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{fmt(row.low52)} / {fmt(row.high52)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/assets/${row.id}`} className="text-xs font-semibold text-primary hover:underline">Open</Link>
                      <GeneratePitchButton assetId={row.id} symbol={row.symbol} compact />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
