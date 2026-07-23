'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { computeAveragingPlan, type FxRates } from '@/lib/portfolio';
import { impliedDropPct } from '@/lib/spartan';

type SavedTranche = { price: number; budgetGBP: number | null; executed: boolean };
type SavedPlan = { id: string; basePrice: number | null; targetSellPrice: number | null; tranches: SavedTranche[] };
type EditTranche = { price: string; budget: string; executed: boolean };

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;
const gbp = (n: number) => `£${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const local = (n: number | null, c: string) => (n == null ? '—' : `${sym(c)}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

/**
 * Inline averaging plan for a portfolio holding: view the existing plan or
 * create one, all on the same page (no navigation to the planner). Saving links
 * the plan to the holding and enables Spartan, then refreshes the portfolio.
 */
export function InlineAveragePlan({
  assetId,
  holdingId,
  currency,
  currentPrice,
  onSaved,
}: {
  assetId: string;
  holdingId: string;
  currency: string;
  currentPrice: number | null;
  onSaved: () => void;
}) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [tranches, setTranches] = useState<EditTranche[]>([]);
  const [targetSell, setTargetSell] = useState('');
  const [saving, setSaving] = useState(false);
  const [fx, setFx] = useState<FxRates>({ USD: 1.27, EUR: 1.17, CAD: 1.84 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, fxRes] = await Promise.all([
        fetch(`/api/me/average-plans?assetId=${assetId}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/market/fx').then((r) => r.json()).catch(() => null),
      ]);
      if (fxRes?.ok && fxRes.data.fx) setFx(fxRes.data.fx);
      const p: SavedPlan | undefined = planRes.ok ? planRes.data.plans?.[0] : undefined;
      if (p) {
        setPlan(p);
        setTargetSell(p.targetSellPrice != null ? String(p.targetSellPrice) : '');
        setTranches(p.tranches.map((t) => ({ price: String(t.price), budget: t.budgetGBP != null ? String(t.budgetGBP) : '', executed: t.executed })));
        setEditing(false);
      } else {
        setPlan(null);
        setTranches([{ price: currentPrice != null ? String(currentPrice) : '', budget: '', executed: false }]);
        setEditing(true);
      }
    } finally {
      setLoading(false);
    }
  }, [assetId, currentPrice]);

  useEffect(() => {
    load();
  }, [load]);

  const valid = tranches.map((t, i) => ({ t, i })).filter((x) => Number(x.t.price) > 0);
  const basePrice = Number(valid[0]?.t.price) || null;
  const allocations = valid.map((x) => Number(x.t.budget) || 0);
  const hasAlloc = allocations.some((v) => v > 0);

  const preview = useMemo(() => {
    if (valid.length === 0 || !hasAlloc) return null;
    return computeAveragingPlan(valid.map((x, k) => ({ budgetGBP: allocations[k], targetPrice: Number(x.t.price) })), currency, fx);
  }, [valid, allocations, hasAlloc, currency, fx]);

  function splitEvenly() {
    const total = Number(prompt('Total budget to split across tranches (£):') ?? '');
    if (!Number.isFinite(total) || total <= 0 || valid.length === 0) return;
    const each = Math.floor((total / valid.length) * 100) / 100;
    const last = Math.round((total - each * (valid.length - 1)) * 100) / 100;
    const priced = new Set(valid.map((x) => x.i));
    let k = 0;
    setTranches((prev) =>
      prev.map((t, i) => {
        if (!priced.has(i)) return t;
        const amt = k === valid.length - 1 ? last : each;
        k += 1;
        return { ...t, budget: String(amt) };
      }),
    );
  }

  async function save() {
    if (valid.length === 0 || !hasAlloc || basePrice == null) {
      pushToast('Set at least one tranche price and allocation.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        assetId,
        currency,
        basePrice,
        targetSellPrice: targetSell ? Number(targetSell) : null,
        tranches: valid.map((x, k) => ({ price: Number(x.t.price), budgetGBP: allocations[k], executed: x.t.executed })),
        linkHoldingId: holdingId,
      };
      let res = await fetch('/api/me/average-plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      let j = await res.json();
      // The plan API requires the stock on the watchlist; add it and retry once.
      if (!j.ok && j.error?.code === 'NOT_ON_WATCHLIST') {
        await fetch(`/api/me/watchlist/${assetId}`, { method: 'POST' });
        res = await fetch('/api/me/average-plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        j = await res.json();
      }
      if (!j.ok) {
        pushToast(j.error?.message ?? 'Could not save plan', 'error');
        return;
      }
      pushToast(plan ? 'Averaging plan updated.' : 'Averaging plan created.', 'success');
      await load();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading plan…</div>;

  // Read-only view of a saved plan.
  if (plan && !editing) {
    const finalAvg = computeAveragingPlan(plan.tranches.filter((t) => t.budgetGBP != null && t.budgetGBP > 0).map((t) => ({ budgetGBP: t.budgetGBP as number, targetPrice: t.price })), currency, fx);
    const executed = plan.tranches.filter((t) => t.executed);
    return (
      <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">Averaging plan</div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40">Edit</button>
            <Link href={`/app/portfolio-tools/average-calculator?assetId=${assetId}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40">Full planner <ExternalLink className="h-3 w-3" /></Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-3">Trade</th><th className="py-1.5 pr-3">Entry</th><th className="py-1.5 pr-3">Allocation</th><th className="py-1.5 pr-3">Drop %</th><th className="py-1.5 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.tranches.map((t, i) => {
                const drop = i === 0 ? null : impliedDropPct(plan.tranches[0].price, t.price);
                return (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-semibold text-foreground">Trade {i + 1}</td>
                    <td className="py-1.5 pr-3 font-mono">{local(t.price, currency)}</td>
                    <td className="py-1.5 pr-3 font-mono">{t.budgetGBP == null ? '—' : gbp(t.budgetGBP)}</td>
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">{drop == null ? 'base' : `-${drop.toFixed(1)}%`}</td>
                    <td className="py-1.5 pr-3">{t.executed ? <Badge tone="emerald">Bought</Badge> : <Badge tone="zinc">Pending</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <div><span className="text-muted-foreground">If all execute:</span> <span className="font-mono font-bold text-foreground">{local(finalAvg.averagePrice, currency)}</span></div>
          <div><span className="text-muted-foreground">Executed:</span> <span className="font-mono">{executed.length}/{plan.tranches.length}</span></div>
          <div><span className="text-muted-foreground">Target sell:</span> <span className="font-mono text-emerald-500">{local(plan.targetSellPrice, currency)}</span></div>
        </div>
      </div>
    );
  }

  // Create / edit form.
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">{plan ? 'Edit averaging plan' : 'Create averaging plan'}</div>
        <button onClick={splitEvenly} disabled={valid.length === 0} className="rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50">Split evenly</button>
      </div>
      <div className="space-y-2">
        {tranches.map((t, i) => {
          const drop = i === 0 ? null : impliedDropPct(basePrice, Number(t.price) || null);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Trade {i + 1}</span>
              <input value={t.price} onChange={(e) => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)))} inputMode="decimal" placeholder={`price ${currency}`} className="w-24 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none" />
              <input value={t.budget} onChange={(e) => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, budget: e.target.value } : x)))} inputMode="decimal" placeholder="£ alloc" className="w-20 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none" />
              <span className="w-14 text-right font-mono text-xs text-muted-foreground">{drop == null ? 'base' : `-${drop.toFixed(1)}%`}</span>
              <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={t.executed} onChange={() => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, executed: !x.executed } : x)))} className="accent-primary" /> Bought</label>
              {tranches.length > 1 && <button onClick={() => setTranches((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove" className="text-rose-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setTranches((p) => [...p, { price: '', budget: '', executed: false }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"><Plus className="h-3.5 w-3.5" /> Add tranche</button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">Target sell ({currency})
          <input value={targetSell} onChange={(e) => setTargetSell(e.target.value)} inputMode="decimal" placeholder="optional" className="w-24 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none" />
        </label>
      </div>
      {preview && (
        <div className="text-xs text-muted-foreground">If all tranches execute: <span className="font-mono font-bold text-foreground">{local(preview.averagePrice, currency)}</span> · {preview.totalShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares · {gbp(preview.totalCostGBP)}</div>
      )}
      <div className="flex items-center justify-end gap-2">
        {plan && <button onClick={() => { setEditing(false); load(); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40">Cancel</button>}
        <button onClick={save} disabled={saving || valid.length === 0} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{saving ? 'Saving…' : plan ? 'Update plan' : 'Create plan'}</button>
      </div>
    </div>
  );
}
