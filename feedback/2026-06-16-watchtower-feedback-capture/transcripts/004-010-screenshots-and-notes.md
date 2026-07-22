# Feedback Items 004–010 — Screenshots and inline notes batch

Captured: 2026-06-16
Type: Screenshots, audio attachments, and typed notes

## Item 004 — Live Portfolio mobile empty state

Source: `originals/002-live-portfolio-mobile-empty.jpg`

Visible UI:
- URL: watchtower-virid.vercel.app
- SPA header, avatar “A”, theme toggle
- Nav: Command Centre, Daily Checks, Watchlists, truncated Asset Library/other item
- Page: Portfolio Tools → Live Portfolio
- Description: “Your real holdings, valued against live prices. This is your own book, separate from the academy master list and the virtual portfolio.”
- Metrics:
  - Invested: £0
  - Value: £0
  - Profit: £0 (+0.0%)
  - Declared Size: —

Feedback captured:
- Mobile nav is clipped horizontally; needs better mobile layout or scroll affordance.
- Empty live portfolio should guide the user toward adding holdings / setting portfolio value.
- “Declared Size” should be renamed; later feedback says use “Portfolio Starting Value (Cash)”.
- Profit at £0 should probably be neutral rather than green.

## Item 005 — Holdings declared amount annotation

Source: `originals/003-holdings-declared-value-annotated.jpg`

Visible UI:
- Avg price field
- + Save holding button
- Holdings table
- Declared £ input set to 50000 with Set button, circled in red
- Rows show values, costs, values and returns

Feedback captured:
- “Declared £” is unclear.
- Rename this concept to **Portfolio Starting Value (Cash)**.
- Currency formatting should show £50,000 rather than raw 50000.
- The control should be clearer, probably using Edit rather than a cramped Set field in the table header.

## Item 006 — Asset cells should be clickable

Source: `originals/005-holdings-assets-annotated.jpg`

Visible UI:
- Holdings table columns: Asset, Signal, Shares, Avg, Price
- Assets circled in red:
  - NKE / USD
  - DIS / USD
- Signals:
  - NKE: BUY
  - DIS: NONE

Typed feedback:
“These should be clickable to go to the asset library”

Requirement:
- Asset ticker/name cells in holdings should be clickable.
- Clicking NKE/DIS should navigate to the corresponding Asset Library detail page.

## Item 007 — Averaging plan column

Source: `originals/006-holdings-averaging-plan-column.jpg`

Visible UI:
- Holdings table columns: Asset, Signal, Shares, Avg, Price, Averaging Plan
- NKE row has View button
- DIS row has View button

Typed feedback:
“Then another column labelled averaging plan that just has a clickable ‘view’ button - redirects to the averaging plan if clicked if it has no plan it will be blank if it does have one then it shows what’s previously inputted”

Requirement:
- Add an **Averaging Plan** column.
- If a holding has an averaging plan, show a clickable **View** button.
- Clicking View opens the existing averaging plan and shows previously inputted values.
- If no plan exists, the column should be blank/dash, unless a separate “Create Average Plan” action is intentionally shown.

## Item 008 — Full Spartan Strategy holdings table

Source: `originals/007-holdings-spartan-strategy-full.jpg`

Visible UI:
- Holdings title/subtitle
- Add Holding button
- Columns:
  - Asset
  - Signal
  - Shares
  - Avg
  - Price
  - Next Buy Price
  - Sell Target
  - Averaging Plan
  - Spartan Strategy
- NKE row:
  - BUY
  - 100 shares
  - $45.00 avg
  - $45.25 price
  - $22.50 next buy price (-50.00%)
  - $90.00 sell target (+99.17%)
  - View averaging plan
  - Spartan Strategy checked
- DIS row:
  - NONE
  - 300 shares
  - $100.00 avg
  - $101.60 price
  - next buy/sell/plan blank
  - Spartan Strategy unchecked
- Strategy Legend explains Spartan / Custom / None.
- About Spartan Strategy explains calculated next buy/sell when enabled.

Feedback captured:
- Spartan Strategy is a core state per holding.
- Checkbox/toggle should indicate whether calculated strategy fields are driven by an averaging plan.
- Next Buy Price and Sell Target should feed from the averaging plan when Spartan Strategy is enabled.
- If disabled, fields can be blank or manually set.
- The default state should be ticked.

## Item 009 — Expanded Average Planner

Source: `originals/008-average-planner-expanded.jpg`

Visible UI:
- Plan Summary:
  - Stock: NKE - Nike, Inc.
  - On Watchlist
  - Current Price: $98.46 USD, +1.32 (1.36%)
  - Target Price to Sell: $150.00
- Input Parameters:
  - Currency: USD - US Dollar
  - Total Budget: 1,500.00
  - Current / Target Entry Price (Trade 1): 100.00
  - Tranches:
    - Trade 1: 100.00, implied drop —
    - Trade 2: 60.00, implied drop 40.00%
    - Trade 3: 40.00, implied drop 60.00%
  - Add Tranche button
  - Delete/remove tranche control
- Execution Plan:
  - Trade, Allocation, Entry Price, Shares, Implied Drop %, Executed
  - Trade 1 executed; Trades 2/3 not executed
  - Final position and average price
- Your Holdings:
  - Add Holding Manually
  - NKE and DIS have View Plan / Plan Active
  - CASH has No Plan / Create Average Plan

