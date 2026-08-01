'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { ACADEMY_OFFERS } from '@/lib/academyOffers';

/**
 * Admin control over which of the academy's products and services members see.
 *
 * Only the bookable services and the newsletter can be switched off. The
 * membership and the course are the standing shop front and stay put, so the
 * panel cannot be emptied by accident.
 */
export function AcademyOffersPanel() {
  const { pushToast } = useToast();
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setHidden(j.data.settings?.academy_offers_hidden ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string) {
    const next = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    setBusy(id);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: 'academy_offers_hidden', value: next }),
      });
      const j = await res.json();
      if (j.ok) {
        setHidden(j.data.settings?.academy_offers_hidden ?? next);
      } else {
        pushToast(j.error?.message ?? 'Could not save', 'error');
      }
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        These appear on the member Dashboard under &quot;More from the academy&quot;. Each one opens in a new tab; nothing is paid for inside this app.
      </p>
      <ul className="space-y-2">
        {ACADEMY_OFFERS.map((offer) => {
          const isHidden = hidden.includes(offer.id);
          return (
            <li key={offer.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="min-w-40 flex-1">
                <div className="text-sm font-semibold text-foreground">{offer.title}</div>
                <a
                  href={offer.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  {offer.destination}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
              {offer.canHide ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isHidden}
                  onClick={() => toggle(offer.id)}
                  disabled={busy === offer.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                    isHidden
                      ? 'border-border text-muted-foreground hover:bg-muted/40'
                      : 'border-primary bg-primary/10 text-foreground'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isHidden ? 'border-border' : 'border-primary bg-primary text-primary-foreground'
                    }`}
                  >
                    {!isHidden && <Check className="h-3 w-3" />}
                  </span>
                  {isHidden ? 'Hidden' : 'Shown'}
                </button>
              ) : (
                <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Always shown
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
