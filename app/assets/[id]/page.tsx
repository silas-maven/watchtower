'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { assets } from '@/lib/mock';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const asset = assets.find(a => a.id === id);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const series = useMemo(() => {
    if (!asset) return [];
    const base = asset.price;
    return Array.from({ length: 30 }).map((_, i) => {
      const noise = (Math.sin(i / 4) + Math.random() - 0.5) * (base * 0.01);
      return { day: i + 1, price: Math.max(1, base + noise - (15 - i) * (base * 0.001)) };
    });
  }, [asset]);

  if (!asset) {
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
        body: JSON.stringify({ assetId: asset.id }),
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
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{asset.symbol} <span className="text-zinc-500">·</span> {asset.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="zinc">{asset.type}</Badge>
            {asset.tags.map(t => <Badge key={t} tone="blue">{t}</Badge>)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{fmt(asset.price)} {asset.currency}</div>
          <div className={`text-sm ${asset.changePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {asset.changePct >= 0 ? '+' : ''}{fmt(asset.changePct)}%
          </div>
          <div className="mt-1 text-xs text-zinc-500">Updated {new Date(asset.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Price (mock)">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={['dataMin', 'dataMax']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#1f6feb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-zinc-500">Mock series just to visualise UI.</div>
          </Card>
        </div>
        <Card title="Levels">
          <div className="space-y-3">
            {asset.levels.map(l => (
              <div key={l.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{l.label}</div>
                  <div className="text-sm font-semibold">{fmt(l.price)}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-600">{l.type.replaceAll('_',' ')}</div>
                {l.note && <div className="mt-2 text-xs text-zinc-600">{l.note}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="AI Insight (simulated)"
        right={
          <button
            onClick={generateInsight}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
        }
      >
        {!insight && <div className="text-sm text-zinc-600">Click Generate to simulate an AI summary + bullets.</div>}
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
