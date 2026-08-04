// What of the academy daily brief a free profile may read.
//
// THE BUG THIS FIXES. The brief card on /app/daily-checks rendered
// `brief.summary` and `brief.insights` with no entitlement check at all, directly
// below a panel that showed free profiles four LOCKED headings for exactly that
// information. The live 3 August brief read "77 buy-side and 20 sell-side active
// signals" and listed seventeen sell tickers by name. The signals are the paid
// product, and the busiest page was giving them away in prose while charging for
// them in the panel above.
//
// WHY AN ALLOWLIST AND NOT A FILTER. The summary is written by a language model.
// Any attempt to strip signal talk out of generated prose is a losing game: the
// model can phrase the same fact a hundred ways, and a filter that misses once
// leaks the thing we are paid for. So a free profile never sees model prose at
// all. It gets a summary composed here, from breadth numbers, and only those
// insights that positively match a known safe shape.
//
// Default is DENY. An insight that does not match a safe pattern is withheld,
// which means a new insight type added later is private until somebody decides
// otherwise. That is the correct direction for the failure to point.
//
// Dependency free so it can be unit tested and imported anywhere.

export type BriefAudience = 'free' | 'paid';

/**
 * Insight shapes that carry no academy signal.
 *
 * Market breadth, biggest movers and the earnings calendar are public facts
 * about the market. The owner confirmed the earnings section is fine for
 * freemium, and breadth is the same class of thing: it describes what the market
 * did, not what the academy thinks anyone should do about it.
 */
const FREE_SAFE_PATTERNS: RegExp[] = [
  /^Market breadth:/i,
  /^Top gainers:/i,
  /^Top losers:/i,
  /^Reporting earnings/i,
  /^Extreme daily ranges/i,
];

/**
 * Words that mean an insight is describing the paid product, checked even when a
 * line matched a safe pattern above. Belt and braces: if a future edit prefixes a
 * signal sentence with "Market breadth:", the line is still withheld.
 */
const SIGNAL_WORDS = /\b(signal|signals|buy|sell|alert|alerts|entry|exit|target|targets)\b/i;

export function isFreeSafeInsight(line: string): boolean {
  const text = line.trim();
  if (!FREE_SAFE_PATTERNS.some((p) => p.test(text))) return false;
  return !SIGNAL_WORDS.test(text);
}

/** The insights a free profile may read. Everything else is withheld. */
export function insightsFor(audience: BriefAudience, insights: string[]): string[] {
  if (audience === 'paid') return insights;
  return insights.filter(isFreeSafeInsight);
}

export type BreadthStats = {
  totalAssets: number;
  advancers: number;
  decliners: number;
  flat: number;
  avgChangePct: number;
};

/**
 * The summary line a free profile sees.
 *
 * Composed here from breadth numbers rather than taken from the brief, because
 * the brief's own summary is model-written and leads with signal counts. Note it
 * deliberately does NOT mention how many signals are active: the count alone is
 * part of what the membership buys, and "97 active signals" tells a non-member
 * how much they are missing in a way that is itself the product.
 */
export function freeSummary(stats: BreadthStats | null): string {
  if (!stats) {
    return 'The academy brief covers the day across the full watchlist. The signal sections come with the paid membership.';
  }
  const direction =
    stats.advancers > stats.decliners
      ? 'more risers than fallers'
      : stats.decliners > stats.advancers
        ? 'more fallers than risers'
        : 'an even split between risers and fallers';
  return (
    `Across ${stats.totalAssets.toLocaleString()} tracked assets the market showed ${direction} today ` +
    `(${stats.advancers.toLocaleString()} up, ${stats.decliners.toLocaleString()} down, ${stats.flat.toLocaleString()} flat, ` +
    `average move ${stats.avgChangePct.toFixed(2)}%). ` +
    `The academy's buy and sell calls on these assets are part of the paid membership.`
  );
}

/**
 * Which stat cards a free profile may see.
 *
 * Breadth is fine. `activeSignals` is not, and it was already absent from the
 * rendered grid, but it is stripped here too so the number cannot reach the
 * browser at all rather than merely going unrendered.
 */
export function statsFor<T extends { activeSignals: number }>(
  audience: BriefAudience,
  stats: T | null,
): Omit<T, 'activeSignals'> | null {
  if (!stats) return null;
  if (audience === 'paid') return stats;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { activeSignals, ...rest } = stats;
  return rest;
}
