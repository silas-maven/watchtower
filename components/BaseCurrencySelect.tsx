'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/money';

export function BaseCurrencySelect({ initial }: { initial: string }) {
  const [currency, setCurrency] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();

  async function change(next: string) {
    const previous = currency;
    setCurrency(next);
    setBusy(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ baseCurrency: next }),
      });
      const json = await res.json();
      if (!json.ok) {
        setCurrency(previous);
        pushToast(json.error?.message ?? 'Could not update currency', 'error');
        return;
      }
      pushToast(`Base currency set to ${next}.`, 'success');
    } catch {
      setCurrency(previous);
      pushToast('Could not update currency', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-foreground">Base currency</div>
        <div className="mt-1 text-xs text-muted-foreground">Portfolio values across the app are shown in this currency.</div>
      </div>
      <select
        value={currency}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
        ))}
      </select>
    </div>
  );
}
