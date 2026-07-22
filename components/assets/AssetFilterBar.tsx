'use client';

import { Search } from 'lucide-react';
import type { AssetFilters, SignalFilter } from '@/lib/assetClass';

const SIGNAL_OPTIONS: Array<{ value: SignalFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
  { value: 'BOTH_ONLY', label: 'Both' },
  { value: 'ANY_ALERT', label: 'Any alert' },
];

const CAP_BANDS = ['ALL', 'Small', 'Mid', 'Large', 'Mega'] as const;

export function AssetFilterBar({
  filters,
  onChange,
  currencies,
  showSearch = true,
}: {
  filters: AssetFilters;
  onChange: (next: AssetFilters) => void;
  currencies: string[];
  showSearch?: boolean;
}) {
  const selectClass =
    'rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
        {SIGNAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, signal: opt.value })}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              filters.signal === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select value={filters.currency} onChange={(e) => onChange({ ...filters, currency: e.target.value })} className={selectClass} aria-label="Currency filter">
        <option value="ALL">All currencies</option>
        {currencies.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={filters.capBand}
        onChange={(e) => onChange({ ...filters, capBand: e.target.value as AssetFilters['capBand'] })}
        className={selectClass}
        aria-label="Market cap filter"
      >
        {CAP_BANDS.map((b) => (
          <option key={b} value={b}>{b === 'ALL' ? 'All caps' : `${b} cap`}</option>
        ))}
      </select>

      {showSearch && (
        <div className="flex min-w-40 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Symbol or name"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
