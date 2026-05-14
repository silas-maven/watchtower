import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { computeSignalState } from '@/lib/signals/engine';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

function fmt(n: number | null | undefined) {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function tone(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default async function AssetsPage() {
  await requirePageUser('/app/assets');
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    orderBy: { symbol: 'asc' },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Member Assets</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Master asset list</h1>
        <p className="mt-2 text-sm text-slate-600">The spreadsheet view in product form: rules, prices, targets, volatility and 52-week context.</p>
      </div>
      <Card title="All Assets">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-500"><th className="py-3 pr-4">Asset</th><th className="py-3 pr-4">Signal</th><th className="py-3 pr-4">Price</th><th className="py-3 pr-4">Day Range</th><th className="py-3 pr-4">Targets</th><th className="py-3 pr-4">52w</th><th className="py-3 pr-4">Open</th></tr></thead>
            <tbody>
              {assets.map((asset) => {
                const latest = asset.snapshots[0];
                const state = computeSignalState({ dailyLow: latest?.dailyLow ?? null, dailyHigh: latest?.dailyHigh ?? null, targetEntry: asset.rule?.targetEntry ?? null, targetExit: asset.rule?.targetExit ?? null });
                return (
                  <tr key={asset.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4"><div className="font-black">{asset.symbol}</div><div className="text-xs text-slate-500">{asset.name}</div>{asset.reason && <div className="mt-1 max-w-xs text-xs text-slate-500">{asset.reason}</div>}</td>
                    <td className="py-3 pr-4"><Badge tone={tone(state)}>{state}</Badge></td>
                    <td className="py-3 pr-4"><div className="font-bold">{fmt(latest?.currentPrice)} {asset.currency}</div><div className={(latest?.dailyChangePct ?? 0) >= 0 ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>{fmt(latest?.dailyChangePct)}%</div></td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{fmt(latest?.dailyLow)} - {fmt(latest?.dailyHigh)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">Entry {fmt(asset.rule?.targetEntry)} · Exit {fmt(asset.rule?.targetExit)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{fmt(latest?.low52 ?? asset.low52)} / {fmt(latest?.high52 ?? asset.high52)}</td>
                    <td className="py-3 pr-4"><Link href={`/assets/${asset.id}`} className="font-bold text-slate-950 underline decoration-amber-300 underline-offset-4">Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
