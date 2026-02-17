import Link from 'next/link';
import { assets } from '@/lib/mock';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Mock data to visualise the spreadsheet as an app: assets, levels, and alerts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Watchlist" right={<span className="text-zinc-600">{assets.length} assets</span>}>
          <div className="text-sm text-zinc-600">User prefs + filters later.</div>
        </Card>
        <Card title="Alerts" right={<span className="text-zinc-600">Mock stream</span>}>
          <div className="text-sm text-zinc-600">Try <code className="rounded bg-zinc-100 px-1">/api/alerts</code></div>
        </Card>
        <Card title="AI" right={<span className="text-zinc-600">Simulated</span>}>
          <div className="text-sm text-zinc-600">Generate insight per asset.</div>
        </Card>
      </div>

      <Card title="Assets">
        <div className="divide-y divide-zinc-100">
          {assets.map((a) => (
            <Link key={a.id} href={`/assets/${a.id}`} className="block py-3 hover:bg-zinc-50/60 -mx-2 px-2 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{a.symbol}</div>
                    <Badge tone="zinc">{a.type}</Badge>
                    {a.tags.slice(0, 2).map(t => <Badge key={t} tone="blue">{t}</Badge>)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">{a.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{fmt(a.price)} {a.currency}</div>
                  <div className={`text-xs ${a.changePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {a.changePct >= 0 ? '+' : ''}{fmt(a.changePct)}%
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card title="Next (real build)">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Real market data provider + historical candles</li>
          <li>Alert rules engine + cooldown + delivery channels</li>
          <li>User accounts + per-user watchlists</li>
          <li>Community commentary per signal/event</li>
        </ul>
      </Card>
    </div>
  );
}
