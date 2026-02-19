'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  stats: {
    beta: number | null;
    low52: number | null;
    high52: number | null;
    pe: number | null;
    volumeAvg: number | null;
    marketCap: number | null;
  };
};

type InsightPayload = {
  summary: string;
  bullets: string[];
  confidence: number;
  model: string;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<AssetPayload | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [insight, setInsight] = useState<InsightPayload | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingAsset(true);
      try {
        const res = await fetch(`/api/assets/${id}`, { cache: 'no-store' });
        const json = (await res.json()) as { ok: boolean; data?: { asset: AssetPayload } };
        if (!cancelled && json.ok && json.data?.asset) {
          setAsset(json.data.asset);
        }
      } finally {
        if (!cancelled) setLoadingAsset(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const latest = asset?.snapshots[0];

  const series = useMemo(
    () =>
      (asset?.snapshots ?? [])
        .slice()
        .reverse()
        .map((s, idx) => ({ day: idx + 1, price: s.currentPrice ?? 0 }))
        .filter((s) => s.price > 0),
    [asset],
  );

  async function generateInsight() {
    if (!asset) return;
    setLoadingInsight(true);
    setInsight(null);
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id }),
      });
      const json = (await res.json()) as { ok: boolean; data?: InsightPayload };
      if (json.ok && json.data) {
        setInsight(json.data);
      }
    } finally {
      setLoadingInsight(false);
    }
  }

  if (loadingAsset) {
    return <div className="text-sm text-zinc-600">Loading asset…</div>;
  }

  if (!asset || !latest) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-zinc-600">Asset not found or unavailable for this session.</div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Back</Link>
      </div>
    );
  }

  const signalTone = latest.signalState === 'BUY' ? 'emerald' : latest.signalState === 'SELL' ? 'rose' : latest.signalState === 'BOTH' ? 'blue' : 'zinc';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{asset.symbol} <span className="text-zinc-500">·</span> {asset.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="zinc">{asset.assetType}</Badge>
            <Badge tone="blue">{asset.currency}</Badge>
            {latest.signalState !== 'NONE' && <Badge tone={signalTone}>{latest.signalState}</Badge>}
          </div>
          {asset.reason && <div className="mt-2 text-sm text-zinc-600">{asset.reason}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{latest.currentPrice == null ? '—' : fmt(latest.currentPrice)} {asset.currency}</div>
          <div className={`text-sm ${(latest.dailyChangePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {latest.dailyChangePct == null ? '—' : `${latest.dailyChangePct >= 0 ? '+' : ''}${fmt(latest.dailyChangePct)}%`}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Updated {new Date(latest.capturedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="30-point trend">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={['dataMin', 'dataMax']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#1f6feb" strokeWidth={2} dot={false} />
                  {asset.targetEntry != null && <ReferenceLine y={asset.targetEntry} stroke="#10b981" strokeDasharray="4 4" />}
                  {asset.targetExit != null && <ReferenceLine y={asset.targetExit} stroke="#f43f5e" strokeDasharray="4 4" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-zinc-500">Green = target entry, red = target exit.</div>
          </Card>
        </div>

        <Card title="Key fields">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-600">Entry (broker)</span><span className="font-semibold">{asset.brokerEntryPrice ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Avg entry</span><span className="font-semibold">{asset.averageEntryPrice ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Shares</span><span className="font-semibold">{asset.shares ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Target entry</span><span className="font-semibold">{asset.targetEntry ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Target exit</span><span className="font-semibold">{asset.targetExit ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">52w low/high</span><span className="font-semibold">{asset.stats.low52 ?? '—'} / {asset.stats.high52 ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Beta</span><span className="font-semibold">{asset.stats.beta ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">PE</span><span className="font-semibold">{asset.stats.pe ?? '—'}</span></div>
          </div>
        </Card>
      </div>

      <Card
        title="AI Sweep"
        right={
          <button
            onClick={generateInsight}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {loadingInsight ? 'Generating…' : 'Generate'}
          </button>
        }
      >
        {!insight && <div className="text-sm text-zinc-600">Generate an insight using gpt-5-nano-2025-08-07 (or deterministic fallback).</div>}
        {insight && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">{insight.summary}</div>
            <div className="text-sm text-zinc-700">
              <div className="font-semibold">Confidence: {insight.confidence}%</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {insight.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
            <div className="text-xs text-zinc-500">Model: {insight.model}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
