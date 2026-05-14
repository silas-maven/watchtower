import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
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

export default async function AccessControlPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/access');

  const [members, recentActions] = await Promise.all([
    prisma.profile.findMany({
      where: { role: 'MEMBER' },
      select: {
        id: true,
        name: true,
        email: true,
        accessState: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.adminAccessAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        targetProfile: { select: { name: true, email: true } },
        actorProfile: { select: { name: true } },
      },
    }).catch(() => []),
  ]);

  const counts = {
    active: members.filter(m => m.accessState === 'ACTIVE').length,
    paused: members.filter(m => m.accessState === 'PAUSED').length,
    removed: members.filter(m => m.accessState === 'REMOVED').length,
  };

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">← Admin</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Access Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage member access with full audit trail. Payment failure does <strong>not</strong> auto-pause — all access changes are manual.</p>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="grid gap-4 md:grid-cols-3">
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
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <Card title="Member Access Table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pr-4">Member</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Last Seen</th>
                  <th className="py-3 pr-4">Joined</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </td>
                    <td className="py-3 pr-4"><Badge tone={tone(m.accessState)}>{m.accessState}</Badge></td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{timeAgo(m.lastSeenAt)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{m.createdAt.toISOString().slice(0, 10)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        <form action={`/api/admin/subscribers/${m.id}`} method="POST">
                          <input type="hidden" name="accessState" value="ACTIVE" />
                          <button type="submit" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500 hover:bg-emerald-500/20 transition">Activate</button>
                        </form>
                        <form action={`/api/admin/subscribers/${m.id}`} method="POST">
                          <input type="hidden" name="accessState" value="PAUSED" />
                          <button type="submit" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition">Pause</button>
                        </form>
                        <form action={`/api/admin/subscribers/${m.id}`} method="POST">
                          <input type="hidden" name="accessState" value="REMOVED" />
                          <button type="submit" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition">Remove</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </BlurFade>

      <BlurFade delay={0.25}>
        <Card title="Audit Trail">
          {recentActions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No access changes recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActions.map(action => (
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
