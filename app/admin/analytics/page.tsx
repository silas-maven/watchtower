import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { BlurFade } from '@/components/ui/blur-fade';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function AnalyticsPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/analytics');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    events,
    members,
    watches,
    totalEvents,
    recentEvents,
    topAssets,
    toolUsage,
  ] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ['type'], _count: { type: true }, orderBy: { _count: { type: 'desc' } } }).catch(() => []),
    prisma.profile.findMany({
      where: { role: 'MEMBER' },
      select: { id: true, name: true, email: true, declaredPortfolioGBP: true, averageInvestmentGBP: true, lastSeenAt: true, createdAt: true },
    }).catch(() => []),
    prisma.userWatchlistItem.count().catch(() => 0),
    prisma.usageEvent.count().catch(() => 0),
    prisma.usageEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
    // Top viewed assets
    prisma.usageEvent.groupBy({
      by: ['metadata'],
      where: { type: 'ASSET_VIEW', createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }).catch(() => []),
    // Tool adoption
    prisma.usageEvent.groupBy({
      by: ['type'],
      where: {
        type: { in: ['AVERAGE_PLAN_CREATE', 'DUE_DILIGENCE_UPDATE', 'AI_BRIEF_GENERATE'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { type: true },
    }).catch(() => []),
  ]);

  const activeIn7d = members.filter(m => m.lastSeenAt && m.lastSeenAt >= sevenDaysAgo).length;
  const activeIn30d = members.filter(m => m.lastSeenAt && m.lastSeenAt >= thirtyDaysAgo).length;
  const neverSeen = members.filter(m => !m.lastSeenAt).length;

  const declared = members.map(m => m.declaredPortfolioGBP).filter((n): n is number => n != null);
  const avgPortfolio = declared.length ? declared.reduce((a, b) => a + b, 0) / declared.length : 0;
  const totalPortfolioAUM = declared.reduce((a, b) => a + b, 0);

  const toolMap = Object.fromEntries(toolUsage.map(t => [t.type, t._count.type]));

  // Per-user averages
  const [holdingsCount, watchlistItemCount, closedPositionCount, eventsPerUser] = await Promise.all([
    prisma.userHolding.count().catch(() => 0),
    prisma.userWatchlistItem.count().catch(() => 0),
    prisma.closedPosition.count().catch(() => 0),
    prisma.usageEvent.groupBy({
      by: ['profileId'],
      _count: { id: true },
    }).catch(() => []),
  ]);

  const memberCount = members.length || 1;
  const avgHoldings = holdingsCount / memberCount;
  const avgWatchlistItems = watchlistItemCount / memberCount;
  const avgClosedPositions = closedPositionCount / memberCount;
  const avgEventsPerUser = eventsPerUser.length > 0 ? eventsPerUser.reduce((sum, e) => sum + e._count.id, 0) / eventsPerUser.length : 0;
  const retentionRate7d = members.length > 0 ? ((activeIn7d / members.length) * 100) : 0;
  const retentionRate30d = members.length > 0 ? ((activeIn30d / members.length) * 100) : 0;

  const eventTypeLabels: Record<string, string> = {
    SIGN_IN: 'Sign Ins',
    PAGE_VIEW: 'Page Views',
    ASSET_VIEW: 'Asset Views',
    WATCHLIST_ADD: 'Watchlist Adds',
    WATCHLIST_REMOVE: 'Watchlist Removes',
    ALERT_OPEN: 'Alerts Opened',
    AI_BRIEF_GENERATE: 'AI Briefs',
    AVERAGE_PLAN_CREATE: 'Avg Calculator',
    DUE_DILIGENCE_UPDATE: 'Due Diligence',
  };

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">← Admin</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide usage intelligence — engagement, adoption, and portfolio trends across all users.</p>
        </div>
      </BlurFade>

      {/* KPI Cards */}
      <BlurFade delay={0.15}>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Members</div>
            <div className="mt-1 text-2xl font-black text-foreground">{members.length}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active 7d</div>
            <div className="mt-1 text-2xl font-black text-foreground">{activeIn7d}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active 30d</div>
            <div className="mt-1 text-2xl font-black text-foreground">{activeIn30d}</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Never Seen</div>
            <div className="mt-1 text-2xl font-black text-foreground">{neverSeen}</div>
          </div>
        </div>
      </BlurFade>

      {/* User Averages — The "Wider Lens" */}
      <BlurFade delay={0.18}>
        <Card title="User Averages (Wider Lens)">
          <p className="text-xs text-muted-foreground mb-4">Averaged metrics across all {members.length} members — how the typical user engages with the platform.</p>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-primary">{retentionRate7d.toFixed(0)}%</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">7d Retention</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-foreground">{retentionRate30d.toFixed(0)}%</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">30d Retention</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-foreground">{avgEventsPerUser.toFixed(1)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Events/User</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-foreground">{avgHoldings.toFixed(1)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Holdings/User</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-foreground">{avgWatchlistItems.toFixed(1)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Watched/User</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <div className="text-2xl font-black text-foreground">{avgClosedPositions.toFixed(1)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trades/User</div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <div className="text-2xl font-black text-primary">£{avgPortfolio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Portfolio</div>
            </div>
          </div>
        </Card>
      </BlurFade>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Breakdown */}
        <BlurFade delay={0.2}>
          <Card title="Event Breakdown (All Time)">
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground">No usage events recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {events.map(e => {
                  const maxCount = events[0]._count.type;
                  const pct = maxCount > 0 ? (e._count.type / maxCount) * 100 : 0;
                  return (
                    <div key={e.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{eventTypeLabels[e.type] ?? e.type}</span>
                        <span className="text-sm font-mono font-bold text-primary">{e._count.type.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </BlurFade>

        {/* Tool Adoption */}
        <BlurFade delay={0.25}>
          <Card title="Tool Adoption (30d)">
            <div className="space-y-4">
              {[
                { key: 'AVERAGE_PLAN_CREATE', label: 'Average Planner', icon: '📊' },
                { key: 'DUE_DILIGENCE_UPDATE', label: 'Due Diligence', icon: '✅' },
                { key: 'AI_BRIEF_GENERATE', label: 'AI Briefs', icon: '🤖' },
              ].map(tool => (
                <div key={tool.key} className="flex items-center gap-4 rounded-xl border border-border bg-muted/10 p-4">
                  <div className="text-2xl">{tool.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-foreground">{tool.label}</div>
                    <div className="text-xs text-muted-foreground">Uses in the last 30 days</div>
                  </div>
                  <div className="text-2xl font-black text-primary">{(toolMap[tool.key] ?? 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        </BlurFade>
      </div>

      {/* Portfolio Intelligence */}
      <BlurFade delay={0.3}>
        <Card title="Portfolio Intelligence">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total AUM (Declared)</div>
              <div className="mt-1 text-2xl font-black text-foreground">£{totalPortfolioAUM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Across {declared.length} members who declared</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Average Portfolio Size</div>
              <div className="mt-1 text-2xl font-black text-foreground">£{avgPortfolio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Mean declared portfolio value</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Events</div>
              <div className="mt-1 text-2xl font-black text-foreground">{totalEvents.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground">{recentEvents.toLocaleString()} in the last 7 days</div>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* Member Activity Table */}
      <BlurFade delay={0.35}>
        <Card title="Member Activity Overview">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pr-4">Member</th>
                  <th className="py-3 pr-4">Last Seen</th>
                  <th className="py-3 pr-4">Declared Portfolio</th>
                  <th className="py-3 pr-4">Joined</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .sort((a, b) => {
                    if (!a.lastSeenAt) return 1;
                    if (!b.lastSeenAt) return -1;
                    return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
                  })
                  .map(m => {
                    const isActive7d = m.lastSeenAt && m.lastSeenAt >= sevenDaysAgo;
                    return (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                        <td className="py-3 pr-4">
                          <Link href={`/admin/customers/${m.id}`} className="hover:underline">
                            <div className="font-bold text-foreground">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          {m.lastSeenAt ? (
                            <Badge tone={isActive7d ? 'emerald' : 'zinc'}>
                              {m.lastSeenAt.toISOString().slice(0, 10)}
                            </Badge>
                          ) : (
                            <Badge tone="amber">Never</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-foreground">
                          {m.declaredPortfolioGBP != null ? `£${m.declaredPortfolioGBP.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{m.createdAt.toISOString().slice(0, 10)}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={isActive7d ? 'emerald' : 'zinc'}>{isActive7d ? 'Active' : 'Inactive'}</Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}
