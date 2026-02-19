'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type RunState = {
  loading: boolean;
  message: string | null;
};

function initial(): RunState {
  return { loading: false, message: null };
}

export function AssetOperationsPanel() {
  const [refreshState, setRefreshState] = useState<RunState>(initial());
  const [briefState, setBriefState] = useState<RunState>(initial());
  const { pushToast } = useToast();

  async function runRefresh() {
    setRefreshState({ loading: true, message: null });
    try {
      const res = await fetch('/api/admin/refresh-market', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        setRefreshState({ loading: false, message: json.error?.message ?? 'Refresh failed' });
        pushToast(json.error?.message ?? 'Refresh failed', 'error');
        return;
      }
      const updated = json.data?.result?.updated ?? 0;
      setRefreshState({ loading: false, message: `Market refresh complete. Updated ${updated} assets.` });
      pushToast(`Market refresh complete. Updated ${updated} assets.`, 'success');
    } catch {
      setRefreshState({ loading: false, message: 'Refresh failed' });
      pushToast('Market refresh failed', 'error');
    }
  }

  async function runBrief() {
    setBriefState({ loading: true, message: null });
    try {
      const res = await fetch('/api/admin/brief/regenerate', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        setBriefState({ loading: false, message: json.error?.message ?? 'Brief generation failed' });
        pushToast(json.error?.message ?? 'Brief generation failed', 'error');
        return;
      }
      setBriefState({ loading: false, message: `Daily brief generated using ${json.data?.brief?.model ?? 'model'}.` });
      pushToast(`Daily brief generated using ${json.data?.brief?.model ?? 'model'}.`, 'success');
    } catch {
      setBriefState({ loading: false, message: 'Brief generation failed' });
      pushToast('Brief generation failed', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={runRefresh}
          disabled={refreshState.loading}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {refreshState.loading ? 'Refreshing…' : 'Run Market Refresh'}
        </button>
        <button
          onClick={runBrief}
          disabled={briefState.loading}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {briefState.loading ? 'Generating…' : 'Generate Daily Brief'}
        </button>
      </div>

      {refreshState.message && <div className="text-xs text-zinc-600">{refreshState.message}</div>}
      {briefState.message && <div className="text-xs text-zinc-600">{briefState.message}</div>}
    </div>
  );
}
