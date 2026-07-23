'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

/** Member form to request a stock be added to the academy universe. */
export function RequestStock() {
  const { pushToast } = useToast();
  const [symbol, setSymbol] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!symbol.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/me/stock-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim(), note: note.trim() || undefined }),
      });
      const j = await res.json();
      if (j.ok) {
        pushToast('Request sent to the academy.', 'success');
        setSymbol('');
        setNote('');
      } else {
        pushToast(j.error?.message ?? 'Could not send request', 'error');
      }
    } catch {
      pushToast('Could not send request', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ticker</label>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. AMZN" maxLength={20} className="mt-1 block w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
      </div>
      <div className="min-w-48 flex-1">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="A short reason helps the academy prioritise" maxLength={280} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
      </div>
      <button onClick={submit} disabled={saving || !symbol.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
        <Send className="h-4 w-4" /> {saving ? 'Sending…' : 'Request'}
      </button>
    </div>
  );
}
