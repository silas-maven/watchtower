'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Bell, CandlestickChart, TrendingUp } from 'lucide-react';
import { latestStochasticK } from '@/lib/indicators';
import { marketCapLabel } from '@/lib/marketCap';
import { IndicatorView } from '@/components/assets/IndicatorView';
import { PriceAlertsView, type PositionPayload } from '@/components/assets/PriceAlertsView';

type Snapshot = {
  capturedAt: string;
  currentPrice: number | null;
  dailyChangePct: number | null;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
};

type AssetPayload = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: string;
  currency: string;
  brokerEntryPrice: number | null;
  averageEntryPrice: number | null;
  shares: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  signalOverride: string | null;
  snapshots: Snapshot[];
  stats: {
    beta: number | null;
    low52: number | null;
    high52: number | null;
    pe: number | null;
    volumeAvg: number | null;
    marketCap: number | null;
    ma50: number | null;
    ma200: number | null;
    dividendYield: number | null;
    quickRatio: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    sectorPE: number | null;
    nextEarningsDate: string | null;
  };
};

type InsightPayload = { summary: string; bullets: string[]; confidence: number; model: string };
type ChartPoint = { date: string; open: number; high: number; low: number; close: number };

const RANGES = ['1mo', '3mo', '6mo', '1y'] as const;
type Range = (typeof RANGES)[number];

type View = 'history' | 'indicator' | 'alerts';

const VIEWS: Array<{ value: View; label: string; icon: typeof TrendingUp }> = [
  { value: 'history', label: 'Price history', icon: TrendingUp },
  { value: 'indicator', label: 'Indicator view', icon: CandlestickChart },
  { value: 'alerts', label: 'Price alerts', icon: Bell },
];

