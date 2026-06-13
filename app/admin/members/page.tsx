import { Role } from '@prisma/client';
import Link from 'next/link';
import { MembersHub } from '@/components/MembersHub';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { getMemberIntelligence } from '@/lib/server/memberIntelligence';
import { BlurFade } from '@/components/ui/blur-fade';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function MembersHubPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/members');

  const [subscribers, overdueNotices, recentAccessActions, intelligence] = await Promise.all([
    prisma.profile
      .findMany({
        where: { role: 'MEMBER' },
        include: { subscriptionMirror: true },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []),
    prisma.billingAlert
      .findMany({
        where: { status: 'OPEN' },
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
      .catch(() => []),
    prisma.adminAccessAction
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: {
          targetProfile: { select: { name: true, email: true } },
          actorProfile: { select: { name: true } },
        },
      })
      .catch(() => []),
    getMemberIntelligence().catch(() => null),
  ]);

  const fallbackIntelligence = {
    totals: {
      members: subscribers.length,
      activeAccess: subscribers.filter((m) => m.accessState === 'ACTIVE').length,
      declaredPortfolioGBP: 0,
      holdingsValueGBP: 0,
      holdingsInvestedGBP: 0,
      holdingsCount: 0,
      activeLast7d: 0,
      newLast30d: 0,
    },
    topHeldAssets: [],
    recentClosedPositions: [],
    watchlistLeaders: [],
  };

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground transition hover:text-foreground">← Admin</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profiles, how members are trading, subscriptions, access control, and billing in one place. Payment failure raises an alert; access is only ever changed by you.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <MembersHub
          intelligence={intelligence ?? fallbackIntelligence}
          subscribers={subscribers.map((u) => ({
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
          billingAlerts={overdueNotices.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            email: n.profile?.email ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
          auditActions={recentAccessActions.map((a) => ({
            id: a.id,
            targetName: a.targetProfile.name,
            toState: a.toState,
            reason: a.reason,
            actorName: a.actorProfile?.name ?? null,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </BlurFade>
    </div>
  );
}
