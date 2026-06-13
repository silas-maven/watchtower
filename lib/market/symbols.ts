const EXCHANGE_PREFIX_SUFFIX: Record<string, string> = {
  LON: '.L',
  ASX: '.AX',
  TSE: '.TO',
  TSX: '.TO',
  CVE: '.V',
  FRA: '.F',
  ETR: '.DE',
  EPA: '.PA',
  AMS: '.AS',
  BIT: '.MI',
  NYSE: '',
  NASDAQ: '',
  NYSEAMERICAN: '',
  NYSEARCA: '',
  BATS: '',
};

const CURRENCY_SUFFIX: Record<string, string> = {
  GBX: '.L',
  GBP: '.L',
  AUD: '.AX',
  CAD: '.TO',
};

type SymbolSource = {
  symbol: string;
  quoteSymbol?: string | null;
  assetType?: string | null;
  currency?: string | null;
};

/**
 * Maps a stored asset symbol (often Google Finance style, e.g. LON:VLS) to the
 * symbol Yahoo Finance expects (VLS.L). An explicit asset.quoteSymbol always wins,
 * which is the admin escape hatch for ambiguous listings.
 */
export function toQuoteSymbol(asset: SymbolSource): string {
  const explicit = asset.quoteSymbol?.trim();
  if (explicit) return explicit.toUpperCase();

  const raw = asset.symbol.trim().toUpperCase();

  if (asset.assetType === 'CRYPTO') {
    return raw.includes('-') ? raw : `${raw}-USD`;
  }

  const colonIndex = raw.indexOf(':');
  if (colonIndex > 0) {
    const prefix = raw.slice(0, colonIndex);
    const ticker = raw.slice(colonIndex + 1);
    const suffix = EXCHANGE_PREFIX_SUFFIX[prefix];
    if (suffix != null) return `${ticker}${suffix}`;
    return ticker;
  }

  if (!raw.includes('.')) {
    const ccy = (asset.currency ?? '').trim().toUpperCase();
    const suffix = CURRENCY_SUFFIX[ccy];
    if (suffix) return `${raw}${suffix}`;
  }

  return raw;
}