function fmt(n: number | null | undefined) {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function initialView(param: string | null): View {
  return param === 'indicator' || param === 'alerts' || param === 'history' ? param : 'history';
}

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [asset, setAsset] = useState<AssetPayload | null>(null);
  const [position, setPosition] = useState<PositionPayload | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>('3mo');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [insight, setInsight] = useState<InsightPayload | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [view, setView] = useState<View>(() => initialView(searchParams.get('view')));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAsset(true);
      try {
        const res = await fetch(`/api/assets/${id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.ok && json.data?.asset) {
          setAsset(json.data.asset);
          setPosition(json.data.position ?? null);
        }
      } finally {
        if (!cancelled) setLoadingAsset(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/assets/${id}/history?range=${range}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setHistory(json.data.points ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }, [id, range]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const latest = asset?.snapshots[0];

  async function generateInsight() {
    if (!asset) return;
    setLoadingInsight(true);
    setInsight(null);
    try {
      const res = await fetch('/api/ai-insight', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assetId: asset.id }) });
      const json = await res.json();
      if (json.ok && json.data) setInsight(json.data);
    } finally {
      setLoadingInsight(false);
    }
  }

  if (loadingAsset) return <div className="text-sm text-muted-foreground">Loading asset…</div>;
  if (!asset) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Asset not found or unavailable.</div>
        <Link href="/app/assets" className="text-sm font-semibold text-primary">← Asset Centre</Link>
      </div>
    );
  }

  const signalState = asset.signalState ?? latest?.signalState ?? 'NONE';
  const signalTone = signalState === 'BUY' ? 'emerald' : signalState === 'SELL' ? 'rose' : signalState === 'BOTH' ? 'blue' : 'zinc';
  const change = latest?.dailyChangePct;
  const stochK = history.length >= 16 ? latestStochasticK(history) : null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/app/assets" className="text-sm font-semibold text-primary">← Asset Centre</Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{asset.symbol} <span className="text-muted-foreground">·</span> {asset.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="zinc">{asset.assetType}</Badge>
            <Badge tone="blue">{asset.currency}</Badge>
            {signalState !== 'NONE' && <Badge tone={signalTone}>{signalState}</Badge>}
            {asset.signalOverride && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Owner call</span>}
          </div>
          {asset.reason && <div className="mt-2 max-w-xl text-sm text-muted-foreground">{asset.reason}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{fmt(latest?.currentPrice)} {asset.currency}</div>
          <div className={`text-sm font-mono ${change == null ? 'text-muted-foreground' : change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {change == null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change)}%`}
          </div>
          {latest && <div className="mt-1 text-xs text-muted-foreground">Updated {new Date(latest.capturedAt).toLocaleString()}</div>}
        </div>
      </div>

      {/* View selector */}
      <div className="flex flex-wrap gap-2">
        {VIEWS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setView(value)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              view === value
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`h-4 w-4 ${view === value ? 'text-primary' : ''}`} />
            {label}
          </button>
        ))}
      </div>

      {view === 'history' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card
              title="Price history"
              right={
                <div className="flex gap-1">
                  {RANGES.map((r) => (
                    <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2 py-1 text-xs font-semibold transition ${range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{r}</button>
                  ))}
                </div>
              }
            >
              <div className="h-64 w-full">
                {loadingHistory ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading chart…</div>
                ) : history.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No price history available for this asset.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={40} />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        domain={['auto', 'auto']}
                        width={56}
                        tickFormatter={(v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--muted-foreground)' }}
                        formatter={(value) => [Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }), 'close']}
                      />
                      <Line type="monotone" dataKey="close" stroke="var(--primary)" strokeWidth={2} dot={false} />
                      {asset.targetEntry != null && <ReferenceLine y={asset.targetEntry} stroke="#10b981" strokeDasharray="4 4" />}
                      {asset.targetExit != null && <ReferenceLine y={asset.targetExit} stroke="#f43f5e" strokeDasharray="4 4" />}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Live daily closes from market data. Green line = target entry, red = target exit.</div>
            </Card>
          </div>

          <Card title="Key fields">
            <div className="space-y-3 text-sm">
              <Row label="Entry (broker)" value={fmt(asset.brokerEntryPrice)} />
              <Row label="Avg entry" value={fmt(asset.averageEntryPrice)} />
              <Row label="Shares" value={fmt(asset.shares)} />
              <Row label="Target entry" value={fmt(asset.targetEntry)} />
              <Row label="Target exit" value={fmt(asset.targetExit)} />
              <Row label="52w low/high" value={`${fmt(asset.stats.low52)} / ${fmt(asset.stats.high52)}`} />
              <Row label="Beta" value={fmt(asset.stats.beta)} />
              <Row label="Market Cap" value={marketCapLabel(asset.stats.marketCap, asset.currency)} />
              <Row label="P/E Ratio" value={fmt(asset.stats.pe)} />
              <Row label="Sector P/E Ratio" value={fmt(asset.stats.sectorPE)} />
              <Row label="50d moving average" value={fmt(asset.stats.ma50)} />
              <Row label="200d moving average" value={fmt(asset.stats.ma200)} />
              <Row label="Quick ratio" value={fmt(asset.stats.quickRatio)} />
              <Row label="Current ratio" value={fmt(asset.stats.currentRatio)} />
              <Row label="D/E ratio" value={fmt(asset.stats.debtToEquity)} />
              <Row
                label="Next earnings date"
                value={asset.stats.nextEarningsDate ? new Date(asset.stats.nextEarningsDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              />
              <Row label="Dividend yield" value={asset.stats.dividendYield == null ? '—' : `${fmt(asset.stats.dividendYield)}%`} />
              <Row
                label="Stochastic (8,5,5)"
                value={stochK == null ? '—' : fmt(stochK)}
                valueClass={stochK == null ? undefined : stochK >= 80 ? 'text-rose-500' : stochK <= 20 ? 'text-emerald-500' : undefined}
              />
            </div>
          </Card>
        </div>
      )}

      {view === 'indicator' && (
        <Card title="Indicator view">
          <IndicatorView assetId={asset.id} />
        </Card>
      )}

      {view === 'alerts' && (
        <PriceAlertsView
          assetId={asset.id}
          symbol={asset.symbol}
          currency={asset.currency}
          currentPrice={latest?.currentPrice ?? null}
          targetEntry={asset.targetEntry}
          targetExit={asset.targetExit}
          signalState={signalState}
          position={position}
        />
      )}

      <Card
        title="AI read"
        right={
          <button onClick={generateInsight} disabled={loadingInsight} className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60">
            {loadingInsight ? 'Generating…' : 'Generate'}
          </button>
        }
      >
        {!insight && <div className="text-sm text-muted-foreground">Generate an AI read on this asset. Falls back to a deterministic summary if the model is unavailable.</div>}
        {insight && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">{insight.summary}</div>
            <div className="text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Confidence: {insight.confidence}%</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">{insight.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="text-xs text-muted-foreground">Model: {insight.model}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${valueClass ?? 'text-foreground'}`}>{value}</span>
    </div>
  );
}
