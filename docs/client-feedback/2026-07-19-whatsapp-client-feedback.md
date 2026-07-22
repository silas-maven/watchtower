# Watchtower Client Feedback — 2026-07-19

Source: forwarded WhatsApp messages from client.
Project: Watchtower / Stockpickers Academy.

## Executive summary

Client is asking for Watchtower to evolve from a stock/watchlist app into a broader Stockpickers Academy investing workspace with:

1. richer asset detail cards and indicator charts,
2. asset library and watchlist table upgrades,
3. global market ticker / macro dashboard,
4. Weather Outside market-regime module,
5. portfolio stress testing and personal finance AI tools,
6. Spartan alerts / tranche tracking,
7. AI-generated trade pitch support based on the 60–90 second pitch framework.

## A. Asset detail: key fields card

### Amendments

- Add Market Cap to the Key fields card.
- Rename `PE` to `P/E Ratio`.
- Add the following fields:
  - Sector P/E Ratio
  - 50d moving average
  - 200d moving average
  - Quick ratio
  - Current ratio
  - D/E ratio
  - Next earnings date
  - Dividend yield
  - Stochastic (8,5,5)

### Display rules

- Stochastic (8,5,5) colour coding:
  - Red if 80 or higher
  - Green if 20 or lower
  - White if between 20 and 80
- Add bracketed labels where useful, e.g. `(large)`.
- Use existing valuation/metric logic for labels where available.

### Notes

- Image context shows current dark card with: Entry broker, Avg entry, Shares, Target entry, Target exit, 52w low/high, Beta, PE.
- Client wants this expanded, not replaced.

## B. Asset detail: view selector and chart tabs

### Add segmented view selector at top of chart section

Views:

1. Price History
2. Indicator View
3. Price Alerts

### Indicator View

Default chart should include:

Main chart:
- Candlesticks
- Bollinger Bands (20,2)
- 50-day Moving Average
- 200-day Moving Average

Lower indicator panel:
- Stochastics (8,5,5)

### Timeframe controls

Indicator View must allow:
- Daily
- Weekly
- Monthly

Indicators recalculate automatically when timeframe changes.

### Indicator toggles

Add on/off controls for:
- Candlesticks
- Bollinger Bands (20,2)
- 50-day Moving Average
- 200-day Moving Average

### Indicator defaults

When entering Indicator View, default enabled indicators:
- Bollinger Bands (20,2)
- Stochastics (8,5,5)

## C. Asset detail: Price Alerts view

### Dedicated Price Alerts tab

Display:
- Current Buy Alert
- Current Sell Alert
- Active Position Information

### Buy alert

Show current buy alert price, e.g. `Buy Alert: $7.20`:
- in summary card
- as horizontal blue line on chart

### Sell alert

Show current sell alert price, e.g. `Sell Alert: $7.80`:
- in summary card
- as horizontal red line on chart

### Alert overlay

Draw chart lines:
- Blue = Buy Alert
- Red = Sell Alert

Both should be labelled directly on chart.

### Existing positions

If the user owns the stock, display whether it is:
- Live Position
- Virtual Position
- Both

If none:
- `No current position`

### Position data

Display:
- Average Price: weighted average purchase price
- Portfolio Type: Live Portfolio, Virtual Portfolio, or Both
- Unrealised Profit/Loss value
- Unrealised Profit/Loss percent

Example:
- `+£340 (+5.21%)`
- `-£220 (-3.40%)`

### Position summary card

Include:
- Position Status
- Portfolio Type
- Average Price
- Current P/L

### Optional / next enhancements mentioned

- Toggle to show/hide price-alert lines.
- Multi-tranche Spartan alerts:
  - Buy Alert 1
  - Buy Alert 2
  - Buy Alert 3
- Spartan Position Tracker:
  - Tranche 1 (£700)
  - Tranche 2 (£500)
  - Tranche 3 (£800)
  - completion status
- Signal status badge:
  - 🟢 BUY ZONE
  - 🟠 WATCHLIST
  - 🔴 SELL ZONE
