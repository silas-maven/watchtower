# Stock Pickers Academy - what's been built

A plain-English summary for the owner of everything shipped so far, newest first.
Each round below is also viewable inside the app under Admin, then What's New, with a
link to each change. Per-round detail lives in the dated folders in this directory.

---

## Notes and things needing your attention

Read this bit first. Everything here is either an action only you can take, or a
judgement call worth knowing about before beta.

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
- **The ~1,000-stock universe: ready to load, not yet loaded.** Your SPArtans watchlist
  (1,067 tickers) has been checked against the live price provider. **866 resolve and
  can be priced today** (702 shares, 83 crypto, 81 ETFs), including the London listings
  and the crypto pairs. 199 do not resolve, and **158 of those are the rows your own
  sheet shows as `#N/A`**, which means they have been delisted or renamed (for example
  Activision, taken over by Microsoft). So roughly 95% of the names your sheet still
  recognises are covered. The full unresolved list is saved to
  `reference/universe-unresolved.csv` for you to review or correct. The load itself is
  one command and is being held until you say go, because it adds those assets to the
  live Asset Centre immediately.
- **Email provider key.** The daily brief email is built and tested but cannot actually
  send until `RESEND_API_KEY` and a from-address on a domain you own are set. Until then
  every attempt is recorded as "no provider configured" rather than failing silently.
- **Dividend and rights ex-dates, and all-time lows.** Deliberately not shown (see above).
  Dividends and rights would need a paid corporate-actions provider; all-time lows would
  need a full adjusted price-history back-fill. Both are sensible post-beta additions.
- **Freemium follow-ups (small).** A free account can currently keep a small
  personal watchlist and see basic asset detail; per-asset signal badges and a
  hard cap on the free watchlist size are still to add. An admin screen to edit
  the news sources and the X list is also not built yet (they are set in
  configuration for now).

---

## A note on how the AI features work

Everything the AI produces (the pitch, the stress test, the personal finance read) is built the
same safe way: the platform computes the real numbers from live data first, and the AI only turns
those numbers into sentences. It is told to use only the provided figures, to say when something
is unavailable rather than guess, and never to promise returns. Every AI output is labelled as
educational analysis, not financial advice.
