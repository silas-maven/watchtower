'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { CandleChart, type AlertLine } from '@/components/charts/CandleChart';
import { GeneratePitchButton } from '@/components/assets/GeneratePitch';
import type { FxRates } from '@/lib/portfolio';
import type { Ohlc } from '@/lib/indicators';

// Client-safe GBP conversion (lib/market/fx pulls in the server-only Yahoo
// client, so it cannot be imported here). Rates are GBP-per-unit from /api/market/fx.
function toGbp(value: number | null, currency: string, rates: FxRates): number | null {
  if (value == null) return null;
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return value;
  if (ccy === 'GBX') return value / 100;
  if (ccy === 'USD') return value / rates.USD;
  if (ccy === 'EUR') return value / rates.EUR;
  if (ccy === 'CAD' && rates.CAD) return value / rates.CAD;
  return value;
}

export type PositionHolding = {
  id: string;
  portfolioKind: 'REAL' | 'VIRTUAL';
  shares: number | null;
  averagePrice: number | null;
  investedGBP: number | null;
  spartanEnabled: boolean;
};

export type PositionPlan = {
  id: string;
  basePrice: number | null;
  targetSellPrice: number | null;
  currency: string;
  tranches: Array<{ orderIndex: number; price: number; budgetGBP: number | null; executed: boolean }>;
};

export type PositionPayload = {
  holdings: PositionHolding[];
  plan: PositionPlan | null;
  lastSignalEvent: { eventType: string; toState: string; occurredAt: string; price: number | null } | null;
};

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const cur = (c: string) => SYMBOLS[c] ?? `${c} `;

