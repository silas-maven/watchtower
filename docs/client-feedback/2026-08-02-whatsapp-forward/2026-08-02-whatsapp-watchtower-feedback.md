# Client feedback, 2 August 2026 (WhatsApp forward, relayed manually)

Source: Debodun SF (academy owner), WhatsApp messages 13:58 to 16:33 on 2026-08-02,
plus six screenshots. Relayed by Kyser. Captured before implementation, deliberately,
because the raw messages are terse and several need interpreting.

**Nothing in this document is built yet.**

---

## The raw messages, verbatim

> [13:58] These can be freemium
>
> [14:00] Can you put these two both under personal finance aswell pls
> Can you out the headings in bold 'Active buy signals' etc then for freemium just
> out in brackets (members only) with a button on right to 'upgrade to paid'
> Earnings but is fine for freemium ✅
>
> [14:15] Restrict alerts from Assets but want them to see assets just not signals
> same with generate pitch want them to see the button but to then get told on
> clicking it is members only
>
> [14:18 / 14:20] Watchlist is lead gen so fine for freemium but alerts and tools
> around it as well as indicator view (paid feature) rename indicator view to
> SPArtan Indicator view
> Dont name the 3 indicators just say the SPArtan indicator view come with paid ..
>
> [14:21] Im ok with freeplan involves 1 trade pitch a month
> Rather than just 1 trade pitch
>
> [14:22] Ok for freemium asset chart to toggle between line or candlesticks only
>
> [16:06] Yo bro one thing missing is on the feed members should be able to 'tweet'
> post … and members posts show up in a public feed with an alias - it should show
> featured post on rotation 5 secs … then like maybe an extra tab that says
> community feed here
>
> [16:13] ReOrder headings
> Dashboard / Watchlists / Portfolio / Community Feed / Daily Checks /
> Personal Finance / Asset Center / Account
>
> [16:16] Can we make this smaller to fit more

---

## Interpreted work items

### A. Freemium boundary is being redrawn

The owner is moving the line. The current build gates more than he wants. His model
is **watchlist and tools are lead generation; the signals and the alerting are the
product**.

| Thing | Now | Wanted |
| --- | --- | --- |
| Personal Finance | Paid | **Free** |
| Compound Interest calculator | Paid | **Free** |
| CAGR calculator | Paid | **Free** |
| Master Watchlist | Paid (paywalled) | **Free** ("lead gen") |
| Asset Centre asset rows | Free | Free, unchanged |
| Asset Centre SIGNAL column | Free (ungated) | **Paid** |
| Generate pitch button | Hidden/gated | **Visible to free**, tells them it is members only **on click** |
| Trade pitches on free | 1 for life | **1 per month** |
| Asset chart, free | Full | **Line or candlestick toggle only**, no indicators |
| Indicator view | Paid (just gated) | Paid, and **renamed** (see C) |
| Alerts and tools around the watchlist | Paid | Paid, unchanged |
| Daily brief earnings section | n/a | **Free** |

Two screenshots confirm the intent: the "All assets (815)" table with the SIGNAL
column circled, and the free-preview paywall on Watchlists which he now does not
want there.

**Note the tension to resolve:** "restrict alerts from Assets" and "watchlist is fine
for freemium" pull against each other, because the master watchlist table shows a
signal badge per row. Reading both together: the **list of assets** is free, the
**signal state** is not, wherever it appears.

### B. Daily brief / market breadth presentation

From the circled screenshot of the brief:

1. **Bold the headings.** "Active BUY signals", "New signal entries today", "New buy
   alerts since yesterday", "New sell alerts since yesterday", "Extreme daily ranges",
   "Reporting earnings this week".
2. **For free users**, append `(members only)` in brackets to the restricted lines,
   with an **"Upgrade to paid" button on the right**.
3. **Earnings stays free.** He ticked it explicitly.

Already-known defects in the same panel, to fix while in there (from the 27 July
review, task #32):

- The member-facing `Model: deterministic-fallback` footer should not be shown to
  members at all.
- **The earnings window is wrong.** The screenshot is the 2026-08-02 brief and it
  lists earnings dated 2026-07-27 and 2026-07-28, both already past. Cause is
  `lib/server/briefHighlights.ts` computing `weekStart` as the Monday of the calendar
  week rather than a forward window.
- Percentages need rounding (the brief prints raw floats elsewhere).

### C. Indicator view: rename, and stop naming the indicators

- Rename **"Indicator view"** to **"SPArtan Indicator view"** everywhere.
- **Do not name the three indicators publicly.** Bollinger Bands, moving averages and
  stochastics must not appear in any copy a non-paying user can read. He treats the
  specific indicator set as proprietary.
- The upgrade copy should say the SPArtan Indicator view comes with the paid plan,
  and nothing more.

**This contradicts what I shipped on 3 August.** The locked-state panel I added to
`components/assets/IndicatorView.tsx` names all three in its upgrade message. That
copy has to change. The toggle labels inside the paid view are presumably fine, since
only paying members see them, but confirm.

### D. Community feed (new feature, the largest item)

- Members can **post**, described as "tweet".
- Posts appear in a **public feed under an alias**, not the member's real name.
- A **featured post rotates every 5 seconds**.
- Reached from a new **"Community Feed"** tab.

Open questions to settle before building:
- Is the public feed genuinely public (signed out) or members-visible only? "Public"
  plus "alias" suggests signed-out visitors can see it, which makes it lead gen.
- Alias: self-chosen once, or generated? Changeable?
- Moderation. An open post box on a financial platform needs at least an admin
  delete, ideally a report path and a hold-for-review option. Not stated by the owner,
  but I should not ship an unmoderated public feed. Flag it.
- Can free members post, or read only?
- Does posting count as financial promotion? Worth raising with him, given the
  platform is already careful never to give advice.

### E. Navigation reorder

Exact order he gave:

1. Dashboard
2. Watchlists
3. Portfolio
4. Community Feed
5. Daily Checks
6. Personal Finance
7. Asset Centre
8. Account

Current order is Dashboard, Daily Checks, Watchlists, Asset Centre, Portfolio,
Personal Finance, Account. So this is a genuine reshuffle, plus the new tab.

### F. Dashboard "Weather outside" cards are too big

"Can we make this smaller to fit more." The screenshot circles the market cards under
Market Mood: GBP/USD, S&P 500, Gold, Bitcoin. He wants more of them visible without
scrolling, so reduce the card size / tighten the grid rather than remove anything.

**Also visible in that screenshot and worth checking:** Bitcoin (BTC) shows a dash
for both price and change, so it is not resolving. Gold shows 4,107.00. Not raised by
the owner, but it is on the first screen a member sees.

---

## Sequencing note

Items A, B, C, E and F are adjustments to things that exist. D is a new feature with
real design questions and a moderation obligation, and should be specified before it
is built rather than improvised.

The freemium changes in A must be made in one pass with the entitlement helpers, not
page by page, or the boundary will drift the way the Dashboard tool list did.
