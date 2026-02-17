import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SectionTitle } from '@/components/SectionTitle';
import { mockDailyBrief, watchlist, type WatchRow } from '@/lib/mock';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function RowPill({ r }: { r: WatchRow }) {
  const tone = r.tradeAlert === 'BUY' ? 'emerald' : r.tradeAlert === 'SELL' ? 'rose' : 'zinc';
  return (
    <Link href={`/assets/${r.id}`} className="block rounded-xl border border-zinc-200 bg-white p-3 hover:bg-zinc-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold">{r.ticker}</div>
            <Badge tone="zinc">{r.assetType}</Badge>
            {r.tradeAlert !== 'NONE' && <Badge tone={tone as any}>{r.tradeAlert}</Badge>}
          </div>
          <div className="mt-1 text-xs text-zinc-600">{r.name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{r.currentPrice == null ? '—' : fmt(r.currentPrice)} {r.ccy}</div>
          <div className={`text-xs ${(r.dailyChangePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {r.dailyChangePct == null ? '—' : `${r.dailyChangePct >= 0 ? '+' : ''}${fmt(r.dailyChangePct)}%`}
          </div>
        </div>
      </div>
      {(r.targetEntryForAveraging != null || r.targetExit != null) && (
        <div className="mt-2 text-xs text-zinc-500">
          {r.targetEntryForAveraging != null && <span>Target entry: {fmt(r.targetEntryForAveraging)} · </span>}
          {r.targetExit != null && <span>Target exit: {fmt(r.targetExit)}</span>}
        </div>
      )}
    </Link>
  );
}

export default function CommunityPage() {
  const brief = mockDailyBrief();
  const buy = watchlist.filter(r => r.tradeAlert === 'BUY');
  const sell = watchlist.filter(r => r.tradeAlert === 'SELL');

  // Mock “curated watchlist” (per-user) without auth/db.
  const myCurated = watchlist.filter(r => ['jmia', 'kodk'].includes(r.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Community</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Clear buy/sell triggers + a personal shortlist. Deeper analysis is on each asset page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Triggered Alerts" right={<Badge tone="blue">{brief.date}</Badge>}>
          <div className="space-y-3">
            <SectionTitle title="BUY" subtitle="Entries to consider" />
            {buy.length ? buy.map(r => <RowPill key={r.id} r={r} />) : <div className="text-sm text-zinc-600">No BUY alerts.</div>}
            <div className="h-px bg-zinc-100" />
            <SectionTitle title="SELL" subtitle="Trims / exits to consider" />
            {sell.length ? sell.map(r => <RowPill key={r.id} r={r} />) : <div className="text-sm text-zinc-600">No SELL alerts.</div>}
          </div>
        </Card>

        <Card title="My Curated Watchlist" right={<span className="text-xs text-zinc-500">mock</span>}>
          <div className="space-y-3">
            <div className="text-xs text-zinc-600">Member’s personal shortlist from the master list.</div>
            {myCurated.map(r => <RowPill key={r.id} r={r} />)}
            <div className="text-xs text-zinc-500">
              Real build: pin assets, choose alert types, notification preferences.
            </div>
          </div>
        </Card>
      </div>

      <Card title="Daily Brief (AI-style)" right={<Link className="text-sm font-semibold text-blue-700" href="/summary">Open →</Link>}>
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Current buy alerts / sell alerts</li>
          <li>New today / dropped off</li>
          <li>Plain-English notes (volatility, earnings soon, FX)</li>
        </ul>
      </Card>
    </div>
  );
}
