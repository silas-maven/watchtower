import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';
import { getAssetsForDashboard } from '@/lib/server/dashboard';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';
import { prisma } from '@/lib/prisma';
import { BorderBeam } from '@/components/ui/border-beam';
import { BlurFade } from '@/components/ui/blur-fade';
import { Calculator, CheckSquare, History, TrendingDown } from 'lucide-react';
import { MarketPulseRail } from '@/components/news/MarketPulseRail';
import { WeatherSnapshotBoard } from '@/components/market/WeatherSnapshotBoard';
import { getMacroTiles, weatherInputsFromTiles } from '@/lib/market/macro';
import { SNAPSHOT_ROWS } from '@/lib/market/macroTypes';
import { classifyWeather } from '@/lib/market/weather';
import { formatMoney } from '@/lib/money';
import { getSetting } from '@/lib/server/settings';
import { trackEvent } from '@/lib/server/trackEvent';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toneForState(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default async function MemberDashboard() {
  const profile = await requirePageUser('/app');

  const [live, rows, watchItems, xHandle, macroTiles] = await Promise.all([
    getLivePortfolioView(profile.id).catch(() => null),
    getAssetsForDashboard().catch(() => []),
    prisma.userWatchlistItem.findMany({
      where: { watchlist: { profileId: profile.id } },
      select: { assetId: true },
    }).catch(() => []),
    getSetting('news_x_handle').catch(() => 'MarketWatch'),
    getMacroTiles().catch(() => new Map()),
  ]);

  const weather = classifyWeather(weatherInputsFromTiles(macroTiles));
  const macroTileRecord = Object.fromEntries(macroTiles);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app');

  const heldAssetIds = (live?.holdings ?? []).map((h) => h.assetId);
  const trackedAssetIds = new Set([...heldAssetIds, ...watchItems.map((w) => w.assetId)]);

  const myTrackedAssets = rows.filter(r => trackedAssetIds.has(r.id));
  const marketOpportunities = rows.filter(r => (r.signalState === 'BUY' || r.signalState === 'BOTH') && !trackedAssetIds.has(r.id));
  const hasPortfolio = live?.hasData ?? false;
  const s = live?.summary;
  const cur = live?.displayCurrency ?? 'GBP';
  const rate = live?.gbpRate ?? 1;
  const money = (gbpAmount: number) => formatMoney(gbpAmount * rate, cur);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Member Workspace</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor your personal watchlist, discover new market opportunities, and access your portfolio toolkit.
            </p>
          </div>
          <Badge tone={profile.accessState === 'ACTIVE' ? 'emerald' : 'amber'}>{profile.accessState}</Badge>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <WeatherSnapshotBoard weather={weather} tiles={macroTileRecord} rows={SNAPSHOT_ROWS} />
      </BlurFade>

      <BlurFade delay={0.2}>
        {hasPortfolio && s ? (
          <div className="grid gap-4 md:grid-cols-4">
            <Card title="Invested"><div className="text-2xl font-bold text-foreground">{money(s.investedGBP)}</div><div className="mt-1 text-xs text-muted-foreground">Across {live!.holdings.length} {live!.holdings.length === 1 ? 'holding' : 'holdings'}</div></Card>
            <Card title="Current value"><div className="text-2xl font-bold text-foreground">{money(s.valueGBP)}</div><div className="mt-1 text-xs text-muted-foreground">Live, shown in {cur}</div></Card>
            <Card title="Profit"><div className={`text-2xl font-bold ${s.profitGBP >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.profitGBP >= 0 ? '+' : ''}{money(s.profitGBP)}</div><div className="mt-1 text-xs text-muted-foreground">{live!.declaredSizeGBP != null ? `Starting value ${money(live!.declaredSizeGBP)}` : 'Vs invested cost'}</div></Card>
            <Card title="Return"><div className={`text-2xl font-bold ${s.returnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.returnPct >= 0 ? '+' : ''}{fmt(s.returnPct)}%</div><div className="mt-1 text-xs text-muted-foreground"><Link href="/app/portfolio-tools/live-portfolio" className="text-primary hover:underline">Manage holdings</Link></div></Card>
          </div>
        ) : (
          <Card title="Your portfolio">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">You have not added any holdings yet. Add your positions to track live value, profit and return here.</p>
              <Link href="/app/portfolio-tools/live-portfolio" className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110">Add holdings</Link>
            </div>
          </Card>
        )}
      </BlurFade>

      <BlurFade delay={0.3}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          {/* Main column */}
          <div className="space-y-6 min-w-0">
            {/* My Tracked Assets */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">My Tracked Assets</h2>
                <Badge tone="zinc">{myTrackedAssets.length} watched</Badge>
              </div>
              <div className="divide-y divide-border">
                {myTrackedAssets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">You are not tracking any assets yet. Add some from the <Link href="/app/watchlists" className="font-semibold text-primary hover:underline">master watchlist</Link>.</div>
                ) : (
                  myTrackedAssets.map((r) => (
                    <Link key={r.id} href={`/assets/${r.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-muted/50">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-bold text-foreground">{r.symbol}</span>{r.signalState !== 'NONE' && <Badge tone={toneForState(r.signalState)}>{r.signalState}</Badge>}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{r.name}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-bold text-foreground font-mono">{r.currentPrice == null ? '—' : fmt(r.currentPrice)} {r.currency}</div>
                        <div className={`font-mono mt-0.5 ${r.dailyChangePct == null ? 'text-muted-foreground' : (r.dailyChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500')}`}>
                          {r.dailyChangePct == null ? '—' : `${r.dailyChangePct >= 0 ? '+' : ''}${fmt(r.dailyChangePct)}%`}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Market Opportunities */}
            <div className="relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden group">
              <BorderBeam size={250} duration={12} delay={9} colorFrom="var(--primary)" colorTo="var(--background)" />
              <div className="border-b border-border bg-primary/5 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><TrendingDown className="h-5 w-5 text-primary" /> Market Opportunities</h2>
                <Badge tone="emerald">Buy Zones Active</Badge>
              </div>
              <div className="divide-y divide-border">
                {marketOpportunities.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No new opportunities in the buy zone right now.</div>
                ) : (
                  marketOpportunities.slice(0, 5).map((r) => (
                    <Link key={r.id} href={`/assets/${r.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-muted/50">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-bold text-foreground">{r.symbol}</span><Badge tone="emerald">BUY</Badge></div>
                        <div className="mt-1 text-sm text-muted-foreground">{r.name}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-bold text-foreground font-mono">{r.currentPrice == null ? '—' : fmt(r.currentPrice)} {r.currency}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Target: {r.targetEntry ? fmt(r.targetEntry) : 'N/A'}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              {marketOpportunities.length > 5 && (
                <div className="border-t border-border bg-muted/30 px-6 py-3 text-center">
                  <Link href="/app/assets" className="text-sm font-semibold text-primary hover:underline">View all {marketOpportunities.length} opportunities</Link>
                </div>
              )}
            </div>

            {/* Portfolio Tools */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio Toolkit</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Link href="/app/portfolio-tools/average-calculator" className="rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                  <div className="w-fit rounded-xl bg-primary/10 p-3"><Calculator className="h-6 w-6 text-primary" /></div>
                  <div className="mt-3 font-bold text-foreground">Average Planner</div>
                  <div className="mt-1 text-sm text-muted-foreground">Split budget into deterministic entry tranches.</div>
                </Link>
                <Link href="/app/portfolio-tools/due-diligence" className="rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                  <div className="w-fit rounded-xl bg-blue-500/10 p-3"><CheckSquare className="h-6 w-6 text-blue-500" /></div>
                  <div className="mt-3 font-bold text-foreground">Due Diligence</div>
                  <div className="mt-1 text-sm text-muted-foreground">Score assets on revenue, margin, and market cap.</div>
                </Link>
                <Link href="/app/portfolio-tools/trade-journal" className="rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                  <div className="w-fit rounded-xl bg-emerald-500/10 p-3"><History className="h-6 w-6 text-emerald-500" /></div>
                  <div className="mt-3 font-bold text-foreground">Trade Journal</div>
                  <div className="mt-1 text-sm text-muted-foreground">Log closed positions and track realised profit.</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Collapsible Market Pulse rail */}
          <MarketPulseRail xHandle={xHandle || 'MarketWatch'} />
        </div>
      </BlurFade>
    </div>
  );
}
