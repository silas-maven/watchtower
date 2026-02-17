# Notes: Hamza- Portfolio Blotter.xlsx (older version)

Source file uploaded via TextPad.

## Workbook structure (sheets)
- `Portfolio` (main watchlist / portfolio view)
- `Average Price Calculator`
- `Virtual Portfolio`
- `Virtual Average Price Calculato` (truncated sheet name)
- `Closed Positions`

## Portfolio sheet — layout
### Top config / summary row (Row 1)
- Portfolio Size: **£5,000**
- Max budget per stock: **£1,000**
- Min entry size: **£300**
- “No ETFs/Reits” flag
- “5 Stocks” (target count)
- Calculated summary fields:
  - Amount Invested
  - Invested Value
  - Portfolio Return
  - Portfolio Cash
  - A note: “Look out for Big red number in this column”

### Guidance row (Row 2)
- “Master Watchlist” with suggested spend buckets:
  - £300 / £300 / £400 (comment: how to spend £1000)
  - £100 / £150 / £250 (comment: how to spend £500)

### Table header row (Row 3)
Core columns (first ~30 observed):
1. Ticker
2. Name
3. Reason for Entry
4. Current Price
5. Trading212/Freetrade entry price
6. Average Entry Price
7. Number of Shares
8. Current Cost
9. Current Value
10. % Weight of Portfolio
11. Current Return (%)
12. 30 Day Trend Chart (sparkline)
13. Ccy
14. Daily Change (%)
15. Daily Change
16. Daily High
17. Daily Low
18. Range / yest close
19. Price / year low
20. Target Entry for Averaging
21. Target Exit
22. Trade Alert
23. TRADE ALERT (duplicate/emphasis column)
24. beta
25. low52
26. high52
27. volume avg
28. pe
29. datadelay
30. marketcap
(There are additional columns beyond this; ref range is `A1:AE52`.)

## Key functions / formulas (high-level)
This sheet is **formula-heavy**: ~**1155** formula cells in the `Portfolio` sheet alone.

Notable logic patterns:
- Portfolio summary calculations:
  - Amount invested = `SUM(H:H)`
  - Invested value = `SUM(I:I)`
  - Portfolio return = `(InvestedValue - InvestedCost)/PortfolioSize` style
  - Portfolio cash = `PortfolioSize - AmountInvested`

- Market data pulls (Google Sheets / GoogleFinance):
  - `GOOGLEFINANCE(ticker, "name")`
  - `GOOGLEFINANCE(ticker)` for price
  - `GOOGLEFINANCE(ticker, "currency")`
  - Historical series used for 30-day sparkline via `SPARKLINE(GOOGLEFINANCE(..."price"...))`

- Currency conversion / position value:
  - Conditional handling of currencies (USD/EUR/GBX)
  - Converts entry price and current price into portfolio base currency via FX rates
  - Position cost/value computed from shares * price with GBX divide-by-100 handling

- Derived metrics:
  - Weight: `CurrentCost / PortfolioSize`
  - Return: `CurrentValue / CurrentCost - 1`
  - Daily change %: `round(CurrentPrice / CloseYest - 1, 4)` (CloseYest appears in later columns)

## Implications for the app
What the app needs to model explicitly (instead of cell formulas):
- **Portfolio constraints**: portfolio size, max per stock, min entry, target count
- **Asset + position**: ticker, name, shares, entry price(s), avg entry, current price
- **Market data**: price, daily change, day high/low, 52w high/low, beta, PE, volume, market cap
- **FX normalization** for GBP-based portfolio, including GBX handling
- **Alerting** columns: target entry for averaging, target exit, trade alert state
- **AI sweep outputs**: daily summary of alerts + changes (new/dropped)

## Recommendation (mock → real)
- For the mock UI, replicate this as:
  - A **Watchlist table** view with the above columns (with toggles to hide advanced columns)
  - A **Portfolio summary strip** at the top (portfolio size/cash/invested/return)
  - A “Trade Alerts” filtered view
- For the real build, replace formula dependencies with:
  - price/metadata provider + scheduled refresh
  - a normalized portfolio currency layer
  - server-side alert evaluation
