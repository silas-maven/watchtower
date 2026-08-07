'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { ACADEMY_OFFERS } from '@/lib/academyOffers';

const ECOURSE = ACADEMY_OFFERS.find((o) => o.id === 'ecourse')!;

type Props = {
  hasCustomer: boolean;
  membershipStatus: string | null;
  currentPeriodEnd: string | null;
  membershipPriceLabel: string;
};

export function BillingPanel({ hasCustomer, membershipStatus, currentPeriodEnd, membershipPriceLabel }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const { pushToast } = useToast();

  async function startCheckout(product: 'membership') {
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
              {/* Active and paying: the portal is the place to change a card or
                  cancel.

                  Active WITHOUT a billing account is a real and permanent case,
                  not an edge one: the academy grants access directly for comped
                  members and for anyone migrated in from the existing community,
                  so there is no customer record to open a portal for. This used
                  to show "Manage billing" to them regardless, which called the
                  portal, failed to find a customer and returned a 404 telling
                  them to "start a membership first" while their membership was
                  plainly active. */}
              {hasCustomer ? (
                <button
                  onClick={openPortal}
                  disabled={busy != null}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
                >
                  {busy === 'portal' ? 'Opening…' : 'Manage billing'}
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your membership was set up by the academy, so there is nothing to manage here. To change or end it,
                  contact the academy.
                </p>
              )}
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

        {/* The eCourse is sold on Whop, not here. It used to have its own Stripe
            price in this panel; two ways to buy one product is how somebody ends
            up paying twice. This links out instead. */}
        <div className="rounded-2xl border border-border bg-muted/20 p-5">
          <div className="text-sm font-semibold text-foreground">{ECOURSE.title}</div>
          <p className="mt-2 text-xs text-muted-foreground">{ECOURSE.blurb}</p>
          <a
            href={ECOURSE.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            {ECOURSE.cta}
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <div className="mt-1 text-center text-[11px] text-muted-foreground">Opens {ECOURSE.destination}</div>
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