- Last Alert Triggered card:
  - e.g. `Buy Alert triggered 3 days ago at $7.20`
  - e.g. `Sell Alert triggered 12 days ago at $7.80`
- AI Stock Summary based on indicators and alert levels.

## D. Asset Library and Watchlists

### Table columns

Main Watchlist and Asset Library should add two columns:

1. Asset Class
   - Equities
   - Commodities
   - Crypto
2. Product
   - stock
   - ETF
   - crypto
   - REIT

### Filters

Add filtering for:
- Buy alerts only
- Sell alerts only
- Both buy and sell alerts
- Currency
- Market cap

Client wording: “Add market cap and a filter that can just show buy, sell or both together alerts — can be a button. Also to filter by currency.”

### Master watchlist fast access

- Add Master Watchlist as a fast-access option.
- Context image shows Master Watchlist button circled.

### Asset Library naming / nav

- Rename relevant top navigation item/page to `Dashboard` where client indicated “Rename to - Dashboard”.
- Need confirm exact current label to rename.

## E. Header / navigation

### Top header update

Replace `SPA` text with either:
- Stockpickers Academy logo, or
- Full text: `Stockpickers Academy`

### Live market ticker strip

Add ticker strip in highlighted top area.

Requirements:
- Always visible across the website.
- On mobile, horizontally scroll.
- On desktop, either horizontally scroll like a market tape or fixed.
- Each ticker item clickable.
- Click opens asset inside Asset Centre.

Ticker assets:
- GBP/USD
- S&P 500
- Gold
- Bitcoin / BTC
- Silver
- BOE Base Rate
- UK 10-Year Gilt Yield
- iTraxx 5-Year
- VIX
- Dollar Index / DXY

Ticker item should show:
- Asset name
- Live price/rate/yield
- Daily move where available
- Green if up
- Red if down
- Neutral grey for static rates like BOE Base Rate

Each asset should support stock-like functionality where applicable:
- Price history
- Indicator view
- Bollinger Bands (20,2)
- 50-day moving average
- 200-day moving average
- Stochastics (8,5,5)
- Price alerts where applicable

## F. Dashboard: Weather Outside

### Purpose

Add a Weather Outside macro conditions panel.

Core principle:
> Before you pick a stock, understand the weather outside.

Panel appears at the top of Dashboard above Market Snapshot.

### Inputs

Weather score generated from:
- S&P 500
- NASDAQ
- Bitcoin
- VIX
- DXY / Dollar Index
- UK 10-Year Gilt Yield
- iTraxx 5-Year
- Gold
- Oil

### Weather states

#### Sunny

Colour: Green

Conditions:
- S&P 500 rising
- NASDAQ rising
- Bitcoin rising
- VIX falling or stable
- Credit markets healthy

Display:
- `Sunny`
- `Risk assets are broadly rising.`
- `Investors are embracing risk today.`
- `Market Mood: Risk On`

#### Mixed

Colour: Amber

Conditions:
- Some risk assets rising
- Some risk assets falling
- No clear market direction

Display:
- `Mixed`
- `Markets are sending conflicting signals.`
- `Proceed selectively.`
- `Market Mood: Neutral`

#### Stormy

Colour: Red

Conditions:
- S&P 500 falling
- NASDAQ falling
- Bitcoin falling
- VIX rising sharply
- Credit spreads widening

Display:
- `Stormy`
- `Risk assets are under pressure.`
- `Expect higher volatility.`
- `Market Mood: Risk Off`

#### Frosty

Colour: Blue

Conditions:
- Markets remain weak
- Bond yields falling
- Inflation cooling
- Early signs of improvement emerging

Display:
- `Frosty`
- `Conditions remain cold, but the thaw may be starting.`
- `Market Mood: Recovery Watch`

### Market Snapshot layout

Below Weather Outside, show Market Snapshot.

Row 1:
- GBP/USD
- S&P 500
- Gold
- Bitcoin
- Silver

Row 2:
- BOE Rate
- UK 10-Year Gilt
- iTraxx 5-Year
- VIX
- DXY

