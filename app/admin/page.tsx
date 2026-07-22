import Link from 'next/link';
import { Role } from '@prisma/client';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { BlurFade } from '@/components/ui/blur-fade';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function AdminOverviewPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin');
  const [assetCount, profileCount, activeAccess, billingAlerts, signalCount, usageCount] = await Promise.all([
    prisma.asset.count({ where: { isActive: true } }).catch(() => 0),
    prisma.profile.count({ where: { role: 'MEMBER' } }).catch(() => 0),
    prisma.profile.count({ where: { role: 'MEMBER', accessState: 'ACTIVE' } }).catch(() => 0),
    prisma.billingAlert.count({ where: { status: 'OPEN' } }).catch(() => 0),
    prisma.assetSnapshot.count({ where: { signalState: { not: 'NONE' } } }).catch(() => 0),
    prisma.usageEvent.count().catch(() => 0),
  ]);

  const areas = [
    { href: '/admin/assets', title: 'Asset Management', body: 'Create, amend, import, refresh market data, prove spreadsheet functions.' },
    { href: '/admin/members', title: 'Members', body: 'Profiles, subscriptions, billing alerts, access control and audit trail.' },
    { href: '/admin/analytics', title: 'Analytics', body: 'Platform-wide usage intelligence, tool adoption, and user engagement trends.' },
    { href: '/admin/ai-briefs', title: 'AI Briefs', body: 'Generate admin summaries using deterministic market state as source.' },
    { href: '/admin/system-jobs', title: 'System Jobs', body: 'Cron schedules, import history, and background task monitoring.' },
    { href: '/admin/releases', title: "What's New", body: 'Release notes for shipped updates, tied to your feedback with links to each change.' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Admin Workspace</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Operational Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">Assets, customers, billing, access and analytics are deliberately separated.</p>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assets</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{assetCount}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Members</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{profileCount}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Active Access</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{activeAccess}</div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Billing Alerts</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{billingAlerts}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Signals</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{signalCount}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usage Events</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{usageCount}</div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <Card title="Admin Sections" right={<Badge tone="blue">segregated</Badge>}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Link key={area.href} href={area.href} className="rounded-2xl border border-border bg-muted/20 p-4 transition hover:bg-muted/40 hover:shadow-sm">
                <div className="font-bold text-foreground">{area.title}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{area.body}</div>
              </Link>
            ))}
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}
