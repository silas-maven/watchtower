# 2026-07-24 feedback - implementation plan

Decisions locked with Kyser: build P0 + start P1 brief work; Daily Checks holdings =
live with a virtual toggle; the ~1,000-asset universe is verified (see below).

## Universe verification (done)

- The end users' "1,000 securities" = the SPArtans Watchlist Google Sheet (linked from the
  blotter as `tinyurl.com/watchlist-spa`).
- Captured to `reference/spartans-watchlist.csv` - **1,067 tickers**, machine-verified against
  the sheet (exact match).
- **203 have no name (`#N/A`)** in the source - delisted/renamed; resolve-or-skip on import.
- The live app currently has 14 active member-facing assets, so the import is a real build.

## Slice 1 - the two bugs (P0, independent of the universe)

1. **Holdings show £0** (`lib/server/memberBrief.ts`). Root cause: it sums the stored
   `holding.investedGBP` / `currentValueGBP` columns, which are null; the portfolio pages value
   holdings live (shares x price x fx) instead. Fix: value holdings live in the brief (reuse the
   live/virtual portfolio valuation), and on Daily Checks default to **live** holdings with a
   **virtual toggle**.
2. **Daily-brief stats contradict the narrative** (image 008: prose 5/6/3 vs cards 1/9). The page
   renders the persisted brief narrative next to `getDailySignalSummary()` recomputed live, so
   they diverge as prices move. Fix: persist the breadth stats on `DailyBrief` (additive `stats`
   Json column) and render the stat cards from the persisted stats, so narrative and cards always
   agree.

## Slice 2 - Average Planner unified rebuild (P0)

Match the ideal (image 006); remove the separate Execution-plan table + dual "If all / Actual"
cards (image 002). One visual: Total amount to allocate + Split evenly; tranche rows (entry price
/ allocation); **Trade 2 prefills 50% below Trade 1, Trade 3 50% below Trade 2** (editable;
recalculate downstream defaults on an upstream change unless that field was manually overridden);
single summary card (Average Entry / Current Price with % vs current / Total Invested); Sell
Target; Potential Gain / Potential Value at target. Apply to the standalone planner
(`average-calculator/page.tsx`) and the inline holdings plan (`InlineAveragePlan.tsx`). Verify the
share maths (the mockup's 86-share figure is internally inconsistent - trust our computation).

## Slice 3 - Personal Finance top-level tab (P0)

Add Personal Finance to the member top nav (`components/TopNav.tsx`), pointing at the existing
route; keep mobile nav usable (it already scrolls). Remove/keep the Portfolio card as a secondary
entry.

## Slice 4 - Universe import (P0 audit -> build; the large slice)

Import `reference/spartans-watchlist.csv` (1,067). Handle: symbol resolution (UK `.L`, EU, ADRs)
via the existing `lib/market/symbols.ts` + per-asset `quoteSymbol`; crypto via CoinGecko; type
ETFs/REITs; skip/flag the 203 `#N/A` and any Yahoo-unresolvable. Scale the refresh job
(`lib/jobs/refreshMarket.ts`): chunk the quote batches and stagger so a 1,067-asset run finishes
within the GitHub Actions window; the fundamentals pass is already throttled. Document coverage
differences (dividends/earnings/fundamentals/calendars apply to equities/ETFs, not crypto).

## Slice 5 - P1 daily-brief expansion + generation/email

- Brief additions where data supports: new buy/sell vs yesterday (from `SignalEvent` history),
  earnings this week (`Asset.nextEarningsDate`), intraday range > 40% ((high-low)/prevClose),
  all-time lows (needs full history + a definition), dividend/rights ex-dates (needs a provider).
  Build the reliable ones; flag the gaps rather than fabricate.
- One site-wide brief generated + cached daily (already persisted); per-user personalised
  watchlist brief; opt-in daily email (Resend).

## Deferred (P2 / product decisions)

Freemium boundaries + subscriber entitlement model; live investing tweets/news feed (assess the
POWR widget vs the existing RSS + X embed - a curated feed is safer for beta).

## Open questions to resolve before Slice 5

Timezone/session cutoff for "yesterday" and daily generation; all-time-low definition (intraday /
closing / adjusted / provider-history); which watchlist for a user's email when they own several;
corporate-action (dividend/rights) data source; freemium split.

## Suggested order

Slice 1 (bugs) -> Slice 2 (planner) -> Slice 3 (PF tab) in one pass (all independent of the
universe), while Slice 4 (import) runs as the larger parallel piece, then Slice 5 once the open
questions are answered.
