'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/ToastProvider';

type AssetRow = {
  id: string;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: string;
  currency: string;
  targetEntry: number | null;
  targetExit: number | null;
  watched: boolean;
  latestSnapshot: {
    capturedAt?: string;
    currentPrice: number | null;
    dailyChangePct: number | null;
    dailyHigh?: number | null;
    dailyLow?: number | null;
    low52?: number | null;
    high52?: number | null;
    beta?: number | null;
    volumeAvg?: number | null;
    signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  } | null;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toneForSignal(state: string) {
  if (state === 'BUY') return 'emerald' as const;
  if (state === 'SELL') return 'rose' as const;
  if (state === 'BOTH') return 'blue' as const;
  return 'zinc' as const;
}

export default function CommunityPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/assets', { cache: 'no-store' });
        const json = (await res.json()) as { ok: boolean; data?: { assets: AssetRow[] }; error?: { message?: string } };
        if (!json.ok) {
          if (!cancelled) setError(json.error?.message ?? 'Unable to load community watchlist');
          return;
        }
        if (!cancelled) setAssets(json.data?.assets ?? []);
      } catch {
        if (!cancelled) setError('Unable to load community watchlist');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const myWatchlist = useMemo(() => assets.filter((a) => a.watched), [assets]);
  const activeSignals = useMemo(
    () => assets.filter((a) => a.latestSnapshot?.signalState && a.latestSnapshot.signalState !== 'NONE'),
    [assets],
  );

  async function toggleWatch(asset: AssetRow) {
    setBusyAssetId(asset.id);
    try {
      const method = asset.watched ? 'DELETE' : 'POST';
      const res = await fetch(`/api/me/watchlist/${asset.id}`, { method });
      const json = (await res.json()) as { ok: boolean };
      if (!json.ok) {
        pushToast('Could not update watchlist selection.', 'error');
        return;
      }

      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, watched: !a.watched } : a)));
      pushToast(asset.watched ? `Removed ${asset.symbol} from My Watchlist.` : `Added ${asset.symbol} to My Watchlist.`, 'success');
    } catch {
      pushToast('Could not update watchlist selection.', 'error');
    } finally {
      setBusyAssetId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Community Watchlist</h1>
        <p className="mt-1 text-sm text-zinc-600">
          This is the member flow: view the full master watchlist, then star assets into your own selected watchlist.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Master Assets">
          <div className="text-2xl font-semibold">{assets.length}</div>
          <div className="text-xs text-zinc-500 mt-1">All assets visible to members</div>
        </Card>
        <Card title="My Selected Assets">
          <div className="text-2xl font-semibold">{myWatchlist.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Starred from the master list</div>
        </Card>
        <Card title="Active Signals">
          <div className="text-2xl font-semibold">{activeSignals.length}</div>
          <div className="text-xs text-zinc-500 mt-1">BUY / SELL / BOTH currently active</div>
        </Card>
      </div>

      {error && (
        <Card title="Session Required">
          <div className="text-sm text-zinc-700">
            {error}. Please <Link className="font-semibold text-blue-700" href="/login">log in</Link> to view member data.
          </div>
        </Card>
      )}

      {!error && (
        <>
          <Card title="My Watchlist (Selected)">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading selected assets…</div>
            ) : myWatchlist.length === 0 ? (
              <div className="text-sm text-zinc-600">No assets selected yet. Use the star action in Master Watchlist below.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-600">
                      <th className="py-2 pr-3">Asset</th>
                      <th className="py-2 pr-3">Signal <HelpTip text="BUY/SELL/BOTH/NONE based on target levels and day range." /></th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">Day Range <HelpTip text="Intraday low to high range." /></th>
                      <th className="py-2 pr-3">Targets <HelpTip text="Configured entry and exit trigger levels." /></th>
                      <th className="py-2 pr-3">52w</th>
                      <th className="py-2 pr-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myWatchlist.map((asset) => {
                      const signal = asset.latestSnapshot?.signalState ?? 'NONE';
                      return (
                        <tr key={`my-${asset.id}`} className="border-b border-zinc-100 align-top">
                          <td className="py-2 pr-3">
                            <div className="font-semibold">{asset.symbol}</div>
                            <div className="text-xs text-zinc-600">{asset.name}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone={toneForSignal(signal)}>{signal}</Badge>
                          </td>
                          <td className="py-2 pr-3">
                            {asset.latestSnapshot?.currentPrice == null ? '—' : `${fmt(asset.latestSnapshot.currentPrice)} ${asset.currency}`}
                            <div className="text-xs text-zinc-600 mt-1">
                              {asset.latestSnapshot?.dailyChangePct == null
                                ? 'No change data'
                                : `${asset.latestSnapshot.dailyChangePct >= 0 ? '+' : ''}${fmt(asset.latestSnapshot.dailyChangePct)}%`}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-xs text-zinc-700">
                            {asset.latestSnapshot?.dailyLow ?? '—'} - {asset.latestSnapshot?.dailyHigh ?? '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-zinc-700">
                            Entry {asset.targetEntry ?? '—'} · Exit {asset.targetExit ?? '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-zinc-700">
                            {asset.latestSnapshot?.low52 ?? '—'} / {asset.latestSnapshot?.high52 ?? '—'}
                          </td>
                          <td className="py-2 pr-3">
                            <Link href={`/assets/${asset.id}`} className="text-sm font-semibold text-blue-700">Open</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Master Watchlist (All Assets)">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading master watchlist…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-600">
                      <th className="py-2 pr-3">Asset</th>
                      <th className="py-2 pr-3">Signal</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">Change</th>
                      <th className="py-2 pr-3">Targets</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => {
                      const signal = asset.latestSnapshot?.signalState ?? 'NONE';
                      return (
                        <tr key={asset.id} className="border-b border-zinc-100 align-top">
                          <td className="py-2 pr-3">
                            <div className="font-semibold">{asset.symbol}</div>
                            <div className="text-xs text-zinc-600">{asset.name}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone={toneForSignal(signal)}>{signal}</Badge>
                          </td>
                          <td className="py-2 pr-3">
                            {asset.latestSnapshot?.currentPrice == null ? '—' : `${fmt(asset.latestSnapshot.currentPrice)} ${asset.currency}`}
                          </td>
                          <td className="py-2 pr-3">
                            {asset.latestSnapshot?.dailyChangePct == null
                              ? '—'
                              : `${asset.latestSnapshot.dailyChangePct >= 0 ? '+' : ''}${fmt(asset.latestSnapshot.dailyChangePct)}%`}
                          </td>
                          <td className="py-2 pr-3 text-xs text-zinc-700">
                            Entry {asset.targetEntry ?? '—'} · Exit {asset.targetExit ?? '—'}
                          </td>
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => toggleWatch(asset)}
                              disabled={busyAssetId === asset.id}
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              {asset.watched ? 'Unstar' : 'Star'}
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
