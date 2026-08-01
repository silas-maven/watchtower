'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import {
  COMMON_MARKETS,
  REQUEST_TYPES,
  REQUEST_TYPE_LABEL,
  requestTypeLabel,
  statusLabel,
  statusTone,
  type RequestType,
} from '@/lib/securityRequests';

type MyRequest = {
  id: string;
  symbol: string;
  assetType: string;
  name: string | null;
  market: string | null;
  note: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

const fieldClass =
  'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

/**
 * Member form to ask the academy to add a security, plus the member's own
 * history so a request is not a message into the void.
 *
 * Ticker, kind and market are asked for together because a ticker on its own is
 * ambiguous across exchanges, and guessing wrong is how an asset ends up priced
 * as a completely different instrument.
 */
export function RequestSecurity() {
  const { pushToast } = useToast();
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<RequestType>('STOCK');
  const [name, setName] = useState('');
  const [market, setMarket] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<MyRequest[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/stock-requests', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setMine(j.data.requests ?? []);
    } catch {
      // A failed history load must not block the form itself.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!symbol.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/me/stock-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim(),
          assetType,
          name: name.trim() || undefined,
          market: market.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        pushToast('Request sent to the academy.', 'success');
        setSymbol('');
        setName('');
        setMarket('');
        setNote('');
        load();
      } else {
        pushToast(j.error?.message ?? 'Could not send request', 'error');
      }
    } catch {
      pushToast('Could not send request', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="req-symbol">Ticker</label>
          <input
            id="req-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AMZN"
            maxLength={20}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="req-type">Type</label>
          <select id="req-type" value={assetType} onChange={(e) => setAssetType(e.target.value as RequestType)} className={fieldClass}>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="req-name">Name (optional)</label>
          <input
            id="req-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amazon.com Inc"
            maxLength={120}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="req-market">Where it trades (optional)</label>
          <input
            id="req-market"
            list="req-market-options"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="e.g. London (LSE)"
            maxLength={60}
            className={fieldClass}
          />
          <datalist id="req-market-options">
            {COMMON_MARKETS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className={labelClass} htmlFor="req-note">Why (optional)</label>
          <input
            id="req-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A short reason helps the academy prioritise"
            maxLength={280}
            className={fieldClass}
          />
        </div>
        <button
          onClick={submit}
          disabled={saving || !symbol.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {saving ? 'Sending…' : 'Request'}
        </button>
      </div>

      {mine.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your requests</div>
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="font-semibold text-foreground">{r.symbol}</span>
                <span className="text-xs text-muted-foreground">{requestTypeLabel(r.assetType)}</span>
                {r.name && <span className="text-xs text-muted-foreground">{r.name}</span>}
                <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </span>
                {r.adminNote && <div className="w-full text-xs text-muted-foreground">Academy: {r.adminNote}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
