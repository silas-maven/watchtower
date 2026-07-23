'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Star, Briefcase, Calculator } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Action buttons for an asset (client feedback: Asset Centre needs Add to
 * watchlist, Add to portfolio (live/virtual), and Create plan). Shown on the
 * asset detail page.
 */
export function AssetActions({ assetId, currency, currentPrice }: { assetId: string; currency: string; currentPrice: number | null }) {
  const { pushToast } = useToast();
  const [addingWl, setAddingWl] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [kind, setKind] = useState<'live' | 'virtual'>('live');
  const [shares, setShares] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [saving, setSaving] = useState(false);

  async function addToWatchlist() {
    setAddingWl(true);
    try {
      const res = await fetch(`/api/me/watchlist/${assetId}`, { method: 'POST' });
      const j = await res.json();
      pushToast(j.ok ? 'Added to your watchlist.' : j.error?.message ?? 'Could not add', j.ok ? 'success' : 'error');
    } catch {
      pushToast('Could not add to watchlist', 'error');
    } finally {
      setAddingWl(false);
    }
  }

  async function addToPortfolio() {
    setSaving(true);
    try {
      const res = await fetch(`/api/me/portfolio/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId,
          shares: shares ? Number(shares) : null,
          averagePrice: avgPrice ? Number(avgPrice) : null,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        pushToast(`Added to your ${kind} portfolio.`, 'success');
        setPortfolioOpen(false);
        setShares('');
        setAvgPrice('');
      } else {
        pushToast(j.error?.message ?? 'Could not add position', 'error');
      }
    } catch {
      pushToast('Could not add position', 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={addToWatchlist}
          disabled={addingWl}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
        >
          <Star className="h-4 w-4" /> Add to watchlist
        </button>
        <button
          onClick={() => { setAvgPrice(currentPrice != null ? String(currentPrice) : ''); setPortfolioOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
        >
          <Briefcase className="h-4 w-4" /> Add to portfolio
        </button>
        <Link
          href={`/app/portfolio-tools/average-calculator?assetId=${assetId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          <Calculator className="h-4 w-4" /> Create plan
        </Link>
      </div>

      <Modal
        open={portfolioOpen}
        onClose={() => { if (!saving) setPortfolioOpen(false); }}
        title="Add to portfolio"
        description="Track this position in your live or virtual portfolio."
        footer={
          <>
            <button type="button" onClick={() => setPortfolioOpen(false)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60">Cancel</button>
            <button type="button" onClick={addToPortfolio} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">{saving ? 'Adding…' : 'Add position'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['live', 'virtual'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${kind === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {k} portfolio
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shares</label>
              <input value={shares} onChange={(e) => setShares(e.target.value)} inputMode="decimal" placeholder="e.g. 100" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg price ({currency})</label>
              <input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} inputMode="decimal" className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">You can refine shares, average price and an averaging plan later from the Portfolio page.</p>
        </div>
      </Modal>
    </>
  );
}