Row 3:
- EUR/USD
- NASDAQ
- Oil
- Natural Gas
- FTSE 100

Every item clickable and opens relevant asset in Asset Centre.

### Expansion behaviour

Client note:
> View full should show what’s circled in yellow so there’s only 2 lines showing at first then ‘view more’ expands and shows those on a new 3rd line.

Interpretation:
- Default Dashboard Market Snapshot shows first two rows only.
- `View more` / `View full market dashboard` expands to reveal row 3.
- Circled yellow items in screenshot are examples of row/tiles to reveal or emphasise.

Needs confirmation: whether row 3 should be hidden by default or all circled yellow assets specifically should be hidden until expanded.

## G. Portfolio Stress Test

### Feature

Add `Portfolio Stress Test` tool/button.

Button runs an AI prompt against:
- Live portfolio
- Virtual portfolio

Prompt provided by client and repeated in follow-up, confirming this is a core requested feature:

> You’re my institutional Chief Risk Officer. Here’s my portfolio. Stress-test it using a Monte Carlo simulation and explain the results in simple English. Tell me: (1) my probability of meeting my long-term goal, (2) my expected range of returns, (3) my likely maximum drawdown, (4) where I’m overexposed by stock, sector, country or currency, and (5) the three changes that would improve my risk-adjusted returns. Prioritise portfolio management over stock selection.

### Required outputs

- Probability of meeting long-term goal
- Expected range of returns
- Likely maximum drawdown
- Overexposure by:
  - stock
  - sector
  - country
  - currency
- Three changes to improve risk-adjusted returns
- Plain English explanation

### Implementation note

This should be portfolio-management-first, not stock-picking-first.

## H. Personal finance tab

### Feature

Add simple personal finance tab/tool.

Follow-up confirms this should be a separate simple tab in the app, not part of the Portfolio Stress Test. It uses user-entered personal finance inputs to run a CFO-style Monte Carlo scenario analysis.

User inputs:
- Age
- Salary / monthly income
- Monthly expenses
- Savings
- Investments
- Pension
- Debts and interest rates
- Home value optional
- Monthly investing
- Financial goal, e.g. retire at 60 or buy a house in five years

AI prompt provided by client:

> Act as my personal Chief Financial Officer. I’ll tell you my monthly income, monthly expenses, savings, investments, debts, interest rates, age, and financial goals. Use Monte Carlo-style scenario analysis to simulate thousands of possible financial futures based on reasonable assumptions about inflation, salary growth, investment returns, unexpected expenses, and economic downturns. Tell me: (1) my probability of reaching my financial goals, (2) how many months of emergency savings I have, (3) my biggest financial risks, (4) whether I’m saving enough, (5) how quickly I could become financially independent, and (6) the three biggest changes I should make to improve my long-term financial outlook. Explain everything in simple English and use practical recommendations rather than technical jargon.

### Example estimates

- Chance of running out of money: 2%
- Chance of retiring by age 60: 84%
- Chance of buying first home within five years: 71%
- Chance of becoming a millionaire by age 55: 62%

## I. Average / tranche planner form

### Client correction

Current helper says: `Split evenly across your tranches.`

Client says:
- This should be manual input, not forced even split.
- Keep ability to override tranche values.
- Add a `Split evenly` button.
- User should still be able to override the generated split if they later create a new average plan.

### Requirement

Change behaviour to:
- total budget is manual input,
- tranche values remain editable,
- `Split evenly` is a button/action,
- button pre-fills equal tranche amounts only when clicked,
- user can override each tranche after split.

## J. Command Centre / Portfolio Tools naming

Image shows a gold nav tile labelled `Command Centre`.

Potential request:
- Rename `Portfolio Tools` to `Command Centre`, or add `Command Centre` as a nav destination.

Needs confirmation because another note says “Rename to - Dashboard”.

## K. Trade pitch generator

### Feature

Every alert should have a `Generate pitch` option.

Also add `Generate pitch` button in Asset Library side.

### Basis

Use client’s 60–90 minute / 90-second pitch framework from Stock Pickers Academy checklist image.

