'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { useToast } from '@/components/ui/ToastProvider';
import { ALIAS_MAX, checkAlias } from '@/lib/community';

/**
 * One-time alias picker, shown in place of the composer until a name is set.
 *
 * Said plainly in the copy that it is permanent, because it is: free renaming
 * would let a member shed a reputation whenever it suited them, and an older
 * post would stop matching the person who wrote it.
 */
export function AliasSetup({ onSet }: { onSet: (alias: string) => void }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  const local = checkAlias(value);
  const problem = value.trim().length > 0 && !local.ok ? local.reason : null;

  async function save() {
    if (saving || !local.ok) return;
    setSaving(true);
    try {
      const res = await fetch('/api/me/community-alias', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alias: value }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not set that name', 'error');
        return;
      }
      onSet(json.data.alias);
      pushToast(`You are posting as ${json.data.alias}.`, 'success');
    } catch {
      pushToast('Could not set that name', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Choose a display name">
      <p className="text-sm leading-6 text-muted-foreground">
        Your posts appear under this name, not your real one. Pick carefully: it is set once, and after that only the
        academy can change it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, ALIAS_MAX))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. chart_watcher"
          className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          onClick={save}
          disabled={saving || !local.ok}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Set name'}
        </button>
      </div>
      {problem && <p className="mt-2 text-xs text-rose-500">{problem}</p>}
    </Card>
  );
}
