# Watchtower Client Feedback — 2026-07-22 WhatsApp Forward

Source: forwarded WhatsApp voice note, text feedback, and screenshots from Stock Pickers Academy / Watchtower review.
Project: Watchtower / Stock Pickers Academy
Raw feedback folder: `raw/`
Image evidence folder: `images/`

## Executive summary

- Keep plan generation and viewing inline: users should not be taken to a separate page after generating or viewing an averaging plan.
- Portfolio holdings need a per-asset dropdown to reveal the existing averaging plan.
- Asset Centre needs clearer action buttons: add to watchlist, add to portfolio, and create plan.
- 90-second pitch generation needs a better loading state/animation and output quality needs to follow the PDF brief more closely.
- Pitch content is overusing “weather outside”; Story and Financial Health need distinct, company-specific analysis.
- Charts need longer ranges: 5Y and Max.
- Users should be able to rearrange/move pitch headings/sections.
- V1 is broadly acceptable, but subscription lifecycle/access removal needs thought before rollout.

## Amendments / additions

### 1. Averaging plan behaviour

Priority: P0
Evidence: `raw/001-voice-note-transcript.md`, `images/003-mobile-dashboard-holdings-nav-annotated.jpg`

- Portfolio should show a dropdown for each held asset.
- If an averaging plan already exists, the dropdown should reveal it inline below that asset/holding.
- If generating a new averaging plan, the generated result should appear on the same page after completion.
- Avoid routing the user to another page for this flow.

### 2. Pitch loading state

Priority: P1
Evidence: `images/002-90-second-pitch-loading-modal.jpg`

- Add some animation or richer loading feedback while the 90-second pitch is being generated.
- Current modal communicates loading, but feels static.

### 3. Pitch output should match the PDF brief

Priority: P0
Evidence: raw DIS pitch in `raw/002-whatsapp-text-and-image-feedback.md`

Current problem:
- The generated pitch repeats “weather outside” across multiple sections.
- The Story section is not explaining the company itself or the last 12 months.
- Financial Health lists metrics, but does not explain whether they are good, bad, concerning, improving, or weak.

Required changes:
- Story should explain what the company does and summarise what has happened over the last 12 months.
- Weather Outside should be contained to the market/macro section only.
- Financial Health should cover balance sheet, income statement, cash flow statement, debt/equity ratios, bankruptcy risk, and profitability.
- Financial Health should interpret the data, not just list it.
- Add a smart scoring / traffic-light style assessment for Financial Health.

### 4. Pitch section controls

Priority: P1
Evidence: `raw/002-whatsapp-text-and-image-feedback.md`

- Users should be able to move/reorder the pitch headings/sections at the top.

### 5. Remove/replace execution strategy section

Priority: P1
Evidence: DIS pitch section 9 in `raw/002-whatsapp-text-and-image-feedback.md`

- Remove “Trade Plan (Execution)” / execution strategy.
- Replace with blended analyst price targets if available.
- If no analyst coverage is available, explicitly state no analyst coverage.

### 6. Time horizon

Priority: P0
Evidence: DIS pitch section 10 and follow-up comment in `raw/002-whatsapp-text-and-image-feedback.md`

- Time horizon should be 3–5 years, not near-term.

### 7. Asset Centre actions

Priority: P0
Evidence: `images/006-mobile-asset-centre-dis-price-history.jpg`

Add buttons in Asset Centre:
- Add to watchlist
- Add to portfolio
  - Live portfolio
  - Virtual portfolio
- Create plan

### 8. Chart ranges

Priority: P1
Evidence: `images/005-price-history-chart-3mo-tooltip.jpg`, `images/006-mobile-asset-centre-dis-price-history.jpg`

- Add 5Y and Max time ranges to Price history charts.

### 9. SPA logo placement

Priority: P1
Evidence: `images/004-desktop-header-nav-logo-annotated.jpg`, `images/003-mobile-dashboard-holdings-nav-annotated.jpg`

- Clarify and implement SPA logo visibility/placement in the marked header/nav area.
- Current screenshots show SPA logo in the app header, but client asks “How do we get SPA logo here”, likely referring to a specific missing placement in the circled area.

### 10. Stock request flow

Priority: P2
Evidence: `raw/002-whatsapp-text-and-image-feedback.md`

- Add a way for users to request a stock to be added to the watchlist/universe.

### 11. Subscription lifecycle / access removal

Priority: P1/P2
Evidence: `raw/002-whatsapp-text-and-image-feedback.md`

- Need a process for adding/removing users once their subscription ends.
- This affects rollout/admin/access control more than UI polish.

## Data / integration implications

- Pitch generator prompt/schema needs tightening so each section has distinct responsibilities.
- Financial Health likely needs richer fundamentals data: balance sheet, income statement, cash flow, debt/equity, profitability, bankruptcy/risk indicators, and scoring thresholds.
- Analyst price targets require a data source; if unavailable, output must clearly say no analyst coverage.
- 5Y/Max chart ranges require availability of longer historical price data.
- Add-to-portfolio needs to distinguish live vs virtual portfolio.
- Stock request flow needs either an admin review queue or a lightweight request record.
- Subscription offboarding needs an entitlement/access-control model.

## Priority pass

### P0 / immediate amendments

- Inline averaging plan dropdown in Portfolio holdings.
- Generated averaging plan appears on the same page.
- Fix 90-second pitch prompt structure so Story, Weather Outside, Financial Health, and Time Horizon follow the PDF brief.
- Financial Health must interpret quality/risk, not just list metrics.
- Asset Centre buttons: add to watchlist, add to portfolio, create plan.
- Time horizon should be 3–5 years.

### P1 / major but bounded V1 improvements

- Loading animation for pitch generation.
- Reorder/move pitch headings.
- Add 5Y and Max chart ranges.
- Replace execution strategy with analyst price targets / no coverage statement.
- SPA logo placement clarification/implementation.
- Subscription add/remove process for rollout.

### P2 / later system work

- User stock request workflow for watchlist additions.
- More advanced admin workflow for subscription lifecycle if not already present.

## Open questions / unclear points

- “Average in plan” from the voice note likely means “averaging plan”; confirm naming before changing UI copy.
- “Blog” in the voice note may refer to the asset detail page or portfolio page, not an actual blog.
- SPA logo request needs exact target location: header logo already appears in screenshots, so the missing placement may be within nav, generated pitch, or exported/embedded view.
- Analyst price targets depend on available market data provider coverage.
- Need to know whether subscription lifecycle is handled manually, via Stripe/webhooks, or via an admin panel.

## Image references

See `image-manifest.md` for copied screenshot paths and descriptions.
