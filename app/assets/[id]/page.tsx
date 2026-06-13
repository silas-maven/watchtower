'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
  snapshots: Snapshot[];
  stats: { beta: number | null; low52: number | null; high52: number | null; pe: number | null; volumeAvg: number | null; marketCap: number | null };
};

type InsightPayload = { summary: string; bullets: string[]; confidence: number; model: string };
type ChartPoint = { date: string; close: number };

const RANGES = ['1mo', '3mo', '6mo', '1y'] as const;
type Range = (typeof RANGES)[number];

function fmt(n: number | null | undefined) {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<AssetPayload | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>('3mo');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [insight, setInsight] = useState<InsightPayload | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAsset(true);
      try {
        const res = await fetch(`/api/assets/${id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.ok && json.data?.asset) setAsset(json.data.asset);
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
        <Link href="/app/assets" className="text-sm font-semibold text-primary">← Asset Library</Link>
      </div>
    );
  }

  const signalTone = latest?.signalState === 'BUY' ? 'emerald' : latest?.signalState === 'SELL' ? 'rose' : latest?.signalState === 'BOTH' ? 'blue' : 'zinc';
  const change = latest?.dailyChangePct;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/app/assets" className="text-sm font-semibold text-primary">← Asset Library</Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{asset.symbol} <span className="text-muted-foreground">·</span> {asset.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="zinc">{asset.assetType}</Badge>
            <Badge tone="blue">{asset.currency}</Badge>
            {latest?.signalState && latest.signalState !== 'NONE' && <Badge tone={signalTone}>{latest.signalState}</Badge>}
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
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} domain={['dataMin', 'dataMax']} width={48} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--foreground)' }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
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
            <Row label="PE" value={fmt(asset.stats.pe)} />
          </div>
        </Card>
      </div>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