Framework sections:
1. Story — what happened?
2. Weather Outside — macro backdrop
3. Direction — bullish / bearish / neutral
4. Sector & Relative Value
5. Technical Analysis
6. Financial Health
7. Strongest Reasons
8. Key Risk / Threat
9. Trade Plan / Execution
10. Time Horizon

### Output intent

Generate a structured pitch for each alert/trade idea using available data:
- price movement
- macro conditions
- direction
- sector comparison
- P/E vs sector P/E
- technical indicators
- financial health metrics
- thesis reasons
- key risks
- entry/target/stop/risk-reward/position size
- investment time horizon

### UX locations

- Alert cards / alert rows
- Asset Library asset row/detail side

## L. Data / integration implications

Likely new or expanded data needed:

### Asset model

- assetClass
- productType
- marketCap
- sectorPERatio
- movingAverage50d
- movingAverage200d
- quickRatio
- currentRatio
- debtToEquityRatio
- nextEarningsDate
- dividendYield
- stochastic855
- beta
- fiftyTwoWeekLowHigh
- currency
- country
- sector

### Market data model

- macro assets: GBP/USD, EUR/USD, S&P 500, NASDAQ, FTSE 100, Gold, Silver, Oil, Natural Gas, Bitcoin, BOE Rate, UK 10Y Gilt, iTraxx 5Y, VIX, DXY
- current value
- daily move
- timestamp
- source/provider
- asset-centre mapping

### Alerts model

- buyAlert
- sellAlert
- multiple buy tranches
- lastTriggeredAt
- lastTriggeredPrice
- alert history
- alert visibility toggle

### Positions model

- live/virtual portfolio ownership
- average cost
- weighted average cost
- unrealised P/L amount
- unrealised P/L percent
- tranche status

### AI tools model

- prompt templates
- user portfolio snapshot
- generated stress-test result
- generated personal-finance result
- generated pitch result
- disclaimers / guardrails

## M. Priority pass

### P0 / immediate client amendments

1. Add Market Cap to Key fields.
2. Rename PE to P/E Ratio.
3. Add expanded Key fields metrics.
4. Add Asset Class and Product columns to Main Watchlist and Asset Library.
5. Add alert filter: buy / sell / both.
6. Add currency filter.
7. Add Master Watchlist fast-access option.
8. Change tranche planner from forced even split to manual override + Split evenly button.
9. Replace `SPA` with logo or `Stockpickers Academy`.

### P1 / major feature work

1. Asset detail view selector: Price History / Indicator View / Price Alerts.
2. Indicator View with candlesticks, Bollinger Bands, 50d MA, 200d MA, Stochastics.
3. Price Alerts tab with buy/sell lines and position summary.
4. Global market ticker strip.
5. Weather Outside panel and Market Snapshot.
6. Generate Pitch button for alerts and Asset Library.

### P2 / advanced tools

1. Portfolio Stress Test with Monte Carlo-style AI analysis.
2. Personal Finance tab with CFO-style Monte Carlo scenario analysis.
3. Spartan tranche tracker.
4. Multi-tranche Spartan alerts.
5. Last Alert Triggered and AI stock summary cards.

## N. Open questions / unclear points

1. “But with drop down too” — unclear what needs a dropdown. Likely view selector/timeframe/filter, but needs confirmation.
2. “Asset library view” — likely refers to the screenshot/request immediately following it, but exact page state to amend should be confirmed.
3. “With labels in brackets e.g. (large) … use the logic above for the labels” — needs exact label thresholds for market cap/ratios unless already defined in code.
4. “Rename to - Dashboard” — unclear which item should be renamed. Could be `Portfolio Tools`, `Command Centre`, or another nav/page label.
5. “Like this” followed by image received but no visible image description — missing visual context.
6. “View full should show what’s circled in yellow...” — likely the Weather/Market Snapshot third row expansion. Need confirm whether exactly row 3 or only yellow-circled tiles.
7. Market ticker / macro asset data provider must be confirmed, especially for BOE Rate, UK 10Y Gilt, iTraxx 5Y, DXY, VIX, natural gas.
8. AI / Monte Carlo outputs need compliance/disclaimer treatment because this is financial analysis. Should be educational, not regulated advice.
9. `Portfolio stress test` should clarify user goal input: retirement, target portfolio value, target date, income requirement, or custom objective.
10. `Generate pitch` should clarify whether output is a 90-second short pitch, a 60–90 minute full research pack, or both.

