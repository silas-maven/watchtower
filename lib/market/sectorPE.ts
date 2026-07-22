import { fetchYahooQuotes } from '@/lib/market/yahoo';

// Sector P/E via the SPDR sector ETFs. Yahoo does not expose a sector P/E
// directly, but each stock reports its sector, and the SPDR sector ETFs each
// report a live trailing P/E for free. We use the sector ETF's P/E as the
// sector benchmark. Caveat: these are US sector ETFs, so a UK-listed name is
// benchmarked against the US sector aggregate, an approximation not a
// country-specific figure. The admin sectorPE field can override per asset.

const SECTOR_ETF: Record<string, string> = {
  Technology: 'XLK',
  'Financial Services': 'XLF',
  Healthcare: 'XLV',
  Energy: 'XLE',
  'Consumer Cyclical': 'XLY',
  'Consumer Defensive': 'XLP',
  Industrials: 'XLI',
  'Communication Services': 'XLC',
  Utilities: 'XLU',
  'Basic Materials': 'XLB',
  'Real Estate': 'XLRE',
};

export function sectorEtfFor(sector: string | null | undefined): string | null {
  if (!sector) return null;
  return SECTOR_ETF[sector] ?? null;
}

/** Map of Yahoo sector name -> current sector P/E (via the sector ETF). */
export async function fetchSectorPEs(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const symbols = [...new Set(Object.values(SECTOR_ETF))];
  try {
    const quotes = await fetchYahooQuotes(symbols);
    for (const [sector, etf] of Object.entries(SECTOR_ETF)) {
      const pe = quotes.get(etf)?.pe;
      if (pe != null && pe > 0) out.set(sector, pe);
    }
  } catch {
    // sector P/E is best-effort; return whatever resolved
  }
  return out;
}
