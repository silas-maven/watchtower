'use client';

import { useState } from 'react';
import { Copy, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

type Rating = 'green' | 'amber' | 'red';
type HealthDimension = { key: string; label: string; rating: Rating; detail: string };
type HealthScore = { overall: Rating; score: number; dimensions: HealthDimension[] };
type AnalystTargets = {
  covered: boolean;
  mean: number | null;
  high: number | null;
  low: number | null;
  count: number | null;
  recommendation: string | null;
  upsidePct: number | null;
};

type Pitch = {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sections: Array<{ title: string; body: string }>;
  financialHealth: HealthScore | null;
  analystTargets: AnalystTargets | null;
  model: string;
};

const DIRECTION_STYLES: Record<Pitch['direction'], string> = {
  BULLISH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  BEARISH: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
  NEUTRAL: 'border-border bg-muted/40 text-muted-foreground',
};

const RATING_DOT: Record<Rating, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' };
const RATING_TEXT: Record<Rating, string> = { green: 'text-emerald-500', amber: 'text-amber-500', red: 'text-rose-500' };
const RATING_WORD: Record<Rating, string> = { green: 'Strong', amber: 'Mixed', red: 'Weak' };

const LOADING_STEPS = [
  'Reading live signals and indicators',
  'Pulling fundamentals and analyst targets',
  'Scoring financial health',
  'Writing the pitch',
];

function HealthTrafficLight({ health }: { health: HealthScore }) {
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${RATING_DOT[health.overall]}`} />
        <span className="text-sm font-bold text-foreground">Financial health: <span className={RATING_TEXT[health.overall]}>{RATING_WORD[health.overall]}</span></span>
        <span className="text-xs text-muted-foreground">({health.score}/100)</span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {health.dimensions.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${RATING_DOT[d.rating]}`} />
            <span className="font-semibold text-foreground">{d.label}</span>
            <span className={`ml-auto font-semibold ${RATING_TEXT[d.rating]}`}>{RATING_WORD[d.rating]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalystTargetBar({ a }: { a: AnalystTargets }) {
  if (!a.covered || a.low == null || a.high == null || a.mean == null || a.high <= a.low) return null;
  const pos = ((a.mean - a.low) / (a.high - a.low)) * 100;
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Low {a.low.toFixed(2)}</span>
        <span className="font-bold text-foreground">Mean {a.mean.toFixed(2)}{a.upsidePct != null && <span className={a.upsidePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}> ({a.upsidePct >= 0 ? '+' : ''}{a.upsidePct.toFixed(1)}%)</span>}</span>
        <span>High {a.high.toFixed(2)}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-muted">
        <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background bg-primary" style={{ left: `calc(${Math.max(0, Math.min(100, pos))}% - 6px)` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{a.count} analysts{a.recommendation ? ` · consensus ${a.recommendation.replace(/_/g, ' ')}` : ''}</div>
    </div>
  );
}

/**
 * "Generate pitch" action: builds the pitch via /api/ai/pitch and shows it in a
 * modal with a financial-health traffic light, analyst target range, an
 * animated loading state, reorderable sections, and a copy action.
 */
export function GeneratePitchButton({ assetId, symbol, compact = false }: { assetId: string; symbol: string; compact?: boolean }) {
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [order, setOrder] = useState<number[]>([]);

  async function generate() {
    setOpen(true);
    if (loading) return;
    setLoading(true);
    setPitch(null);
    setOrder([]);
    try {
      const res = await fetch('/api/ai/pitch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const j = await res.json();
      if (j.ok && j.data?.pitch) {
        setPitch(j.data.pitch);
        setOrder(j.data.pitch.sections.map((_: unknown, i: number) => i));
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

  function move(pos: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev];
      const target = pos + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[pos], next[target]] = [next[target], next[pos]];
      return next;
    });
  }

  function copyPitch() {
    if (!pitch) return;
    const text = order.map((idx, i) => `${i + 1}. ${pitch.sections[idx].title}\n${pitch.sections[idx].body}`).join('\n\n');
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
        title={`${symbol} · trade pitch`}
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
        {loading && <PitchLoading />}
        {pitch && !loading && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${DIRECTION_STYLES[pitch.direction]}`}>
                {pitch.direction}
              </span>
              <span className="text-[11px] text-muted-foreground">Use the arrows to reorder sections</span>
            </div>
            {order.map((idx, pos) => {
              const s = pitch.sections[idx];
              return (
                <div key={s.title} className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">{pos + 1}. {s.title}</div>
                    <div className="flex shrink-0 gap-0.5">
                      <button onClick={() => move(pos, -1)} disabled={pos === 0} aria-label="Move up" className="rounded p-0.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label="Move down" className="rounded p-0.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-foreground">{s.body}</p>
                  {s.title === 'Financial Health' && pitch.financialHealth && <HealthTrafficLight health={pitch.financialHealth} />}
                  {s.title === 'Analyst Price Targets' && pitch.analystTargets && <AnalystTargetBar a={pitch.analystTargets} />}
                </div>
              );
            })}
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              Educational analysis generated from academy signals and public market data. Not financial advice; no returns are promised. Model: {pitch.model}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function PitchLoading() {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        {LOADING_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" style={{ animation: `mk-pulse 1.4s ease-in-out ${i * 0.25}s infinite` }} />
            {step}
            <span className="ml-1 inline-flex gap-0.5">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" style={{ animation: 'mk-pulse 1s ease-in-out 0s infinite' }} />
              <span className="inline-block h-1 w-1 rounded-full bg-primary" style={{ animation: 'mk-pulse 1s ease-in-out 0.2s infinite' }} />
              <span className="inline-block h-1 w-1 rounded-full bg-primary" style={{ animation: 'mk-pulse 1s ease-in-out 0.4s infinite' }} />
            </span>
          </div>
        ))}
      </div>
      {/* Shimmer skeleton of the pitch sections */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="h-3 w-32 rounded bg-muted mk-shimmer" />
            <div className="mt-2 h-2.5 w-full rounded bg-muted mk-shimmer" />
            <div className="mt-1.5 h-2.5 w-4/5 rounded bg-muted mk-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
