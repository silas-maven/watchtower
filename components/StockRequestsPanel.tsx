'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { CheckboxDropdown } from '@/components/ui/CheckboxDropdown';
import { useToast } from '@/components/ui/ToastProvider';
import {
  REQUEST_STATUSES,
  requestTypeLabel,
  statusLabel,
  statusTone,
  type RequestStatus,
} from '@/lib/securityRequests';

type SecurityRequest = {
  id: string;
  symbol: string;
  assetType: string;
  name: string | null;
  market: string | null;
  note: string | null;
  status: RequestStatus;
  adminNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  profile: { id: string; name: string; email: string; tier: string } | null;
  decidedBy: { name: string } | null;
};

const NEXT: RequestStatus[] = ['REVIEWED', 'ADDED', 'DECLINED'];

function since(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

/** Admin review queue for member security requests. */
export function StockRequestsPanel() {
  const { pushToast } = useToast();
  const [requests, setRequests] = useState<SecurityRequest[]>([]);
  const [tracked, setTracked] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(['PENDING', 'REVIEWED']);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [personFilter, setPersonFilter] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stock-requests', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) {
        setRequests(j.data.requests ?? []);
        setTracked(j.data.trackedBySymbol ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: RequestStatus) {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/stock-requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status, adminNote: noteDraft[id] ?? undefined }),
      });
      const j = await res.json();
      if (j.ok) {
        const updated = j.data.request as SecurityRequest;
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status, adminNote: updated.adminNote, decidedAt: updated.decidedAt, decidedBy: updated.decidedBy }
              : r,
          ),
        );
        setNoteDraft((prev) => ({ ...prev, [id]: '' }));
      } else {
        pushToast(j.error?.message ?? 'Could not update', 'error');
      }
    } finally {
      setBusyId(null);
    }
  }

  // Per-person totals, which is how the owner asked to see this: who is asking,
  // how much, and how much of it is still outstanding.
  const people = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; total: number; open: number }>();
    for (const r of requests) {
      if (!r.profile) continue;
      const row = map.get(r.profile.id) ?? {
        id: r.profile.id,
        name: r.profile.name,
        email: r.profile.email,
        total: 0,
        open: 0,
      };
      row.total += 1;
      if (r.status === 'PENDING' || r.status === 'REVIEWED') row.open += 1;
      map.set(r.profile.id, row);
    }
    return [...map.values()].sort((a, b) => b.open - a.open || b.total - a.total);
  }, [requests]);

  // The same security asked for by several members is the strongest signal for
  // what to add next, so surface it rather than leaving it in a flat list.
  const popular = useMemo(() => {
    const map = new Map<string, { symbol: string; count: number; people: Set<string> }>();
    for (const r of requests) {
      if (r.status === 'DECLINED' || r.status === 'ADDED') continue;
      const row = map.get(r.symbol) ?? { symbol: r.symbol, count: 0, people: new Set<string>() };
      row.count += 1;
      if (r.profile) row.people.add(r.profile.id);
      map.set(r.symbol, row);
    }
    return [...map.values()].filter((r) => r.people.size > 1).sort((a, b) => b.people.size - a.people.size);
  }, [requests]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests) counts.set(r.assetType, (counts.get(r.assetType) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: requestTypeLabel(value), count }));
  }, [requests]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return REQUEST_STATUSES.filter((s) => counts.has(s)).map((s) => ({
      value: s,
      label: statusLabel(s),
      count: counts.get(s) ?? 0,
    }));
  }, [requests]);

  const personOptions = useMemo(
    () => people.map((p) => ({ value: p.id, label: p.name || p.email, count: p.total })),
    [people],
  );

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
        if (typeFilter.length > 0 && !typeFilter.includes(r.assetType)) return false;
        if (personFilter.length > 0 && !(r.profile && personFilter.includes(r.profile.id))) return false;
        return true;
      }),
    [requests, statusFilter, typeFilter, personFilter],
  );

  const openCount = requests.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWED').length;

  if (loading) return <div className="text-sm text-muted-foreground">Loading requests…</div>;
  if (requests.length === 0) return <div className="text-sm text-muted-foreground">No security requests yet.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-foreground">
          <span className="font-bold">{openCount}</span> open of {requests.length}
        </span>
        <span className="text-muted-foreground">{people.length} member{people.length === 1 ? '' : 's'} asking</span>
      </div>

      {popular.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Asked for by more than one member</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {popular.map((p) => (
              <span key={p.symbol} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs">
                <span className="font-semibold text-foreground">{p.symbol}</span>
                <span className="ml-1.5 text-muted-foreground">{p.people.size} members</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per person */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Requests per member</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Member</th>
                <th className="py-2 pr-3">Open</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-foreground">{p.open}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{p.total}</td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => setPersonFilter(personFilter.includes(p.id) ? [] : [p.id])}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {personFilter.includes(p.id) ? 'Show all' : 'Show theirs'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The queue */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">The queue</span>
          <CheckboxDropdown label="All statuses" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
          <CheckboxDropdown label="All types" options={typeOptions} selected={typeFilter} onChange={setTypeFilter} />
          <CheckboxDropdown label="All members" options={personOptions} selected={personFilter} onChange={setPersonFilter} />
          <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No requests match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Security</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Why</th>
                  <th className="py-2 pr-3">Waiting</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Decide</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-foreground">{r.symbol}</div>
                      {r.name && <div className="text-xs text-muted-foreground">{r.name}</div>}
                      {r.market && <div className="text-xs text-muted-foreground">{r.market}</div>}
                      {tracked[r.symbol] && (
                        <div className="mt-1 text-[11px] font-semibold text-emerald-500">
                          Already tracked as {tracked[r.symbol]}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{requestTypeLabel(r.assetType)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      <div className="text-foreground">{r.profile?.name ?? '—'}</div>
                      <div>{r.profile?.email}</div>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.note ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{since(r.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                      {r.decidedBy && <div className="mt-1 text-[10px] text-muted-foreground">by {r.decidedBy.name}</div>}
                      {r.adminNote && <div className="mt-1 max-w-40 text-[11px] text-muted-foreground">{r.adminNote}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={noteDraft[r.id] ?? ''}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Reason (optional)"
                        maxLength={280}
                        className="mb-1 w-40 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {NEXT.filter((s) => s !== r.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(r.id, s)}
                            disabled={busyId === r.id}
                            className="rounded-lg border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60"
                          >
                            {statusLabel(s).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
