'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/ToastProvider';

type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY' | 'FOREX' | 'INDEX' | 'OTHER';
type Override = 'AUTO' | 'FORCE_BUY' | 'FORCE_SELL' | 'SUPPRESS';

type AdminAsset = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: AssetType;
  currency: string;
  quoteSymbol: string | null;
  isActive: boolean;
  targetEntry: number | null;
  targetExit: number | null;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  override: Override;
  currentPrice: number | null;
  dailyLow: number | null;
  dailyHigh: number | null;
  source: string | null;
  fetchError: string | null;
};

type Draft = {
  name: string;
  reason: string;
  quoteSymbol: string;
  targetEntry: string;
  targetExit: string;
  isActive: boolean;
};

type Props = { initialAssets: AdminAsset[] };

const OVERRIDE_LABEL: Record<Override, string> = {
  AUTO: 'Auto (calculated)',
  FORCE_BUY: 'Force BUY',
  FORCE_SELL: 'Force SELL',
  SUPPRESS: 'Suppress',
};

function toNullableNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function signalTone(signal: AdminAsset['signalState']) {
  if (signal === 'BUY') return 'emerald' as const;
  if (signal === 'SELL') return 'rose' as const;
  if (signal === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

const inputClass =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';
const cellInputClass = 'rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none';

export function AssetCatalogManager({ initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const [newAsset, setNewAsset] = useState({
    symbol: '',
    name: '',
    reason: '',
    assetType: 'STOCK' as AssetType,
    currency: 'USD',
    quoteSymbol: '',
    targetEntry: '',
    targetExit: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    for (const a of initialAssets) {
      map[a.id] = {
        name: a.name,
        reason: a.reason ?? '',
        quoteSymbol: a.quoteSymbol ?? '',
        targetEntry: a.targetEntry == null ? '' : String(a.targetEntry),
        targetExit: a.targetExit == null ? '' : String(a.targetExit),
        isActive: a.isActive,
      };
    }
    return map;
  });

  const totals = useMemo(
    () => ({
      total: assets.length,
      buy: assets.filter((a) => a.signalState === 'BUY' || a.signalState === 'BOTH').length,
      sell: assets.filter((a) => a.signalState === 'SELL' || a.signalState === 'BOTH').length,
      manual: assets.filter((a) => a.override !== 'AUTO').length,
      stale: assets.filter((a) => a.fetchError != null).length,
    }),
    [assets],
  );

  async function verifySymbol() {
    setVerifying(true);
    setVerifyNote(null);
    try {
      const res = await fetch('/api/admin/assets/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symbol: newAsset.symbol,
          quoteSymbol: newAsset.quoteSymbol || null,
          assetType: newAsset.assetType,
          currency: newAsset.currency,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setVerifyNote(json.error?.message ?? 'Verification failed');
        return;
      }
      const d = json.data;
      if (!d.resolved) {
        setVerifyNote(`No live quote for ${d.quoteSymbol}. Add an explicit quote symbol (e.g. VLS.L) and try again.`);
        return;
      }
      setNewAsset((s) => ({
        ...s,
        name: s.name || '',
        currency: d.currency ?? s.currency,
      }));
      setVerifyNote(`Resolved ${d.quoteSymbol}: ${d.currentPrice} ${d.currency ?? ''}. 52w low ${d.low52 ?? 'n/a'}.`);
    } catch {
      setVerifyNote('Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();
    setBusyId('new');
    try {
      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symbol: newAsset.symbol,
          name: newAsset.name,
          reason: newAsset.reason || null,
          assetType: newAsset.assetType,
          currency: newAsset.currency,
          quoteSymbol: newAsset.quoteSymbol || null,
          targetEntry: toNullableNumber(newAsset.targetEntry),
          targetExit: toNullableNumber(newAsset.targetExit),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Failed to add asset', 'error');
        return;
      }
      const created = json.data?.asset;
      if (created) {
        const row: AdminAsset = {
          id: created.id,
          symbol: created.symbol,
          name: created.name,
          reason: created.reason,
          assetType: created.assetType,
          currency: created.currency,
          quoteSymbol: created.quoteSymbol ?? null,
          isActive: created.isActive,
          targetEntry: created.rule?.targetEntry ?? null,
          targetExit: created.rule?.targetExit ?? null,
          signalState: 'NONE',
          override: 'AUTO',
          currentPrice: null,
          dailyLow: null,
          dailyHigh: null,
          source: null,
          fetchError: null,
        };
        setAssets((prev) => [...prev, row].sort((a, b) => a.symbol.localeCompare(b.symbol)));
        setDrafts((prev) => ({
          ...prev,
          [row.id]: {
            name: row.name,
            reason: row.reason ?? '',
            quoteSymbol: row.quoteSymbol ?? '',
            targetEntry: row.targetEntry == null ? '' : String(row.targetEntry),
            targetExit: row.targetExit == null ? '' : String(row.targetExit),
            isActive: row.isActive,
          },
        }));
        setNewAsset({ symbol: '', name: '', reason: '', assetType: 'STOCK', currency: 'USD', quoteSymbol: '', targetEntry: '', targetExit: '' });
        setVerifyNote(null);
        pushToast(`Added ${row.symbol}. Run a market refresh to pull its first quote.`, 'success');
      }
    } catch {
      pushToast('Failed to add asset', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function saveAsset(assetId: string) {
    const draft = drafts[assetId];
    if (!draft) return;
    setBusyId(assetId);
    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          reason: draft.reason || null,
          quoteSymbol: draft.quoteSymbol || null,
          targetEntry: toNullableNumber(draft.targetEntry),
          targetExit: toNullableNumber(draft.targetExit),
          isActive: draft.isActive,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Failed to save asset', 'error');
        return;
      }
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId
            ? {
                ...a,
                name: draft.name,
                reason: draft.reason || null,
                quoteSymbol: draft.quoteSymbol || null,
                targetEntry: toNullableNumber(draft.targetEntry),
                targetExit: toNullableNumber(draft.targetExit),
                isActive: draft.isActive,
              }
            : a,
        ),
      );
      pushToast('Asset updated.', 'success');
    } catch {
      pushToast('Failed to save asset', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function setOverride(assetId: string, override: Override) {
    setBusyId(assetId);
    const previous = assets.find((a) => a.id === assetId)?.override ?? 'AUTO';
    setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, override } : a)));
    try {
      const res = await fetch(`/api/admin/assets/${assetId}/override`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ override: override === 'AUTO' ? null : override }),
      });
      const json = await res.json();
      if (!json.ok) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, override: previous } : a)));
        pushToast(json.error?.message ?? 'Failed to set override', 'error');
        return;
      }
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, signalState: json.data.signalState } : a)));
      pushToast(override === 'AUTO' ? 'Returned to calculated signal.' : `Signal pinned: ${OVERRIDE_LABEL[override]}.`, 'success');
    } catch {
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, override: previous } : a)));
      pushToast('Failed to set override', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function archiveAsset(assetId: string) {
    setBusyId(assetId);
    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Failed to archive', 'error');
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      pushToast(`Archived ${json.data?.symbol ?? 'asset'}.`, 'success');
    } catch {
      pushToast('Failed to archive', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addAsset} className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="text-sm font-semibold text-foreground">Add asset to master list</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input value={newAsset.symbol} onChange={(e) => setNewAsset((s) => ({ ...s, symbol: e.target.value }))} placeholder="Symbol (e.g. AAPL, LON:VLS)" className={inputClass} />
          <input value={newAsset.name} onChange={(e) => setNewAsset((s) => ({ ...s, name: e.target.value }))} placeholder="Name" className={inputClass} />
          <select value={newAsset.assetType} onChange={(e) => setNewAsset((s) => ({ ...s, assetType: e.target.value as AssetType }))} className={inputClass}>
            <option value="STOCK">STOCK</option><option value="ETF">ETF</option><option value="CRYPTO">CRYPTO</option>
            <option value="COMMODITY">COMMODITY</option><option value="FOREX">FOREX</option><option value="INDEX">INDEX</option><option value="OTHER">OTHER</option>
          </select>
          <input value={newAsset.currency} onChange={(e) => setNewAsset((s) => ({ ...s, currency: e.target.value }))} placeholder="Currency" className={inputClass} />
          <input value={newAsset.quoteSymbol} onChange={(e) => setNewAsset((s) => ({ ...s, quoteSymbol: e.target.value }))} placeholder="Quote symbol override (optional)" className={inputClass} />
          <input value={newAsset.targetEntry} onChange={(e) => setNewAsset((s) => ({ ...s, targetEntry: e.target.value }))} placeholder="Target entry" className={inputClass} />
          <input value={newAsset.targetExit} onChange={(e) => setNewAsset((s) => ({ ...s, targetExit: e.target.value }))} placeholder="Target exit" className={inputClass} />
          <input value={newAsset.reason} onChange={(e) => setNewAsset((s) => ({ ...s, reason: e.target.value }))} placeholder="Reason (optional)" className={`${inputClass} md:col-span-1`} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={verifySymbol} disabled={verifying || !newAsset.symbol} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60">
            {verifying ? 'Verifying…' : 'Verify symbol'}
          </button>
          <button disabled={busyId === 'new' || !newAsset.symbol || !newAsset.name} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {busyId === 'new' ? 'Adding…' : 'Add asset'}
          </button>
          {verifyNote && <span className="text-xs text-muted-foreground">{verifyNote}</span>}
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-5 text-sm">
        <div className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Active assets</div><div className="text-xl font-bold text-foreground">{totals.total}</div></div>
        <div className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Buy signals</div><div className="text-xl font-bold text-emerald-500">{totals.buy}</div></div>
        <div className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Sell signals</div><div className="text-xl font-bold text-rose-500">{totals.sell}</div></div>
        <div className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Manual overrides</div><div className="text-xl font-bold text-amber-500">{totals.manual}</div></div>
        <div className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">No live quote</div><div className="text-xl font-bold text-foreground">{totals.stale}</div></div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Symbol</th>
              <th className="py-2 pr-3">Signal</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Quote sym <HelpTip text="Override the symbol used to fetch quotes (e.g. VLS.L). Leave blank to auto-map." /></th>
              <th className="py-2 pr-3">Entry</th>
              <th className="py-2 pr-3">Exit</th>
              <th className="py-2 pr-3">Override <HelpTip text="Force or suppress the signal regardless of price. Auto returns to the calculation." /></th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const draft = drafts[asset.id];
              if (!draft) return null;
              const busy = busyId === asset.id;
              return (
                <tr key={asset.id} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-foreground">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.currency}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={signalTone(asset.signalState)}>{asset.signalState}</Badge>
                    {asset.override !== 'AUTO' && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Owner call</div>}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {asset.currentPrice == null ? <span className="text-muted-foreground">—</span> : asset.currentPrice.toFixed(2)}
                    {asset.fetchError && <div className="text-[10px] text-rose-500" title={asset.fetchError}>no quote</div>}
                  </td>
                  <td className="py-2 pr-3"><input value={draft.name} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, name: e.target.value } }))} className={`w-40 ${cellInputClass}`} /></td>
                  <td className="py-2 pr-3"><input value={draft.quoteSymbol} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, quoteSymbol: e.target.value } }))} placeholder="auto" className={`w-24 ${cellInputClass}`} /></td>
                  <td className="py-2 pr-3"><input value={draft.targetEntry} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, targetEntry: e.target.value } }))} className={`w-20 ${cellInputClass}`} /></td>
                  <td className="py-2 pr-3"><input value={draft.targetExit} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, targetExit: e.target.value } }))} className={`w-20 ${cellInputClass}`} /></td>
                  <td className="py-2 pr-3">
                    <select value={asset.override} disabled={busy} onChange={(e) => setOverride(asset.id, e.target.value as Override)} className={`${cellInputClass} ${asset.override !== 'AUTO' ? 'border-amber-500/50 text-amber-500' : ''}`}>
                      <option value="AUTO">Auto</option>
                      <option value="FORCE_BUY">Force BUY</option>
                      <option value="FORCE_SELL">Force SELL</option>
                      <option value="SUPPRESS">Suppress</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-1.5">
                      <button disabled={busy} onClick={() => saveAsset(asset.id)} className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60">
                        {busy ? '…' : 'Save'}
                      </button>
                      <button disabled={busy} onClick={() => archiveAsset(asset.id)} className="rounded-md border border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-60">
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
