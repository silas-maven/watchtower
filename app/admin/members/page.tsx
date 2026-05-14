import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { BlurFade } from '@/components/ui/blur-fade';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

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

export default async function MembersHubPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/members');

  const [subscribers, overdueNotices, recentAccessActions] = await Promise.all([
    prisma.profile.findMany({
      where: { role: 'MEMBER' },
      include: { subscriptionMirror: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.billingAlert.findMany({
      where: { status: 'OPEN' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []),
    prisma.adminAccessAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        targetProfile: { select: { name: true, email: true } },
        actorProfile: { select: { name: true } },
      },
    }).catch(() => []),
  ]);

  const counts = {
    total: subscribers.length,
    active: subscribers.filter(m => m.accessState === 'ACTIVE').length,
    paused: subscribers.filter(m => m.accessState === 'PAUSED').length,
    removed: subscribers.filter(m => m.accessState === 'REMOVED').length,
    overdue: overdueNotices.length,
  };

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">← Admin</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Member management hub — profiles, subscriptions, access control, and billing in one place.</p>
        </div>
      </BlurFade>

      {/* Status Overview */}
      <BlurFade delay={0.15}>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="mt-1 text-3xl font-black text-foreground">{counts.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Active</div>
            <div className="mt-1 text-3xl font-black text-foreground">{counts.active}</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Paused</div>
            <div className="mt-1 text-3xl font-black text-foreground">{counts.paused}</div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Removed</div>
            <div className="mt-1 text-3xl font-black text-foreground">{counts.removed}</div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Billing Alerts</div>
            <div className="mt-1 text-3xl font-black text-foreground">{counts.overdue}</div>
          </div>
        </div>
      </BlurFade>

      {/* User Management Table */}
      <BlurFade delay={0.2}>
        <Card title="Member Management">
          <UserManagementPanel
            initialSubscribers={subscribers.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              accessState: u.accessState,
              declaredPortfolioGBP: u.declaredPortfolioGBP,
              averageInvestmentGBP: u.averageInvestmentGBP,
              status: (u.subscriptionMirror?.status ?? 'ACTIVE') as 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'REMOVED',
              dueAt: u.subscriptionMirror?.currentPeriodEnd ? u.subscriptionMirror.currentPeriodEnd.toISOString() : null,
              overdueStage: u.subscriptionMirror?.status === 'OVERDUE' ? 1 : 0,
            }))}
          />
        </Card>
      </BlurFade>

      {/* Billing Alerts */}
      <BlurFade delay={0.25}>
        <Card title="Open Billing Alerts">
          {overdueNotices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open billing alerts — all members are current.</div>
          ) : (
            <div className="space-y-2">
              {overdueNotices.map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="font-bold text-foreground">{notice.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{notice.body}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{notice.profile?.email ?? 'Unknown'} · {notice.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlurFade>

      {/* Access Audit Trail */}
      <BlurFade delay={0.3}>
        <Card title="Access Audit Trail">
          {recentAccessActions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No access changes recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentAccessActions.map(action => (
                <div key={action.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {action.toState === 'ACTIVE' ? '✓' : action.toState === 'PAUSED' ? '⏸' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {action.targetProfile.name} → <Badge tone={tone(action.toState)}>{action.toState}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.reason ?? 'No reason given'} · by {action.actorProfile?.name ?? 'System'} · {action.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
}
