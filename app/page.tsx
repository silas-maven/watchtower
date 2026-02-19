import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';
import { getAssetsForDashboard, getPortfolioSummary } from '@/lib/server/dashboard';
import { watchlist as mockWatchlist, portfolioConfig } from '@/lib/mock';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toneForState(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default async function Page() {
  await requirePageUser('/');

  const summary = await getPortfolioSummary().catch(() => ({
    portfolioSize: portfolioConfig.portfolioSize,
    invested: mockWatchlist.reduce((acc, r) => acc + (r.currentCostGBP ?? 0), 0),
    value: mockWatchlist.reduce((acc, r) => acc + (r.currentValueGBP ?? 0), 0),
    cash: portfolioConfig.portfolioSize - mockWatchlist.reduce((acc, r) => acc + (r.currentCostGBP ?? 0), 0),
    retPct: 0,
  }));

  const rows = await getAssetsForDashboard().catch(() =>
    mockWatchlist.map((r) => ({
      id: r.id,
      symbol: r.ticker,
      name: r.name,
      reason: r.reason,
      assetType: r.assetType,
      currency: r.ccy,
      targetEntry: r.targetEntryForAveraging,
      targetExit: r.targetExit,
      signalState: r.tradeAlert,
      currentPrice: r.currentPrice,
      dailyChangePct: r.dailyChangePct,
      series30d: r.series30d,
    })),
  );

  const activeAlerts = rows.filter((r) => r.signalState !== 'NONE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Live-backed concept: real market snapshots, deterministic alert logic, and AI daily brief generation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Portfolio Size" right={<span className="text-zinc-600">GBP</span>}>
          <div className="text-lg font-semibold">£{fmt(summary.portfolioSize)}</div>
          <div className="mt-1 text-xs text-zinc-500">POC default config</div>
        </Card>
        <Card title="Invested">
          <div className="text-lg font-semibold">£{fmt(summary.invested)}</div>
          <div className="mt-1 text-xs text-zinc-500">Value £{fmt(summary.value)}</div>
        </Card>
        <Card title="Cash">
          <div className="text-lg font-semibold">£{fmt(summary.cash)}</div>
          <div className="mt-1 text-xs text-zinc-500">Derived from seeded portfolio size</div>
        </Card>
        <Card title="Return">
          <div className={`text-lg font-semibold ${summary.retPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {summary.retPct >= 0 ? '+' : ''}
            {fmt(summary.retPct)}%
          </div>
          <div className="mt-1 text-xs text-zinc-500">Computed from GBP-normalized values</div>
        </Card>
      </div>

      <Card title="Trade Alerts" right={<Link href="/summary" className="text-blue-700 font-semibold">View daily brief →</Link>}>
        <div className="flex flex-wrap gap-2">
          {activeAlerts.map((r) => (
            <Badge key={r.id} tone={toneForState(r.signalState)}>
              {r.symbol} · {r.signalState}
            </Badge>
          ))}
          {activeAlerts.length === 0 && <div className="text-sm text-zinc-600">No active alerts.</div>}
        </div>
      </Card>

      <Card title="Watchlist">
        <div className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <Link key={r.id} href={`/assets/${r.id}`} className="block py-3 hover:bg-zinc-50/60 -mx-2 px-2 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{r.symbol}</div>
                    <Badge tone="zinc">{r.assetType}</Badge>
                    {r.signalState !== 'NONE' && <Badge tone={toneForState(r.signalState)}>{r.signalState}</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">{r.name}</div>
                  {r.reason && <div className="mt-1 text-xs text-zinc-500">{r.reason}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {r.currentPrice == null ? '—' : fmt(r.currentPrice)} {r.currency}
                  </div>
                  <div className={`text-xs ${(r.dailyChangePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {r.dailyChangePct == null ? '—' : `${r.dailyChangePct >= 0 ? '+' : ''}${fmt(r.dailyChangePct)}%`}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card title="POC Runtime">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Supabase Postgres + Prisma models for assets, signals, and subscriptions</li>
          <li>15-minute market refresh job + deterministic signal transitions</li>
          <li>Daily AI brief using gpt-5-nano-2025-08-07 with deterministic fallback</li>
        </ul>
      </Card>

      <Card title="Work Areas">
        <div className="grid gap-2 md:grid-cols-4 text-sm">
          <Link href="/admin" className="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50">
            <div className="font-semibold">Asset Management</div>
            <div className="text-zinc-600 mt-1">Manage master watchlist, targets, and signal operations.</div>
          </Link>
          <Link href="/owner" className="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50">
            <div className="font-semibold">User Management</div>
            <div className="text-zinc-600 mt-1">Manage member access, subscription state, and overdue alerts.</div>
          </Link>
          <Link href="/community" className="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50">
            <div className="font-semibold">Member View</div>
            <div className="text-zinc-600 mt-1">View full list and create personal selected watchlist.</div>
          </Link>
          <Link href="/proof" className="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50">
            <div className="font-semibold">POC Proof</div>
            <div className="text-zinc-600 mt-1">Live acceptance checklist with runtime evidence.</div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
