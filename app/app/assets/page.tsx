import Link from 'next/link';
import { Card } from '@/components/Card';
import { BlurFade } from '@/components/ui/blur-fade';
import { AssetLibraryTable, type LibraryRow } from '@/components/assets/AssetLibraryTable';
import { RequestStock } from '@/components/assets/RequestStock';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function AssetsPage() {
  await requirePageUser('/app/assets');
  await ensureFreshMarketData();

  const assets = await prisma.asset
    .findMany({
      where: { isActive: true, isMacro: false },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
      orderBy: { symbol: 'asc' },
    })
    .catch(() => []);

  const rows: LibraryRow[] = assets.map((asset) => {
    const latest = asset.snapshots[0];
    const computed = computeSignalState({
      dailyLow: latest?.dailyLow ?? null,
      dailyHigh: latest?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.assetType,
      currency: asset.currency,
      signalState: effectiveSignalState(computed, asset.rule?.signalOverride),
      ownerCall: asset.rule?.signalOverride != null,
      currentPrice: latest?.currentPrice ?? null,
      dailyChangePct: latest?.dailyChangePct ?? null,
      dailyLow: latest?.dailyLow ?? null,
      dailyHigh: latest?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
      low52: latest?.low52 ?? asset.low52,
      high52: latest?.high52 ?? asset.high52,
      marketCap: latest?.marketCap ?? asset.marketCap,
    };
  });

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Asset Centre</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Master asset list</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The academy watchlist, priced live: rules, prices, targets and 52-week context for every tracked asset.
            </p>
          </div>
          <Link
            href="/app/watchlists"
            className="shrink-0 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/40"
          >
            Master Watchlist →
          </Link>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <Card title={`All assets (${rows.length})`}>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No assets are active yet.</div>
          ) : (
            <AssetLibraryTable rows={rows} />
          )}
        </Card>
      </BlurFade>

      <BlurFade delay={0.15}>
        <Card title="Request a stock">
          <p className="mb-4 text-sm text-muted-foreground">Not tracking a stock you follow? Ask the academy to add it to the universe.</p>
          <RequestStock />
        </Card>
      </BlurFade>
    </div>
  );
}
