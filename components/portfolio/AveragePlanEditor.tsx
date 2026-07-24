'use client';

import { Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { computeAveragingPlan, localToGbp, type FxRates } from '@/lib/portfolio';

// The ONE averaging-plan visual (24 July feedback: a single unified card, no
// separate execution table and no duplicated "if all / actual" summaries). Both
// the standalone Average Planner and the inline plan on a holding render this,
// so the two surfaces can never drift apart again.

export type PlanTranche = {
  price: string;
  budget: string;
  executed: boolean;
  // True once the member types their own price. Manual prices are never
  // overwritten by the 50% cascade; untouched ones keep following it.
  priceTouched?: boolean;
};

/** Default step between tranches: each is 50% below the one above it. */
export const TRANCHE_DROP_FACTOR = 0.5;

export function newTranche(price = '', executed = false): PlanTranche {
  return { price, budget: '', executed, priceTouched: false };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rebuild the default prices below the tranche that changed. Trade 2 sits 50%
 * below Trade 1, Trade 3 50% below Trade 2, and so on (sequential, so Trade 3 is
 * 75% below Trade 1). A tranche the member has edited keeps its price and
 * becomes the new anchor for the ones beneath it.
 */
export function cascadePrices(tranches: PlanTranche[]): PlanTranche[] {
  const out = [...tranches];
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].priceTouched) continue;
    const above = Number(out[i - 1].price);
    out[i] = { ...out[i], price: above > 0 ? String(round2(above * TRANCHE_DROP_FACTOR)) : '' };
  }
  return out;
}

