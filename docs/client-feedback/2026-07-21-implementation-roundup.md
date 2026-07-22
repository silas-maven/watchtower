# What's new in Stock Pickers Academy - July 2026 update

This update implements the feedback you sent on 19 July (captured in
[2026-07-19-whatsapp-client-feedback.md](2026-07-19-whatsapp-client-feedback.md), with your screenshots in
[images/](images/)). Every numbered section below links back to the matching section of that feedback document,
so you can trace each change to what you asked for.

Everything described here is live on the platform now.

---

## 1. Asset detail: expanded Key fields card
*Your feedback: section A*

You asked for Market Cap, a P/E rename, and a longer list of metrics. The Key fields card on every asset page now shows:

- **Market Cap**, with the size label in brackets, for example "$12.4bn (Large)". The Small / Mid / Large / Mega
  bands follow your course table exactly: UK-listed names use the pound thresholds (£30m to £50m Small, up to
  £20bn+ Mega) and everything else uses the dollar thresholds ($300m to $2bn Small, up to $100bn+ Mega).
- **P/E Ratio** (renamed from "PE") and **Sector P/E Ratio**
- **50d and 200d moving averages**
- **Quick ratio, Current ratio and D/E ratio**
- **Next earnings date** and **Dividend yield**
- **Stochastic (8,5,5)** with your colour rule: red at 80 or above, green at 20 or below, neutral in between

Most of these update automatically from live market data. Sector P/E is the one exception: there is no free
data source for it yet, so it shows a dash until a value is entered in the admin console (see section 10).

## 2. Asset detail: view selector and Indicator view
*Your feedback: section B*

Every asset page now has three views, switchable at the top:

1. **Price history** - the existing line chart (and we fixed the bug where the price axis showed scrambled
   numbers, visible in your JMIA screenshot)
2. **Indicator view** - a professional candlestick chart with:
   - Bollinger Bands (20,2), 50-day MA and 200-day MA overlays
   - a Stochastics (8,5,5) panel underneath with the 20/80 guide lines
   - **Daily / Weekly / Monthly** timeframes; indicators recalculate automatically when you switch
   - on/off toggles for candlesticks, Bollinger Bands and both moving averages
   - defaults on entry are Bollinger Bands plus Stochastics, as you specified
3. **Price alerts** - covered next

## 3. Asset detail: Price Alerts view
*Your feedback: section C, including the "optional next enhancements"*

The Price Alerts tab shows:

- **Buy alert and Sell alert cards** with the current levels
- the chart with a **blue Buy alert line and red Sell alert line**, both labelled, plus a toggle to show or
  hide them
- **multi-tranche buy alerts**: if the stock has an averaging plan, each tranche price is drawn as its own
  labelled buy line (Buy alert 1, 2, 3)
- **Your position card**: whether you hold it in the Live Portfolio, Virtual Portfolio, or Both; your weighted
  average price; unrealised profit/loss as money and percent, for example "+£340 (+5.21%)"; or "No current
  position"
- **Spartan signal badge**: BUY ZONE (green), WATCHLIST (amber) or SELL ZONE (red)
- **Spartan position tracker**: each tranche with its budget, Bought/Pending status, and an invested progress
  bar, with a one-click link to the plan
- **Last alert triggered**: for example "Buy alert triggered 3 days ago at $7.20"
- an **AI stock summary** remains available on the page, and the new Generate pitch button lives here too

## 4. Asset Centre and Watchlists: columns and filters
*Your feedback: section D*

- Both the Asset Centre table and the master watchlist now show **Asset Class** (Equities / Commodities /
  Crypto) and **Product** (Stock / ETF / Crypto / REIT) columns.
- New filter bar on both tables: **Buy / Sell / Both / Any alert** buttons, a **currency** filter, a
  **market cap size** filter (using the same course-table bands), and search.
- **Master Watchlist fast access**: the Master Watchlist chip now sits alongside your sublists and jumps you
  straight to it, and the Asset Centre header links to it as well.
- Naming: the pages are now **Dashboard**, **Asset Centre** and **Portfolio** (see section 6).

## 5. Average Planner: manual tranche amounts
*Your feedback: section I*

The forced even split is gone:

- every tranche now has its **own editable allocation** in pounds
- **"Split evenly" is a button**: click it to pre-fill equal amounts across your tranches
- you can still override any tranche after splitting, and the form warns you if your allocations do not add up
  to your stated budget
- saved plans keep your custom amounts and reload them when you come back

## 6. Header, navigation and the live market ticker
*Your feedback: sections E and J, and your dashboard mockup*

- The header now reads **Stock Pickers Academy** in full (previously just "SPA" on mobile).
- Navigation matches your mockup: **Dashboard** (was Command Centre), **Asset Centre** (was Asset Library),
  **Portfolio** (was Portfolio Tools).
- A **live market ticker** runs across the top of every page: GBP/USD, S&P 500, Gold, Bitcoin, Silver,
  BOE Rate, UK 10Y Gilt, iTraxx 5Y, VIX, DXY, EUR/USD, NASDAQ, Oil, Nat Gas and FTSE 100. It scrolls
  continuously, pauses when you hover, shows green/red daily moves (grey for static rates), and **every live
  item is clickable** - it opens the instrument in the Asset Centre with the full chart, indicator view and
  price history, exactly like a stock.

## 7. Dashboard: Weather Outside and Market Snapshot
*Your feedback: section F*

The Dashboard now opens with the **Weather Outside** panel:

