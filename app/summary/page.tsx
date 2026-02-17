import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { assets, mockAlerts } from '@/lib/mock';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function SummaryPage() {
  const alerts = mockAlerts();
  const buy = alerts.filter(a => a.kind === 'ENTER_BUY_ZONE');
  const sell = alerts.filter(a => a.kind === 'ENTER_SELL_ZONE');

  // Purely mocked “diff” to visualise the requirement.
  const newToday = ['NVDA'];
  const droppedOff = ['SPY'];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Daily Summary (mock)</h1>
          <p className="mt-1 text-sm text-zinc-600">
            This page simulates the “AI sweep” of the watchlist: what’s currently buy/sell, what’s new, what dropped off.
          </p>
        </div>
        <Badge tone="blue">Simulated</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Current BUY alerts">
          {buy.length === 0 ? (
            <div className="text-sm text-zinc-600">None.</div>
          ) : (
            <div className="space-y-2">
              {buy.map(a => (
                <div key={a.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{a.symbol}</div>
                    <div className="text-sm font-semibold">{fmt(a.price)}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">Entered buy zone near {a.level}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Current SELL alerts">
          {sell.length === 0 ? (
            <div className="text-sm text-zinc-600">None.</div>
          ) : (
            <div className="space-y-2">
              {sell.map(a => (
                <div key={a.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{a.symbol}</div>
                    <div className="text-sm font-semibold">{fmt(a.price)}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">Approaching/entered sell zone near {a.level}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="New today">
          <div className="flex flex-wrap gap-2">
            {newToday.map(s => <Badge key={s} tone="emerald">{s}</Badge>)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">Mocked list — real build would diff yesterday vs today.</div>
        </Card>
        <Card title="Dropped off">
          <div className="flex flex-wrap gap-2">
            {droppedOff.map(s => <Badge key={s} tone="rose">{s}</Badge>)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">Mocked list — real build would diff yesterday vs today.</div>
        </Card>
      </div>

      <Card title="AI insights (example)">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Cluster alerts by tag (e.g. AI, Macro) to spot theme risk</li>
          <li>Highlight signals you missed ("entered zone" while you were offline)</li>
          <li>Suggest watchlist hygiene: duplicates, stale entries, missing invalidations</li>
        </ul>
        <div className="mt-3 text-xs text-zinc-500">These bullets are illustrative only.</div>
      </Card>

      <Card title="Watchlist snapshot (mock)">
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.slice(0, 4).map(a => (
            <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{a.symbol}</div>
                <div className="text-sm font-semibold">{fmt(a.price)} {a.currency}</div>
              </div>
              <div className="mt-1 text-xs text-zinc-600">{a.name}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
