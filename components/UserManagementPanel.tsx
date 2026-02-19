'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/ToastProvider';

type Status = 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'REMOVED';

type Subscriber = {
  id: string;
  name: string;
  email: string;
  status: Status;
  dueAt: string | null;
  overdueStage: number;
};

type Props = {
  initialSubscribers: Subscriber[];
};

function tone(status: Status) {
  if (status === 'ACTIVE') return 'emerald' as const;
  if (status === 'OVERDUE') return 'rose' as const;
  if (status === 'PAUSED') return 'blue' as const;
  return 'zinc' as const;
}

export function UserManagementPanel({ initialSubscribers }: Props) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { pushToast } = useToast();

  const counts = useMemo(
    () => ({
      active: subscribers.filter((s) => s.status === 'ACTIVE').length,
      overdue: subscribers.filter((s) => s.status === 'OVERDUE').length,
      paused: subscribers.filter((s) => s.status === 'PAUSED').length,
      removed: subscribers.filter((s) => s.status === 'REMOVED').length,
    }),
    [subscribers],
  );

  async function setStatus(userId: string, status: Status) {
    setBusyUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error?.message ?? 'Failed to update status');
        pushToast(json.error?.message ?? 'Failed to update status', 'error');
        return;
      }

      setSubscribers((prev) => prev.map((s) => (s.id === userId ? { ...s, status } : s)));
      setMessage(`Updated subscription to ${status}.`);
      pushToast(`Updated subscription to ${status}.`, 'success');
    } catch {
      setMessage('Failed to update status');
      pushToast('Failed to update status', 'error');
    } finally {
      setBusyUserId(null);
    }
  }

  async function markPaid(userId: string) {
    setBusyUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/mark-paid`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error?.message ?? 'Failed to mark paid');
        pushToast(json.error?.message ?? 'Failed to mark paid', 'error');
        return;
      }

      const dueAt = json.data?.subscription?.dueAt ?? null;
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id === userId
            ? {
                ...s,
                status: 'ACTIVE',
                overdueStage: 0,
                dueAt: typeof dueAt === 'string' ? dueAt : s.dueAt,
              }
            : s,
        ),
      );
      setMessage('Marked paid and reactivated member.');
      pushToast('Marked paid and reactivated member.', 'success');
    } catch {
      setMessage('Failed to mark paid');
      pushToast('Failed to mark paid', 'error');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Active</div><div className="text-2xl font-semibold">{counts.active}</div></div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Overdue</div><div className="text-2xl font-semibold text-rose-700">{counts.overdue}</div></div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Paused</div><div className="text-2xl font-semibold">{counts.paused}</div></div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Removed</div><div className="text-2xl font-semibold">{counts.removed}</div></div>
      </div>

      {message && <div className="text-xs text-zinc-600">{message}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-600">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Status <HelpTip text="ACTIVE, OVERDUE, PAUSED, REMOVED." /></th>
              <th className="py-2 pr-3">Due Date</th>
              <th className="py-2 pr-3">Stage <HelpTip text="Overdue escalation stage: D+1, D+3, weekly." /></th>
              <th className="py-2 pr-3">Actions <HelpTip text="Pause, remove, reactivate, or mark payment received." /></th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => {
              const busy = busyUserId === s.id;
              return (
                <tr key={s.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-zinc-600">{s.email}</div>
                  </td>
                  <td className="py-2 pr-3"><Badge tone={tone(s.status)}>{s.status}</Badge></td>
                  <td className="py-2 pr-3">{s.dueAt ? s.dueAt.slice(0, 10) : '—'}</td>
                  <td className="py-2 pr-3">{s.overdueStage}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => setStatus(s.id, 'ACTIVE')} className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60">Activate</button>
                      <button disabled={busy} onClick={() => setStatus(s.id, 'PAUSED')} className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60">Pause</button>
                      <button disabled={busy} onClick={() => setStatus(s.id, 'REMOVED')} className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60">Remove</button>
                      <button disabled={busy} onClick={() => markPaid(s.id)} className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60">Mark Paid</button>
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
