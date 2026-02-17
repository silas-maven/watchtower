import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { portfolioConfig, watchlist } from '@/lib/mock';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Page() {
  const invested = watchlist.reduce((acc, r) => acc + (r.currentCostGBP ?? 0), 0);
  const value = watchlist.reduce((acc, r) => acc + (r.currentValueGBP ?? 0), 0);
  const cash = portfolioConfig.portfolioSize - invested;
  const retPct = portfolioConfig.portfolioSize ? ((value - invested) / portfolioConfig.portfolioSize) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Mock-up based on the spreadsheet: portfolio summary, watchlist rows, trade alerts, and AI-style daily briefs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Portfolio Size" right={<span className="text-zinc-600">{portfolioConfig.currency}</span>}>
          <div className="text-lg font-semibold">£{fmt(portfolioConfig.portfolioSize)}</div>
          <div className="mt-1 text-xs text-zinc-500">Max/stock £{fmt(portfolioConfig.maxPerStock)} · Min entry £{fmt(portfolioConfig.minEntry)}</div>
        </Card>
        <Card title="Invested">
          <div className="text-lg font-semibold">£{fmt(invested)}</div>
          <div className="mt-1 text-xs text-zinc-500">Value £{fmt(value)}</div>
        </Card>
        <Card title="Cash">
          <div className="text-lg font-semibold">£{fmt(cash)}</div>
          <div className="mt-1 text-xs text-zinc-500">Target holdings {portfolioConfig.targetHoldings}</div>
        </Card>
        <Card title="Return (mock)">
          <div className={`text-lg font-semibold ${retPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{retPct >= 0 ? '+' : ''}{fmt(retPct)}%</div>
          <div className="mt-1 text-xs text-zinc-500">Computed from mocked cost/value</div>
        </Card>
      </div>

      <Card title="Trade Alerts" right={<Link href="/summary" className="text-blue-700 font-semibold">View daily brief →</Link>}>
        <div className="flex flex-wrap gap-2">
          {watchlist.filter(r => r.tradeAlert !== 'NONE').map(r => (
            <Badge key={r.id} tone={r.tradeAlert === 'BUY' ? 'emerald' : 'rose'}>
              {r.ticker} · {r.tradeAlert}
            </Badge>
          ))}
          {watchlist.filter(r => r.tradeAlert !== 'NONE').length === 0 && (
            <div className="text-sm text-zinc-600">No active alerts.</div>
          )}
        </div>
      </Card>

      <Card title="Watchlist">
        <div className="divide-y divide-zinc-100">
          {watchlist.map((r) => (
            <Link key={r.id} href={`/assets/${r.id}`} className="block py-3 hover:bg-zinc-50/60 -mx-2 px-2 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{r.ticker}</div>
                    <Badge tone="zinc">{r.assetType}</Badge>
                    {r.tradeAlert !== 'NONE' && (
                      <Badge tone={r.tradeAlert === 'BUY' ? 'emerald' : 'rose'}>{r.tradeAlert}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">{r.name}</div>
                  {r.reason && <div className="mt-1 text-xs text-zinc-500">{r.reason}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {r.currentPrice == null ? '—' : fmt(r.currentPrice)} {r.ccy}
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

      <Card title="Next (automation)">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Replace formula pulls with a market data refresh job</li>
          <li>Daily AI brief: buy/sell, new/dropped, anomalies, earnings soon, FX exposure</li>
          <li>Admin inputs: targets/levels/notes → alert evaluation</li>
        </ul>
      </Card>
    </div>
  );
}