- one of four states, judged from live macro data: **Sunny** (green, "Risk assets are broadly rising",
  Market Mood: Risk On), **Mixed** (amber, Neutral), **Stormy** (red, Risk Off) and **Frosty** (blue,
  Recovery Watch)
- the reading is driven by the S&P 500, NASDAQ, Bitcoin, VIX, DXY, the UK 10Y gilt, credit (iTraxx), gold and
  oil, using fixed, documented rules - it is a calculation, not an opinion

Below it sits the **Market Snapshot**:

- Row 1: GBP/USD, S&P 500, Gold, Bitcoin, Silver
- Row 2: BOE Rate, UK 10Y Gilt, iTraxx 5Y, VIX, DXY
- **"View full market dashboard"** expands Row 3: EUR/USD, NASDAQ, Oil, Nat Gas, FTSE 100
- every tile is clickable and opens the instrument in the Asset Centre

## 8. Generate pitch
*Your feedback: section K*

A **Generate pitch** button now appears on every row of the Asset Centre and on the asset's Price Alerts tab.
It produces a 90-second pitch following your Trade Idea Interview Checklist, section by section:

1. Story, 2. Weather Outside, 3. Direction, 4. Sector & Relative Value, 5. Technical Analysis,
6. Financial Health, 7. Strongest Reasons, 8. Key Risk / Threat, 9. Trade Plan (Execution), 10. Time Horizon

How it works, and why it is safe: all the facts (signal state, direction, alert levels, tranche prices,
indicators, market weather, financial ratios) are computed by the platform first. The AI only turns those
numbers into readable sentences. It is instructed to use only the provided numbers, to say when something is
unavailable rather than guess, and never to promise returns. There is a copy button so a pitch can be pasted
anywhere, and every pitch carries an "educational analysis, not financial advice" note.

## 9. The two new AI tools
*Your feedback: sections G and H*

Both live under **Portfolio**.

**Portfolio Stress Test.** Pick Live, Virtual or Both, optionally set a goal value and time horizon, and the
platform runs a Monte Carlo simulation of 2,000 possible market futures for your actual holdings. You get:
your probability of meeting the goal, the expected range of outcomes, the likely maximum drawdown, and where
you are overexposed by stock, currency, cash level and portfolio beta, followed by a plain-English "Chief Risk
Officer" explanation and three concrete changes that would improve your risk-adjusted returns, exactly per the
prompt you supplied. Portfolio management first, stock selection second.

**Personal Finance.** A separate, simple tab, as you confirmed. Members enter age, income, expenses, savings,
investments, pension, debts with interest rates, optional home value, monthly investing and their goal. The
platform then simulates thousands of financial futures (with inflation, salary growth, market returns and
random expense shocks built in) and reports in the style of your examples: probability of reaching the goal,
months of emergency savings, chance of never running out of money, chance of financial independence by 60,
and the wealth range at 60, followed by a CFO-style plain-English read and the three highest-impact changes.
Inputs are saved privately to the member's account and prefill next time.

A note on honesty, for both tools: the simulations run on fixed, stated assumptions (which are shown under
every result), the same inputs always produce the same numbers, and the AI's only job is to explain the
results in simple English. Both tools are clearly labelled as educational analysis, not regulated financial
advice.

## 10. Data sources: what updates itself and what is manual

Everything price-related (stocks, indices, FX, commodities, crypto, moving averages, dividend yield, balance
sheet ratios) updates automatically from live market data. On the readings that needed a decision:

- **BOE Base Rate - now automatic.** It updates itself from the free official Bank of England feed. The manual
  field in the admin console is now an optional override: leave it blank to use the live rate, or type a value
  only if you ever want to pin it.
- **Sector P/E - now automatic.** There is no direct free source, so we benchmark each stock against its sector
  using the sector ETFs, which do publish a live P/E. One honest caveat: these are US sector benchmarks, so a
  UK-listed name is compared against the US sector aggregate, an approximation rather than a country-specific
  figure. A per-asset manual value in the admin console overrides it when set.
- **UK 10Y Gilt Yield - manual.** There is genuinely no free live feed for this. It stays a manual field in
  Macro Readings until a paid or terminal source is arranged.
- **iTraxx 5Y - manual.** iTraxx is licensed data with no free source of any kind, so it stays manual. If you
  prefer, a free daily credit-stress substitute (a high-yield credit spread) is available, but it is a
  different index and would be labelled honestly as such rather than as iTraxx.

Manual readings are set in the admin console (Admin, then Assets, then "Macro Readings") and render as neutral
tiles (or a dash) until set. Every reading is built so a real data feed can replace it later without other
changes.

## In-app release notes

Admins also have a live **What's New** page (Admin, then What's New) that lists these updates, ties each one to
the feedback it came from, and links straight to the change in the app, so this summary is always available
inside the platform, not just in this document.

## Points we would like your confirmation on

1. **Pitch length**: we built the 90-second pitch. If you also want a longer, full research-pack version, say
   so and we will add it as a second option.
2. **Market Snapshot expansion**: we show rows 1 and 2 by default with row 3 behind "View full market
   dashboard", based on your yellow-circled screenshot. Tell us if you want different items hidden or shown.
3. **Macro data feeds**: whether to automate the BOE rate now, and whether the credit-stress substitute for
   iTraxx is acceptable, or you can arrange licensed access.

---

*Update shipped 21 July 2026. Source feedback: [2026-07-19-whatsapp-client-feedback.md](2026-07-19-whatsapp-client-feedback.md).*
