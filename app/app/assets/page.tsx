import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';

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
  await ensureFreshMarketData();

  const assets = await prisma.asset
    .findMany({
      where: { isActive: true },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
      orderBy: { symbol: 'asc' },
    })
    .catch(() => []);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Asset Library</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Master asset list</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The academy watchlist, priced live: rules, prices, targets and 52-week context for every tracked asset.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <Card title={`All assets (${assets.length})`}>
          {assets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No assets are active yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4">Asset</th>
                    <th className="py-3 pr-4">Signal</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Day range</th>
                    <th className="py-3 pr-4">Targets</th>
                    <th className="py-3 pr-4">52w</th>
                    <th className="py-3 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const latest = asset.snapshots[0];
                    const computed = computeSignalState({
                      dailyLow: latest?.dailyLow ?? null,
                      dailyHigh: latest?.dailyHigh ?? null,
                      targetEntry: asset.rule?.targetEntry ?? null,
                      targetExit: asset.rule?.targetExit ?? null,
                    });
                    const state = effectiveSignalState(computed, asset.rule?.signalOverride);
                    const change = latest?.dailyChangePct;
                    return (
                      <tr key={asset.id} className="border-b border-border/50 align-top transition hover:bg-muted/30">
                        <td className="py-3 pr-4">
                          <Link href={`/assets/${asset.id}`} className="font-semibold text-foreground hover:text-primary">{asset.symbol}</Link>
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={tone(state)}>{state}</Badge>
                          {asset.rule?.signalOverride && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Owner call</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-mono font-semibold text-foreground">{fmt(latest?.currentPrice)} {asset.currency}</div>
                          <div className={`font-mono text-xs ${change == null ? 'text-muted-foreground' : change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {change == null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change)}%`}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{fmt(latest?.dailyLow)} - {fmt(latest?.dailyHigh)}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">Entry {fmt(asset.rule?.targetEntry)} · Exit {fmt(asset.rule?.targetExit)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{fmt(latest?.low52 ?? asset.low52)} / {fmt(latest?.high52 ?? asset.high52)}</td>
                        <td className="py-3 pr-4">
                          <Link href={`/assets/${asset.id}`} className="text-xs font-semibold text-primary hover:underline">Open</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
}
