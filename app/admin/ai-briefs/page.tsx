import { Role } from '@prisma/client';
import { Card } from '@/components/Card';
import { AssetOperationsPanel } from '@/components/AssetOperationsPanel';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';

export const dynamic = 'force-dynamic';

export default async function AiBriefsPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/ai-briefs');
  const latest = await prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null);
  return <div className="space-y-6"><div><h1 className="text-3xl font-black tracking-tight">AI Briefs</h1><p className="mt-2 text-sm text-slate-600">AI summarizes deterministic market and signal state; it does not create trading truth.</p></div><Card title="Generate"><AssetOperationsPanel /></Card><Card title="Latest Brief">{latest ? <div className="space-y-3"><div className="text-sm leading-6 text-slate-700">{latest.summary}</div><div className="text-xs text-slate-500">{latest.briefDate.toISOString().slice(0,10)} · {latest.model} · fallback={String(latest.isFallback)}</div></div> : <div className="text-sm text-slate-500">No brief generated yet.</div>}</Card></div>;
}
