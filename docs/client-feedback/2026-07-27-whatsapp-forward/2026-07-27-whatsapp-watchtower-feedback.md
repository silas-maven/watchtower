# Watchtower Client Feedback — 2026-07-27 WhatsApp Forward

Source: forwarded WhatsApp feedback and seven screenshots from Stock Pickers Academy / Watchtower review.
Project: Watchtower / Stock Pickers Academy
Image evidence: `images/` and `image-manifest.md`
Audio status: no voice note/audio was received in this batch.

## Executive summary

- Client asks whether the green/gold bar-chart logo shown in the screenshots can be used as the product logo; source/ownership approval is not yet evidenced.
- Make the Master Watchlist’s total asset count explicit and confirm the authoritative current count rather than relying on the screenshot’s visible `869`.
- Make “request a new asset” discoverable from the Master Watchlist, while preserving an administrator-only approval queue.
- Ensure sell alerts appear wherever the alert/filter experience promises them, including a clear sell state in the Master Watchlist and Daily Checks.
- Improve the Daily Checks AI brief presentation: it currently exposes raw, dense operational text and a model/date footer; replace it with scannable, user-facing sections.
- Rename the existing Portfolio Stress Test output to **Portfolio Health Check** and use the supplied full report as the visual/content reference.
- The supplied stress-test prompt describes a P2, institutional-grade path-dependent simulation engine. It is not just a copy or UI amendment and must not be represented as already implemented.

## Amendments / additions

### 1. Product logo

Priority: P1 — brand decision
Evidence: `images/01-watchlists-logo-and-request-location.jpg`

- Client asks: “Can we use this logo?”
- The referenced mark is the green/gold upward bar-chart icon beside “Stock Pickers Academy.”
- Reuse only after confirming it is an approved, owned/licensed asset and locating the source file. Do not lift a mark from an external screenshot without approval.

### 2. Master Watchlist count, request flow, and approvals

Priority: P0 — discoverability / existing workflow verification
Evidence: `images/01-watchlists-logo-and-request-location.jpg`, `images/02-master-watchlist-filters.jpg`

- Show the total current asset count prominently on the Master Watchlist. Screenshot evidence shows `869`, but the product must derive this live from the master universe rather than hard-code it.
- Add a clear “Request an asset” / “Request new” action near the Master Watchlist controls, rather than burying the route elsewhere.
- Members should be able to submit an addition request with enough context to identify the instrument.
- Administrators need a visible private area to review, approve, reject, and action requests. Confirm the existing admin Stock Requests surface satisfies this end-to-end flow and is discoverable to the account owner.
- Approval must be role-gated; no public/member approval controls.

Acceptance checks:
- Master count matches the actual active asset universe.
- A member can submit a request from the Master Watchlist.
- An admin can see the request, record an approval/rejection decision, and the approved instrument becomes available through the intended import/review path.

### 3. Sell alerts

Priority: P0 — signal visibility / correctness
Evidence: `images/02-master-watchlist-filters.jpg`, `images/04-daily-checks-ai-brief-formatting.jpg`

- Client asks how sell alerts are made to appear.
- The Master Watchlist already presents a Sell filter in the supplied image; validate that it returns actual active sell signals when data contains them.
- Make active sell alerts visually distinct from Buy and None states in watchlists, asset rows, and Daily Checks.
- Daily Checks must report newly triggered sell alerts separately from existing active sell alerts.
- If no sell rules/signals exist for an asset, show an explicit neutral/no-signal state rather than silently omitting it.

### 4. Daily Checks brief — formatting and UX

Priority: P0 — visible output quality
Evidence: `images/04-daily-checks-ai-brief-formatting.jpg`

Current problem:
- The brief is a dense raw text block with an imprecise float (`-0.3603062762773302%`), stale-looking dated items, and an exposed model/date footer (`Model: openai-gpt-3-nano 2026-06-07`).

Required presentation:
- Replace the raw narrative block with structured, scannable sections/cards:
  - New alerts today: buys and sells, with counts and linked assets.
  - Market breadth: advancers, decliners, flat, and rounded average change.
  - Extreme moves: assets and rounded range percentages.
  - Earnings / events this week: exchange-aware, current dates only.
  - Top gainers and losers: limited, readable list.
- Use human-friendly dates, rounded percentages, and empty states where no event applies.
- Do not expose model identifiers, internal prompt text, raw provider payloads, or stale data metadata in the member-facing UI.
- Preserve a separate internal/admin freshness/status view if diagnostics are needed.

