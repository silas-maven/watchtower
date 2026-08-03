'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, Flag, Heart, MessageSquare, Star, Trash2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

export type QueueRow = {
  id: string;
  alias: string;
  body: string;
  status: string;
  featured: boolean;
  likeCount: number;
  replyCount: number;
  reportCount: number;
  isReply: boolean;
  replyingTo: string | null;
  moderationNote: string | null;
  moderatedBy: string | null;
  authorName: string;
  authorEmail: string;
  authorTier: string;
  createdAt: string;
};

type Filter = 'reported' | 'all' | 'hidden';

function toneFor(status: string) {
  if (status === 'PUBLISHED') return 'emerald' as const;
  if (status === 'HIDDEN') return 'amber' as const;
  return 'rose' as const;
}

export function ModerationQueue({ initialRows, reportedCount }: { initialRows: QueueRow[]; reportedCount: number }) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>(reportedCount > 0 ? 'reported' : 'all');
  const [busy, setBusy] = useState<string | null>(null);
  // Hiding and removing both require a reason, so both go through this dialog
  // rather than firing straight off a button.
  const [pending, setPending] = useState<{ row: QueueRow; status: 'HIDDEN' | 'REMOVED' } | null>(null);
  const [reason, setReason] = useState('');
  const { pushToast } = useToast();

  const shown = useMemo(() => {
    if (filter === 'reported') return rows.filter((r) => r.reportCount > 0);
    if (filter === 'hidden') return rows.filter((r) => r.status !== 'PUBLISHED');
    return rows;
  }, [rows, filter]);

  async function patch(id: string, payload: Record<string, unknown>, successMessage: string) {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not update that post', 'error');
        return false;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: json.data.post.status,
                featured: json.data.post.featured,
                reportCount: json.data.post.reportCount,
                moderationNote: typeof payload.moderationNote === 'string' ? payload.moderationNote : r.moderationNote,
              }
            : r,
        ),
      );
      pushToast(successMessage, 'success');
      return true;
    } catch {
      pushToast('Could not update that post', 'error');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function confirmTakedown() {
    if (!pending || !reason.trim()) return;
    const ok = await patch(
      pending.row.id,
      { status: pending.status, moderationNote: reason.trim() },
      pending.status === 'HIDDEN' ? 'Hidden from the feed.' : 'Removed.',
    );
    if (ok) {
      setPending(null);
      setReason('');
    }
  }

  const FILTERS: Array<{ value: Filter; label: string; count: number }> = [
    { value: 'reported', label: 'Reported', count: rows.filter((r) => r.reportCount > 0).length },
    { value: 'hidden', label: 'Actioned', count: rows.filter((r) => r.status !== 'PUBLISHED').length },
    { value: 'all', label: 'Everything', count: rows.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label} <span className="text-muted-foreground">{f.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card title="Nothing to review">
          <p className="text-sm text-muted-foreground">
            {filter === 'reported' ? 'No posts have been reported.' : 'Nothing here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{row.alias}</span>
                    <Badge tone={toneFor(row.status)}>{row.status}</Badge>
                    {row.isReply && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        reply to {row.replyingTo ?? 'a post'}
                      </span>
                    )}
                    {row.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                        <Star className="h-2.5 w-2.5 fill-primary" /> Featured
                      </span>
                    )}
                    {row.reportCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-500">
                        <Flag className="h-2.5 w-2.5" /> {row.reportCount} reported
                      </span>
                    )}
                  </div>
                  {/* The real identity behind the alias. A moderator has to know
                      who they are actioning; the feed never shows this. */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.authorName} · {row.authorEmail} · {row.authorTier} ·{' '}
                    {new Date(row.createdAt).toLocaleString('en-GB')}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{row.likeCount}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{row.replyCount}</span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-muted/20 p-3 text-sm leading-6 text-foreground">
                {row.body}
              </p>

              {row.moderationNote && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Reason: <span className="text-foreground">{row.moderationNote}</span>
                  {row.moderatedBy && <> · by {row.moderatedBy}</>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {row.status !== 'PUBLISHED' && (
                  <button
                    onClick={() => patch(row.id, { status: 'PUBLISHED', moderationNote: null }, 'Restored to the feed.')}
                    disabled={busy === row.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
                  >
                    <Eye className="h-3.5 w-3.5" /> Restore
                  </button>
                )}
                {row.status !== 'HIDDEN' && (
                  <button
                    onClick={() => { setPending({ row, status: 'HIDDEN' }); setReason(''); }}
                    disabled={busy === row.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-amber-500 transition hover:bg-muted/40 disabled:opacity-60"
                  >
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </button>
                )}
                {row.status !== 'REMOVED' && (
                  <button
                    onClick={() => { setPending({ row, status: 'REMOVED' }); setReason(''); }}
                    disabled={busy === row.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-rose-500 transition hover:bg-muted/40 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
                {!row.isReply && row.status === 'PUBLISHED' && (
                  <button
                    onClick={() => patch(row.id, { featured: !row.featured }, row.featured ? 'No longer featured.' : 'Featured on the Dashboard.')}
                    disabled={busy === row.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                      row.featured ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${row.featured ? 'fill-primary' : ''}`} />
                    {row.featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}
                {row.reportCount > 0 && (
                  <button
                    onClick={() => patch(row.id, { clearReports: true }, 'Reports cleared.')}
                    disabled={busy === row.id}
                    className="ml-auto text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                  >
                    Clear reports, leave the post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.status === 'REMOVED' ? 'Remove this post?' : 'Hide this post?'}
        description={
          pending?.status === 'REMOVED'
            ? 'It disappears for everyone, including whoever wrote it. Nothing is deleted, so you can put it back.'
            : 'It disappears from the feed. Whoever wrote it still sees it, marked as hidden, so they know what happened.'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmTakedown}
              disabled={!reason.trim() || busy !== null}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {pending?.status === 'REMOVED' ? 'Remove' : 'Hide'}
            </button>
          </>
        }
      >
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Reason (required)
        </label>
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmTakedown()}
          placeholder="e.g. promoting an unrelated service"
          maxLength={280}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Kept on file so there is an answer if this is queried later.
        </p>
      </Modal>
    </div>
  );
}
