import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const user = await requirePageUser('/app/alerts');
  const notifications = await prisma.notification.findMany({ where: { OR: [{ profileId: user.id }, { role: user.role }] }, orderBy: { createdAt: 'desc' }, take: 50 }).catch(() => []);
  const signals = await prisma.assetSnapshot.findMany({ where: { signalState: { not: 'NONE' } }, include: { asset: true }, orderBy: { capturedAt: 'desc' }, take: 50 }).catch(() => []);
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black tracking-tight">Alerts</h1><p className="mt-2 text-sm text-slate-600">Personal notifications plus current buy/sell activity across the master list.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Current Signal Alerts">{signals.length === 0 ? <div className="text-sm text-slate-500">No active signal snapshots.</div> : <div className="space-y-2">{signals.map((s) => <div key={s.id} className="rounded-2xl border border-slate-100 p-3"><Badge tone={s.signalState === 'BUY' ? 'emerald' : s.signalState === 'SELL' ? 'rose' : 'blue'}>{s.signalState}</Badge><div className="mt-2 font-black">{s.asset.symbol} · {s.asset.name}</div><div className="text-xs text-slate-500">Captured {s.capturedAt.toISOString()}</div></div>)}</div>}</Card>
        <Card title="Notifications">{notifications.length === 0 ? <div className="text-sm text-slate-500">No notifications yet.</div> : <div className="space-y-2">{notifications.map((n) => <div key={n.id} className="rounded-2xl border border-slate-100 p-3"><div className="font-black">{n.title}</div><div className="mt-1 text-sm text-slate-600">{n.body}</div><div className="mt-2 text-xs text-slate-400">{n.createdAt.toISOString()}</div></div>)}</div>}</Card>
      </div>
    </div>
  );
}
