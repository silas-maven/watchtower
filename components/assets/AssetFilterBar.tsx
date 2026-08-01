'use client';

import { Search } from 'lucide-react';
import { CheckboxDropdown, type CheckboxOption } from '@/components/ui/CheckboxDropdown';
import { DEFAULT_ASSET_FILTERS, type AssetFilters, type CapBandFilter, type SignalFilter } from '@/lib/assetClass';

const SIGNAL_OPTIONS: Array<{ value: SignalFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
  { value: 'BOTH_ONLY', label: 'Both' },
  { value: 'ANY_ALERT', label: 'Any alert' },
];

export function AssetFilterBar({
  filters,
  onChange,
  currencies,
  capBandOptions,
  productOptions,
  matchCount,
  totalCount,
  showSearch = true,
}: {
  filters: AssetFilters;
  onChange: (next: AssetFilters) => void;
  currencies: string[];
  capBandOptions: CheckboxOption[];
  productOptions: CheckboxOption[];
  matchCount?: number;
  totalCount?: number;
  showSearch?: boolean;
}) {
  const narrowed =
    filters.signal !== 'ALL' ||
    filters.currency !== 'ALL' ||
    filters.capBands.length > 0 ||
    filters.products.length > 0 ||
    filters.query.trim() !== '';
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

      <CheckboxDropdown
        label="All caps"
        options={capBandOptions}
        selected={filters.capBands}
        onChange={(next) => onChange({ ...filters, capBands: next as CapBandFilter[] })}
      />

      <CheckboxDropdown
        label="All types"
        options={productOptions}
        selected={filters.products}
        onChange={(next) => onChange({ ...filters, products: next })}
      />

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

      {matchCount != null && totalCount != null && (
        <span className="text-xs text-muted-foreground">
          {narrowed ? `${matchCount.toLocaleString()} of ${totalCount.toLocaleString()}` : `${totalCount.toLocaleString()} assets`}
        </span>
      )}

      {narrowed && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_ASSET_FILTERS })}
          className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          Reset
        </button>
      )}
    </div>
  );
}
