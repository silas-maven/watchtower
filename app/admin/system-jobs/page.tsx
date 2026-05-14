import { Role } from '@prisma/client';
import { Card } from '@/components/Card';
import { AssetOperationsPanel } from '@/components/AssetOperationsPanel';
import { requirePageRole } from '@/lib/server/pageAuth';

export default async function SystemJobsPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/system-jobs');
  return <div className="space-y-6"><div><h1 className="text-3xl font-black tracking-tight">System Jobs</h1><p className="mt-2 text-sm text-slate-600">Manual controls for Vercel cron-backed workflows.</p></div><Card title="Operations"><AssetOperationsPanel /></Card><Card title="Cron Endpoints"><div className="space-y-2 text-sm text-slate-600"><div><code>/api/cron/refresh-market</code> every 15 minutes.</div><div><code>/api/cron/generate-daily-brief</code> daily Europe/London.</div><div><code>/api/cron/subscription-overdue-check</code> daily billing alert review.</div></div></Card></div>;
}
