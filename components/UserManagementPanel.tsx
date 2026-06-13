'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/ToastProvider';

type Status = 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'REMOVED';
type AccessState = 'ACTIVE' | 'PAUSED' | 'REMOVED';

type Subscriber = {
  id: string;
  name: string;
  email: string;
  status: Status;
  accessState: AccessState;
  dueAt: string | null;
  overdueStage: number;
  declaredPortfolioGBP: number | null;
  averageInvestmentGBP: number | null;
};

type Props = { initialSubscribers: Subscriber[] };

function tone(status: Status | AccessState) {
  if (status === 'ACTIVE') return 'emerald' as const;
  if (status === 'OVERDUE' || status === 'REMOVED') return 'rose' as const;
  if (status === 'PAUSED') return 'amber' as const;
  return 'zinc' as const;
}

function fmtGBP(value: number | null) {
  if (value == null) return '—';
  return `£${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function UserManagementPanel({ initialSubscribers }: Props) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const counts = useMemo(
    () => ({
      active: subscribers.filter((s) => s.accessState === 'ACTIVE').length,
      overdue: subscribers.filter((s) => s.status === 'OVERDUE').length,
      paused: subscribers.filter((s) => s.accessState === 'PAUSED').length,
      removed: subscribers.filter((s) => s.accessState === 'REMOVED').length,
    }),
    [subscribers],
  );

  async function patchUser(userId: string, body: Record<string, unknown>, optimistic: Partial<Subscriber>, success: string) {
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Failed to update subscriber', 'error');
        return;
      }
      setSubscribers((prev) => prev.map((s) => (s.id === userId ? { ...s, ...optimistic } : s)));
      pushToast(success, 'success');
    } catch {
      pushToast('Failed to update subscriber', 'error');
    } finally {
      setBusyUserId(null);
    }
  }

  async function markPaid(userId: string) {
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/mark-paid`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Failed to mark paid', 'error');
        return;
      }
      const dueAt = json.data?.subscription?.currentPeriodEnd ?? null;
      setSubscribers((prev) => prev.map((s) => (s.id === userId ? { ...s, status: 'ACTIVE', overdueStage: 0, dueAt } : s)));
      pushToast('Marked paid and cleared open billing alerts.', 'success');
    } catch {
      pushToast('Failed to mark paid', 'error');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-xs font-bold text-emerald-500">Active Access</div>
          <div className="text-2xl font-black text-foreground">{counts.active}</div>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="text-xs font-bold text-rose-500">Payment Alerts</div>
          <div className="text-2xl font-black text-foreground">{counts.overdue}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-xs font-bold text-amber-500">Paused</div>
          <div className="text-2xl font-black text-foreground">{counts.paused}</div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <div className="text-xs font-bold text-muted-foreground">Removed</div>
          <div className="text-2xl font-black text-foreground">{counts.removed}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Access <HelpTip text="Manual product access controlled by admin. Payment failure does not auto-pause." /></th>
              <th className="px-4 py-3">Billing</th>
              <th className="px-4 py-3 text-right">Declared</th>
              <th className="px-4 py-3 text-right">Avg invest</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => {
              const busy = busyUserId === s.id;
              return (
                <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={tone(s.accessState)}>{s.accessState}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge tone={tone(s.status)}>{s.status}</Badge>
                    {(s.status === 'OVERDUE' || s.dueAt) && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.dueAt ? `Due ${s.dueAt.slice(0, 10)}` : 'No due date'}{s.status === 'OVERDUE' ? ` · Stage ${s.overdueStage}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{fmtGBP(s.declaredPortfolioGBP)}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{fmtGBP(s.averageInvestmentGBP)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Contextual access controls: only show transitions that make sense */}
                      {s.accessState !== 'ACTIVE' && (
                        <button disabled={busy} onClick={() => patchUser(s.id, { accessState: 'ACTIVE' }, { accessState: 'ACTIVE' }, 'Access activated.')} className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-60 transition">Activate</button>
                      )}
                      {s.accessState === 'ACTIVE' && (
                        <button disabled={busy} onClick={() => patchUser(s.id, { accessState: 'PAUSED', reason: 'Manual admin pause' }, { accessState: 'PAUSED' }, 'Access paused.')} className="rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/10 disabled:opacity-60 transition">Pause</button>
                      )}
                      {s.accessState !== 'REMOVED' && (
                        <button disabled={busy} onClick={() => patchUser(s.id, { accessState: 'REMOVED', reason: 'Manual admin removal' }, { accessState: 'REMOVED' }, 'Access removed.')} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 disabled:opacity-60 transition">Remove</button>
                      )}
                      {/* Billing action: Mark Paid when overdue, else Flag Overdue */}
                      {s.status === 'OVERDUE' ? (
                        <button disabled={busy} onClick={() => markPaid(s.id)} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition">Mark paid</button>
                      ) : (
                        <button disabled={busy} onClick={() => patchUser(s.id, { status: 'OVERDUE' }, { status: 'OVERDUE', overdueStage: 1 }, 'Billing marked overdue.')} className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 disabled:opacity-60 transition">Flag overdue</button>
                      )}
                      <Link href={`/admin/customers/${s.id}`} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition">Review</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
