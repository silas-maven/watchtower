'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { computeAveragingPlan, type FxRates } from '@/lib/portfolio';
import { impliedDropPct } from '@/lib/spartan';
import { AveragePlanEditor, seedTranches, type PlanTranche as EditTranche } from '@/components/portfolio/AveragePlanEditor';

type SavedTranche = { price: number; budgetGBP: number | null; executed: boolean };
type SavedPlan = { id: string; basePrice: number | null; targetSellPrice: number | null; tranches: SavedTranche[] };

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
  const [totalBudget, setTotalBudget] = useState('3000');
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
        // Saved prices are the member's own, so the 50% cascade must not move them.
        setTranches(
          p.tranches.map((t) => ({
            price: String(t.price),
            budget: t.budgetGBP != null ? String(t.budgetGBP) : '',
            executed: t.executed,
            priceTouched: true,
          })),
        );
        const total = p.tranches.reduce((s, t) => s + (t.budgetGBP ?? 0), 0);
        setTotalBudget(total > 0 ? String(total) : '3000');
        setEditing(false);
      } else {
        setPlan(null);
        // Fresh plan: Trade 1 at the current price, then each 50% below the last.
        setTranches(seedTranches(currentPrice));
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
      </div>
      {/* Same single visual as the full planner, so the two never drift apart. */}
      <AveragePlanEditor
        tranches={tranches}
        setTranches={setTranches}
        totalBudget={totalBudget}
        setTotalBudget={setTotalBudget}
        targetSell={targetSell}
        setTargetSell={setTargetSell}
        currency={currency}
        currentPrice={currentPrice}
        fx={fx}
        compact
      />
      <div className="flex items-center justify-end gap-2">
        {plan && <button onClick={() => { setEditing(false); load(); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40">Cancel</button>}
        <button onClick={save} disabled={saving || valid.length === 0} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{saving ? 'Saving…' : plan ? 'Update plan' : 'Create plan'}</button>
      </div>
    </div>
  );
}
