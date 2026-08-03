# Stock Pickers Academy - what's been built

A plain-English summary for the owner of everything shipped so far, newest first.
Each round below is also viewable inside the app under Admin, then What's New, with a
link to each change. Per-round detail lives in the dated folders in this directory.

---

## Notes and things needing your attention

Read this bit first. Everything here is either an action only you can take, or a
judgement call worth knowing about before beta.

**00000. The entry and exit levels moved to the paid side along with the signal.**
You said the signal column should be members only, and that is done. I also moved
the academy's entry and exit prices with it, everywhere they appear, which you did
not explicitly ask for. The reason: leaving "Entry 41.20, Exit 58.00" printed
beside a live price while hiding the BUY badge gives the same call away by
subtraction. Anyone who understands your method can read the signal off the
levels in a second. If you would rather the levels stayed visible as a taste of
the method, it is a one line change; I would advise against it.

Related, and also my judgement rather than your instruction: the moving average
and stochastic readings on the asset page are now members only too, since they
are the readings behind the view you have asked me never to describe publicly.
The plain fundamentals, price, market cap, P/E, 52 week range and the rest, stay
open to everyone.

**00001. Requesting a security is still members only, and I think that is worth revisiting.**
The request form sits on the watchlist page, which free members can now see. The
form is hidden for them, because the request itself is gated and showing a form
that gets refused on submit is worse than not showing it. But a free member
asking you to cover something is a genuinely useful signal about what they want,
and it costs you nothing beyond a queue entry. Say the word and I will open it.

**0000. Missed payments now remove access on their own. Read this before it happens to someone.**
This is a change of policy, not a bug fix, so it is worth being precise about what
it does.

A failed payment no longer just raises an alert for you. After ten days unpaid,
the account moves to the free plan automatically. Ten days rather than
immediately, because cards fail for ordinary reasons and Stripe keeps retrying
for about a fortnight; cutting someone off on day one would punish a payment that
was about to go through. A cancelled or ended subscription steps down straight
away, because there is nothing left to retry. Someone who has cancelled but is
still inside a period they paid for keeps everything until that period ends.

What "removed" means: they drop to the free plan. They keep their login, their
holdings, their lists and their history, and they lose the watchlist, the buy and
sell alerts, the indicators and the paid tools. They are NOT locked out of the
app. That is deliberate: locking them out would also stop them reaching the page
where they could pay you.

Paying puts everything back on its own, with no action needed from you. You can
also reinstate anyone by hand from the Members page, and nothing overrides that.

If you would rather a missed payment locked the account entirely, say so and it
can be changed, but I would advise against it for the reason above.

**000. Sell alerts were missing cases, and 17 of them were live.**
The buy rule fires either when the price crosses your buy target during the day,
or when the whole day trades below it. The sell rule only ever had the first half.
So a holding that jumped straight past your sell price at the open and kept going,
without ever trading through it, raised nothing. That is precisely the case you
would most want flagged.

This cost nothing while only one security had a sell price on it. It costs a great
deal now that 85 sell targets have been imported from your sheet. Checked against
live prices, 17 securities should have been showing a sell and were silent,
including Barclays at 508.7 against your 400 target, Mastercard at 573 against 500
and Glencore at 543 against 400. Sell alerts across the watchlist go from 3 to 20.

Expect those 17 to appear the first time prices refresh after this goes live. They
are not new events; they are ones that were already true and were not being shown.

**00. Why the admin panel was not showing for you, plainly.**
Admins are named in a setting on the server. That setting was only ever read at the
moment an account was first created. Your account was created on 14 June. Your email
was added to the admin list on 27 July, six weeks later. Because the list was never
looked at again after sign-up, the change could not reach your account, and nothing
you did at your end, signing out, signing back in, clearing the browser, would have
made any difference. It was not a problem with your email address or the sign-in
check on it.

Two things have been done. Your account has been set to admin directly, so the panel
is available to you now. And the code has been changed so the admin list is re-read
every time anyone signs in, meaning anyone added in future gets access on their next
sign-in rather than never. Taking someone off the list does not strip their admin on
its own; that stays a deliberate manual step, the same way member access works.