function fmt(n: number | null | undefined, dp = 2) {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function zoneBadge(state: string): { label: string; className: string } {
  if (state === 'BUY') return { label: 'BUY ZONE', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
  if (state === 'SELL') return { label: 'SELL ZONE', className: 'bg-rose-500/10 text-rose-500 border-rose-500/30' };
  if (state === 'BOTH') return { label: 'BUY + SELL ZONE', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' };
  return { label: 'WATCHLIST', className: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };
}

/**
 * Price Alerts view: buy/sell alert cards + labelled lines on the chart,
 * position summary (live/virtual/both), Spartan signal badge, Spartan tranche
 * tracker, and the last triggered alert.
 */
export function PriceAlertsView({
  assetId,
  symbol,
  currency,
  currentPrice,
  targetEntry,
  targetExit,
  signalState,
  position,
}: {
  assetId: string;
  symbol: string;
  currency: string;
  currentPrice: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  signalState: string;
  position: PositionPayload | null;
}) {
  const [points, setPoints] = useState<Ohlc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [fx, setFx] = useState<FxRates>({ USD: 1.27, EUR: 1.17, CAD: 1.84 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, fxRes] = await Promise.all([
        fetch(`/api/assets/${assetId}/history?range=6mo&interval=1d`, { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/market/fx').then((r) => r.json()).catch(() => null),
      ]);
      if (historyRes?.ok) setPoints(historyRes.data.points ?? []);
      if (fxRes?.ok && fxRes.data.fx) setFx(fxRes.data.fx);
    } catch {
      /* keep previous data */
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const plan = position?.plan ?? null;
  const holdings = useMemo(() => position?.holdings ?? [], [position]);
  const lastEvent = position?.lastSignalEvent ?? null;

  const priceLines = useMemo(() => {
    if (!showLines) return [];
    const lines: AlertLine[] = [];
    // Buy alerts: the primary target entry plus averaging-plan tranches.
    if (targetEntry != null) lines.push({ price: targetEntry, color: '#3b82f6', title: 'Buy alert' });
    if (plan) {
      plan.tranches.forEach((t, i) => {
        if (t.price !== targetEntry) lines.push({ price: t.price, color: '#3b82f6', title: `Buy alert ${i + 1}` });
      });
    }
    if (targetExit != null) lines.push({ price: targetExit, color: '#f43f5e', title: 'Sell alert' });
    if (plan?.targetSellPrice != null && plan.targetSellPrice !== targetExit) {
      lines.push({ price: plan.targetSellPrice, color: '#f43f5e', title: 'Sell target' });
    }
    return lines;
  }, [showLines, targetEntry, targetExit, plan]);

  // Position aggregation across live + virtual holdings.
  const positionSummary = useMemo(() => {
    const withData = holdings.filter((h) => h.shares != null && h.shares > 0);
    if (withData.length === 0) return null;
    const kinds = new Set(withData.map((h) => h.portfolioKind));
    const portfolioType = kinds.size === 2 ? 'Both' : kinds.has('VIRTUAL') ? 'Virtual Portfolio' : 'Live Portfolio';
    const totalShares = withData.reduce((s, h) => s + (h.shares ?? 0), 0);
    const weightedAvg =
      totalShares > 0 ? withData.reduce((s, h) => s + (h.averagePrice ?? 0) * (h.shares ?? 0), 0) / totalShares : null;
    const investedGBP = withData.reduce((s, h) => s + (h.investedGBP ?? 0), 0);
    let plGBP: number | null = null;
    let plPct: number | null = null;
    if (currentPrice != null && weightedAvg != null && weightedAvg > 0) {
      plPct = ((currentPrice - weightedAvg) / weightedAvg) * 100;
      const valueGBP = toGbp(totalShares * currentPrice, currency, fx);
      const costGBP = investedGBP > 0 ? investedGBP : toGbp(totalShares * weightedAvg, currency, fx);
      if (valueGBP != null && costGBP != null) plGBP = valueGBP - costGBP;
    }
    return { portfolioType, weightedAvg, plGBP, plPct, totalShares };
  }, [holdings, currentPrice, currency, fx]);

  const tracker = useMemo(() => {
    if (!plan || plan.tranches.length === 0) return null;
    const total = plan.tranches.reduce((s, t) => s + (t.budgetGBP ?? 0), 0);
    const invested = plan.tranches.filter((t) => t.executed).reduce((s, t) => s + (t.budgetGBP ?? 0), 0);
    return { total, invested, pct: total > 0 ? (invested / total) * 100 : 0 };
  }, [plan]);

  const zone = zoneBadge(signalState);
  const plTone = (v: number | null) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-emerald-500' : 'text-rose-500');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GeneratePitchButton assetId={assetId} symbol={symbol} />
      </div>
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Price alerts">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Buy alert
              </span>
              <span className="font-mono font-semibold text-foreground">{targetEntry == null ? '—' : `${cur(currency)}${fmt(targetEntry, 4)}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> Sell alert
              </span>
              <span className="font-mono font-semibold text-foreground">{targetExit == null ? '—' : `${cur(currency)}${fmt(targetExit, 4)}`}</span>
            </div>
            <label className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <input type="checkbox" checked={showLines} onChange={() => setShowLines((v) => !v)} className="accent-primary" />
              Show price alerts on chart
            </label>
          </div>
        </Card>

        <Card title="Your position">
          {positionSummary ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average price</span>
                <span className="font-mono font-semibold text-foreground">{cur(currency)}{fmt(positionSummary.weightedAvg, 4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio</span>
                <span className="font-semibold text-foreground">{positionSummary.portfolioType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unrealised P/L</span>
                <span className={`font-mono font-semibold ${plTone(positionSummary.plGBP)}`}>
                  {positionSummary.plGBP == null
                    ? '—'
                    : `${positionSummary.plGBP >= 0 ? '+' : '-'}£${fmt(Math.abs(positionSummary.plGBP))}`}
                  {positionSummary.plPct != null && (
                    <span className="ml-1 text-xs">({positionSummary.plPct >= 0 ? '+' : ''}{fmt(positionSummary.plPct)}%)</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No current position.</div>
          )}
        </Card>

        <Card title="Spartan signal">
          <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${zone.className}`}>
            <span className="inline-block h-2 w-2 rounded-full bg-current" /> {zone.label}
          </div>
          {lastEvent && (
            <div className="mt-3 text-xs text-muted-foreground">
              {lastEvent.toState === 'SELL' ? 'Sell' : lastEvent.toState === 'BUY' ? 'Buy' : 'Signal'} alert triggered {daysAgo(lastEvent.occurredAt)}
              {lastEvent.price != null && <> at {cur(currency)}{fmt(lastEvent.price, 4)}</>}
            </div>
          )}
        </Card>
      </div>

      {/* Chart with alert lines */}
      {loading ? (
        <div className="grid h-80 place-items-center text-sm text-muted-foreground">Loading chart…</div>
      ) : (
        <CandleChart data={points} priceLines={priceLines} height={380} />
      )}

      {/* Spartan tracker */}
      {plan && tracker && (
        <Card
          title="Spartan position tracker"
          right={
            <Link href={`/app/portfolio-tools/average-calculator?assetId=${assetId}`} className="text-xs font-semibold text-primary hover:underline">
              Open plan →
            </Link>
          }
        >
          <div className="space-y-2 text-sm">
            {plan.tranches.map((t, i) => (
              <div key={t.orderIndex} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Tranche {i + 1}{t.budgetGBP != null && <> (£{fmt(t.budgetGBP, 0)})</>} · {cur(plan.currency)}{fmt(t.price, 4)}
                </span>
                {t.executed ? <Badge tone="emerald">Bought</Badge> : <Badge tone="zinc">Pending</Badge>}
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Invested: £{fmt(tracker.invested, 0)} / £{fmt(tracker.total, 0)}</span>
                <span>{fmt(tracker.pct, 0)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, tracker.pct)}%` }} />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
