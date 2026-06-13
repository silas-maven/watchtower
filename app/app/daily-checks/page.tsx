import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { prisma } from '@/lib/prisma';
import { getDailySignalSummary } from '@/lib/server/signals';
import { getMemberBrief, type MemberBriefAsset } from '@/lib/server/memberBrief';
import { requirePageUser } from '@/lib/server/pageAuth';
import { buildFallbackBrief } from '@/lib/ai/dailyBrief';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';
import { trackEvent } from '@/lib/server/trackEvent';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function SignalChip({ asset, tone }: { asset: MemberBriefAsset; tone: 'emerald' | 'rose' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
      <span className={tone === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}>{asset.symbol}</span>
      {asset.isManualSignal && <span className="text-[10px] uppercase tracking-wide text-amber-500">Owner call</span>}
      {asset.dailyChangePct != null && (
        <span className="text-muted-foreground">{asset.dailyChangePct >= 0 ? '+' : ''}{fmt(asset.dailyChangePct)}%</span>
      )}
    </span>
  );
}

export default async function DailyChecksPage() {
  const profile = await requirePageUser('/app/daily-checks');
  await ensureFreshMarketData();

  const [memberBrief, latest, summary] = await Promise.all([
    getMemberBrief(profile.id).catch(() => null),
    prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null),
    getDailySignalSummary().catch(() => null),
  ]);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app/daily-checks');

  const market = summary?.market;
  const fallbackBrief = summary ? buildFallbackBrief(summary) : null;

  const brief = latest
    ? {
        date: latest.briefDate.toISOString().slice(0, 10),
        summary: latest.summary,
        insights: asStringArray(latest.insights),
        model: latest.model,
        isFallback: latest.isFallback,
      }
    : fallbackBrief
      ? {
          date: summary!.date,
          summary: fallbackBrief.summary,
          insights: fallbackBrief.insights,
          model: fallbackBrief.model,
          isFallback: true,
        }
      : null;

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Daily Checks</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Your morning brief</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A personal read on what you track, then the academy-wide picture. Signals are deterministic. The AI summary explains them, it does not decide them.
            </p>
          </div>
          {brief && <Badge tone="blue">{brief.date}</Badge>}
        </div>
      </BlurFade>

      {/* Personalised member brief */}
      <BlurFade delay={0.12}>
        <Card
          title="Your watchlist today"
          right={<Badge tone="zinc">{memberBrief?.trackedCount ?? 0} tracked</Badge>}
        >
          {!memberBrief || memberBrief.trackedCount === 0 ? (
            <div className="text-sm text-muted-foreground">
              You are not tracking any assets yet. Open the master watchlist and build a sublist to get a personal brief here.
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-foreground">{memberBrief.headline}</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Buy signals in your lists</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberBrief.buy.length > 0
                      ? memberBrief.buy.map((a) => <SignalChip key={a.symbol} asset={a} tone="emerald" />)
                      : <span className="text-sm text-muted-foreground">None right now.</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sell signals in your lists</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberBrief.sell.length > 0
                      ? memberBrief.sell.map((a) => <SignalChip key={a.symbol} asset={a} tone="rose" />)
                      : <span className="text-sm text-muted-foreground">None right now.</span>}
                  </div>
                </div>
              </div>

              {memberBrief.holdings.count > 0 && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your holdings</div>
                    <div className="text-sm text-muted-foreground">
                      Invested <span className="font-semibold text-foreground">£{fmt(memberBrief.holdings.investedGBP)}</span>
                      {' · '}Value <span className="font-semibold text-foreground">£{fmt(memberBrief.holdings.valueGBP)}</span>
                      {memberBrief.holdings.returnPct != null && (
                        <>
                          {' · '}
                          <span className={memberBrief.holdings.returnPct >= 0 ? 'font-semibold text-emerald-500' : 'font-semibold text-rose-500'}>
                            {memberBrief.holdings.returnPct >= 0 ? '+' : ''}{fmt(memberBrief.holdings.returnPct)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {memberBrief.holdings.inSignal.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {memberBrief.holdings.inSignal.map((a) => (
                        <SignalChip key={a.symbol} asset={a} tone={a.signalState === 'SELL' ? 'rose' : 'emerald'} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {memberBrief.watchlists.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {memberBrief.watchlists.map((wl) => (
                    <span key={wl.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{wl.name}</span>
                      {wl.isDefault && <span className="text-[10px] uppercase tracking-wide text-primary">default</span>}
                      <span>{wl.itemCount} assets</span>
                      {wl.activeSignals > 0 && <span className="text-emerald-500">{wl.activeSignals} active</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </BlurFade>

      {/* Academy-wide brief */}
      {brief && (
        <BlurFade delay={0.2}>
          <Card
            title="Academy daily brief"
            right={<Badge tone={brief.isFallback ? 'amber' : 'emerald'}>{brief.isFallback ? 'Deterministic' : 'AI summary'}</Badge>}
          >
            <div className="space-y-4">
              <p className="text-sm leading-6 text-foreground">{brief.summary}</p>
              {market && (
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Assets tracked</div>
                    <div className="text-lg font-bold text-foreground">{market.totalAssets}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Advancers</div>
                    <div className="text-lg font-bold text-emerald-500">{market.advancers}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Decliners</div>
                    <div className="text-lg font-bold text-rose-500">{market.decliners}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Avg change</div>
                    <div className="text-lg font-bold text-foreground">{market.avgChangePct.toFixed(2)}%</div>
                  </div>
                </div>
              )}
              {brief.insights.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {brief.insights.map((n) => <li key={n}>{n}</li>)}
                </ul>
              )}
              <div className="text-xs text-muted-foreground">Model: {brief.model}</div>
            </div>
          </Card>
        </BlurFade>
      )}
    </div>
  );
}
