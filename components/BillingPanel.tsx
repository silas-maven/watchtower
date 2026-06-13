'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type Props = {
  hasCustomer: boolean;
  membershipStatus: string | null;
  currentPeriodEnd: string | null;
  membershipPriceLabel: string;
  ecoursePriceLabel: string;
};

export function BillingPanel({ hasCustomer, membershipStatus, currentPeriodEnd, membershipPriceLabel, ecoursePriceLabel }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const { pushToast } = useToast();

  async function startCheckout(product: 'membership' | 'ecourse') {
    setBusy(product);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const json = await res.json();
      if (!json.ok || !json.data?.url) {
        pushToast(json.error?.message ?? 'Could not start checkout', 'error');
        return;
      }
      window.location.href = json.data.url;
    } catch {
      pushToast('Could not start checkout', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const json = await res.json();
      if (!json.ok || !json.data?.url) {
        pushToast(json.error?.message ?? 'Could not open billing portal', 'error');
        return;
      }
      window.location.href = json.data.url;
    } catch {
      pushToast('Could not open billing portal', 'error');
    } finally {
      setBusy(null);
    }
  }

  const isActive = membershipStatus === 'ACTIVE';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Membership</div>
            <div className="text-sm font-bold text-foreground">{membershipPriceLabel}</div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Full access to the master watchlist, signals, daily briefs and portfolio tools.
          </p>
          {isActive ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-emerald-500">
                Active{currentPeriodEnd ? ` · renews ${currentPeriodEnd}` : ''}
              </div>
              <button
                onClick={openPortal}
                disabled={busy != null}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
              >
                {busy === 'portal' ? 'Opening…' : 'Manage billing'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startCheckout('membership')}
              disabled={busy != null}
              className="mt-4 w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {busy === 'membership' ? 'Starting…' : 'Start membership'}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">SPArtan Investing eCourse</div>
            <div className="text-sm font-bold text-foreground">{ecoursePriceLabel}</div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            One-time purchase. The full course covering the SPA method end to end.
          </p>
          <button
            onClick={() => startCheckout('ecourse')}
            disabled={busy != null}
            className="mt-4 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
          >
            {busy === 'ecourse' ? 'Starting…' : 'Buy the eCourse'}
          </button>
        </div>
      </div>

      {hasCustomer && !isActive && (
        <button
          onClick={openPortal}
          disabled={busy != null}
          className="text-xs font-semibold text-primary transition hover:underline disabled:opacity-60"
        >
          {busy === 'portal' ? 'Opening…' : 'Manage existing billing'}
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Billing is handled securely by Stripe. A failed payment is flagged to the academy for review; your access is never cut automatically.
      </p>
    </div>
  );
}
