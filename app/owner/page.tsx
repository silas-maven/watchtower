import Link from 'next/link';
import { Role } from '@prisma/client';
import { Card } from '@/components/Card';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function OwnerPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/owner');

  const [subscribers, overdueNotices] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'MEMBER' },
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.notification.findMany({
      where: { type: 'subscription_overdue' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-zinc-600">
          This section is only for member access and subscription operations.
        </p>
      </div>

      <Card title="Members and Subscription Status">
        <UserManagementPanel
          initialSubscribers={subscribers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: (u.subscription?.status ?? 'ACTIVE') as 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'REMOVED',
            dueAt: u.subscription?.dueAt ? u.subscription.dueAt.toISOString() : null,
            overdueStage: u.subscription?.overdueStage ?? 0,
          }))}
        />
      </Card>

      <Card title="Overdue Alert Feed">
        {overdueNotices.length === 0 ? (
          <div className="text-sm text-zinc-600">No overdue notifications yet.</div>
        ) : (
          <div className="space-y-2">
            {overdueNotices.map((notice) => (
              <div key={notice.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-sm font-semibold">{notice.title}</div>
                <div className="text-xs text-zinc-600 mt-1">{notice.body}</div>
                <div className="text-xs text-zinc-500 mt-2">{notice.createdAt.toISOString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
