import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { BlurFade } from '@/components/ui/blur-fade';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

function fmtGBP(v: number | null) {
  if (v == null) return '—';
  return `£${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function timeAgo(date: Date | null) {
  if (!date) return 'Never';
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function tone(state: string) {
  if (state === 'ACTIVE') return 'emerald' as const;
  if (state === 'PAUSED') return 'amber' as const;
  return 'rose' as const;
}

export default async function CustomerPortfolioReviewPage({ params }: { params: Promise<{ profileId: string }> }) {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/customers');
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      subscriptionMirror: true,
      holdings: { include: { asset: { include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } } } } },
      watchlists: { include: { items: { include: { asset: true } } } },
      closedPositions: { include: { asset: true }, orderBy: { closedAt: 'desc' } },
      usageEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });

  if (!profile) notFound();

  // Calculate portfolio totals
  const totalInvested = profile.holdings.reduce((sum, h) => sum + (h.investedGBP ?? 0), 0);
  const totalCurrentValue = profile.holdings.reduce((sum, h) => sum + (h.currentValueGBP ?? 0), 0);
  const totalRealizedPL = profile.closedPositions.reduce((sum, cp) => sum + (cp.profitGBP ?? 0), 0);
  const watchlistItems = profile.watchlists.flatMap(w => w.items);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground transition">← Customers</Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={tone(profile.accessState)}>{profile.accessState}</Badge>
              <Badge tone={profile.subscriptionMirror?.status === 'ACTIVE' ? 'emerald' : 'rose'}>
                {profile.subscriptionMirror?.status ?? 'NO SUB'}
              </Badge>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* Quick Stats */}
      <BlurFade delay={0.15}>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Seen</div>
            <div className="mt-1 text-lg font-bold text-foreground">{timeAgo(profile.lastSeenAt)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Declared Portfolio</div>
            <div className="mt-1 text-lg font-bold text-foreground">{fmtGBP(profile.declaredPortfolioGBP)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Invested</div>
            <div className="mt-1 text-lg font-bold text-foreground">{fmtGBP(totalInvested || null)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Value</div>
            <div className="mt-1 text-lg font-bold text-foreground">{fmtGBP(totalCurrentValue || null)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Realized P&L</div>
            <div className={`mt-1 text-lg font-bold ${totalRealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {fmtGBP(totalRealizedPL || null)}
            </div>
          </div>
        </div>
      </BlurFade>

      {/* Holdings */}
      <BlurFade delay={0.2}>
        <Card title={`Holdings (${profile.holdings.length})`}>
          {profile.holdings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No holdings recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4">Asset</th>
                    <th className="py-3 pr-4">Shares</th>
                    <th className="py-3 pr-4">Avg Entry</th>
                    <th className="py-3 pr-4">Current Price</th>
                    <th className="py-3 pr-4">Invested</th>
                    <th className="py-3 pr-4">Current Value</th>
                    <th className="py-3 pr-4">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.holdings.map(h => {
                    const currentPrice = h.asset.snapshots?.[0]?.currentPrice ?? null;
                    const pl = (h.currentValueGBP ?? 0) - (h.investedGBP ?? 0);
                    return (
                      <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                        <td className="py-3 pr-4">
                          <div className="font-bold text-foreground">{h.asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">{h.asset.name}</div>
                        </td>
                        <td className="py-3 pr-4 font-mono">{h.shares ?? '—'}</td>
                        <td className="py-3 pr-4 font-mono">{fmtGBP(h.averagePrice)}</td>
                        <td className="py-3 pr-4 font-mono">{currentPrice != null ? `£${currentPrice.toFixed(2)}` : '—'}</td>
                        <td className="py-3 pr-4 font-mono">{fmtGBP(h.investedGBP)}</td>
                        <td className="py-3 pr-4 font-mono">{fmtGBP(h.currentValueGBP)}</td>
                        <td className={`py-3 pr-4 font-mono font-bold ${pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {fmtGBP(pl || null)}
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

      {/* Watchlists */}
      <BlurFade delay={0.25}>
        <Card title={`Watchlist (${watchlistItems.length} items)`}>
          {watchlistItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">No watchlist items.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchlistItems.map(item => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <div className="text-sm font-bold text-foreground">{item.asset.symbol}</div>
                  <div className="text-xs text-muted-foreground">{item.asset.name}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlurFade>

      {/* Closed Positions (Trade Journal) */}
      <BlurFade delay={0.3}>
        <Card title={`Trade Journal (${profile.closedPositions.length} closed)`}>
          {profile.closedPositions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No closed positions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4">Asset</th>
                    <th className="py-3 pr-4">Shares</th>
                    <th className="py-3 pr-4">Entry</th>
                    <th className="py-3 pr-4">Exit</th>
                    <th className="py-3 pr-4">Profit</th>
                    <th className="py-3 pr-4">Return</th>
                    <th className="py-3 pr-4">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.closedPositions.map(cp => (
                    <tr key={cp.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-foreground">{cp.asset.symbol}</div>
                      </td>
                      <td className="py-3 pr-4 font-mono">{cp.shares ?? '—'}</td>
                      <td className="py-3 pr-4 font-mono">{fmtGBP(cp.averageEntryPrice)}</td>
                      <td className="py-3 pr-4 font-mono">{fmtGBP(cp.exitPrice)}</td>
                      <td className={`py-3 pr-4 font-mono font-bold ${(cp.profitGBP ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {fmtGBP(cp.profitGBP)}
                      </td>
                      <td className={`py-3 pr-4 font-mono ${(cp.returnPct ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {fmtPct(cp.returnPct)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{cp.closedAt.toISOString().slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </BlurFade>

      {/* Activity Log */}
      <BlurFade delay={0.35}>
        <Card title="Recent Activity">
          {profile.usageEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No activity recorded.</div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {profile.usageEvents.map(evt => (
                <div key={evt.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
                  <div className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{evt.type}</div>
                  <div className="flex-1 text-xs text-muted-foreground truncate">{evt.path ?? '—'}</div>
                  <div className="shrink-0 text-xs text-muted-foreground">{evt.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
}
