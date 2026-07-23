'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';

type StockRequest = {
  id: string;
  symbol: string;
  note: string | null;
  status: 'PENDING' | 'REVIEWED' | 'ADDED' | 'DECLINED';
  createdAt: string;
  profile: { name: string; email: string } | null;
};

const STATUS_TONE: Record<StockRequest['status'], 'amber' | 'blue' | 'emerald' | 'zinc'> = {
  PENDING: 'amber',
  REVIEWED: 'blue',
  ADDED: 'emerald',
  DECLINED: 'zinc',
};

const NEXT: Array<StockRequest['status']> = ['REVIEWED', 'ADDED', 'DECLINED'];

/** Admin review queue for member stock requests. */
export function StockRequestsPanel() {
  const { pushToast } = useToast();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stock-requests', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setRequests(j.data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: StockRequest['status']) {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/stock-requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const j = await res.json();
      if (j.ok) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      } else {
        pushToast(j.error?.message ?? 'Could not update', 'error');
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading requests…</div>;
  if (requests.length === 0) return <div className="text-sm text-muted-foreground">No stock requests yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Ticker</th>
            <th className="py-2 pr-3">Member</th>
            <th className="py-2 pr-3">Note</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Set</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-border/50 align-top">
              <td className="py-2 pr-3 font-semibold text-foreground">{r.symbol}</td>
              <td className="py-2 pr-3 text-xs text-muted-foreground">{r.profile?.name ?? '—'}<div>{r.profile?.email}</div></td>
              <td className="py-2 pr-3 text-xs text-muted-foreground">{r.note ?? '—'}</td>
              <td className="py-2 pr-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  {NEXT.filter((s) => s !== r.status).map((s) => (
                    <button key={s} onClick={() => setStatus(r.id, s)} disabled={busyId === r.id} className="rounded-lg border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60">{s.toLowerCase()}</button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
