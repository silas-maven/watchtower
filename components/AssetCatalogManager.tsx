'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/ToastProvider';

type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY' | 'FOREX' | 'INDEX' | 'OTHER';

type AdminAsset = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: AssetType;
  currency: string;
  isActive: boolean;
  targetEntry: number | null;
  targetExit: number | null;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  currentPrice: number | null;
  dailyLow: number | null;
  dailyHigh: number | null;
};

type Draft = {
  name: string;
  reason: string;
  targetEntry: string;
  targetExit: string;
  isActive: boolean;
};

type Props = {
  initialAssets: AdminAsset[];
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

export function AssetCatalogManager({ initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { pushToast } = useToast();

  const [newAsset, setNewAsset] = useState({
    symbol: '',
    name: '',
    reason: '',
    assetType: 'STOCK' as AssetType,
    currency: 'USD',
    targetEntry: '',
    targetExit: '',
  });

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    for (const a of initialAssets) {
      map[a.id] = {
        name: a.name,
        reason: a.reason ?? '',
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
    }),
    [assets],
  );

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
          targetEntry: toNullableNumber(newAsset.targetEntry),
          targetExit: toNullableNumber(newAsset.targetExit),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error?.message ?? 'Failed to add asset');
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
          isActive: created.isActive,
          targetEntry: created.rule?.targetEntry ?? null,
          targetExit: created.rule?.targetExit ?? null,
          signalState: 'NONE',
          currentPrice: null,
          dailyLow: null,
          dailyHigh: null,
        };
        setAssets((prev) => [...prev, row].sort((a, b) => a.symbol.localeCompare(b.symbol)));
        setDrafts((prev) => ({
          ...prev,
          [row.id]: {
            name: row.name,
            reason: row.reason ?? '',
            targetEntry: row.targetEntry == null ? '' : String(row.targetEntry),
            targetExit: row.targetExit == null ? '' : String(row.targetExit),
            isActive: row.isActive,
          },
        }));
        setNewAsset({ symbol: '', name: '', reason: '', assetType: 'STOCK', currency: 'USD', targetEntry: '', targetExit: '' });
        setMessage(`Added asset ${row.symbol}.`);
        pushToast(`Added asset ${row.symbol}.`, 'success');
      }
    } catch {
      setMessage('Failed to add asset');
      pushToast('Failed to add asset', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function saveAsset(assetId: string) {
    const draft = drafts[assetId];
    if (!draft) return;

    setBusyId(assetId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          reason: draft.reason || null,
          targetEntry: toNullableNumber(draft.targetEntry),
          targetExit: toNullableNumber(draft.targetExit),
          isActive: draft.isActive,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error?.message ?? 'Failed to save asset');
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
                targetEntry: toNullableNumber(draft.targetEntry),
                targetExit: toNullableNumber(draft.targetExit),
                isActive: draft.isActive,
              }
            : a,
        ),
      );
      setMessage('Asset updated.');
      pushToast('Asset updated.', 'success');
    } catch {
      setMessage('Failed to save asset');
      pushToast('Failed to save asset', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addAsset} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="text-sm font-semibold">Add Asset</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input value={newAsset.symbol} onChange={(e) => setNewAsset((s) => ({ ...s, symbol: e.target.value }))} placeholder="Symbol (e.g. AAPL)" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <input value={newAsset.name} onChange={(e) => setNewAsset((s) => ({ ...s, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <select value={newAsset.assetType} onChange={(e) => setNewAsset((s) => ({ ...s, assetType: e.target.value as AssetType }))} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
            <option value="STOCK">STOCK</option><option value="ETF">ETF</option><option value="CRYPTO">CRYPTO</option>
            <option value="COMMODITY">COMMODITY</option><option value="FOREX">FOREX</option><option value="INDEX">INDEX</option><option value="OTHER">OTHER</option>
          </select>
          <input value={newAsset.currency} onChange={(e) => setNewAsset((s) => ({ ...s, currency: e.target.value }))} placeholder="Currency" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <input value={newAsset.targetEntry} onChange={(e) => setNewAsset((s) => ({ ...s, targetEntry: e.target.value }))} placeholder="Target Entry" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <input value={newAsset.targetExit} onChange={(e) => setNewAsset((s) => ({ ...s, targetExit: e.target.value }))} placeholder="Target Exit" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <input value={newAsset.reason} onChange={(e) => setNewAsset((s) => ({ ...s, reason: e.target.value }))} placeholder="Reason (optional)" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button disabled={busyId === 'new'} className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60">
          {busyId === 'new' ? 'Adding…' : 'Add Asset'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Total Assets</div><div className="text-xl font-semibold">{totals.total}</div></div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Buy-Side Signals</div><div className="text-xl font-semibold text-emerald-700">{totals.buy}</div></div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="text-xs text-zinc-600">Sell-Side Signals</div><div className="text-xl font-semibold text-rose-700">{totals.sell}</div></div>
      </div>

      {message && <div className="text-xs text-zinc-600">{message}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-600">
              <th className="py-2 pr-3">Symbol <HelpTip text="Ticker code from master watchlist." /></th>
              <th className="py-2 pr-3">Signal <HelpTip text="Deterministic signal from target/range logic." /></th>
              <th className="py-2 pr-3">Price <HelpTip text="Latest fetched market price." /></th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Reason</th>
              <th className="py-2 pr-3">Target Entry <HelpTip text="Buy-zone trigger level." /></th>
              <th className="py-2 pr-3">Target Exit <HelpTip text="Sell-zone trigger level." /></th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const draft = drafts[asset.id];
              if (!draft) return null;
              return (
                <tr key={asset.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-3 font-semibold">{asset.symbol}</td>
                  <td className="py-2 pr-3"><Badge tone={signalTone(asset.signalState)}>{asset.signalState}</Badge></td>
                  <td className="py-2 pr-3">{asset.currentPrice == null ? '—' : `${asset.currentPrice.toFixed(2)} ${asset.currency}`}</td>
                  <td className="py-2 pr-3"><input value={draft.name} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, name: e.target.value } }))} className="w-44 rounded-md border border-zinc-200 px-2 py-1 text-sm" /></td>
                  <td className="py-2 pr-3"><input value={draft.reason} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, reason: e.target.value } }))} className="w-52 rounded-md border border-zinc-200 px-2 py-1 text-sm" /></td>
                  <td className="py-2 pr-3"><input value={draft.targetEntry} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, targetEntry: e.target.value } }))} className="w-24 rounded-md border border-zinc-200 px-2 py-1 text-sm" /></td>
                  <td className="py-2 pr-3"><input value={draft.targetExit} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, targetExit: e.target.value } }))} className="w-24 rounded-md border border-zinc-200 px-2 py-1 text-sm" /></td>
                  <td className="py-2 pr-3"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDrafts((p) => ({ ...p, [asset.id]: { ...draft, isActive: e.target.checked } }))} /></td>
                  <td className="py-2 pr-3">
                    <button disabled={busyId === asset.id} onClick={() => saveAsset(asset.id)} className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60">
                      {busyId === asset.id ? 'Saving…' : 'Save'}
                    </button>
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
