# Watchtower Feedback Capture — Portfolio Tools / Live Portfolio / Average Planner

Captured: 2026-06-16
Project: Watchtower
Directory: `/Users/hn52/Desktop/jarvis/projects/watchtower/feedback/2026-06-16-watchtower-feedback-capture`

## Transcription note

Two OGG voice notes were transcribed through OpenAI `whisper-1` and saved in `transcripts/`:
- `004-voice-or-media-asset-clickable-whisper1.txt`
- `010-voice-or-media-averaging-plan-clickthrough-whisper1.txt`
- Consolidated readable copy: `transcripts/WHISPER-1-TRANSCRIPTIONS.md`

## Executive summary

This feedback defines the product direction for Watchtower’s portfolio tools: move the current Google Sheets / personal blotter workflow into a web app where users can log in, maintain their own live and virtual portfolios, view holdings and allocation, connect holdings to averaging plans, and see Spartan Strategy-specific buy/sell guidance.

The immediate phase is not full automation. Phase 1 is to make the personal blotter/watchlist usable in the app: holdings, portfolio value, allocation, current prices, average plans, next buy prices, sell targets, and manual access management. Later phases add alerts and eventually generated averaging plans based on budget/user preferences.

## Core product intent

Watchtower should not become just a generic Trading 212-style portfolio view. The goal is to capture the Spartan/SPH strategy: what the user holds, how much cash they have, where the next buy price is, where the sell target is, how the averaging plan works, and how the overall portfolio is positioned.

The web app should replace spreadsheet dependence while preserving the logic and decision-making framework users currently rely on.

## Phase breakdown

### Phase 1 — Move away from Google Sheets

Build a personal web app version of the blotter/watchlist workflow.

Required:
- Users log in to access their own portfolio/watchlist.
- Collect user phone number, name, email, etc. for access management/revocation.
- Show Live Portfolio and Virtual Portfolio views.
- Show holdings, portfolio summary, allocation, P/L, cash, portfolio start value, portfolio beta.
- Let users add holdings manually.
- Let holdings connect to averaging plans.
- Let asset rows link to Asset Library pages.
- Let averaging plan rows link to the saved averaging plan.
- Show next buy price and sell target from the averaging plan where available.
- Support Spartan Strategy checkbox/toggle behaviour.

### Phase 2 — Alerts

Switch on alerts when strategy thresholds are hit.

Required later:
- Alert user when next buy price is hit.
- Alert user when sell price / sell target is hit.
- Alerts should work from the same fields fed by averaging plans and Spartan Strategy state.

### Phase 3 — Generated averaging plans

Reduce manual questions by generating average plans based on user inputs and budget.

Required later:
- Generate plans for budgets such as £3k, £4k, £5k, £10k, etc.
- Add user preference/onboarding page asking things like how busy the user is / how active they can be.
- Use behind-the-scenes logic to produce a suitable averaging plan instead of requiring the user to ask manually.
- Keep expert override/tweaking available.

## Live Portfolio requirements

### Summary cards

Live Portfolio should show:
- Invested amount.
- Current value.
- Profit/loss amount.
- Overall portfolio % return in brackets.
- Portfolio Starting Value (Cash) — rename from Declared Size / Declared £ / Portfolio Size.
- Portfolio Beta.
- Cash.

Naming decision:
- Use **Portfolio Starting Value (Cash)** instead of “Declared £”, “Declared Size”, or “Portfolio Size”.

### Portfolio beta

Portfolio beta must be visible.

Formula from feedback:
- For each stock: portfolio weighting % × stock beta.
- Add them all up to get overall portfolio beta.

Notes:
- Cash should probably have beta 0 unless product logic says otherwise.
- Add info tooltip explaining the calculation.

### Portfolio allocation

Add a pie/donut chart showing what the user holds.

Should include:
- Each held stock as a segment.
- Cash as a segment.
- Portfolio total in the center.
- Legend with ticker and percentage.
- Cash vs invested summary.

### Holdings list/table

If user has many holdings, e.g. 10 stocks, the user can scroll to see more.

Holdings table should include:
- Asset.
- Shares.
- Average price.
- Current price.
- Value.
- P/L amount.
- P/L percentage.
- Weight %.
- Next Buy Price.
- Sell Target.
- Averaging Plan.
- Spartan Strategy.
- Status.

Weight formula from feedback:
- Stock Value / Portfolio Value × 100.

### Asset row clickthrough

Asset ticker/name cells should be clickable.

Behaviour:
- Clicking NKE/DIS/etc. goes to the corresponding Asset Library page.
- Asset rows should feel like links or have clear hover/tap affordance.

### Detailed report

Live Portfolio should include a “View Detailed Report” action.

