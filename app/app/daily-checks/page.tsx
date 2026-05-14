import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { prisma } from '@/lib/prisma';
import { getDailySignalSummary } from '@/lib/server/signals';
import { requirePageUser } from '@/lib/server/pageAuth';
import { buildFallbackBrief } from '@/lib/ai/dailyBrief';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export default async function SummaryPage() {
  await requirePageUser('/summary');

  const latest = await prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null);

  const fallback = await getDailySignalSummary().catch(() => ({
    date: new Date().toISOString().slice(0, 10),
    buy: [],
    sell: [],
    newToday: [],
    droppedOff: [],
    market: {
      totalAssets: 0,
      activeSignals: 0,
      advancers: 0,
      decliners: 0,
      flat: 0,
      avgChangePct: 0,
      topGainers: [],
      topLosers: [],
      byAssetType: [],
    },
  }));
  const fallbackBrief = buildFallbackBrief(fallback);

  const brief = latest
    ? {
        date: latest.briefDate.toISOString().slice(0, 10),
        buy: asStringArray(latest.buy),
        sell: asStringArray(latest.sell),
        newToday: asStringArray(latest.newToday),
        droppedOff: asStringArray(latest.droppedOff),
        summary: latest.summary,
        insights: asStringArray(latest.insights),
        model: latest.model,
        isFallback: latest.isFallback,
      }
    : {
        date: fallback.date,
        buy: fallbackBrief.buy,
        sell: fallbackBrief.sell,
        newToday: fallbackBrief.newToday,
        droppedOff: fallbackBrief.droppedOff,
        summary: fallbackBrief.summary,
        insights: fallbackBrief.insights,
        model: fallbackBrief.model,
        isFallback: true,
      };
  const market = fallback.market;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Daily Brief</h1>
          <p className="mt-1 text-sm text-zinc-600">
            AI summary is shown here. If AI output is unavailable, deterministic brief fallback is displayed.
          </p>
        </div>
        <Badge tone="blue">{brief.date}</Badge>
      </div>

      <Card title="Executive Summary" right={<Badge tone={brief.isFallback ? 'zinc' : 'emerald'}>{brief.isFallback ? 'Fallback' : 'LLM'}</Badge>}>
        <div className="text-sm text-zinc-700">{brief.summary}</div>
        <div className="text-xs text-zinc-500 mt-2">Model: {brief.model}</div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="BUY alerts">
          <div className="flex flex-wrap gap-2">
            {brief.buy.length > 0 ? brief.buy.map((s) => <Badge key={s} tone="emerald">{s}</Badge>) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>

        <Card title="SELL alerts">
          <div className="flex flex-wrap gap-2">
            {brief.sell.length > 0 ? brief.sell.map((s) => <Badge key={s} tone="rose">{s}</Badge>) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>
      </div>

      <Card title="Market Snapshot">
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-600">Assets Tracked</div>
            <div className="text-lg font-semibold">{market.totalAssets}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-600">Advancers</div>
            <div className="text-lg font-semibold text-emerald-700">{market.advancers}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-600">Decliners</div>
            <div className="text-lg font-semibold text-rose-700">{market.decliners}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-600">Avg Daily Change</div>
            <div className="text-lg font-semibold">{market.avgChangePct.toFixed(2)}%</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="New today">
          <div className="flex flex-wrap gap-2">
            {brief.newToday.length > 0 ? brief.newToday.map((s) => <Badge key={s} tone="emerald">{s}</Badge>) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>

        <Card title="Dropped off">
          <div className="flex flex-wrap gap-2">
            {brief.droppedOff.length > 0 ? brief.droppedOff.map((s) => <Badge key={s} tone="rose">{s}</Badge>) : <div className="text-sm text-zinc-600">None.</div>}
          </div>
        </Card>
      </div>

      <Card title="Insights">
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          {brief.insights.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </Card>

      <Card title="Run Controls">
        <div className="text-sm text-zinc-700">
          To refresh this report: go to <Link href="/admin" className="font-semibold text-blue-700">Assets</Link> and run:
          <span className="font-semibold"> Market Refresh</span> then <span className="font-semibold">Generate Daily Brief</span>.
        </div>
      </Card>
    </div>
  );
}
