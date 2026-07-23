'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { InlineAveragePlan } from '@/components/portfolio/InlineAveragePlan';

export type HoldingRow = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  currency: string;
  shares: number | null;
  averagePrice: number | null;
  currentPrice: number | null;
  costGBP: number | null;
  valueGBP: number | null;
  profitGBP: number | null;
  returnPct: number | null;
  weightPct: number | null;
  beta: number | null;
  nextBuyPrice: number | null;
  sellTarget: number | null;
  spartanEnabled: boolean;
  averagePlanId: string | null;
  hasPlan: boolean;
  signalState: string;
};

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;

function toneForSignal(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export function HoldingsTable({
  holdings,
  displayCurrency,
  gbpRate,
  onUpdated,
  onRemove,
  onRefresh,
  busy,
}: {
  holdings: HoldingRow[];
  displayCurrency: string;
  gbpRate: number;
  onUpdated: (view: unknown) => void;
  onRemove: (assetId: string) => void;
  onRefresh?: () => void;
  busy?: boolean;
}) {
  const { pushToast } = useToast();
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const money = (g: number | null) => (g == null ? '—' : `${sym(displayCurrency)}${(g * gbpRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  const price = (n: number | null, c: string) => (n == null ? '—' : `${sym(c)}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

  async function patchHolding(id: string, body: Record<string, unknown>) {
    setPatchingId(id);
    try {
      const res = await fetch(`/api/me/holdings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.ok) onUpdated(j.data.view);
      else pushToast(j.error?.message ?? 'Could not update holding', 'error');
    } catch {
      pushToast('Could not update holding', 'error');
    } finally {
      setPatchingId(null);
    }
  }

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Asset</th>
            <th className="py-2 pr-3">Signal</th>
            <th className="py-2 pr-3">Shares</th>
            <th className="py-2 pr-3">Avg Price</th>
            <th className="py-2 pr-3">Current Price</th>
            <th className="py-2 pr-3">Value</th>
            <th className="py-2 pr-3">Weight</th>
            <th className="py-2 pr-3">Next Buy</th>
            <th className="py-2 pr-3">Sell Target</th>
            <th className="py-2 pr-3">Avg Plan</th>
            <th className="py-2 pr-3">Spartan</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const rowBusy = busy || patchingId === h.id;
            return (
              <Fragment key={h.id}>
              <tr className="border-b border-border/50 align-top">
                <td className="py-2 pr-3">
                  <Link href={`/assets/${h.assetId}`} className="font-semibold text-foreground hover:text-primary">{h.symbol}</Link>
                  <div className="text-xs text-muted-foreground">{h.currency}</div>
                </td>
                <td className="py-2 pr-3"><Badge tone={toneForSignal(h.signalState)}>{h.signalState}</Badge></td>
                <td className="py-2 pr-3 font-mono">{h.shares ?? '—'}</td>
                <td className="py-2 pr-3 font-mono">{price(h.averagePrice, h.currency)}</td>
                <td className="py-2 pr-3 font-mono">{price(h.currentPrice, h.currency)}</td>
                <td className="py-2 pr-3 font-mono">{money(h.valueGBP)}</td>
                <td className="py-2 pr-3 font-mono text-muted-foreground">{h.weightPct == null ? '—' : `${h.weightPct.toFixed(1)}%`}</td>

                {/* Next Buy: derived (Spartan) read-only; manual editable when Spartan off */}
                <td className="py-2 pr-3 font-mono">
                  {h.spartanEnabled ? (
                    price(h.nextBuyPrice, h.currency)
                  ) : (
                    <input
                      defaultValue={h.nextBuyPrice ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        if (v !== (h.nextBuyPrice ?? null)) patchHolding(h.id, { manualNextBuyPrice: v });
                      }}
                      inputMode="decimal"
                      placeholder="set"
                      className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </td>
                <td className="py-2 pr-3 font-mono">
                  {h.spartanEnabled ? (
                    <span className={h.sellTarget != null ? 'text-emerald-500' : ''}>{price(h.sellTarget, h.currency)}</span>
                  ) : (
                    <input
                      defaultValue={h.sellTarget ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        if (v !== (h.sellTarget ?? null)) patchHolding(h.id, { manualSellTarget: v });
                      }}
                      inputMode="decimal"
                      placeholder="set"
                      className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </td>

                {/* Averaging Plan: expands inline (no navigation) */}
                <td className="py-2 pr-3">
                  <button
                    onClick={() => toggle(h.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40"
                  >
                    {h.hasPlan ? 'View' : 'Create'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedId === h.id ? 'rotate-180' : ''}`} />
                  </button>
                </td>

                {/* Spartan toggle */}
                <td className="py-2 pr-3">
                  <input
                    type="checkbox"
                    checked={h.spartanEnabled}
                    disabled={rowBusy}
                    onChange={() => patchHolding(h.id, { spartanEnabled: !h.spartanEnabled })}
                    className="h-4 w-4 accent-primary"
                    aria-label="Spartan Strategy"
                  />
                </td>

                {/* Status */}
                <td className="py-2 pr-3">
                  {h.hasPlan ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">Plan active</span>
                  ) : (
                    <button onClick={() => toggle(h.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline">
                      Create Average Plan
                    </button>
                  )}
                </td>

                <td className="py-2 pr-3">
                  <button onClick={() => onRemove(h.assetId)} disabled={rowBusy} className="text-rose-500 transition hover:text-rose-400 disabled:opacity-60"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
              {expandedId === h.id && (
                <tr className="border-b border-border/50 bg-muted/10">
                  <td colSpan={13} className="px-3 py-3">
                    <InlineAveragePlan
                      assetId={h.assetId}
                      holdingId={h.id}
                      currency={h.currency}
                      currentPrice={h.currentPrice}
                      onSaved={() => onRefresh?.()}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        Spartan Strategy on = Next Buy &amp; Sell Target come from your averaging plan. Off = set them manually. Prices shown in each stock&rsquo;s currency.
      </p>
    </div>
  );
}
