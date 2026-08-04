import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { prisma } from '@/lib/prisma';
import { getDailySignalSummary } from '@/lib/server/signals';
import Link from 'next/link';
import { getMemberBrief, type BriefScope, type MemberBriefAsset } from '@/lib/server/memberBrief';
import { requirePageUser } from '@/lib/server/pageAuth';
import { buildFallbackBrief, type DailyBriefStats } from '@/lib/ai/dailyBrief';
import { getBriefHighlights, EARNINGS_WINDOW_DAYS, EXTREME_RANGE_PCT } from '@/lib/server/briefHighlights';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';
import { trackEvent } from '@/lib/server/trackEvent';
import { canUse } from '@/lib/entitlements';
import { BriefHeading } from '@/components/brief/BriefHeading';
import { freeSummary, insightsFor, statsFor, type BriefAudience } from '@/lib/briefVisibility';

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

function asStats(value: unknown): DailyBriefStats | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const nums = ['totalAssets', 'activeSignals', 'advancers', 'decliners', 'flat', 'avgChangePct'];
  if (!nums.every((k) => typeof v[k] === 'number')) return null;
  return value as DailyBriefStats;
}

export default async function DailyChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const profile = await requirePageUser('/app/daily-checks');
  // Signals are the paid product; the earnings calendar and the market breadth
  // are not (owner, 2 Aug 2026: "Earnings but is fine for freemium").
  const paid = canUse(profile, 'signals');
  ensureFreshMarketData();

  // Holdings default to the member's real book; the toggle switches to paper.
  const scope: BriefScope = (await searchParams).book === 'virtual' ? 'virtual' : 'live';

  // Scope the highlights to what this member tracks, so their brief is personal.
  const trackedItems = await prisma.userWatchlistItem
    .findMany({ where: { watchlist: { profileId: profile.id } }, select: { assetId: true } })
    .catch(() => []);
  const trackedIds = [...new Set(trackedItems.map((t) => t.assetId))];

  const [memberBrief, latest, summary, highlights] = await Promise.all([
    getMemberBrief(profile.id, scope).catch(() => null),
    prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null),
    getDailySignalSummary().catch(() => null),
    // A free profile has no sublists to scope to, so the highlights are computed
    // academy-wide. Only the earnings calendar out of that is shown to them; the
    // signal counts are replaced by the upgrade prompt below.
    paid
      ? trackedIds.length > 0
        ? getBriefHighlights(new Date(), trackedIds).catch(() => null)
        : Promise.resolve(null)
      : getBriefHighlights(new Date()).catch(() => null),
  ]);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app/daily-checks');

  const market = summary?.market;
  const fallbackBrief = summary ? buildFallbackBrief(summary) : null;

  // The academy brief is the paid product written as prose. A free profile gets
  // a breadth-only summary composed by us and only the insights that positively
  // match a safe shape; the model's own summary never reaches them, because
  // filtering generated prose for signal talk is a game you eventually lose.
  // See lib/briefVisibility.ts.
  const audience: BriefAudience = paid ? 'paid' : 'free';
  const shape = (raw: { date: string; summary: string; insights: string[]; model: string; isFallback: boolean; stats: DailyBriefStats | null; statsAreLive: boolean }) => ({
    ...raw,
    summary: paid ? raw.summary : freeSummary(raw.stats),
    insights: insightsFor(audience, raw.insights),
    stats: statsFor(audience, raw.stats),
  });

  const brief = latest
    ? shape({
        date: latest.briefDate.toISOString().slice(0, 10),
        summary: latest.summary,
        insights: asStringArray(latest.insights),
        model: latest.model,
        isFallback: latest.isFallback,
        // Render the breadth the narrative was written against. Older briefs
        // have no persisted stats, so fall back to the live summary for those.
        stats: asStats(latest.stats) ?? market ?? null,
        statsAreLive: asStats(latest.stats) == null,
      })
    : fallbackBrief
      ? shape({
          date: summary!.date,
          summary: fallbackBrief.summary,
          insights: fallbackBrief.insights,
          model: fallbackBrief.model,
          isFallback: true,
          // This brief was just built from the same live summary, so they agree.
          stats: fallbackBrief.stats ?? market ?? null,
          statsAreLive: false,
        })
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
          right={paid ? <Badge tone="zinc">{memberBrief?.trackedCount ?? 0} tracked</Badge> : <Badge tone="zinc">Free plan</Badge>}
        >
          {!paid ? (
            // The free view of this panel: the same headings in the same order,
            // so a free member can see the shape of what a paid brief gives
            // them, with the earnings calendar filled in for real.
            <div className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Your morning brief reads the academy signals across the assets you track. The signal sections come with the
                paid membership; the earnings calendar below is yours either way.
              </p>
              {/* Full width, one per line, so the upgrade button sits out on the
                  right as the owner drew it. In two columns it wraps under the
                  heading and stops reading as a call to action. */}
              <div className="divide-y divide-border rounded-2xl border border-border">
                {['Active buy signals', 'Active sell signals', 'New buy alerts since yesterday', 'New sell alerts since yesterday'].map(
                  (heading) => (
                    <div key={heading} className="px-4 py-3">
                      <BriefHeading locked>{heading}</BriefHeading>
                    </div>
                  ),
                )}
              </div>
              {highlights && highlights.earningsThisWeek.length > 0 && (
                <div className="rounded-2xl border border-border p-4">
                  <BriefHeading>Reporting earnings in the next {EARNINGS_WINDOW_DAYS} days</BriefHeading>
                  <div className="mt-2 space-y-1 text-sm">
                    {highlights.earningsThisWeek.slice(0, 8).map((r) => (
                      <div key={r.symbol} className="flex justify-between gap-3">
                        <span className="font-semibold text-foreground">{r.symbol}</span>
                        <span className="font-mono text-muted-foreground">{r.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !memberBrief || memberBrief.trackedCount === 0 ? (
            <div className="text-sm text-muted-foreground">
              You are not tracking any assets yet. Open the master watchlist and build a sublist to get a personal brief here.
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-foreground">{memberBrief.headline}</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <BriefHeading>Active buy signals</BriefHeading>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberBrief.buy.length > 0
                      ? memberBrief.buy.map((a) => <SignalChip key={a.symbol} asset={a} tone="emerald" />)
                      : <span className="text-sm text-muted-foreground">None right now.</span>}
                  </div>
                </div>
                <div>
                  <BriefHeading>Active sell signals</BriefHeading>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberBrief.sell.length > 0
                      ? memberBrief.sell.map((a) => <SignalChip key={a.symbol} asset={a} tone="rose" />)
                      : <span className="text-sm text-muted-foreground">None right now.</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-foreground">Your holdings</div>
                    {/* Live is the member's real book; Virtual is the paper portfolio. */}
                    <div className="inline-flex rounded-full border border-border p-0.5">
                      <Link
                        href="/app/daily-checks"
                        scroll={false}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${scope === 'live' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Live
                      </Link>
                      <Link
                        href="/app/daily-checks?book=virtual"
                        scroll={false}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${scope === 'virtual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Virtual
                      </Link>
                    </div>
                  </div>
                  {memberBrief.holdings.count === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No {scope === 'virtual' ? 'virtual' : 'live'} holdings yet.
                    </div>
                  ) : (
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
                  )}
                </div>
                {memberBrief.holdings.inSignal.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {memberBrief.holdings.inSignal.map((a) => (
                      <SignalChip key={a.symbol} asset={a} tone={a.signalState === 'SELL' ? 'rose' : 'emerald'} />
                    ))}
                  </div>
                )}
              </div>

              {highlights && (
                <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-2">
                  <div>
                    <BriefHeading>New buy alerts since yesterday</BriefHeading>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {highlights.newBuy.length > 0
                        ? highlights.newBuy.map((a) => (
                            <span key={a.symbol} className="rounded-full border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-500">{a.symbol}</span>
                          ))
                        : <span className="text-sm text-muted-foreground">None. Active buys are carried over.</span>}
                    </div>
                  </div>
                  <div>
                    <BriefHeading>New sell alerts since yesterday</BriefHeading>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {highlights.newSell.length > 0
                        ? highlights.newSell.map((a) => (
                            <span key={a.symbol} className="rounded-full border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-500">{a.symbol}</span>
                          ))
                        : <span className="text-sm text-muted-foreground">None. Active sells are carried over.</span>}
                    </div>
                  </div>

                  {highlights.extremeRange.length > 0 && (
                    <div>
                      <BriefHeading>Wide daily range (over {EXTREME_RANGE_PCT}% of previous close)</BriefHeading>
                      <div className="mt-2 space-y-1 text-sm">
                        {highlights.extremeRange.slice(0, 5).map((r) => (
                          <div key={r.symbol} className="flex justify-between gap-3">
                            <span className="font-semibold text-foreground">{r.symbol}</span>
                            <span className="font-mono text-amber-500">{r.rangePct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {highlights.earningsThisWeek.length > 0 && (
                    <div>
                      <BriefHeading>Reporting earnings in the next {EARNINGS_WINDOW_DAYS} days</BriefHeading>
                      <div className="mt-2 space-y-1 text-sm">
                        {highlights.earningsThisWeek.slice(0, 8).map((r) => (
                          <div key={r.symbol} className="flex justify-between gap-3">
                            <span className="font-semibold text-foreground">{r.symbol}</span>
                            <span className="font-mono text-muted-foreground">{r.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    Compared with 00:00 {highlights.timezone} yesterday. Not shown, because the data cannot be relied on:
                    dividend and rights ex-dates, and all-time lows.
                  </div>
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
              {brief.stats && (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Assets tracked</div>
                      <div className="text-lg font-bold text-foreground">{brief.stats.totalAssets}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Advancers</div>
                      <div className="text-lg font-bold text-emerald-500">{brief.stats.advancers}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Decliners</div>
                      <div className="text-lg font-bold text-rose-500">{brief.stats.decliners}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Avg change</div>
                      <div className="text-lg font-bold text-foreground">{brief.stats.avgChangePct.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {brief.statsAreLive
                      ? 'Live market breadth. This brief predates stat snapshots, so these figures may have moved since it was written.'
                      : `Market breadth as at the ${brief.date} brief.`}
                  </div>
                </>
              )}
              {brief.insights.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {brief.insights.map((n) => <li key={n}>{n}</li>)}
                </ul>
              )}
              {/* The model identifier is engineering detail, and "Model:
                  deterministic-fallback" reads to a member as though something
                  broke. The badge in the header already says whether this brief
                  was written by the AI or assembled from the rules, which is the
                  part a member has any use for. */}
            </div>
          </Card>
        </BlurFade>
      )}
    </div>
  );
}
