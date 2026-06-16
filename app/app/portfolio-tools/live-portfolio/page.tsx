'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';

type Holding = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  currency: string;
  shares: number | null;
  averagePrice: number | null;
  currentPrice: number | null;
  costGBP: number | null;
  valueGBP: number | null;
  profitGBP: number | null;
  returnPct: number | null;
  weightPct: number | null;
  beta: number | null;
  signalState: string;
};

type Summary = {
  investedGBP: number;
  valueGBP: number;
  profitGBP: number;
  returnPct: number;
  cashGBP: number;
  liquidationValueGBP: number;
  portfolioBeta: number | null;
};

type View = { hasData: boolean; declaredSizeGBP: number | null; holdings: Holding[]; summary: Summary; displayCurrency: string; gbpRate: number };
type MasterAsset = { id: string; symbol: string; name: string; currency: string; latestSnapshot: { currentPrice: number | null } | null };

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$' };

function money(gbpAmount: number | null, currency: string, rate: number) {
  if (gbpAmount == null) return '—';
  return `${SYMBOLS[currency] ?? `${currency} `}${(gbpAmount * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function toneForSignal(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default function LivePortfolioPage() {
  const [view, setView] = useState<View | null>(null);
  const [assets, setAssets] = useState<MasterAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();

  const [form, setForm] = useState({ assetId: '', shares: '', averagePrice: '' });
  const [sizeDraft, setSizeDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [viewRes, assetsRes] = await Promise.all([
        fetch('/api/me/portfolio/live', { cache: 'no-store' }),
        fetch('/api/assets', { cache: 'no-store' }),
      ]);
      const viewJson = await viewRes.json();
      const assetsJson = await assetsRes.json();
      if (viewJson.ok) {
        setView(viewJson.data);
        setSizeDraft(viewJson.data.declaredSizeGBP != null ? String(viewJson.data.declaredSizeGBP) : '');
      }
      if (assetsJson.ok) setAssets(assetsJson.data?.assets ?? []);
    } catch {
      pushToast('Could not load your portfolio', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === form.assetId), [assets, form.assetId]);

  async function addHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assetId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/me/portfolio/live', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: form.assetId,
          shares: form.shares ? Number(form.shares) : null,
          averagePrice: form.averagePrice ? Number(form.averagePrice) : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not add position', 'error');
        return;
      }
      setView(json.data);
      setForm({ assetId: '', shares: '', averagePrice: '' });
      pushToast('Holding saved.', 'success');
    } catch {
      pushToast('Could not add position', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeHolding(assetId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/me/portfolio/live?assetId=${assetId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) setView(json.data);
    } catch {
      pushToast('Could not remove holding', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveSize() {
    setBusy(true);
    try {
      const res = await fetch('/api/me/portfolio/live', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ declaredSizeGBP: sizeDraft ? Number(sizeDraft) : null }),
      });
      const json = await res.json();
      if (json.ok) {
        setView(json.data);
        pushToast('Portfolio starting value updated.', 'success');
      }
    } finally {
      setBusy(false);
    }
  }

  const s = view?.summary;
  const cur = view?.displayCurrency ?? 'GBP';
  const rate = view?.gbpRate ?? 1;
  const fmtMoney = (g: number | null) => money(g, cur, rate);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio Tools
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Live Portfolio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your real holdings, valued against live prices. This is your own book, separate from the academy master list and the virtual portfolio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Invested" value={fmtMoney(s?.investedGBP ?? null)} />
        <Stat label="Value" value={fmtMoney(s?.valueGBP ?? null)} />
        <Stat label="Profit" value={fmtMoney(s?.profitGBP ?? null)} tone={s ? (s.profitGBP >= 0 ? 'pos' : 'neg') : undefined} sub={s ? `${s.returnPct >= 0 ? '+' : ''}${s.returnPct.toFixed(1)}%` : undefined} />
        <Stat label="Portfolio Starting Value (Cash)" value={view?.declaredSizeGBP != null ? fmtMoney(view.declaredSizeGBP) : '—'} />
        <Stat label="Portfolio beta" value={s?.portfolioBeta != null ? s.portfolioBeta.toFixed(2) : '—'} />
        <Stat label="Cash" value={view?.declaredSizeGBP != null ? fmtMoney(s?.cashGBP ?? null) : '—'} />
      </div>

      <Card title="Add or update a holding">
        <form onSubmit={addHolding} className="grid gap-3 md:grid-cols-4">
          <select value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="">Select asset…</option>
            {assets.map((a) => (<option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>))}
          </select>
          <input value={form.shares} onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))} placeholder="Shares" inputMode="decimal" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <input value={form.averagePrice} onChange={(e) => setForm((f) => ({ ...f, averagePrice: e.target.value }))} placeholder={`Avg price ${selectedAsset ? `(${selectedAsset.currency})` : ''}`} inputMode="decimal" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button disabled={busy || !form.assetId} className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            <Plus className="h-4 w-4" /> Save holding
          </button>
        </form>
        {selectedAsset?.latestSnapshot?.currentPrice != null && (
          <div className="mt-2 text-xs text-muted-foreground">Live price for {selectedAsset.symbol}: {selectedAsset.latestSnapshot.currentPrice} {selectedAsset.currency}</div>
        )}
      </Card>

      <Card
        title="Holdings"
        right={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Starting value</span>
            <input value={sizeDraft} onChange={(e) => setSizeDraft(e.target.value)} placeholder="set yours" className="w-24 rounded border border-border bg-background px-2 py-1 text-foreground focus:outline-none" inputMode="decimal" />
            <button onClick={saveSize} disabled={busy} className="rounded border border-border px-2 py-1 font-semibold text-foreground hover:bg-muted/40 disabled:opacity-60">Set</button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !view || view.holdings.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No holdings yet. Add your real positions above to track live value and return, then set your Portfolio Starting Value (Cash) to see allocation and free cash.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Signal</th>
                  <th className="py-2 pr-3">Shares</th>
                  <th className="py-2 pr-3">Avg Price</th>
                  <th className="py-2 pr-3">Current Price</th>
                  <th className="py-2 pr-3">Cost</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Weight</th>
                  <th className="py-2 pr-3">Return</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {view.holdings.map((h) => (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      <Link href={`/assets/${h.assetId}`} className="font-semibold text-foreground hover:text-primary">{h.symbol}</Link>
                      <div className="text-xs text-muted-foreground">{h.currency}</div>
                    </td>
                    <td className="py-2 pr-3"><Badge tone={toneForSignal(h.signalState)}>{h.signalState}</Badge></td>
                    <td className="py-2 pr-3 font-mono">{h.shares ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono">{h.averagePrice ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono">{h.currentPrice ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono">{fmtMoney(h.costGBP)}</td>
                    <td className="py-2 pr-3 font-mono">{fmtMoney(h.valueGBP)}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">{h.weightPct == null ? '—' : `${h.weightPct.toFixed(1)}%`}</td>
                    <td className={`py-2 pr-3 font-mono ${h.returnPct == null ? 'text-muted-foreground' : h.returnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {h.returnPct == null ? '—' : `${h.returnPct >= 0 ? '+' : ''}${h.returnPct.toFixed(1)}%`}
                    </td>
                    <td className="py-2 pr-3">
                      <button onClick={() => removeHolding(h.assetId)} disabled={busy} className="text-rose-500 transition hover:text-rose-400 disabled:opacity-60"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-black ${tone === 'pos' ? 'text-emerald-500' : tone === 'neg' ? 'text-rose-500' : 'text-foreground'}`}>{value}</div>
      {sub && <div className={`mt-0.5 text-xs ${tone === 'pos' ? 'text-emerald-500' : tone === 'neg' ? 'text-rose-500' : 'text-muted-foreground'}`}>{sub}</div>}
    </div>
  );
}