## O. Recommended implementation sequence

1. Quick UI/data amendments: fields, labels, filters, columns, header rename/logo, tranche split button.
2. Asset detail chart architecture: shared chart tabs, indicator calculations, alert overlays.
3. Weather Outside + Market Snapshot + ticker assets.
4. Pitch generator using available asset/alert/macro data.
5. Portfolio stress test and personal finance tools once data model and guardrails are settled.

## P. Image references from forwarded messages

Images have been copied into `docs/client-feedback/images/` and indexed in `docs/client-feedback/image-manifest.md`.

| Image | Related feedback section | Related message / purpose |
|---|---|---|
| [images/01-key-fields-current-partial.jpg](images/01-key-fields-current-partial.jpg) | A. Asset detail: key fields card | Client asked: “Also add market cap please”; screenshot shows current Key fields card with PE. |
| [images/02-forwarded-image-unreadable.jpg](images/02-forwarded-image-unreadable.jpg) | N. Open questions / unclear points | Forwarded image could not be read by automatic summary; kept as raw evidence. |
| [images/03-key-fields-expanded-target.jpg](images/03-key-fields-expanded-target.jpg) | A. Asset detail: key fields card | Expanded Key fields mock showing P/E Ratio, Sector P/E Ratio, moving averages, ratios, earnings, dividend yield, stochastic. |
| [images/04-add-update-position-dropdown.jpg](images/04-add-update-position-dropdown.jpg) | C. Asset detail: Price Alerts view | Position state / add-update position context; relates to dropdown and live/virtual/both position handling. |
| [images/05-tranche-total-budget-split-evenly.jpg](images/05-tranche-total-budget-split-evenly.jpg) | I. Average / tranche planner form | Current Total budget helper says split evenly; client wants manual override plus Split evenly button. |
| [images/06-asset-library-mobile-partial.jpg](images/06-asset-library-mobile-partial.jpg) | D. Asset Library and Watchlists | Asset Library mobile view context for new columns/filters. |
| [images/07-master-watchlist-fast-access.jpg](images/07-master-watchlist-fast-access.jpg) | D. Asset Library and Watchlists | Master Watchlist button circled; client wants fast access. |
| [images/08-current-price-history-chart.jpg](images/08-current-price-history-chart.jpg) | B. Asset detail: view selector and chart tabs | Current Price History chart; source for adding selector / indicator view / alerts. |
| [images/09-desired-indicator-view-mockup.jpg](images/09-desired-indicator-view-mockup.jpg) | B. Asset detail: view selector and chart tabs | Desired Indicator View mockup with candlesticks/indicators. |
| [images/10-command-centre-button.jpg](images/10-command-centre-button.jpg) | J. Command Centre / Portfolio Tools naming | Command Centre nav/button screenshot; naming ambiguity. |
| [images/11-asset-library-mobile.jpg](images/11-asset-library-mobile.jpg) | D. Asset Library and Watchlists | Mobile Asset Library screenshot; context for columns/filters. |
| [images/12-watchlists-mobile.jpg](images/12-watchlists-mobile.jpg) | D. Asset Library and Watchlists | Mobile Watchlists screenshot; context for adding Asset Class/Product columns. |
| [images/13-dashboard-weather-market-snapshot.jpg](images/13-dashboard-weather-market-snapshot.jpg) | F. Dashboard: Weather Outside | Dashboard Weather Outside / Market Snapshot / portfolio overview; yellow circles relate to view-full expansion. |
| [images/14-trade-idea-interview-checklist.jpg](images/14-trade-idea-interview-checklist.jpg) | K. Trade pitch generator | Trade Idea Interview Checklist framework for Generate pitch feature. |
