'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Search, X, Star } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { computeAveragingPlan, type FxRates } from '@/lib/portfolio';
import { impliedDropPct } from '@/lib/spartan';

type Asset = {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  watched?: boolean;
  latestSnapshot: { currentPrice: number | null } | null;
};
type PlanTranche = { price: number; budgetGBP: number | null; executed: boolean };
type SavedPlan = { id: string; basePrice: number | null; targetSellPrice: number | null; tranches: PlanTranche[] };
type Tranche = { price: string; budget: string; executed: boolean };

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;
const gbp = (n: number) => `£${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const local = (n: number | null, c: string) => (n == null ? '—' : `${sym(c)}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

export default function AveragePlannerPage() {
  const { pushToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fx, setFx] = useState<FxRates>({ USD: 1.27, EUR: 1.17, CAD: 1.84 });
  const [query, setQuery] = useState('');
  const [assetId, setAssetId] = useState('');
  const [budget, setBudget] = useState('1500');
  const [targetSell, setTargetSell] = useState('');
  const [tranches, setTranches] = useState<Tranche[]>([{ price: '', budget: '', executed: false }]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingWl, setAddingWl] = useState(false);
  const didDeepLink = useRef(false);

  const loadAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setAssets(j.data.assets ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadAssets();
    fetch('/api/market/fx')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data.fx) setFx(j.data.fx);
      })
      .catch(() => {});
  }, [loadAssets]);

  const asset = useMemo(() => assets.find((a) => a.id === assetId) ?? null, [assets, assetId]);
  const currency = asset?.currency ?? 'USD';
  const currentPrice = asset?.latestSnapshot?.currentPrice ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? assets.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) : assets;
    return list.slice(0, 8);
  }, [assets, query]);

  const pickAsset = useCallback(async (a: Asset) => {
    setAssetId(a.id);
    setQuery('');
    const px = a.latestSnapshot?.currentPrice;
    try {
      const res = await fetch(`/api/me/average-plans?assetId=${a.id}`, { cache: 'no-store' });
      const j = await res.json();
      const plan: SavedPlan | undefined = j.ok ? j.data.plans?.[0] : undefined;
      if (plan) {
        setPlanId(plan.id);
        const total = plan.tranches.reduce((s, t) => s + (t.budgetGBP ?? 0), 0);
        setBudget(total > 0 ? String(total) : '1500');
        setTargetSell(plan.targetSellPrice != null ? String(plan.targetSellPrice) : '');
        setTranches(
          plan.tranches.length
            ? plan.tranches.map((t) => ({ price: String(t.price), budget: t.budgetGBP != null ? String(t.budgetGBP) : '', executed: t.executed }))
            : [{ price: px != null ? String(px) : '', budget: '', executed: false }],
        );
        return;
      }
    } catch {
      /* fall through to a fresh plan */
    }
    setPlanId(null);
    setTargetSell('');
    setTranches([{ price: px != null ? String(px) : '', budget: '', executed: false }]);
  }, []);

  // Deep-link: /average-calculator?assetId=<id> auto-selects + loads the plan (once).
  useEffect(() => {
    if (didDeepLink.current || assets.length === 0) return;
    didDeepLink.current = true;
    const id = new URLSearchParams(window.location.search).get('assetId');
    if (id) {
      const a = assets.find((x) => x.id === id);
      if (a) pickAsset(a);
    }
  }, [assets, pickAsset]);

  const validIdx = tranches.map((t, i) => ({ t, i })).filter((x) => Number(x.t.price) > 0);
  const totalBudget = Number(budget) || 0;
  const n = validIdx.length;
  const basePrice = Number(validIdx[0]?.t.price) || null;

  // Manual allocation per tranche (client feedback: no forced even split).
  const allocations = useMemo(() => validIdx.map((x) => Number(x.t.budget) || 0), [validIdx]);
  const allocatedTotal = useMemo(() => allocations.reduce((s, v) => s + v, 0), [allocations]);
  const hasAllocations = allocations.some((v) => v > 0);

  // The "Split evenly" button pre-fills equal amounts; each stays editable after.
  function splitEvenly() {
    if (n === 0 || totalBudget <= 0) return;
    const each = Math.floor((totalBudget / n) * 100) / 100;
    const last = Math.round((totalBudget - each * (n - 1)) * 100) / 100;
    const priced = new Set(validIdx.map((x) => x.i));
    let k = 0;
    setTranches((prev) =>
      prev.map((t, i) => {
        if (!priced.has(i)) return t;
        const amount = k === n - 1 ? last : each;
        k += 1;
        return { ...t, budget: String(amount) };
      }),
    );
  }

  const preview = useMemo(() => {
    if (n === 0 || !hasAllocations) return null;
    return computeAveragingPlan(validIdx.map((x, k) => ({ budgetGBP: allocations[k], targetPrice: Number(x.t.price) })), currency, fx);
  }, [validIdx, allocations, currency, fx, n, hasAllocations]);

  const executed = useMemo(() => {
    const ex = validIdx.map((x, k) => ({ ...x, k })).filter((x) => x.t.executed);
    if (ex.length === 0) return null;
    return computeAveragingPlan(ex.map((x) => ({ budgetGBP: allocations[x.k], targetPrice: Number(x.t.price) })), currency, fx);
  }, [validIdx, allocations, currency, fx]);

  async function addToWatchlist() {
    if (!asset) return;
    setAddingWl(true);
    try {
      const res = await fetch(`/api/me/watchlist/${asset.id}`, { method: 'POST' });
      const j = await res.json();
      if (j.ok) {
        await loadAssets();
        pushToast('Added to your watchlist.', 'success');
      } else {
        pushToast(j.error?.message ?? 'Could not add to watchlist', 'error');
      }
    } finally {
      setAddingWl(false);
    }
  }

  async function savePlan() {
    if (!asset || n === 0 || !hasAllocations) {
      pushToast('Pick a stock, set at least one tranche price and an allocation.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/me/average-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          currency,
          basePrice,
          targetSellPrice: targetSell ? Number(targetSell) : null,
          tranches: validIdx.map((x, k) => ({ price: Number(x.t.price), budgetGBP: allocations[k], executed: x.t.executed })),
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        pushToast(j.error?.message ?? 'Could not save plan', 'error');
        return;
      }
      setPlanId(j.data.plan?.id ?? null);
      pushToast(planId ? 'Averaging plan updated.' : 'Averaging plan saved.', 'success');
    } catch {
      pushToast('Could not save plan', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Average Planner</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Stage a budget across price tranches to plan your average entry, the SPA way. Prices are in the stock&rsquo;s currency; your budget is in £.
        </p>
      </div>

      {/* Plan summary: stock selector + target sell */}
      <Card title="Plan summary">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock</label>
            {asset ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-primary bg-primary/10 px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">{asset.symbol}</span>
                  <span className="text-muted-foreground">{asset.name}</span>
                  <button onClick={() => { setAssetId(''); setPlanId(null); }} aria-label="Clear" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
                {asset.watched ? (
                  <Badge tone="emerald">On watchlist</Badge>
                ) : (
                  <button onClick={addToWatchlist} disabled={addingWl} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60">
                    <Star className="h-3 w-3" /> Add to Watchlist
                  </button>
                )}
              </div>
            ) : (
              <div className="relative mt-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by symbol or name" className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                </div>
                {(query || filtered.length > 0) && (
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
                    ) : (
                      filtered.map((a) => (
                        <button key={a.id} onClick={() => pickAsset(a)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted/40">
                          <span><span className="font-semibold text-foreground">{a.symbol}</span> <span className="text-muted-foreground">{a.name}</span></span>
                          <span className="font-mono text-xs text-muted-foreground">{local(a.latestSnapshot?.currentPrice ?? null, a.currency)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {asset && (
              <div className="mt-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current price</span>
                <div className="mt-1 font-mono text-lg font-bold text-foreground">{local(currentPrice, currency)} <span className="text-xs font-normal text-muted-foreground">{currency}</span></div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target price to sell ({currency})</label>
            <input value={targetSell} onChange={(e) => setTargetSell(e.target.value)} inputMode="decimal" placeholder={`e.g. ${currentPrice != null ? (currentPrice * 1.5).toFixed(2) : '150.00'}`} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            <p className="mt-2 text-xs text-muted-foreground">Feeds the Sell Target on the matching holding when Spartan Strategy is on.</p>
          </div>
        </div>
      </Card>

      {/* Input parameters: budget + tranches */}
      <Card title="Input parameters">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total budget (£)</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <button
              onClick={splitEvenly}
              disabled={n === 0 || totalBudget <= 0}
              className="mt-3 w-full rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
            >
              Split evenly
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Set each tranche allocation yourself, or use Split evenly to pre-fill equal amounts. You can still edit every tranche after.
            </p>
            {hasAllocations && totalBudget > 0 && Math.abs(allocatedTotal - totalBudget) > 0.01 && (
              <p className="mt-2 text-xs font-semibold text-amber-500">
                Allocated {gbp(allocatedTotal)} of {gbp(totalBudget)}.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tranches (entry price {currency} + allocation £)</label>
              <span className="text-xs text-muted-foreground">Drop % vs Trade 1</span>
            </div>
            <div className="mt-2 space-y-2">
              {tranches.map((t, i) => {
                const drop = i === 0 ? null : impliedDropPct(basePrice, Number(t.price) || null);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{i === 0 ? 'Trade 1' : `Trade ${i + 1}`}</span>
                    <input value={t.price} onChange={(e) => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)))} inputMode="decimal" placeholder="price" className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                    <input value={t.budget} onChange={(e) => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, budget: e.target.value } : x)))} inputMode="decimal" placeholder="£ alloc" className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                    <span className="w-16 text-right font-mono text-xs text-muted-foreground">{drop == null ? (i === 0 ? 'base' : '—') : `-${drop.toFixed(1)}%`}</span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input type="checkbox" checked={t.executed} onChange={() => setTranches((p) => p.map((x, idx) => (idx === i ? { ...x, executed: !x.executed } : x)))} className="accent-primary" /> Executed
                    </label>
                    {tranches.length > 1 && (
                      <button onClick={() => setTranches((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove tranche" className="text-rose-500 transition hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setTranches((p) => [...p, { price: '', budget: '', executed: false }])} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Add tranche
            </button>
          </div>
        </div>
      </Card>

      {/* Execution plan */}
      <Card title="Execution plan">
        {preview == null ? (
          <div className="text-sm text-muted-foreground">Pick a stock, set a budget and tranche prices to see the plan.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Trade</th>
                    <th className="py-2 pr-3">Allocation</th>
                    <th className="py-2 pr-3">Entry Price</th>
                    <th className="py-2 pr-3">Shares</th>
                    <th className="py-2 pr-3">Drop %</th>
                    <th className="py-2 pr-3">Executed</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, k) => {
                    const drop = k === 0 ? null : impliedDropPct(basePrice, r.targetPrice);
                    return (
                      <tr key={k} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-semibold text-foreground">{k === 0 ? 'Trade 1' : `Trade ${k + 1}`}</td>
                        <td className="py-2 pr-3 font-mono">{gbp(r.budgetGBP)}</td>
                        <td className="py-2 pr-3 font-mono">{local(r.targetPrice, currency)}</td>
                        <td className="py-2 pr-3 font-mono">{r.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        <td className="py-2 pr-3 font-mono text-muted-foreground">{drop == null ? 'base' : `-${drop.toFixed(1)}%`}</td>
                        <td className="py-2 pr-3">{validIdx[k]?.t.executed ? <Badge tone="emerald">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">If all tranches execute</div>
                <div className="mt-1 font-mono text-2xl font-black text-foreground">{local(preview.averagePrice, currency)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{preview.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares · {gbp(preview.totalCostGBP)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actual (executed only)</div>
                <div className="mt-1 font-mono text-2xl font-black text-foreground">{executed ? local(executed.averagePrice, currency) : '—'}</div>
                <div className="mt-1 text-xs text-muted-foreground">{executed ? `${executed.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares · ${gbp(executed.totalCostGBP)}` : 'No tranches executed yet'}</div>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {planId && <span className="text-xs text-muted-foreground">Saved plan</span>}
          <button onClick={savePlan} disabled={saving || !asset || n === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
            {saving ? 'Saving…' : planId ? 'Update plan' : 'Save plan'}
          </button>
        </div>
      </Card>
    </div>
  );
}