### 5. Portfolio Stress Test → Portfolio Health Check

Priority: P1 — rename, output UX, then simulation scope
Evidence: `images/05-stress-test-weather-table.jpg`, `images/06-stress-test-entry-page.jpg`, `images/07-portfolio-health-check-reference.jpg`

#### Naming and visible journey

- Rename the feature/output from **Portfolio Stress Test** to **Portfolio Health Check**.
- The portfolio entry-page CTA and result-page title must use the new name consistently.
- Keep the educational, non-advisory framing and visible disclaimer.

#### Reference output

The full supplied reference report is the desired output direction:

- Overall health score with a plain-English one-sentence assessment.
- Market Weather Forecast showing outcomes for different regimes.
- Key metrics, portfolio-health breakdown, allocation snapshot, strengths, vulnerabilities, and educational insight.
- Clear visual hierarchy, rounded estimates, and no false precision.
- Results must distinguish likely, plausible stress, and extreme permanent-loss cases.

#### Required simulation brief — P2 / major system

The client supplied a detailed specification for an institutional-style, path-dependent Spartan value-averaging simulator. Capture the following as required scope, not as a claim of current behaviour:

- Track invested capital and available cash over time; do not model a static buy-and-hold portfolio.
- Simulate initial buys, averaging tranches, weighted-average entry recalculation, sell/recovery/profit targets, realised P/L, cash release, and repeated capital-recycling cycles.
- Respect editable portfolio rules: cash reserve, position limits, tranche count/size, averaging levels, sell targets, contributions, costs, taxes, dividends/interest, currency effects, and priority when multiple opportunities compete for cash.
- Use regime-aware and correlated simulation paths with fat tails, volatility clustering, changing correlations, sequence-of-returns risk, inflation paths, currency shocks, liquidity crises, asset-specific failures, and the twenty listed market scenarios.
- Treat 20% annualised as a strategic target/distribution benchmark, never as a guaranteed or forced return.
- Compare the Spartan approach against static/fully invested buy-and-hold, cash without averaging, averaging without profit-taking, averaging plus capital recycling, and a suitable diversified benchmark.
- Produce the specified snapshot, outcome distribution, goal, drawdown, cash, strategy-contribution, scenario, strengths/vulnerabilities, and resilience-improvement outputs.
- Display nominal and inflation-adjusted results, stated assumptions, sensitivity, and financial-education disclaimers.

## Data / model implications

- A true version of the Portfolio Health Check requires historical pricing, asset metadata, sector/geography/currency exposure, dividends/interest, correlations, drawdown/recovery assumptions, and portfolio-rule inputs that may not yet exist in Watchtower.
- The simulation cannot honestly promise institutional-grade results from a prompt alone. It needs a documented quantitative model, deterministic rules, calibrated inputs, repeatable simulation code, result persistence, and validation/backtesting.
- Sell-alert visibility requires a traceable signal-rule source and historical signal snapshots if “new since yesterday” is shown.
- Asset requests require lifecycle state, requester/audit metadata, validation/deduplication, and approval permissions.

## Priority pass

### P0 / immediate amendments

- Surface the live Master Watchlist count.
- Put a clear asset-request action on the Master Watchlist and verify the admin approval flow.
- Verify active sell alerts appear in filters, rows, and Daily Checks; correct any missing signal visibility.
- Replace raw Daily Checks AI prose with the requested structured member-facing presentation.

### P1 / bounded feature and product work

- Confirm/approve the logo source and apply it if licensed/owned.
- Rename Portfolio Stress Test to Portfolio Health Check.
- Reshape the current health-check result into the supplied report structure, without overstating simulation fidelity.

### P2 / major simulation programme

- Build and validate the complete path-dependent Spartan portfolio simulation engine described in the supplied specification.
- Integrate reliable market, corporate-action, inflation, currency, and historical data where available.

## Open questions / unclear points

- Is the requested logo an existing Stock Pickers Academy-owned source asset, or a logo copied from a third-party visual reference?
- What is the exact authoritative Master Watchlist count today, and which asset states are included/excluded?
- Should ordinary members only request additions, or should they also be able to track request status and supply more details?
- What exact rule/data source creates a sell alert, and which asset classes support it?
- Is the desired Portfolio Health Check initially a polished interpretation of current heuristic output, or is the client authorising the much larger quantitative simulation programme?
- Which assumptions are editable in the first release of the health check versus advanced settings?
- What goal value, contribution schedule, taxes/costs, and user-specific Spartan rules are mandatory before producing a personalised result?

