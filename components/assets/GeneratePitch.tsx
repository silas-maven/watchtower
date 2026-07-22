'use client';

import { useState } from 'react';
import { Copy, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

type Pitch = {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sections: Array<{ title: string; body: string }>;
  model: string;
};

const DIRECTION_STYLES: Record<Pitch['direction'], string> = {
  BULLISH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  BEARISH: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
  NEUTRAL: 'border-border bg-muted/40 text-muted-foreground',
};

/**
 * "Generate pitch" action: builds a 90-second pitch for the asset via
 * /api/ai/pitch and shows it in a modal with a copy action. Available from the
 * Asset Centre rows and the asset detail Price Alerts view.
 */
export function GeneratePitchButton({ assetId, symbol, compact = false }: { assetId: string; symbol: string; compact?: boolean }) {
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<Pitch | null>(null);

  async function generate() {
    setOpen(true);
    if (loading) return;
    setLoading(true);
    setPitch(null);
    try {
      const res = await fetch('/api/ai/pitch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const j = await res.json();
      if (j.ok && j.data?.pitch) {
        setPitch(j.data.pitch);
      } else {
        pushToast(j.error?.message ?? 'Could not generate the pitch', 'error');
        setOpen(false);
      }
    } catch {
      pushToast('Could not generate the pitch', 'error');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function copyPitch() {
    if (!pitch) return;
    const text = pitch.sections.map((s, i) => `${i + 1}. ${s.title}\n${s.body}`).join('\n\n');
    navigator.clipboard
      .writeText(`${pitch.symbol} trade pitch (${pitch.direction})\n\n${text}`)
      .then(() => pushToast('Pitch copied.', 'success'))
      .catch(() => pushToast('Could not copy', 'error'));
  }

  return (
    <>
      <button
        onClick={generate}
        className={
          compact
            ? 'inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10'
            : 'inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10'
        }
      >
        <FileText className={compact ? 'h-3 w-3' : 'h-4 w-4'} /> Generate pitch
      </button>

      <Modal
        open={open}
        onClose={() => { if (!loading) setOpen(false); }}
        title={`${symbol} · 90-second pitch`}
        description="Built on the Trade Idea Interview Checklist. Educational analysis, not financial advice."
        footer={
          <>
            <button
              type="button"
              onClick={copyPitch}
              disabled={!pitch}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              Close
            </button>
          </>
        }
      >
        {loading && (
          <div className="grid place-items-center py-10 text-sm text-muted-foreground">
            Building the pitch from live signals, indicators and macro conditions…
          </div>
        )}
        {pitch && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${DIRECTION_STYLES[pitch.direction]}`}>
              {pitch.direction}
            </span>
            {pitch.sections.map((s, i) => (
              <div key={s.title}>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">{i + 1}. {s.title}</div>
                <p className="mt-1 text-sm leading-6 text-foreground">{s.body}</p>
              </div>
            ))}
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              Educational analysis generated from academy signals and public market data. Not financial advice; no returns are promised. Model: {pitch.model}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
