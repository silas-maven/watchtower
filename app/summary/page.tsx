import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { mockDailyBrief, watchlist } from '@/lib/mock';

export default function SummaryPage() {
  const brief = mockDailyBrief();
  const buyRows = watchlist.filter(r => brief.buy.includes(r.ticker));
  const sellRows = watchlist.filter(r => brief.sell.includes(r.ticker));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Daily Brief (mock)</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Simulates the AI sweep your friend described: current buy/sell alerts, what’s new today, what dropped off.
          </p>
        </div>
        <Badge tone="blue">{brief.date}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="BUY alerts">
          <div className="space-y-2">
            {buyRows.length ? buyRows.map(r => (
              <Link key={r.id} href={`/assets/${r.id}`} className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:bg-zinc-50/60">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{r.ticker}</div>
                  <Badge tone="emerald">BUY</Badge>
                </div>
                <div className="mt-1 text-xs text-zinc-600">Target entry: {r.targetEntryForAveraging ?? '—'} · Reason: {r.reason || '—'}</div>
              </Link>
            )) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>

        <Card title="SELL alerts">
          <div className="space-y-2">
            {sellRows.length ? sellRows.map(r => (
              <Link key={r.id} href={`/assets/${r.id}`} className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:bg-zinc-50/60">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{r.ticker}</div>
                  <Badge tone="rose">SELL</Badge>
                </div>
                <div className="mt-1 text-xs text-zinc-600">Target exit: {r.targetExit ?? '—'} · Reason: {r.reason || '—'}</div>
              </Link>
            )) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="New today">
          <div className="flex flex-wrap gap-2">
            {brief.newToday.map(s => <Badge key={s} tone="emerald">{s}</Badge>)}
          </div>
        </Card>
        <Card title="Dropped off">
          <div className="flex flex-wrap gap-2">
            {brief.droppedOff.map(s => <Badge key={s} tone="rose">{s}</Badge>)}
          </div>
        </Card>
      </div>

      <Card title="Automation notes (simulated AI)">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          {brief.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      </Card>
    </div>
  );
}
