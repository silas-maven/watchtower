# Owner Update 002 — Market Pulse, Personal Finance and Pension Drawdown

**Captured:** 4 August 2026  
**Source:** Three WhatsApp screenshots plus Kyser's written direction. This is a requirements capture only; no product code has been changed.

## Decisions locked

### 1. Mobile Dashboard: bring Market Pulse forward

- Move the existing Market Pulse/news surface **up to immediately after the second row of macro tiles**: after the **SILVER** and **BOE RATE** cards, before the **UK 10Y GILT** and **ITRAXX 5Y** cards.
- On the Dashboard, show **only the top three news articles**.
- Add a **View more** action below those three articles.
- The View more action should open the dedicated Market Pulse surface described below.
- Retain the chart-style portfolio metrics as a feature. Kyser explicitly confirmed the portfolio chart belongs alongside the metrics.

### 2. Dedicated Market Pulse navigation

- Add a top-level member tab named **Market Pulse**.
- Position it **immediately before Community Feed** in the member navigation.
- This is the full news/market-pulse destination; the Dashboard becomes the compact three-article preview.

### 3. Personal Finance placement

- The laptop Personal Finance area should also surface the relevant calculator tools, rather than leaving them only under the current Portfolio tools route.
- The new pension calculator belongs in **Personal Finance**.
- Preserve the existing laptop layout otherwise; Kyser said it is broadly right.

## New calculator: UK Pension Drawdown Calculator

### Access and commercial rule

- Place in the **Personal Finance** tab.
- ~~Make it a **freemium-gated feature**: locked for free members at this location, using the existing server-side entitlement/paywall pattern rather than a visual-only lock.~~ **Reversed 5 August: the calculator is free for everyone. See `005-2026-08-05-revisions.md`.**

### Inputs

| Input | Requirement |
| --- | --- |
| Current age | Required |
| Retirement age | Required |
| Pension pot value | Required |
| Tax-free cash option | 0%, 25%, or custom percentage/value |
| Investment growth | Percentage assumption |
| Annual fees | Percentage assumption |
| Inflation | Percentage assumption |
| End age to model | Default 90, editable |
| State Pension | Annual amount and starting age |
| Other taxable income | Annual amount |
| Target inheritance | Optional |
| Withdrawal strategy | 3% Conservative, 4% Balanced, 5% Higher income, or custom annual withdrawal as £ or % |

### Calculation flow

1. Calculate available tax-free cash as the lower of 25% of the pension pot and the remaining Lump Sum Allowance.
2. Deduct tax-free cash from the pension pot to form the drawdown fund.
3. Calculate annual drawdown using the selected withdrawal strategy.
4. Add State Pension and other taxable income.
5. Estimate Income Tax using current UK tax bands; calculate gross and net annual/monthly income.
6. Project the pension each year: apply investment growth, deduct fees, then subtract withdrawals, ending at the selected end age or fund exhaustion.
7. Model the target inheritance as an end-fund objective when supplied; do not present it as guaranteed.

### Results

- Tax-free lump sum
- Remaining drawdown fund
- Gross annual income
- Net annual income
- Net monthly income
- Estimated tax paid
- Projected age the fund lasts to
- Remaining fund at the end of the projection
- Time-series charts for fund value, income and tax

### Configuration requirement

Put these outside calculation logic in configurable assumptions/settings:

- Income-tax bands and allowances
- Lump Sum Allowance
- State Pension assumptions
- Default growth and fee assumptions

### Product guardrails

- Clearly label results as an educational projection, not regulated financial advice.
- Make all assumptions visible in the UI and included in output/chart labels.
- Use nominal values unless the UI explicitly offers an inflation-adjusted view; do not mix the two silently.

## Build-time decision still needed

Income-tax bands differ for Scotland. Default the first version to **England, Wales and Northern Ireland**, with this limitation disclosed, unless Kyser directs otherwise. A later version can add a tax-region selector.

## Screenshots retained

- `002-mobile-dashboard.jpg` — Market Pulse placement marker and mobile Dashboard state
- `003-laptop-personal-finance-tools.jpg` — current laptop calculator/tool placement
- `004-market-dashboard-placement.jpg` — blue-line marker showing the desired Market Pulse insertion point
