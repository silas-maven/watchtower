'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type MacroValue = { value: number | null; changePct: number | null; asOf: string | null };

const FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'macro_boe_base_rate', label: 'BOE Base Rate (%)', hint: 'Auto-updates from the Bank of England feed. Leave blank to use it; enter a value only to override.' },
  { key: 'macro_uk_10y_gilt', label: 'UK 10Y Gilt Yield (%)', hint: 'No free live feed; update from your own source.' },
  { key: 'macro_itraxx_5y', label: 'iTraxx Europe 5Y', hint: 'Licensed data; update manually from your terminal/source.' },
];

type Draft = { value: string; changePct: string };

export function MacroSettingsPanel() {
  const { pushToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [asOf, setAsOf] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        const next: Record<string, Draft> = {};
        const nextAsOf: Record<string, string | null> = {};
        for (const f of FIELDS) {
          const v = (j.data.settings?.[f.key] ?? {}) as MacroValue;
          next[f.key] = { value: v.value != null ? String(v.value) : '', changePct: v.changePct != null ? String(v.changePct) : '' };
          nextAsOf[f.key] = v.asOf ?? null;
        }
        setDrafts(next);
        setAsOf(nextAsOf);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save(key: string) {
    const draft = drafts[key];
    if (!draft) return;
    setSaving(key);
    try {
      const payload: MacroValue = {
        value: draft.value.trim() === '' ? null : Number(draft.value),
        changePct: draft.changePct.trim() === '' ? null : Number(draft.changePct),
        asOf: new Date().toISOString(),
      };
      if ((payload.value != null && !Number.isFinite(payload.value)) || (payload.changePct != null && !Number.isFinite(payload.changePct))) {
        pushToast('Enter numeric values.', 'error');
        return;
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, value: payload }),
      });
      const j = await res.json();
      if (j.ok) {
        setAsOf((p) => ({ ...p, [key]: payload.asOf }));
        pushToast('Macro reading saved.', 'success');
      } else {
        pushToast(j.error?.message ?? 'Could not save', 'error');
      }
    } finally {
      setSaving(null);
    }
  }

  if (!loaded) return <div className="text-sm text-muted-foreground">Loading macro readings…</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        These readings power the ticker strip, Market Snapshot and Weather Outside for instruments with no free
        live feed. They render as neutral tiles until set.
      </p>
      {FIELDS.map((f) => {
        const draft = drafts[f.key] ?? { value: '', changePct: '' };
        return (
          <div key={f.key} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input
                value={draft.value}
                onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: { ...draft, value: e.target.value } }))}
                inputMode="decimal"
                placeholder="value"
                className="mt-1 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily move %</label>
              <input
                value={draft.changePct}
                onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: { ...draft, changePct: e.target.value } }))}
                inputMode="decimal"
                placeholder="optional"
                className="mt-1 w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => save(f.key)}
              disabled={saving === f.key}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {saving === f.key ? 'Saving…' : 'Save'}
            </button>
            <div className="pb-2 text-xs text-muted-foreground">
              {asOf[f.key] ? `Updated ${new Date(asOf[f.key]!).toLocaleString('en-GB')}` : f.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
