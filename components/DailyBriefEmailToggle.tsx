'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Opt-in for the daily personalised brief email. Off by default; the member
 * turns it on here and can unsubscribe from any email without signing in.
 */
export function DailyBriefEmailToggle({ initial }: { initial: boolean }) {
  const { pushToast } = useToast();
  const [enabled, setEnabled] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    // Optimistic, reverted if the save fails.
    setEnabled(next);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dailyBriefEmail: next }),
      });
      const json = await res.json();
      if (!json.ok) {
        setEnabled(!next);
        pushToast(json.error?.message ?? 'Could not save that preference', 'error');
        return;
      }
      pushToast(next ? 'Daily brief email turned on.' : 'Daily brief email turned off.', 'success');
    } catch {
      setEnabled(!next);
      pushToast('Could not save that preference', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-md">
        <div className="text-sm font-semibold text-foreground">Daily brief email</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          A morning email covering the assets you track: new buy and sell alerts since yesterday, wide daily ranges and
          earnings that week. You can unsubscribe from any email in one click.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        role="switch"
        aria-checked={enabled}
        aria-label="Daily brief email"
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
