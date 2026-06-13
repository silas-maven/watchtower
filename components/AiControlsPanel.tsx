'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type Toggles = {
  ai_briefs_enabled: boolean;
  weekly_digest_enabled: boolean;
  ai_member_brief_enabled: boolean;
};

type Props = { initial: Toggles };

const LABELS: Record<keyof Toggles, { title: string; help: string }> = {
  ai_briefs_enabled: {
    title: 'Daily AI brief',
    help: 'When off, the daily brief still generates from deterministic data without calling the model.',
  },
  weekly_digest_enabled: {
    title: 'Weekly owner digest',
    help: 'When off, the Monday digest still generates deterministically without calling the model.',
  },
  ai_member_brief_enabled: {
    title: 'Member personal brief',
    help: 'Controls the personalised brief shown to members on Daily Checks.',
  },
};

export function AiControlsPanel({ initial }: Props) {
  const [toggles, setToggles] = useState<Toggles>(initial);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const { pushToast } = useToast();

  async function setToggle(key: keyof Toggles, value: boolean) {
    setBusyKey(key);
    const previous = toggles[key];
    setToggles((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const json = await res.json();
      if (!json.ok) {
        setToggles((prev) => ({ ...prev, [key]: previous }));
        pushToast(json.error?.message ?? 'Failed to update setting', 'error');
        return;
      }
      pushToast(`${LABELS[key].title} ${value ? 'enabled' : 'disabled'}.`, 'success');
    } catch {
      setToggles((prev) => ({ ...prev, [key]: previous }));
      pushToast('Failed to update setting', 'error');
    } finally {
      setBusyKey(null);
    }
  }

  async function regenerateDigest() {
    setDigestBusy(true);
    try {
      const res = await fetch('/api/admin/digest/regenerate', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Digest generation failed', 'error');
        return;
      }
      pushToast(`Weekly digest generated using ${json.data?.digest?.model ?? 'model'}.`, 'success');
    } catch {
      pushToast('Digest generation failed', 'error');
    } finally {
      setDigestBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {(Object.keys(LABELS) as Array<keyof Toggles>).map((key) => (
          <div key={key} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">{LABELS[key].title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{LABELS[key].help}</div>
            </div>
            <button
              role="switch"
              aria-checked={toggles[key]}
              disabled={busyKey === key}
              onClick={() => setToggle(key, !toggles[key])}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${toggles[key] ? 'bg-emerald-500' : 'bg-muted'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${toggles[key] ? 'left-[1.375rem]' : 'left-0.5'}`}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={regenerateDigest}
        disabled={digestBusy}
        className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/30 disabled:opacity-60"
      >
        {digestBusy ? 'Generating…' : 'Generate weekly digest now'}
      </button>
    </div>
  );
}
