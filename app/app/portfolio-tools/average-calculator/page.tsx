'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, X, Star } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { type FxRates } from '@/lib/portfolio';
import {
  AveragePlanEditor,
  seedTranches,
  type PlanTranche as Tranche,
} from '@/components/portfolio/AveragePlanEditor';

type Asset = {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  watched?: boolean;
  latestSnapshot: { currentPrice: number | null } | null;
};
type SavedTranche = { price: number; budgetGBP: number | null; executed: boolean };
type SavedPlan = { id: string; basePrice: number | null; targetSellPrice: number | null; tranches: SavedTranche[] };

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', GBX: 'p' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;
const local = (n: number | null, c: string) => (n == null ? '—' : `${sym(c)}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

export default function AveragePlannerPage() {
  const { pushToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fx, setFx] = useState<FxRates>({ USD: 1.27, EUR: 1.17, CAD: 1.84 });
  const [query, setQuery] = useState('');
  const [assetId, setAssetId] = useState('');
  const [budget, setBudget] = useState('3000');
  const [targetSell, setTargetSell] = useState('');
  const [tranches, setTranches] = useState<Tranche[]>(() => seedTranches(null));
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
        setBudget(total > 0 ? String(total) : '3000');
        setTargetSell(plan.targetSellPrice != null ? String(plan.targetSellPrice) : '');
        // A saved plan's prices are the member's own, so they are all "touched"
        // and the 50% cascade must not overwrite them.
        setTranches(
          plan.tranches.length
            ? plan.tranches.map((t) => ({
                price: String(t.price),
                budget: t.budgetGBP != null ? String(t.budgetGBP) : '',
                executed: t.executed,
                priceTouched: true,
              }))
            : seedTranches(px ?? null),
        );
        return;
      }
    } catch {
      /* fall through to a fresh plan */
    }
    setPlanId(null);
    setTargetSell('');
    // Fresh plan: Trade 1 at the current price, then the 50% cascade.
    setTranches(seedTranches(px ?? null));
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

  const validIdx = useMemo(
    () => tranches.map((t, i) => ({ t, i })).filter((x) => Number(x.t.price) > 0),
    [tranches],
  );
  const n = validIdx.length;
  const basePrice = Number(validIdx[0]?.t.price) || null;
  const allocations = useMemo(() => validIdx.map((x) => Number(x.t.budget) || 0), [validIdx]);
  const hasAllocations = allocations.some((v) => v > 0);

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
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How the tranches default</label>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Trade 1 starts at the current price. Each following trade defaults to 50% below the one above it, so Trade 3
              sits 75% below Trade 1. Every price is editable, and editing one re-seeds the trades beneath it.
            </p>
          </div>
        </div>
      </Card>

      {/* The ONE plan visual: allocation, tranches, summary, sell target, outcome */}
      <Card title="Averaging plan">
        {!asset ? (
          <div className="text-sm text-muted-foreground">Pick a stock above to build its averaging plan.</div>
        ) : (
          <AveragePlanEditor
            tranches={tranches}
            setTranches={setTranches}
            totalBudget={budget}
            setTotalBudget={setBudget}
            targetSell={targetSell}
            setTargetSell={setTargetSell}
            currency={currency}
            currentPrice={currentPrice}
            fx={fx}
          />
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