Expected behaviour:
- Opens/generates a detailed one-pager for each stock.
- Should include stock-specific information relevant to the portfolio and strategy.
- Existing mock shows AI-generated news summary; the detailed report likely expands that into per-stock analysis.

## Virtual Portfolio requirements

The Live Portfolio functionality should also exist in the Virtual Portfolio.

Requirements:
- Users should be able to use the virtual portfolio more easily.
- Virtual holdings should support the same strategy concepts: holdings, allocation, averaging plans, next buy prices, sell targets, and reports where relevant.

## Average Planner requirements

### Stock input

Add a stock selector/input at the top of the Average Planner.

Requirements:
- Search by stock name or ticker/code.
- Selected stock displays ticker and company name, e.g. NKE - Nike, Inc.
- Stock must be on watchlist.
- If selected stock is not on watchlist, show **Add to Watchlist** button.
- Clicking Add to Watchlist adds it to the main watchlist.
- Once stock is selected, display current stock price.
- Currency should default to the stock’s currency.

### Target price to sell

Add a **Target Price to Sell** input in the top-right of the planner.

Requirements:
- Currency-formatted numeric input.
- Used as Sell Target / exit target.
- Should feed to holdings table where relevant.

### Tranches

Change tranche inputs so users enter prices, not drop percentages.

Requirements:
- Trade 1 / initial entry price.
- Trade 2, Trade 3, etc. as price inputs.
- Option to add a new tranche.
- Option to remove the third tranche / remove extra tranches.
- Implied drop percentage is calculated and displayed from tranche prices.

Example from feedback:
- Trade 1: 10
- Trade 2: 4
- Display implied drop: 60% drop.

Open calculation question:
- Current mock says “based on price vs prior trade”, but example values in screenshots imply drop from Trade 1/base price, not previous trade.
- Recommendation: calculate implied drop from Trade 1/base entry unless Kyser says otherwise. It matches the explicit example and the screenshots.

### Execution status

Add checkbox per trade/tranche to indicate whether it has executed.

Requirements:
- Trade 1, Trade 2, Trade 3 etc. each have executed checkbox.
- Executed trades are what update portfolio holdings.
- Non-executed trades remain planned/projected.
- Holdings should reflect only executed trades unless manually added.

### Final position

Average Planner should show:
- If-all-executed final average price.
- Total shares if all executed.
- Actual current holding based on executed trades.
- Any projected/summary metric must be explicitly labelled; current mock has an unclear large value.

## Manual holdings requirements

Users must still be able to add a portfolio holding manually with no average plan.

Requirements:
- Add Holding Manually action.
- Manual/no-plan holdings are allowed.
- These holdings should be flagged with amber warning state: **Create Average Plan**.
- Clicking **Create Average Plan** takes user to the averaging plan section/flow for that holding.
- If a holding has no averaging plan, Averaging Plan column can be blank/dash or show a clear create-plan CTA depending on the screen context.

## Averaging Plan column requirements

Add a column labelled **Averaging Plan**.

Behaviour:
- If holding has a saved averaging plan: show clickable **View** button.
- Clicking View opens the averaging plan and shows previously inputted values.
- If no plan exists: show blank/dash, or amber “Create Average Plan” where the product wants to prompt completion.

## Spartan Strategy requirements

### Checkbox/toggle

Add a **Spartan Strategy** checkbox/toggle per holding.

Default:
- Should be ticked by default.

When ticked:
- Fields populate from the averaging plan.
- Next Buy Price feeds from the averaging plan.
- Sell Target feeds from the averaging plan.
- Holding is linked to Spartan strategy calculations.

When unticked:
- User can manually write values.
- Fields do not need to link to an averaging plan.
- Unticking should not necessarily delete the plan; it just allows manual override / decoupling.

### Fields affected

Spartan Strategy should control or feed:
- Next Buy Price.
- Sell Target.
- Averaging Plan linkage.
- Signal state where relevant.

### UX explanation

Need helper text/tooltip explaining:
- What Spartan Strategy means.
- What happens when it is enabled.
- What happens when it is disabled.
- Whether it overwrites manual fields.

Existing good copy from mock:
- “When enabled, next buy price and sell target are calculated from your averaging plan.”
- “If disabled, these fields will be empty unless manually set.”

## Portfolio table column changes

Add/ensure these columns:
- Weight %.
- Next Buy Price.
- Sell Target.
- Averaging Plan.
- Spartan Strategy.

Remove/avoid ambiguity:
- Rename AVG to Avg Price or Avg Cost where space allows.
- Rename PRICE to Current Price where space allows.

## Currency and pricing requirements

