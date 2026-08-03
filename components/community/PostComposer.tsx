'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { POST_MAX_LENGTH, checkBody } from '@/lib/community';
import type { FeedPost } from '@/lib/server/community';

/**
 * The post and reply box. Same component either way: a reply is a post with a
 * parent, so there is one path to keep working rather than two that drift.
 *
 * Validation runs here for the counter and the immediate message, and again on
 * the server, which is the one that counts. The client copy exists to save a
 * round trip, not to be trusted.
 */
export function PostComposer({
  alias,
  parentId,
  maxLength = POST_MAX_LENGTH,
  placeholder = 'What are you watching?',
  onPosted,
}: {
  alias: string;
  parentId?: string;
  maxLength?: number;
  placeholder?: string;
  onPosted: (post: FeedPost) => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { pushToast } = useToast();

  const remaining = maxLength - body.length;
  const local = checkBody(body, { isReply: parentId != null });
  const blocked = body.trim().length > 0 && !local.ok ? local.reason : null;

  async function submit() {
    if (sending || body.trim().length === 0) return;
    if (!local.ok) {
      pushToast(local.reason, 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, parentId: parentId ?? null }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not post that', 'error');
        return;
      }
      onPosted(json.data.post);
      setBody('');
    } catch {
      pushToast('Could not post that', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={parentId ? 2 : 3}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {blocked ? (
            <span className="text-rose-500">{blocked}</span>
          ) : (
            <>
              Posting as <span className="font-semibold text-foreground">{alias}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs tabular-nums ${remaining < 20 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {remaining}
          </span>
          <button
            onClick={submit}
            disabled={sending || body.trim().length === 0 || !local.ok}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {sending ? 'Posting…' : parentId ? 'Reply' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