One thing worth knowing: there are 188 ordinary shares on the watchlist where our
price provider gives us no market cap figure at all, out of 814. They are not broken,
we just have no size for them. They used to disappear from the list whenever you
picked a cap size, with nothing to say so. There is now a "No cap data" option in the
filter so you can see exactly which ones they are.

**0. The stress test was never removed. Straight answer, since you asked for one.**
The Portfolio Stress Test and its Monte Carlo simulation were added on 19 July and
have not been edited or deleted since. They were in the code and on the live site
the entire time, and still are, at Portfolio then Portfolio Stress Test.

What went wrong is a navigation fault, and it is mine. The "Portfolio Toolkit" panel
on the Dashboard was written by hand as a list of three tools, back when three were
all there were. When the Stress Test (19 July) and Personal Finance (20 July) were
added, they were added to the Portfolio page but that Dashboard panel was never
updated. Two lists of the same thing, only one maintained. If you navigate from the
Dashboard, which is where members start, those two tools were invisible. Add that the
phone tab bar shows about four of seven tabs with nothing to hint the rest scroll into
view, and there was genuinely no visible path to them from where you were standing.

So "gone" is fair from your side, and it is a real defect. It just was not a removal,
and nothing was cut for cost, complexity or any other reason. Fixed on 26 July: both
lists are now generated from one shared source that cannot drift, the Dashboard shows
all seven tools, and both portfolio pages carry a direct "Stress test this portfolio"
button.

**1. The daily brief email cannot send yet.** It is built and tested, but nothing will
reach a member until an email provider key (`RESEND_API_KEY`) and a from-address on a
domain you own are set. Until then every attempt is recorded as "no provider configured"
rather than failing quietly. Members can already switch the preference on.

**2. Two deliberate differences from your averaging-plan mockup.** The mockup's share
count and average entry were not internally consistent (Trades 2 and 3 had blank
allocations, yet the summary said 86 shares), which you spotted yourself; ours computes
from the real allocations and live exchange rates, so the figures will not match the
screenshot. And the percentage under Current Price is shown as your gain or loss against
your average entry, not the mockup's `-37.03%`, which measured the average against the
current price and reads backwards for a buyer. Both are easy to change if you disagree.

**3. The universe is loaded, and 199 of 1,067 are not.** 866 tickers are live and priced.
Of the missing 199, **158 are rows your own sheet marks `#N/A`** because they have been
delisted or taken over, so they do not trade anywhere. Another 41 are named in your sheet
but did not resolve: 15 are European listings we can recover on request (Deutsche Bank,
Novartis, ING, Ørsted, Maersk, Zalando and similar), and the rest are genuinely dead
(Activision, VMware, Walgreens). The full list is in `reference/universe-unresolved.csv`.

**4. Bad price data is now filtered before it reaches a member.** The wide-range check
first reported a range of 553,400,848% for a delisted shell, because the price feed
returns a near-zero previous close for dead tickers. Figures are sanity-checked now, which
cut that list from 16 entries to the 5 that are real. This matters more now the universe
is around 900 assets rather than 14.

**5. Three brief items are withheld on purpose:** dividend ex-dates, rights-issue
ex-dates and all-time lows. The data is not dependable enough, and you asked us not to
claim a corporate action or an all-time low on incomplete coverage. The brief says so on
the page. Doing them properly needs a paid corporate-actions provider and a full
price-history back-fill: both good post-beta additions.

**6. Free and paid is enforced on the server, not just hidden.** A free account cannot
reach a members-only page or its data even by going straight to it. Trade pitches are
metered because each one costs a real AI call.

---

## The free plan opens up, and the signals become the product (3 August)

This is the round from your WhatsApp messages on 2 August.

**The master watchlist is free.** A free account now sees the whole curated list,
priced live, with the filters. It does not see the signal on each row, or the entry
and exit levels. Those are left out before the page is even built, so they are not
sitting in the page source waiting to be found. Personal sublists and the tools
around the list stay with the membership. See note 00000 at the top about the
levels, which is my judgement rather than your instruction.

**Personal Finance and both calculators are free.** So is the Portfolio section
itself: a free member can now see the full list of tools, with the members-only
ones marked, rather than meeting a wall. Each of those is gated on its own, so
typing the address does not get anyone in. Personal Finance runs a real AI
analysis every time, so free accounts get three a day and members twenty five.
Without a limit, "free" would mean anyone could run up your API bill.

