'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Star, Trash2, Pencil, Check, X } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';

type AssetRow = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  targetEntry: number | null;
  targetExit: number | null;
  latestSnapshot: {
    currentPrice: number | null;
    dailyChangePct: number | null;
    dailyHigh?: number | null;
    dailyLow?: number | null;
    signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  } | null;
};

type Watchlist = { id: string; name: string; isDefault: boolean; assetIds: string[] };

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toneForSignal(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default function WatchlistsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');
  const { pushToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, listsRes] = await Promise.all([
        fetch('/api/assets', { cache: 'no-store' }),
        fetch('/api/me/watchlists', { cache: 'no-store' }),
      ]);
      const assetsJson = await assetsRes.json();
      const listsJson = await listsRes.json();
      if (!assetsJson.ok || !listsJson.ok) {
        setError(assetsJson.error?.message ?? listsJson.error?.message ?? 'Unable to load watchlists');
        return;
      }
      setAssets(assetsJson.data?.assets ?? []);
      const loaded: Watchlist[] = listsJson.data?.watchlists ?? [];
      setLists(loaded);
      setActiveId((prev) => prev ?? loaded.find((l) => l.isDefault)?.id ?? loaded[0]?.id ?? null);
    } catch {
      setError('Unable to load watchlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeList = useMemo(() => lists.find((l) => l.id === activeId) ?? null, [lists, activeId]);
  const activeAssetIds = useMemo(() => new Set(activeList?.assetIds ?? []), [activeList]);

  const listAssets = useMemo(() => assets.filter((a) => activeAssetIds.has(a.id)), [assets, activeAssetIds]);
  const filteredMaster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [assets, search]);

  async function toggleItem(asset: AssetRow) {
    if (!activeList) return;
    setBusyAssetId(asset.id);
    const inList = activeAssetIds.has(asset.id);
    try {
      const res = await fetch(`/api/me/watchlists/${activeList.id}/items/${asset.id}`, { method: inList ? 'DELETE' : 'POST' });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not update list', 'error');
        return;
      }
      setLists((prev) =>
        prev.map((l) =>
          l.id === activeList.id
            ? { ...l, assetIds: inList ? l.assetIds.filter((x) => x !== asset.id) : [...l.assetIds, asset.id] }
            : l,
        ),
      );
    } catch {
      pushToast('Could not update list', 'error');
    } finally {
      setBusyAssetId(null);
    }
  }

  async function createList() {
    const name = window.prompt('Name your new list');
    if (!name?.trim()) return;
    try {
      const res = await fetch('/api/me/watchlists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not create list', 'error');
        return;
      }
      setLists((prev) => [...prev, json.data.watchlist]);
      setActiveId(json.data.watchlist.id);
      pushToast(`Created ${json.data.watchlist.name}.`, 'success');
    } catch {
      pushToast('Could not create list', 'error');
    }
  }

  async function renameList(id: string) {
    if (!renameValue.trim()) {
      setRenaming(null);
      return;
    }
    try {
      const res = await fetch(`/api/me/watchlists/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not rename list', 'error');
        return;
      }
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: renameValue.trim() } : l)));
      pushToast('List renamed.', 'success');
    } catch {
      pushToast('Could not rename list', 'error');
    } finally {
      setRenaming(null);
    }
  }

  async function deleteList(id: string) {
    if (lists.length <= 1) {
      pushToast('Keep at least one list.', 'error');
      return;
    }
    if (!window.confirm('Delete this list? The assets stay on the master watchlist.')) return;
    try {
      const res = await fetch(`/api/me/watchlists/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) {
        pushToast(json.error?.message ?? 'Could not delete list', 'error');
        return;
      }
      const remaining = lists.filter((l) => l.id !== id);
      setLists(remaining);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);
      pushToast('List deleted.', 'success');
    } catch {
      pushToast('Could not delete list', 'error');
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Watchlists</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Master list and your sublists</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The academy curates the master watchlist. You cannot change it, but you can build as many personal sublists from it as you like.
          </p>
        </div>
      </div>

      {error ? (
        <Card title="Session required">
          <div className="text-sm text-muted-foreground">
            {error}. Please <Link className="font-semibold text-primary" href="/sign-in">sign in</Link> to view your lists.
          </div>
        </Card>
      ) : (
        <>
          {/* Sublist switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {lists.map((l) => (
              <div
                key={l.id}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  activeId === l.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {renaming === l.id ? (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && renameList(l.id)}
                      className="w-28 rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none"
                    />
                    <button onClick={() => renameList(l.id)} className="text-emerald-500"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setRenaming(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </span>
                ) : (
                  <>
                    <button onClick={() => setActiveId(l.id)} className="font-semibold">{l.name}</button>
                    <span className="text-xs text-muted-foreground">{l.assetIds.length}</span>
                    {l.isDefault && <span className="text-[10px] uppercase tracking-wide text-primary">default</span>}
                    <button
                      onClick={() => { setRenaming(l.id); setRenameValue(l.name); }}
                      className="opacity-0 transition group-hover:opacity-100"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {lists.length > 1 && (
                      <button onClick={() => deleteList(l.id)} className="opacity-0 transition group-hover:opacity-100" title="Delete">
                        <Trash2 className="h-3 w-3 text-rose-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <button
              onClick={createList}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New list
            </button>
          </div>

          {/* Active sublist */}
          <Card title={activeList ? `${activeList.name} (${listAssets.length})` : 'Your list'}>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : listAssets.length === 0 ? (
              <div className="text-sm text-muted-foreground">This list is empty. Add assets from the master watchlist below.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Asset</th>
                      <th className="py-2 pr-3">Signal</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">Targets</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listAssets.map((asset) => {
                      const signal = asset.latestSnapshot?.signalState ?? 'NONE';
                      return (
                        <tr key={`my-${asset.id}`} className="border-b border-border/50 align-top">
                          <td className="py-2 pr-3">
                            <Link href={`/assets/${asset.id}`} className="font-semibold text-foreground hover:text-primary">{asset.symbol}</Link>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </td>
                          <td className="py-2 pr-3"><Badge tone={toneForSignal(signal)}>{signal}</Badge></td>
                          <td className="py-2 pr-3 font-mono">
                            {asset.latestSnapshot?.currentPrice == null ? '—' : `${fmt(asset.latestSnapshot.currentPrice)} ${asset.currency}`}
                            <div className={`text-xs ${asset.latestSnapshot?.dailyChangePct == null ? 'text-muted-foreground' : asset.latestSnapshot.dailyChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {asset.latestSnapshot?.dailyChangePct == null ? '—' : `${asset.latestSnapshot.dailyChangePct >= 0 ? '+' : ''}${fmt(asset.latestSnapshot.dailyChangePct)}%`}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">Entry {asset.targetEntry ?? '—'} · Exit {asset.targetExit ?? '—'}</td>
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => toggleItem(asset)}
                              disabled={busyAssetId === asset.id}
                              className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Master list */}
          <Card
            title="Master watchlist"
            right={
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or name"
                className="w-56 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            }
          >
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading master watchlist…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Asset</th>
                      <th className="py-2 pr-3">Signal</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">Change</th>
                      <th className="py-2 pr-3">{activeList ? `In ${activeList.name}` : 'Add'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaster.map((asset) => {
                      const signal = asset.latestSnapshot?.signalState ?? 'NONE';
                      const inList = activeAssetIds.has(asset.id);
                      return (
                        <tr key={asset.id} className="border-b border-border/50 align-top">
                          <td className="py-2 pr-3">
                            <Link href={`/assets/${asset.id}`} className="font-semibold text-foreground hover:text-primary">{asset.symbol}</Link>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </td>
                          <td className="py-2 pr-3"><Badge tone={toneForSignal(signal)}>{signal}</Badge></td>
                          <td className="py-2 pr-3 font-mono">{asset.latestSnapshot?.currentPrice == null ? '—' : `${fmt(asset.latestSnapshot.currentPrice)} ${asset.currency}`}</td>
                          <td className={`py-2 pr-3 font-mono ${asset.latestSnapshot?.dailyChangePct == null ? 'text-muted-foreground' : asset.latestSnapshot.dailyChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {asset.latestSnapshot?.dailyChangePct == null ? '—' : `${asset.latestSnapshot.dailyChangePct >= 0 ? '+' : ''}${fmt(asset.latestSnapshot.dailyChangePct)}%`}
                          </td>
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => toggleItem(asset)}
                              disabled={busyAssetId === asset.id || !activeList}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                                inList ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
                              }`}
                            >
                              <Star className={`h-3 w-3 ${inList ? 'fill-primary' : ''}`} />
                              {inList ? 'Added' : 'Add'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