Requirements:
- Asset-level prices use asset currency, e.g. USD.
- Portfolio-level values use portfolio/base currency, e.g. GBP.
- Currency should default from selected stock in Average Planner.
- If converting USD holdings into GBP portfolio value, calculations must reconcile and ideally expose FX logic.
- Price data should show delay disclaimer and last updated timestamp.
- Refresh action should update current prices and dependent metrics.

## Access/account requirements

Login/account flow should capture enough details to manage access.

Fields mentioned:
- Phone number.
- Name.
- Email address.
- “and so on and so forth” — likely role/subscription/access metadata.

Purpose:
- Make it easy to revoke access.
- Tie user portfolio/watchlist data to known account details.

## Mobile/responsive notes

Observed mobile issues/opportunities:
- Navigation can be clipped horizontally on mobile.
- Empty-state Live Portfolio shows zeros but does not guide next action.
- Portfolio cards are readable but vertically heavy.
- Need sufficient bottom safe-area padding for Safari/iOS.

Recommendations:
- Use mobile-specific nav pattern or clear horizontal scroll affordance.
- Add guided empty state: add first holding, set Portfolio Starting Value (Cash), import/enter positions.
- Consider denser metric grid on mobile.
- Ensure holdings table has responsive card/scroll layout.

## Prioritised implementation list

### P0 — Strategy-critical data model and fields

1. Rename portfolio starting cash/value concept to **Portfolio Starting Value (Cash)**.
2. Add holdings table columns: Weight %, Next Buy Price, Sell Target, Averaging Plan, Spartan Strategy.
3. Implement Weight % formula: Stock Value / Portfolio Value × 100.
4. Implement Portfolio Beta formula: sum(weight × stock beta).
5. Add Spartan Strategy default-ticked checkbox/toggle logic.
6. Feed Next Buy Price and Sell Target from averaging plan when Spartan Strategy is enabled.
7. Allow manual override/no plan when Spartan Strategy is disabled.

### P1 — Average Planner workflow

1. Add stock selector with watchlist requirement.
2. Add Add to Watchlist button when selected stock is not on watchlist.
3. Display current stock price after selection.
4. Default currency from stock currency.
5. Add Target Price to Sell field.
6. Change tranche inputs from drop % to price inputs.
7. Calculate implied drop % from entered prices.
8. Add/remove tranche support.
9. Add executed checkbox per trade.
10. Executed trades update holdings.

### P2 — Navigation and clickthroughs

1. Make asset cells clickable to Asset Library pages.
2. Add Averaging Plan View button linking to existing plan.
3. Show previous inputs when viewing an existing plan.
4. Add Create Average Plan action for no-plan holdings.
5. Ensure manual holdings without plans are flagged amber.

### P3 — Portfolio insight layer

1. Add portfolio allocation donut/pie chart.
2. Add portfolio summary metrics.
3. Add AI/news summary for holdings.
4. Add View Detailed Report one-pager per stock.
5. Make same functionality available in Virtual Portfolio.

### P4 — Later automation

1. Alerts for next buy price hit.
2. Alerts for sell target hit.
3. Generated averaging plans based on budget and user preferences.
4. User preference/onboarding page for busyness/activity level.

## Open questions / decisions needed

1. Implied tranche drop % basis:
   - Should it be calculated against Trade 1/base price, or against the previous tranche?
   - Evidence points to Trade 1/base price.

2. Spartan Strategy default state for existing holdings:
   - New holdings should default ticked.
   - For migrated existing holdings, should we infer checked only when a plan exists?

3. No-plan display:
   - Should no-plan Averaging Plan column be blank/dash, or show amber “Create Average Plan” everywhere?
   - Feedback says blank in one place, amber prompt in another. Recommendation: table column can show dash, status column can show amber Create Average Plan CTA.

4. Portfolio Value definition:
   - Is Portfolio Value current invested value only, or invested + cash?
   - Weight formula says Stock Value / Portfolio Value × 100. Need consistent denominator.

5. Portfolio Starting Value (Cash):
   - Is this total starting capital, available cash, or both initial declared capital and cash derived from it?
   - Current feedback naming implies it represents starting portfolio cash/capital.

6. Detailed report contents:
   - Should detailed one-pager be AI/news only, or include strategy metrics, earnings, beta, next buy/sell, allocation impact, and risk summary?

## Recommended product interpretation

Build the Live Portfolio around three linked objects:

1. Holding
   - what the user owns now.

2. Averaging Plan
   - the strategy plan attached to the holding.

3. Spartan Strategy state
   - whether the holding’s next buy/sell fields are automatically driven by the averaging plan or manually controlled.

This keeps the product simple: holdings are the current book, averaging plans are the strategy layer, and Spartan Strategy is the switch deciding whether the strategy layer drives the visible targets.