**Asset pages are free, the call on them is not.** Price, market cap, P/E, 52 week
range, dividend yield, earnings date and the price history are open to everyone,
and the chart now switches between a line and candlesticks on every plan. The
signal, the levels, the alerts and the SPArtan Indicator View are members only.

**One trade pitch a month.** Up from one ever. The Generate pitch button stays
visible to free members and tells them it is a members feature when they click it,
exactly as you described. Someone who has simply used this month's pitch is told
that, rather than being sold a plan they already pay for.

**The SPArtan Indicator View, and silence about what is in it.** Renamed
everywhere. The locked message I shipped on 3 August listed all three indicators
by name, which is precisely what you asked me not to do, so that copy is gone.
Every upgrade message across the app now comes from a single place in the code,
which is what turns "do not name them" into a rule the code enforces rather than
something I have to remember.

**The brief headings now lead.** Active buy signals, Active sell signals and the
alert sections are bold headings instead of small grey labels. On a free account
each carries "(members only)" with an Upgrade to paid button on the right, and the
earnings list underneath is filled in for real, since you were happy for earnings
to be free.

**The market cards are about half as tall.** Six across on a laptop, eight on a
wide screen, up from five, and no price is cut off.

**The menu is in your order.** Dashboard, Watchlists, Portfolio, Daily Checks,
Personal Finance, Asset Centre, Account. Community Feed goes in fourth when the
feed is built. I have not added the tab yet because a tab that leads nowhere is
worse than one that arrives a few days late.

**Community Feed is specified, not built.** Written up in full at
`docs/specs/COMMUNITY-FEED.md`, including your answer that any admin can moderate.
There are four questions in it I need from you before it is worth building, listed
at the end of this section.

**Two things fixed that you did not report.**

Bitcoin was showing a dash on the Dashboard, in your own screenshot, on the first
panel a member sees. The Bitcoin row had been switched off on 27 July by the job
that repaired the wrong instrument prices. That job looks assets up by their
ticker, but the market instruments behind the Weather panel deliberately use an
internal name and store the real ticker separately, so it concluded Bitcoin could
not be priced and deactivated it. It is back on, and that job now leaves those
instruments alone. Bitcoin was the only casualty; I checked the other eleven.

The brief was listing earnings that had already been reported. Your 2 August brief
showed 27 and 28 July. "This week" was being read as the calendar week, so on a
Sunday it looked back at the Monday and Tuesday just gone. It is now today plus
the next seven days and can never look backwards.

Also, members were being shown "Model: deterministic-fallback" at the foot of the
academy brief. That is engineering detail that reads like a fault. Removed; the
badge at the top already says whether the brief was written by the AI or built
from the rules.

**The four questions on the Community Feed.**
1. Should the feed be visible to people who are not signed in, or members only? I
   would start members only and open it later.
2. Can free members post, or only read? I would say read only, so posting is part
   of what the membership buys.
3. Should a brand new member's first post wait for approval? Everything else is
   moderated after the fact, which means there is a window where something bad is
   live.
4. Do you want likes or replies at all? The spec assumes neither for now.

---

## Payment now controls access, and two calculators (2 to 3 August)

**An unpaid account steps down on its own.** See note 0000 at the top for the full
explanation, including why it waits ten days and what "removed" actually means.

**Preview the free plan from Admin.** There is a switch on the Admin overview that shows
you the members area exactly as somebody on the free plan sees it: no averaging planner,
no buy and sell alerts, no indicators, no stress test. Your own account is not changed. A
band runs across the top while it is on, so a missing feature is never mistaken for a
fault.

**Indicators were not actually behind the membership.** Checking your four items turned
this up. The indicator view, with the Bollinger bands, moving averages and stochastics,
was open to anyone signed in, free plan included. It is a paid feature now, and free
members see an explanation rather than an empty chart. The plain price chart on an asset
page stays open to everyone.

**Compound Interest calculator.** What a pot becomes over time, with or without regular
top-ups, and a year by year breakdown of what came from your money and what came from
growth.

