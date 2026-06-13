import type { FxRates } from '@/lib/portfolio';

// Currencies we can display in, limited to the ones the FX layer provides
// (rates are quoted as GBP -> X). GBP is the base the app computes in.
export const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD'] as const;
export type DisplayCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: 'C$',
};

export function isSupportedCurrency(code: string | null | undefined): code is DisplayCurrency {
  return !!code && (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

export function normaliseDisplayCurrency(code: string | null | undefined): DisplayCurrency {
  return isSupportedCurrency(code) ? code : 'GBP';
}

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/** Convert a GBP amount into the chosen display currency using GBP-based rates. */
export function convertFromGbp(amountGBP: number | null | undefined, code: DisplayCurrency, fx: FxRates): number | null {
  if (amountGBP == null) return null;
  if (code === 'GBP') return amountGBP;
  if (code === 'USD') return amountGBP * fx.USD;
  if (code === 'EUR') return amountGBP * fx.EUR;
  if (code === 'CAD' && fx.CAD) return amountGBP * fx.CAD;
  return amountGBP;
}

/** Format a money amount with the currency symbol. Pass already-converted amounts. */
export function formatMoney(amount: number | null | undefined, code: string, opts?: { maximumFractionDigits?: number }): string {
  if (amount == null) return '—';
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 0;
  return `${currencySymbol(code)}${amount.toLocaleString(undefined, { maximumFractionDigits })}`;
}
