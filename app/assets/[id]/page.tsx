'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { watchlist } from '@/lib/mock';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const row = watchlist.find(r => r.id === id);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const series = useMemo(() => row?.series30d ?? [], [row]);

  if (!row) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-zinc-600">Asset not found.</div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Back</Link>
      </div>
    );
  }

  async function generateInsight() {
    setLoading(true);
    setInsight(null);
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId: row.id }),
      });
      const json = await res.json();
      setInsight(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{row.ticker} <span className="text-zinc-500">·</span> {row.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="zinc">{row.assetType}</Badge>
            <Badge tone="blue">{row.ccy}</Badge>
            {row.tradeAlert !== 'NONE' && (
              <Badge tone={row.tradeAlert === 'BUY' ? 'emerald' : 'rose'}>{row.tradeAlert}</Badge>
            )}
          </div>
          {row.reason && <div className="mt-2 text-sm text-zinc-600">{row.reason}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{row.currentPrice == null ? '—' : fmt(row.currentPrice)} {row.ccy}</div>
          <div className={`text-sm ${(row.dailyChangePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {row.dailyChangePct == null ? '—' : `${row.dailyChangePct >= 0 ? '+' : ''}${fmt(row.dailyChangePct)}%`}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Updated {new Date(row.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="30-day trend (mock)">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={['dataMin', 'dataMax']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#1f6feb" strokeWidth={2} dot={false} />
                  {row.targetEntryForAveraging != null && <ReferenceLine y={row.targetEntryForAveraging} stroke="#10b981" strokeDasharray="4 4" />}
                  {row.targetExit != null && <ReferenceLine y={row.targetExit} stroke="#f43f5e" strokeDasharray="4 4" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-zinc-500">Green = target entry, red = target exit (mock).</div>
          </Card>
        </div>

        <Card title="Key fields">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-600">Entry (broker)</span><span className="font-semibold">{row.entryPrice ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Avg entry</span><span className="font-semibold">{row.avgEntryPrice ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Shares</span><span className="font-semibold">{row.shares ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Target entry</span><span className="font-semibold">{row.targetEntryForAveraging ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Target exit</span><span className="font-semibold">{row.targetExit ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">52w low/high</span><span className="font-semibold">{row.low52 ?? '—'} / {row.high52 ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Beta</span><span className="font-semibold">{row.beta ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">PE</span><span className="font-semibold">{row.pe ?? '—'}</span></div>
          </div>
        </Card>
      </div>

      <Card
        title="AI Sweep (simulated)"
        right={
          <button
            onClick={generateInsight}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
        }
      >
        {!insight && <div className="text-sm text-zinc-600">Simulates an agent reading the watchlist row and producing a plan.</div>}
        {insight?.ok && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">{insight.summary}</div>
            <div className="text-sm text-zinc-700">
              <div className="font-semibold">Confidence: {insight.confidence}%</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {insight.bullets.map((b: string) => <li key={b}>{b}</li>)}
              </ul>
            </div>
            <div className="text-xs text-zinc-500">Stubbed output — no real model call.</div>
          </div>
        )}
      </Card>
    </div>
  );
}