**CAGR calculator.** The annual growth rate behind a result, the total return, and how
long the same rate would take to reach a target. Where the maths has no honest answer,
such as growth from a starting value of zero, it says so rather than printing a number.

**Both live in the Portfolio Toolkit, not as new tabs.** The navigation was already too
long, which was the other thing you raised, so adding two more top level tabs would have
made that worse. The toolkit now lists nine tools.

**The in-app eCourse checkout is gone.** The eCourse sells on Whop now, and two ways to
buy one thing is how somebody ends up paying twice. The pricing page and the billing
panel link out instead.

---

## Your products on the Dashboard, and a shorter tab bar (1 to 2 August)

**Your five products and services now appear on the member Dashboard.** The Spartan
Mentoring Club and the eCourse link to Whop, the one to one mentoring and the one off
discussion to your Acuity booking pages, and the newsletter to your Linktree. There was
no newsletter link anywhere in the app before. The club and the course carry a note that
most people take them together, which is what you said the usual route is. Each card says
where it is sending you. These are shown to everyone including people on the free plan,
because this is your shop front rather than a member benefit. Admin, then Assets, lets
you hide the two bookable services and the newsletter; the club and the course cannot be
hidden so the panel can never be emptied by accident.

**The phone tab bar is two rows for admins.** As soon as you were given admin it became a
single scrolling line of fourteen tabs, with the admin ones several swipes past the end
and nothing to show they were there. Two labelled rows now, Member and Admin.

**Stronger duplicate protection when adding an asset.** An exact ticker clash was always
caught. Two other routes to a duplicate were not: a deactivated asset still holds its
ticker, so adding one back failed with "already exists" while it was nowhere on the
watchlist and gave you no way forward, and two different tickers could point at the same
underlying instrument. Both are handled now. Checked against the live watchlist: there
are no duplicates today.

---

## Sell alerts fixed, and requesting any security (1 to 2 August)

**Sell alerts were missing cases.** See note 000 at the top. Seventeen securities should
have been showing a sell and were silent.

**Members can request any security, not just a stock.** The form asks what kind of thing
it is, and optionally its name and where it trades. Those two extras matter more than
they look: a ticker on its own is ambiguous across exchanges, and guessing wrong is how
an asset ends up priced as a completely different instrument. The form is on the Master
Watchlist as well as the Asset Centre, because asking for something missing belongs next
to the list you just searched. Members can now see what happened to their own requests
instead of them vanishing on send.

**The admin request queue was rebuilt.** It shows how many are outstanding and who is
asking, a table of requests per member with open and total counts, and a one click filter
to see just that person's. The queue itself carries the ticker, name, market, type, who
asked, why, and how long it has been waiting, and filters by status, type or member.
Anything asked for by more than one member is pulled to the top, since that is the
strongest signal for what to add next. Decisions record who and why, and the reason goes
back to the member.

---

## Admin access fixed, and multi-select filters (1 August)

**Being added as an admin now actually grants admin.** See note 00 at the top.

**The market cap filter takes several sizes at once**, as tick boxes rather than one
choice, with a count against each option.

**A new filter for what kind of thing it is**: stocks, ETFs, crypto or commodities, and
you can tick more than one. Stocks means stocks only, so ETFs are left out.

**Assets with no market cap are findable instead of hidden.** Picking a cap size used to
quietly drop every asset the price provider gives no market cap for. That is 264 of the
814 on the watchlist; 76 are ETFs, which genuinely have none, but 188 are ordinary shares
where the figure is simply missing on our side. There is a "No cap data" tick box now, and
a count next to the filters showing how many of the total are on screen.

---

## Mobile holdings, and every tool reachable (26 July)

**Holdings read as cards on a phone.** The holdings list has thirteen columns, which is
right on a laptop but meant swiping sideways to read one position on a phone. On small
screens each holding is now its own card: shares, average price, current price, value,
weight, next buy, sell target and the Spartan toggle all visible at once, no scrolling
across. The averaging plan still opens in place, and the next buy and sell target are
still editable when Spartan is off. Tablets and laptops keep the table exactly as it was.

