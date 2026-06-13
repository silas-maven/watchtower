import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';
import { getAssetsForDashboard, getPortfolioSummary } from '@/lib/server/dashboard';
import { prisma } from '@/lib/prisma';
import { BorderBeam } from '@/components/ui/border-beam';
import { BlurFade } from '@/components/ui/blur-fade';
import { Calculator, CheckSquare, History, TrendingDown } from 'lucide-react';
import { NewsFeedCard } from '@/components/news/NewsFeedCard';
import { XTimelineCard } from '@/components/news/XTimelineCard';
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
  
  // Need to get User to find watches, as PersonalWatch uses userId
  const user = await prisma.user.findUnique({ where: { email: profile.email } });

  const [summary, rows, holdings, watches, xHandle] = await Promise.all([
    getPortfolioSummary().catch(() => ({ portfolioSize: 0, invested: 0, value: 0, cash: 0, retPct: 0 })),
    getAssetsForDashboard().catch(() => []),
    prisma.userHolding.findMany({ where: { profileId: profile.id } }),
    user ? prisma.personalWatch.findMany({ where: { userId: user.id } }) : Promise.resolve([]),
    getSetting('news_x_handle').catch(() => 'MarketWatch'),
  ]);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app');

  const trackedAssetIds = new Set([...holdings.map(h => h.assetId), ...watches.map(w => w.assetId)]);
  
  const myTrackedAssets = rows.filter(r => trackedAssetIds.has(r.id));
  const marketOpportunities = rows.filter(r => (r.signalState === 'BUY' || r.signalState === 'BOTH') && !trackedAssetIds.has(r.id));

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Member Workspace</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">SPA Command Centre</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor your personal watchlist, discover new market opportunities, and access your portfolio toolkit.
            </p>
          </div>
          <Badge tone={profile.accessState === 'ACTIVE' ? 'emerald' : 'amber'}>{profile.accessState}</Badge>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Portfolio Size"><div className="text-2xl font-bold text-foreground">£{fmt(summary.portfolioSize)}</div><div className="mt-1 text-xs text-muted-foreground">Declared/current demo basis</div></Card>
          <Card title="Invested"><div className="text-2xl font-bold text-foreground">£{fmt(summary.invested)}</div><div className="mt-1 text-xs text-muted-foreground">Value £{fmt(summary.value)}</div></Card>
          <Card title="Cash"><div className="text-2xl font-bold text-foreground">£{fmt(summary.cash)}</div><div className="mt-1 text-xs text-muted-foreground">GBP normalized</div></Card>
          <Card title="Return"><div className={`text-2xl font-bold ${summary.retPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{summary.retPct >= 0 ? '+' : ''}{fmt(summary.retPct)}%</div><div className="mt-1 text-xs text-muted-foreground">Workbook parity formula</div></Card>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* My Tracked Assets */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">My Tracked Assets</h2>
                <Badge tone="zinc">{myTrackedAssets.length} watched</Badge>
              </div>
              <div className="divide-y divide-border">
                {myTrackedAssets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">You are not tracking any assets yet.</div>
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
          </div>

          <div className="space-y-6">
            {/* Portfolio Tools */}
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio Tools</h3>
            <div className="grid gap-4">
              <Link href="/app/portfolio-tools/average-calculator" className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                <div className="rounded-xl bg-primary/10 p-3"><Calculator className="h-6 w-6 text-primary" /></div>
                <div>
                  <div className="font-bold text-foreground">Average Planner</div>
                  <div className="mt-1 text-sm text-muted-foreground">Split budget into deterministic entry tranches.</div>
                </div>
              </Link>
              
              <Link href="/app/portfolio-tools/due-diligence" className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                <div className="rounded-xl bg-blue-500/10 p-3"><CheckSquare className="h-6 w-6 text-blue-500" /></div>
                <div>
                  <div className="font-bold text-foreground">Due Diligence</div>
                  <div className="mt-1 text-sm text-muted-foreground">Score assets on revenue, margin, and market cap.</div>
                </div>
              </Link>

              <Link href="/app/portfolio-tools/trade-journal" className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md">
                <div className="rounded-xl bg-emerald-500/10 p-3"><History className="h-6 w-6 text-emerald-500" /></div>
                <div>
                  <div className="font-bold text-foreground">Trade Journal</div>
                  <div className="mt-1 text-sm text-muted-foreground">Log closed positions and track realized profit.</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.4}>
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Market Pulse</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <NewsFeedCard />
            <XTimelineCard handle={xHandle || 'MarketWatch'} />
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