## Addendum — the core feature: Spartan Readiness Score

Correction: this is not merely a visual reference for the existing simulation. The client identifies the **Spartan Readiness Score** as the primary, distinctive product feature and the shareable top-level result.

Priority: P0 for product definition; P1 for the first usable implementation once the underlying score rules are agreed.

### Top-level experience

- Rename the user-facing outcome to **Portfolio Health Check**; the internal concept can remain a Spartan stress/simulation engine if useful.
- First screen: a large **Spartan Readiness Score / 100** (also described as Portfolio Health), readable in 20–30 seconds.
- Pair it with a direct, one-sentence assessment, e.g. “Built for storms, but slightly concentrated.”
- Follow it with one plain-English explanation of the score’s principal strength and weakness.
- This score must be designed to be shareable — e.g. “I got 91/100 on the Spartan Stress Test” — but never omit the educational/not-financial-advice disclaimer.

### Score components

Score and explain each component separately, then calculate the overall score. The requested components are:

- Cash readiness
- Diversification
- Average-entry quality
- Concentration risk
- Liquidity
- Recovery potential
- Inflation resilience/protection
- Capital recycling efficiency
- Opportunity readiness

Examples supplied by the client: Cash readiness 98, Diversification 71, Average-entry quality 82, Concentration risk 53, Liquidity 96, Recovery potential 91, Inflation resilience 74, Capital recycling efficiency 93, Opportunity readiness 95, Overall 87/100.

Each component requires a one-line human explanation, a documented calculation/rubric, a directionally sensible score, and an explicit data-quality/assumption state where inputs are unavailable. Do not fabricate precision or present heuristic scores as fully validated simulation output.

### Page information hierarchy

1. **Overall Portfolio Health** — large 0–100 score, one-line verdict, brief explanation.
2. **Executive summary** — around 100 words / no more than three short paragraphs.
3. **Market Weather Forecast** — plain-English regimes, not technical scenario jargon.
4. **Key metrics** — clear cards: goal probability, probability of reaching 20% CAGR target, likely drawdown, cash-exhaustion risk, inflation resilience, expected annual return, recovery speed.
5. **Portfolio Health Breakdown** — component scores and one-line reasons.
6. **Three strengths** — only the strongest three characteristics.
7. **Three vulnerabilities** — only the biggest three weaknesses.
8. **Educational insight** — a concise explanation of the Spartan philosophy.
9. **View Full Analysis** — collapsed by default; detailed analytics appear only on expansion.

The intended tone is Apple Health, not a hedge-fund terminal: reassuring, clear, practical, and non-predictive.

### Full-analysis content behind expansion

- Monte Carlo outcome distribution.
- Goal analysis.
- Nominal versus inflation-adjusted results.
- Cash-deployment simulation.
- Capital-recycling cycle estimates.
- Drawdown, recovery, and time-underwater analysis.
- Market-regime comparison.
- Spartan versus buy-and-hold comparison: drawdown, recovery speed, goal probability, capital efficiency, and risk-adjusted return.

### Performance and delivery requirement

Priority: P1 — core product architecture

The client expects the review to take time after it is started and then be delivered by email. Recommended design:

- Start the review as an asynchronous, durable job rather than holding the browser request open.
- Immediately show a “Review in progress” state with transparent stages (collecting inputs, simulating scenarios, preparing report) and an estimated/observed completion range only if measured.
- Persist the completed result and make it viewable on return; do not rerun the same simulation merely because the user refreshes.
- Email the completed report/link only to an opted-in, verified email address, with retry/failure tracking and unsubscribe controls.
- Use a deterministic versioned input snapshot and score/model version on every run so a result is reproducible and explainable.
- For speed, split the experience: calculate a fast, explicitly labelled readiness baseline from current portfolio data immediately where possible; run the heavier path-dependent simulation in the background; replace/enrich the report when it completes. Never present the fast baseline as the completed simulation.
- Cache reusable market/regime inputs and deduplicate identical active jobs, but never share personalised portfolio data or report URLs across users.

### Product philosophy to preserve

The feature is not a prediction engine. It assesses preparedness when future market paths differ from expectations. Its differentiator is modelling the Spartan investor’s likely behaviour — retaining/deploying cash, averaging into weakness, profit-taking, and recycling capital — rather than treating the portfolio as static buy-and-hold.

## Image references

See `image-manifest.md` for all seven copied screenshots and their associated feedback.