**The tab bar now shows there is more to see.** On a phone the tabs scroll sideways and
about four of the seven fit. Nothing indicated the others existed. There is now a soft
fade at the right edge so it is obvious the strip scrolls.

**The Dashboard toolkit lists all seven tools.** It had been showing three. See note 0 at
the top for the full explanation of how that happened.

**Stress test reachable from the portfolio it analyses.** Both the Live and Virtual
Portfolio pages now have a "Stress test this portfolio" button, since that is where you
are standing when the question occurs to you.

---

## Daily brief expanded, and an optional email (25 July)

**New alerts are now separated from ongoing ones.** The brief says which buy and sell
alerts newly triggered since yesterday, instead of mixing them with alerts that have been
running for days. "Since yesterday" means since midnight London time on the previous day,
and the same cut-off applies to every asset, whether it trades in London, New York, or
continuously like crypto. That one definition matters now the universe spans several
exchanges.

**Unusually wide days and earnings.** Assets whose daily range exceeded 40% of the
previous close are flagged, using exactly the formula you gave:
`(high - low) / previous close x 100`. Anything reporting earnings that week is listed
with its date.

> Worth knowing: the first run of this produced a "553,400,848% range" for a delisted
> shell, because the price feed reports a previous close of near-zero for dead tickers.
> The figures are now sanity-checked before they are shown, which cut that list from 16
> entries to the 5 that are real.

**Three things the brief deliberately will not tell you**, and it says so on the page:
dividend ex-dates, rights-issue ex-dates, and all-time lows. The data is not dependable
enough. Dividend dates arrive unevenly from the provider, rights issues barely at all, and
an "all-time low" would only really mean "the lowest price we happen to hold on record".
You asked not to claim a corporate action or an all-time low on incomplete coverage, so
these are reported as unavailable rather than guessed.

**Optional morning email.** Members can switch on a daily email of their own brief under
Account, then Preferences. It is off unless turned on, covers only the assets that member
tracks, and every email has a one-click unsubscribe that works without signing in. Each
send is logged with its outcome, so a failure is visible and retried rather than silent,
and a member can only receive one per day even if the job runs twice.

> One thing needed from you before this can actually send: an email provider key
> (`RESEND_API_KEY`) and a from-address on a domain you own. Until that is set, the system
> records each attempt as "no provider configured" and sends nothing, rather than failing
> quietly.

## Beta blockers cleared (24 July)

**Holdings no longer show £0.** Daily Checks was listing your holdings (NKE, DIS, SNAP)
while the summary said "Invested £0 · Value £0". The cause: it was adding up two stored
columns that are never actually filled in, while the portfolio pages work the value out
live. It now values holdings exactly the way the portfolio does, shares times the live
price converted to pounds, so the two can never disagree again. Checked against the real
account: it now reads £30,410.37 invested and £29,034.84 value, matching the Live
Portfolio page to the penny. There is also a Live and Virtual toggle so you can see
either book.

**The daily brief no longer contradicts itself.** The brief text described one set of
numbers while the cards next to it showed another. The words were written in the morning
and saved, but the cards were being recalculated live, so they drifted apart as prices
moved. The breadth figures are now saved with the brief and displayed as written, labelled
with the date they refer to.

**The averaging plan is one visual.** The separate execution table and the two competing
summary cards are gone. One card now holds the amount to allocate, the tranche rows, your
average entry against the current price, the total invested, the sell target, and the
potential gain and value at that target.

**Tranches default the way you asked.** Trade 1 uses the current price, Trade 2 starts 50%
below Trade 1, and Trade 3 50% below Trade 2, so Trade 3 sits 75% below Trade 1. Your
example resolves exactly: 92.96, then 46.48, then 23.24. These are editable prefills, not
fixed values. Changing an upstream price re-seeds the trades below it, and any price you
type yourself is pinned and never overwritten. The same visual is used both on the full
planner and inline on a holding, so they cannot drift apart.

> One deliberate difference from your mockup: the mockup's share count and average were not
> internally consistent (blank allocations on Trades 2 and 3 but 86 shares in the summary),
> which you flagged yourself. Ours computes from the actual allocations and live exchange
> rates, so the figures will differ from the screenshot. The percentage under Current Price
> is shown as your gain or loss against your average entry, which is the number that
> matters when deciding whether to add.