Typed feedback requirements:
- Add new input: **Stock**.
- Stock must be on watchlist; if not, show an **Add to Watchlist** button that adds it to main watchlist.
- Stock search should work by stock name or ticker/code.
- Once stock is selected, display current stock price.
- Currency should default to the stock’s currency.
- Add option to add a new tranche.
- Add option to remove the third tranche.
- Tranche inputs should be prices, not drop percentages.
- Implied drop percentage should be calculated/displayed from the entered tranche prices.
- Add **Target Price to Sell** in the top right.
- Add executed checkbox per trade.
- Executed trades should update portfolio holdings.
- Still allow manual holdings with no average plan.
- Manual/no-plan holdings should be flagged amber with “Create Average Plan”, linking to the averaging plan flow.

Open issue:
- The UI/helper says implied drop is based on prior trade, but example values imply drop from Trade 1/base price: 100→60 = 40%, 100→40 = 60%. If using prior trade, 60→40 would be 33.33%. Needs product decision.

## Item 010 — Live Portfolio dashboard

Source: `originals/009-live-portfolio-dashboard.jpg`

Visible UI:
- Live Portfolio page with summary cards:
  - Invested: £25,711
  - Value: £26,104
  - Profit: £393 (+0.8%)
  - Portfolio Size: £50,000 Edit
  - Portfolio Beta: 0.82
  - Cash: £24,289
- Portfolio Allocation donut:
  - NKE 41.7%
  - DIS 33.6%
  - CASH 24.7%
- Portfolio News Summary / AI generated
- View Detailed Report button
- Holdings table columns:
  - Asset, Shares, Avg Price, Current Price, Value, P/L, Weight %, Avg Plan, Status
- Footer: Prices delayed by 15 minutes; Refresh; Total Portfolio Value £26,104

Typed feedback:
- Need to see portfolio beta: **% portfolio weighting of each stock × beta of the stock, then add them all up**.
- Need to see overall portfolio % return in brackets.
- Rename to **Portfolio Starting Value (Cash)**.
- Holdings table needs a **% Weight** column.
- Formula: **Stock Value / Portfolio Value × 100**.
- Add **Next Buy Price** and **Sell Target** columns.
- These should feed from the averaging plan.
- Add **Spartan Strategy** checkbox.

## Item 011 — Whisper transcription: Spartan Strategy checkbox

Source: `originals/004-voice-or-media-asset-clickable.ogg`
Transcription: `transcripts/004-voice-or-media-asset-clickable-whisper1.txt`
Model: OpenAI `whisper-1`

Transcript:
“So the Spartan strategy tick box, if they tick it, it should be default ticked and what that means is that the fields will populate from the averaging plan. And if it's unticked, then it means you can just write what you want. It doesn't need to link to an averaging plan.”

Captured as requirement:
- Spartan Strategy checkbox/toggle should be ticked by default.
- When ticked, relevant fields populate from the averaging plan.
- When unticked, users can manually write their own values and the fields do not need to link to an averaging plan.

## Item 012 — Whisper transcription: Live Portfolio, reports, clickthroughs, generated plans

Source: `originals/010-voice-or-media-averaging-plan-clickthrough.ogg`
Transcription: `transcripts/010-voice-or-media-averaging-plan-clickthrough-whisper1.txt`
Model: OpenAI `whisper-1`

Transcript:
“So there I've added a pie chart that just shows what you hold and then also a portfolio news summary that just basically gives you a summary. So if you had like say 10 stocks you just have to scroll down to see more and then when you hit the view detailed report it would give you like a very detailed one pager for each for each stock or something like that. So I'm just really trying to if you go on trading 212 it has stuff like this but it's not there's a lot missing so I want this to really capture the SPA strategy like the things we should care about like what is my portfolio beta what is my next buy price on the stocks that we hold and then obviously the next phase will be to switch on alerts so people will just automatically get an alert if their next buy price get hit or their sell price gets hit. But yeah the key thing is right now they should be able to see their live portfolio and all this should be in a virtual portfolio as well. And yeah this is actually quite good because people can use the virtual portfolio a bit easier now and then also the fact that when you click on any asset you can get that asset page as well and then on the other side you can click and you can get your averaging plan. It could be that there can then be a way for me to set up some logic so that eventually people can do their own they won't need to keep coming to me for averaging plan the system will generate it and I know the default is like 50% and then people ask me and then I tweak it and stuff like that but eventually I want this is more stuff I need to do behind the scenes but I want to make sure that there's less of those questions coming in. So for example behind the scenes I want there to be logic in place where if someone has 10k then I can write like this the algorithm will generate what an averaging plan looks like if you've got a 3k a 4k a 5k a 10k or whatever budget. So there'll be a page where each user can kind of they need to fill out something that says how busy they are and so on and so forth and but that's the next phase bro that's the next phase. The first phase is just moving away from Google Sheets and having your personal blotter the watch list on on a web app like this that they can log into to get access and when they log in they need to put their phone number their name and their email address and so on and so forth so that it becomes easy for me to revoke access.”

Captured as requirement:
- Live Portfolio should show allocation pie/donut chart and portfolio news summary.
- View Detailed Report should open a detailed one-pager per stock.
- Product should capture SPA/Spartan-specific strategy metrics, not just generic broker portfolio data.
- Key metrics include portfolio beta and next buy price for held stocks.
- Next phase: alerts for next buy price and sell target hits.
- Live Portfolio functionality should also exist in Virtual Portfolio.
- Asset cells should click through to Asset Library pages.
- Averaging Plan View should click through to the saved averaging plan.
- Future phase: generate averaging plans automatically based on budget/user profile, reducing manual plan requests.
- Phase 1 remains Google Sheets replacement: personal blotter/watchlist in a login-protected web app.
- Login/access flow should collect phone number, name, email, etc. to make access revocation easy.
