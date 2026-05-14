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

export default async function CustomersPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/customers');
  const [subscribers, overdueNotices] = await Promise.all([
    prisma.profile.findMany({ where: { role: 'MEMBER' }, include: { subscriptionMirror: true }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.billingAlert.findMany({ where: { status: 'OPEN' }, include: { profile: true }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []),
  ]);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">← Admin</Link>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary mt-3">Admin</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Member profiles, investment indicators, billing state and manual access controls.</p>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <Card title="Members">
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

      <BlurFade delay={0.2}>
        <Card title="Open Billing Alerts">
          {overdueNotices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open billing alerts.</div>
          ) : (
            <div className="space-y-2">
              {overdueNotices.map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="font-bold text-foreground">{notice.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{notice.body}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{notice.profile?.email ?? 'Unknown customer'} · {notice.createdAt.toISOString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
}