/** Seed a fresh 3-tranche plan from the current price, per the ideal layout. */
export function seedTranches(basePrice: number | null): PlanTranche[] {
  const first = newTranche(basePrice != null ? String(round2(basePrice)) : '');
  return cascadePrices([first, newTranche(), newTranche()]);
}

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;
const gbp = (n: number) => `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const local = (n: number | null, c: string) =>
  n == null ? '—' : `${sym(c)}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shareText = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} share${n === 1 ? '' : 's'}`;

export function AveragePlanEditor({
  tranches,
  setTranches,
  totalBudget,
  setTotalBudget,
  targetSell,
  setTargetSell,
  currency,
  currentPrice,
  fx,
  compact = false,
}: {
  tranches: PlanTranche[];
  setTranches: (next: PlanTranche[]) => void;
  totalBudget: string;
  setTotalBudget: (next: string) => void;
  targetSell: string;
  setTargetSell: (next: string) => void;
  currency: string;
  currentPrice: number | null;
  fx: FxRates;
  compact?: boolean;
}) {
  const priced = tranches.map((t, i) => ({ t, i })).filter((x) => Number(x.t.price) > 0);
  const allocations = priced.map((x) => Number(x.t.budget) || 0);
  const hasAllocation = allocations.some((v) => v > 0);
  const budgetNum = Number(totalBudget) || 0;
  const allocatedTotal = allocations.reduce((s, v) => s + v, 0);

  const plan =
    priced.length === 0 || !hasAllocation
      ? null
      : computeAveragingPlan(
          priced.map((x, k) => ({ budgetGBP: allocations[k], targetPrice: Number(x.t.price) })),
          currency,
          fx,
        );

  // Position P/L if every allocated tranche fills, measured at today's price.
  const vsCurrentPct =
    plan?.averagePrice != null && currentPrice != null && plan.averagePrice > 0
      ? (currentPrice / plan.averagePrice - 1) * 100
      : null;

  // Value and gain if the plan fills and later sells at the target.
  const targetNum = Number(targetSell) || 0;
  const atTarget = (() => {
    if (!plan || plan.averagePrice == null || targetNum <= 0 || plan.totalShares <= 0) return null;
    const valueLocal = plan.totalShares * targetNum;
    const valueGBP = localToGbp(valueLocal, currency, fx);
    const gainPct = (targetNum / plan.averagePrice - 1) * 100;
    const gainGBP = valueGBP != null ? valueGBP - plan.totalCostGBP : null;
    return { valueLocal, valueGBP, gainPct, gainGBP };
  })();

  function update(index: number, patch: Partial<PlanTranche>) {
    const next = tranches.map((t, i) => (i === index ? { ...t, ...patch } : t));
    // A price edit re-seeds every untouched tranche beneath it.
    setTranches(patch.price !== undefined ? cascadePrices(next) : next);
  }

  function addTranche() {
    setTranches(cascadePrices([...tranches, newTranche()]));
  }

  function removeTranche(index: number) {
    setTranches(cascadePrices(tranches.filter((_, i) => i !== index)));
  }

  function splitEvenly() {
    if (priced.length === 0 || budgetNum <= 0) return;
    const each = Math.floor((budgetNum / priced.length) * 100) / 100;
    const last = round2(budgetNum - each * (priced.length - 1));
    const pricedSet = new Set(priced.map((x) => x.i));
    let k = 0;
    setTranches(
      tranches.map((t, i) => {
        if (!pricedSet.has(i)) return t;
        const amount = k === priced.length - 1 ? last : each;
        k += 1;
        return { ...t, budget: String(amount) };
      }),
    );
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

  return (
    <div className="space-y-5">
      {/* Total to allocate + split evenly */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total amount to allocate (£)</label>
        <div className="mt-2 flex overflow-hidden rounded-lg border border-border">
          <input
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            inputMode="decimal"
            placeholder="3000"
            className="w-full bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={splitEvenly}
            disabled={priced.length === 0 || budgetNum <= 0}
            className="shrink-0 border-l border-border px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            Split evenly
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Set each tranche allocation yourself, or use Split evenly to pre-fill equal amounts.
        </p>
        {hasAllocation && budgetNum > 0 && Math.abs(allocatedTotal - budgetNum) > 0.01 && (
          <p className="mt-1 text-xs font-semibold text-amber-500">
            Allocated {gbp(allocatedTotal)} of {gbp(budgetNum)}.
          </p>
        )}
      </div>

      {/* Tranche rows */}
      <div className="border-t border-border pt-4">
        <div className="hidden gap-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_1.2fr_1.2fr_auto]">
          <div>Tranche</div>
          <div>Entry price ({currency})</div>
          <div>Allocation (£)</div>
          <div className="w-8" />
        </div>
        <div className="divide-y divide-border">
          {tranches.map((t, i) => (
            <div key={i} className="grid gap-3 py-3 sm:grid-cols-[1fr_1.2fr_1.2fr_auto] sm:items-start">
              <div>
                <div className="text-sm font-semibold text-foreground">Trade {i + 1}</div>
                <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={t.executed}
                    onChange={() => update(i, { executed: !t.executed })}
                    className="accent-primary"
                  />
                  Executed
                </label>
              </div>
              <div>
                <input
                  value={t.price}
                  onChange={(e) => update(i, { price: e.target.value, priceTouched: true })}
                  inputMode="decimal"
                  placeholder="price"
                  aria-label={`Trade ${i + 1} entry price`}
                  className={inputCls}
                />
                {i > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.priceTouched ? 'Custom price' : `50% drop from Trade ${i}`}
                  </div>
                )}
              </div>
              <div>
                <input
                  value={t.budget}
                  onChange={(e) => update(i, { budget: e.target.value })}
                  inputMode="decimal"
                  placeholder="£ alloc"
                  aria-label={`Trade ${i + 1} allocation`}
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end sm:pt-2">
                {tranches.length > 1 && (
                  <button
                    onClick={() => removeTranche(i)}
                    aria-label={`Remove Trade ${i + 1}`}
                    className="text-rose-500 transition hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addTranche}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add tranche
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        {plan == null ? (
          <div className="text-sm text-muted-foreground">Set tranche prices and allocations to see your average entry.</div>
        ) : (
          <div className={`grid gap-4 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Average entry price</div>
              <div className="mt-1 font-mono text-2xl font-black text-foreground">{local(plan.averagePrice, currency)}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">({shareText(plan.totalShares)})</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current price</div>
              <div className="mt-1 font-mono text-2xl font-black text-foreground">{local(currentPrice, currency)}</div>
              {vsCurrentPct != null && (
                <div className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${vsCurrentPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {vsCurrentPct >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {vsCurrentPct >= 0 ? '+' : ''}{vsCurrentPct.toFixed(2)}% vs your average
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total invested</div>
              <div className="mt-1 font-mono text-2xl font-black text-foreground">{gbp(plan.totalCostGBP)}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{shareText(plan.totalShares)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Sell target */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sell target price ({currency})</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Set your target exit price</div>
        </div>
        <input
          value={targetSell}
          onChange={(e) => setTargetSell(e.target.value)}
          inputMode="decimal"
          placeholder={currentPrice != null ? (currentPrice * 1.5).toFixed(2) : '120.00'}
          aria-label="Sell target price"
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Potential outcome at target */}
      {atTarget && plan && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Potential gain at target</div>
              <div className={`mt-1 inline-flex items-center gap-1 font-mono text-2xl font-black ${atTarget.gainPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {atTarget.gainPct >= 0 ? '+' : ''}{atTarget.gainPct.toFixed(2)}%
                {atTarget.gainPct >= 0 ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
              </div>
              {atTarget.gainGBP != null && (
                <div className={`mt-0.5 text-xs font-semibold ${atTarget.gainGBP >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {atTarget.gainGBP >= 0 ? '+' : ''}{gbp(atTarget.gainGBP)} (estimated)
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Potential value at target</div>
              <div className="mt-1 font-mono text-2xl font-black text-foreground">
                {atTarget.valueGBP != null ? gbp(atTarget.valueGBP) : local(atTarget.valueLocal, currency)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{shareText(plan.totalShares)}</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Estimates are based on the current price and your target. Fees and taxes are not included.
      </p>
    </div>
  );
}
