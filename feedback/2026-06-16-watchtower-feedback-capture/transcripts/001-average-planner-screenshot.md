# Feedback Item 001 — Average Planner screenshot

Source: `originals/001-average-planner-screenshot.jpg`
Captured: 2026-06-16
Type: Screenshot / visual UI feedback

## Visual transcript

Dark-themed Watchtower/SPA financial planning interface showing the Portfolio Tools section, specifically an Average Planner calculator.

Top navigation:
- SPA
- Watchlists
- Asset Library
- Portfolio Tools — selected/highlighted in a gold pill
- Account
- Moon icon/theme toggle
- Green circular avatar with “A”

Page header:
- Back to Dashboard
- Average Planner
- Digitized Virtual Average Price Calculator from the spreadsheet.

Input Parameters card:
- Currency: £ GBP
- Total Budget (£): 1500
- Current/Target Entry Price: 100
- Tranche 2 Drop %: 10
- Tranche 3 Drop %: 20

Execution Plan card table columns:
- Tranche
- Allocation
- Entry Price
- Shares
- New Avg Price

Row 1:
- Tranche: #1 (Initial)
- Allocation: £495.00 (33%)
- Entry Price: £100.00
- Shares: 4.95
- New Avg Price: £100.00

Row 2:
- Tranche: #2 (-10%)
- Allocation: £495.00 (33%)
- Entry Price: £90.00
- Shares: 5.5
- New Avg Price: £94.74

Row 3:
- Tranche: #3 (-20%)
- Allocation: £510.00 (34%)
- Entry Price: £80.00
- Shares: 6.375
- New Avg Price: £89.15

Final Position panel:
- FINAL POSITION
- If all three tranches are executed.
- £89.15
- 16.825 total shares

## Product / UX observations

- The UI clearly converts the original spreadsheet-style average price calculator into an app surface.
- The flow is easy to understand: inputs first, execution plan second, final average position at the bottom.
- Gold is used consistently for calculated average-price values and the active Portfolio Tools nav item.
- Green is used for the final outcome, which gives the result a positive/success feel.
- The phrase “Current/Target Entry Price” may be slightly ambiguous because it combines current price and target entry price into one field.
- No visible save, export, reset, asset picker, or ticker selector is present in the screenshot.
- No visible calculate button is present, implying live recalculation as values change.

## Possible implementation implications

- Preserve the tranche calculation logic shown here:
  - Budget split: 33%, 33%, 34%
  - Tranche 2 entry price = initial price less the configured drop percentage
  - Tranche 3 entry price = initial price less the configured drop percentage
  - Final average price = total allocated budget divided by total shares
- Consider whether “Current/Target Entry Price” should be renamed or split for clarity.
- Consider adding save/export/reset and optional asset/ticker selection if this planner is intended to become more than a standalone calculator.
