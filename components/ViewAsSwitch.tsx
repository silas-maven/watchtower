'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

async function setView(view: 'free' | 'full') {
  const res = await fetch('/api/admin/view-as', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ view }),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error?.message ?? 'Could not switch view');
}

/** Admin control to enter the free-member preview. */
export function ViewAsSwitch({ previewing }: { previewing: boolean }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function go(view: 'free' | 'full') {
    setBusy(true);
    try {
      await setView(view);
      // Everything that gates on entitlement is rendered on the server, so the
      // whole tree has to be refetched for the switch to show.
      router.refresh();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Could not switch view', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        See the members area exactly as somebody on the free plan does: no averaging planner, no buy and sell alerts, no
        indicators, no portfolio stress test. Your own account is not changed, and nothing about your role or data moves.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(previewing ? 'full' : 'free')}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${
            previewing
              ? 'bg-primary text-primary-foreground hover:brightness-110'
              : 'border border-border bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          {previewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {busy ? 'Switching…' : previewing ? 'Back to the full view' : 'Preview the free plan'}
        </button>
        <span className="text-xs text-muted-foreground">
          Currently showing: <span className="font-semibold text-foreground">{previewing ? 'Free plan' : 'Full membership'}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Persistent strip shown while the preview is on. Without it, an admin who
 * forgets they switched will read missing features as a bug, which is a very
 * easy way to lose an afternoon.
 */
export function ViewAsBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function exit() {
    setBusy(true);
    try {
      await setView('full');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-black">
      <span>You are previewing the free plan. Paid features are hidden on purpose.</span>
      <button type="button" onClick={exit} disabled={busy} className="underline underline-offset-2 disabled:opacity-60">
        {busy ? 'Leaving…' : 'Leave preview'}
      </button>
    </div>
  );
}
