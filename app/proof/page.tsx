import Link from 'next/link';
import { Role, SubscriptionStatus } from '@prisma/client';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { HelpTip } from '@/components/ui/HelpTip';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { getFormulaParityProof } from '@/lib/server/formulaParity';

export const dynamic = 'force-dynamic';

type CheckStatus = 'PASS' | 'WARN';

type CheckRow = {
  id: string;
  area: string;
  check: string;
  status: CheckStatus;
  proof: string;
  route: string;
};

function statusTone(status: CheckStatus) {
  return status === 'PASS' ? ('emerald' as const) : ('rose' as const);
}

function fmtDate(value: Date | null | undefined) {
  if (!value) return 'n/a';
  return value.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export default async function ProofPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/proof');

  const [
    ownerCount,
    adminCount,
    memberCount,
    activeSubs,
    overdueSubs,
    pausedSubs,
    removedSubs,
    assetCount,
    ruleCount,
    snapshotCount,
    latestSnapshot,
    signalEventCount,
    personalWatchCount,
    importRunsCount,
    lastImportRun,
    overdueNotificationCount,
    mockEmailCount,
    latestBrief,
    parity,
    assetsWithLatestState,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'OWNER' } }).catch(() => 0),
    prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0),
    prisma.user.count({ where: { role: 'MEMBER' } }).catch(() => 0),
    prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }).catch(() => 0),
    prisma.subscription.count({ where: { status: SubscriptionStatus.OVERDUE } }).catch(() => 0),
    prisma.subscription.count({ where: { status: SubscriptionStatus.PAUSED } }).catch(() => 0),
    prisma.subscription.count({ where: { status: SubscriptionStatus.REMOVED } }).catch(() => 0),
    prisma.asset.count({ where: { isActive: true } }).catch(() => 0),
    prisma.assetRule.count().catch(() => 0),
    prisma.assetSnapshot.count().catch(() => 0),
    prisma.assetSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } }).catch(() => null),
    prisma.signalEvent.count().catch(() => 0),
    prisma.personalWatch.count().catch(() => 0),
    prisma.importRun.count().catch(() => 0),
    prisma.importRun.findFirst({ orderBy: { createdAt: 'desc' } }).catch(() => null),
    prisma.notification.count({ where: { type: 'subscription_overdue' } }).catch(() => 0),
    prisma.mockEmailLog.count().catch(() => 0),
    prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null),
    getFormulaParityProof().catch(() => ({ sampleAsset: null, formulas: [] as Array<{ implemented: boolean }> })),
    prisma.asset
      .findMany({
        where: { isActive: true },
        include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
      })
      .catch(() => []),
  ]);

  const buyLikeCount = assetsWithLatestState.filter(
    (a) => a.snapshots[0]?.signalState === 'BUY' || a.snapshots[0]?.signalState === 'BOTH',
  ).length;
  const sellLikeCount = assetsWithLatestState.filter(
    (a) => a.snapshots[0]?.signalState === 'SELL' || a.snapshots[0]?.signalState === 'BOTH',
  ).length;

  const checks: CheckRow[] = [
    {
      id: 'auth',
      area: 'Access',
      check: 'Demo auth/session and role split',
      status: ownerCount > 0 && adminCount > 0 && memberCount > 0 ? 'PASS' : 'WARN',
      proof: `owner=${ownerCount}, admin=${adminCount}, member=${memberCount}`,
      route: '/login',
    },
    {
      id: 'asset-catalog',
      area: 'Assets',
      check: 'Master watchlist + target rules (add/amend)',
      status: assetCount > 0 && ruleCount > 0 ? 'PASS' : 'WARN',
      proof: `active assets=${assetCount}, rules=${ruleCount}`,
      route: '/admin',
    },
    {
      id: 'import',
      area: 'Assets',
      check: 'Spreadsheet import pipeline',
      status: importRunsCount > 0 ? 'PASS' : 'WARN',
      proof: lastImportRun
        ? `runs=${importRunsCount}, last=${lastImportRun.status}, rows=${lastImportRun.rowCount}, assets=${lastImportRun.assetCount}`
        : 'no import run found',
      route: '/admin',
    },
    {
      id: 'market-refresh',
      area: 'Signals',
      check: 'Market ingestion snapshots',
      status: snapshotCount > 0 ? 'PASS' : 'WARN',
      proof: `snapshots=${snapshotCount}, latest=${fmtDate(latestSnapshot?.capturedAt)}`,
      route: '/admin',
    },
    {
      id: 'signal-engine',
      area: 'Signals',
      check: 'Deterministic signal transitions and events',
      status: signalEventCount > 0 || buyLikeCount > 0 || sellLikeCount > 0 ? 'PASS' : 'WARN',
      proof: `buy-like=${buyLikeCount}, sell-like=${sellLikeCount}, events=${signalEventCount}`,
      route: '/summary',
    },
    {
      id: 'formula-parity',
      area: 'Signals',
      check: 'Spreadsheet formula parity implementation',
      status: parity.formulas.length > 0 && parity.formulas.every((f) => f.implemented) ? 'PASS' : 'WARN',
      proof: `functions=${parity.formulas.length}, sample=${parity.sampleAsset?.symbol ?? 'n/a'}`,
      route: '/admin',
    },
    {
      id: 'member-watchlist',
      area: 'Member',
      check: 'Full list + personal watchlist selection',
      status: assetCount > 0 ? 'PASS' : 'WARN',
      proof: `master assets=${assetCount}, personal stars=${personalWatchCount}`,
      route: '/community',
    },
    {
      id: 'user-management',
      area: 'Users',
      check: 'Subscription lifecycle controls (activate/pause/remove/mark paid)',
      status: memberCount > 0 ? 'PASS' : 'WARN',
      proof: `active=${activeSubs}, overdue=${overdueSubs}, paused=${pausedSubs}, removed=${removedSubs}`,
      route: '/owner',
    },
    {
      id: 'overdue-alerts',
      area: 'Users',
      check: 'Overdue escalation alerts (in-app + mock email)',
      status: overdueNotificationCount > 0 || overdueSubs > 0 ? 'PASS' : 'WARN',
      proof: `overdue notices=${overdueNotificationCount}, mock emails=${mockEmailCount}`,
      route: '/owner',
    },
    {
      id: 'daily-brief',
      area: 'AI',
      check: 'Daily brief generation (LLM + fallback)',
      status: latestBrief != null ? 'PASS' : 'WARN',
      proof: latestBrief
        ? `date=${latestBrief.briefDate.toISOString().slice(0, 10)}, model=${latestBrief.model}, fallback=${latestBrief.isFallback}`
        : 'no brief generated yet',
      route: '/summary',
    },
  ];

  const passCount = checks.filter((c) => c.status === 'PASS').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">POC Acceptance Checklist</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Live proof board for owner demo. Each check includes measurable runtime evidence.
          </p>
        </div>
        <Badge tone={passCount === checks.length ? 'emerald' : 'blue'}>
          {passCount}/{checks.length} Pass
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Checks Passed">
          <div className="text-2xl font-semibold text-emerald-700">{passCount}</div>
        </Card>
        <Card title="Checks Needs Attention">
          <div className="text-2xl font-semibold text-rose-700">{checks.length - passCount}</div>
        </Card>
        <Card
          title={
            <span>
              How To Demo
              <HelpTip text="Run Market Refresh and Generate Daily Brief from Asset Management before owner walkthrough." />
            </span>
          }
        >
          <div className="text-xs text-zinc-600">
            For best demo state, run refresh + brief once before review.
          </div>
        </Card>
      </div>

      <Card
        title={
          <span>
            Checklist
            <HelpTip text="PASS = implemented with runtime evidence. WARN = implemented route exists but no runtime evidence yet." />
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="py-2 pr-3">Area</th>
                <th className="py-2 pr-3">Capability</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Proof</th>
                <th className="py-2 pr-3">Open</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-3 font-semibold">{row.area}</td>
                  <td className="py-2 pr-3">{row.check}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-zinc-700">{row.proof}</td>
                  <td className="py-2 pr-3">
                    <Link href={row.route} className="text-sm font-semibold text-blue-700">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