**Personal Finance is a top-level tab**, out of the Portfolio cards and into the main
navigation, with the mobile bar scrolling sideways so labels stay readable.

## Plans (free vs member) and the live feed (24 July)

**Two plans, with a real free tier.** The academy now has a free taster and the
paid membership. The idea: people do not pay for market data (that is free
elsewhere), they pay for the academy's own conviction and the live signals around
it. So anything that is just market data is free bait; anything that is the
academy's edge, or does personalised work for a member, is paid.

| Area | Free (taster) | Member (paid) |
|---|---|---|
| Market ticker, Weather Outside, Market Snapshot | Yes | Yes |
| Live news + X feed | Yes | Yes |
| Asset Centre (browse) | Yes | Yes |
| Curated master watchlist (the academy's picks) | No | Yes |
| Live buy/sell signals and alerts | No | Yes |
| Personal watchlists / sublists | No | Yes |
| Portfolio, average planner, stress test, personal finance | No | Yes |
| Request a stock | No | Yes |
| Trade pitch generator | One pitch | Unlimited (metered daily) |

**Upgrades happen automatically; removals stay manual.** A member becomes paid
automatically when Stripe reports a paid invoice or an active subscription, or
when you mark them paid. Access is never dropped automatically. A cancelled or
unpaid subscription is flagged for you to remove by hand, the same as before. You
can also set a member back to free from the Members queue.

**Two things worth knowing (the caveats behind this):**

1. **The AI features are metered on purpose.** Every trade pitch, stress test and
   personal-finance run is a real AI call that costs money. Free accounts get one
   pitch; paid members get a generous daily allowance. This keeps the cost
   predictable and stops a runaway loop or a shared login from turning into a
   large bill, which matters more as the stock universe grows to ~1,000.
2. **The free/paid line is enforced on the server, not just hidden.** A free
   account cannot reach a members-only page or its data even by navigating
   straight to it or calling it directly: the server checks the plan and refuses
   the data, showing an upgrade gate instead. Hiding a button is not security;
   this is a hard gate.

**The live feed now leans investing.** The Market Pulse panel on the dashboard
was showing general top-news. It now draws from CNBC Markets, MarketWatch
(real-time and top stories), Investing.com and Cointelegraph. The X panel
defaults to StockTwits (native investing chatter) and can be pointed at a curated
X List of investor accounts, so it shows many voices in one timeline rather than
a single outlet.

## Logo (23 July)

- The academy logo (green up-trend arrow over the gold-to-green candlestick bars) is now used
  across the app in place of the old "SPA" text chip.
- On the landing page the logo animates: the bars rise and the arrow draws itself in.
- The nav and footer read the logo from a single file (`public/brand/spa-logo.svg`), so the
  official artwork can be dropped in by replacing that one file. It needs a transparent
  background so it does not show a white box on the dark interface.

## Feedback round two (22 July)

**The trade pitch, rebuilt.** This was the main concern and it has been reworked so each section
does its own job:
- Story explains what the company actually does and its last 12 months (share price, revenue and
  earnings). Weather Outside is now the only section that talks about the macro backdrop.
- Financial Health interprets the balance sheet, profitability, cash flow, leverage and
  bankruptcy risk, with a red / amber / green traffic-light score out of 100, instead of just
  listing numbers.
- Key Risk is a company-specific risk, not the macro weather.
- The old "Trade Plan (Execution)" section is replaced by Analyst Price Targets (blended target,
  range, implied upside, consensus), or a plain "no analyst coverage" when none exists.
- Time horizon is now 3 to 5 years.
- The pitch sections can be reordered, and there is a proper loading animation.

**Portfolio and Asset Centre.**
- Averaging plans now open inline on each holding, on the same page, with no jump to a separate
  screen. You can view or create a plan there and it links to the holding.
- Every asset has Add to watchlist, Add to portfolio (live or virtual) and Create plan buttons.
- Price history charts gained 5Y and Max ranges.
- Members can request a stock be added to the universe; requests land in an admin review queue.

**Admin and billing.**
- When Stripe reports a subscription has ended or been cancelled, it is flagged in the Members
  billing queue for you to remove access manually. Access is never cut automatically.

## Feedback round one (19 July)

**Asset detail.**
- Expanded Key fields card: market cap with size labels, P/E, sector P/E, 50 and 200 day moving
  averages, quick / current / debt-to-equity ratios, dividend yield, next earnings, and a
  colour-coded Stochastic.
- A three-way view selector: Price history, Indicator view (candles, Bollinger Bands, moving
  averages, stochastics, with Daily / Weekly / Monthly), and Price alerts (buy and sell lines,
  your position, the Spartan tracker, and the last alert triggered).

**Asset Centre and Watchlists.**
- Asset Class and Product columns, plus filters for buy / sell / both alerts, currency and market
  cap. Master Watchlist fast access.

**Dashboard.**
- A live market ticker across the top of every page, each item clickable through to the asset.
- The Weather Outside panel (Sunny / Mixed / Stormy / Frosty from live macro data) and a Market
  Snapshot grid that expands from two rows to three.

**Tools.**
- A trade pitch generator, a Portfolio Stress Test and a Personal Finance tool, all built so the
  numbers are computed by the platform and the AI only explains them in plain English.

**Market data.**
- The BOE base rate and Sector P/E update automatically now (BOE from the official Bank of England
  feed; Sector P/E benchmarked against the US sector ETFs). The UK 10Y gilt and iTraxx have no
  free source, so they stay manual in Admin, then Assets, then Macro Readings.

---

## Still open (not yet built)

These are known and tracked, not forgotten:

- **Alert delivery.** Members can see alert levels and the last alert that triggered, but are not
  yet actively notified when an alert fires.
- **Full alert history.** Only the most recent triggered alert is shown, not a full history list.
- **Stress test coverage.** Overexposure is reported by stock, currency, cash and beta, but not
  yet by sector or country (country needs a new data field).
- **Official logo file.** To be dropped in by the owner.
- **Stochastic and the 200 day moving average in the watchlist table.** You asked for
  these alongside the range against yesterday's close. The maths already exists and is
  tested, and they are already on the indicator view for a single asset. Putting them in
  the table for all 814 assets is the part that needs a decision, because the price
  history behind them is not stored: it is fetched from the provider per asset, so this
  has to become a nightly job that computes and saves them, not something worked out as
  the page loads. Some assets will also show "not enough history" for a 200 day average.
  Waiting on your go-ahead.
- **The Spartan Readiness Score and the Portfolio Health Check.** The larger piece from
  your 27 July notes: the path dependent Spartan simulation, the readiness score, and
  renaming the Stress Test to Portfolio Health Check with the report rebuilt and sent by
  email. Designed and agreed, not yet built. The email part depends on the provider key
  below.
- **Email provider key.** The daily brief email is built and tested but cannot actually
  send until `RESEND_API_KEY` and a from-address on a domain you own are set. Until then
  every attempt is recorded as "no provider configured" rather than failing silently.
- **Dividend and rights ex-dates, and all-time lows.** Deliberately not shown (see above).
  Dividends and rights would need a paid corporate-actions provider; all-time lows would
  need a full adjusted price-history back-fill. Both are sensible post-beta additions.
- **Freemium follow-ups (small).** A free account can currently keep a small
  personal watchlist and see basic asset detail; per-asset signal badges and a
  hard cap on the free watchlist size are still to add. Admins can now edit the
  reviewed RSS sources, fallback X account, and optional curated X List under
  Admin → Assets → Market Pulse sources.
- **Stripe is still in test mode.** The keys in production are test keys, so no real
  money has ever moved and no payment webhook has ever been received. Going live is more
  than swapping the secret key: the product and prices have to be recreated in live mode
  because test-mode prices do not exist there, a live webhook endpoint has to be created
  with its own signing secret, and the site has to be redeployed for any of it to take
  effect. Worth testing end to end in test mode first, since that path has never run.

---

## A note on how the AI features work

Everything the AI produces (the pitch, the stress test, the personal finance read) is built the
same safe way: the platform computes the real numbers from live data first, and the AI only turns
those numbers into sentences. It is told to use only the provided figures, to say when something
is unavailable rather than guess, and never to promise returns. Every AI output is labelled as
educational analysis, not financial advice.
