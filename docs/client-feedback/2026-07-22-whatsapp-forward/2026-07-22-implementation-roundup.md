# What's new in Stock Pickers Academy - follow-up update

This update implements the feedback you sent on 22 July (captured in
[2026-07-22-whatsapp-watchtower-feedback.md](2026-07-22-whatsapp-watchtower-feedback.md), with the raw voice
note and text in [raw/](raw/) and your screenshots in [images/](images/)). Each section links back to the
numbered item of that feedback.

Everything described here is live on the platform now. Admins can also see this as a "What's New" release note
inside the app (Admin, then What's New), with a link to each change.

---

## 1. The trade pitch, rebuilt
*Your feedback: sections 3, 4, 5, 6*

The pitch was the main concern, and it has been reworked so each section does its own job and stops repeating
the market weather:

- **Story** now explains what the company actually does and summarises the last 12 months (share price move,
  revenue growth, earnings growth). For Disney, for example, it describes the business and notes the shares are
  down about 23% over the year with earnings down 29.8%.
- **Weather Outside** is now the only section that talks about the macro backdrop. It no longer bleeds into
  Story, Key Risk or Financial Health.
- **Financial Health** now interprets the numbers instead of listing them. It covers the balance sheet,
  profitability, cash flow, leverage and bankruptcy risk, and gives each a **red / amber / green traffic-light
  rating** plus an overall score out of 100. It says whether things are strong, mixed or weak, not just what the
  figures are.
- **Key Risk** is now a company-specific risk (for Disney, negative earnings growth), not the macro weather.
- **Analyst Price Targets** replaces the old "Trade Plan (Execution)" section. It shows the blended analyst
  target, the high/low range, the implied upside and the consensus rating. If a stock has no analyst coverage,
  it says so plainly.
- **Time Horizon** is now 3 to 5 years, matching the academy's investing framework.

Two smaller pitch improvements you asked for:

- **You can reorder the sections.** Each heading has up/down arrows to move it, and the copied pitch follows your
  order.
- **A proper loading animation** replaces the static loading text while the pitch is being written.

As before, all the numbers are computed by the platform (signals, indicators, the financial-health score, the
analyst figures); the AI only turns them into sentences, and is told to use only the provided numbers and never
to promise returns.

## 2. Averaging plans open inline on your holdings
*Your feedback: section 1 (voice note)*

On the Portfolio holdings table, the averaging plan no longer sends you to a separate page. Each holding now has
a dropdown that **expands the plan inline, directly below that holding**. If a plan exists, you see its tranches,
allocations, executed status and target sell there and can edit them. If there is no plan yet, you can create one
in the same place and it appears immediately, linked to the holding, with Spartan Strategy switched on. A link to
the full planner is still there if you want the larger view.

## 3. Asset Centre action buttons
*Your feedback: section 7*

Every asset now has three action buttons: **Add to watchlist**, **Add to portfolio** (with a live or virtual
choice, plus shares and average price), and **Create plan**.

## 4. 5Y and Max chart ranges
*Your feedback: section 8*

Price history charts now include **5Y** and **Max** alongside 1mo, 3mo, 6mo and 1y. Max shows the full available
history (for Disney, back to the 1980s).

## 5. The Stock Pickers Academy logo
*Your feedback: section 9*

The plain "SPA" text chip in the header (and on the marketing pages) has been replaced with the academy's chart
logo mark. Note: this is a close recreation drawn in-app for now. When you send the official logo file, it swaps
in everywhere in one step.

## 6. Requesting a stock
*Your feedback: section 10*

There is now a **Request a stock** box at the bottom of the Asset Centre. Members enter a ticker and an optional
reason, and the request lands in an admin review queue (Admin, then Assets, then Stock Requests) where you can
mark it reviewed, added or declined.

## 7. Subscriptions ending
*Your feedback: section 11*

When Stripe reports that a subscription has ended, been cancelled, or is set not to renew, the platform now
**flags it in the Members billing queue** for you to act on. In keeping with the existing rule, access is never
cut automatically; an admin removes it manually using the existing member controls. If the member pays again,
the flag clears itself.

## Still to confirm or provide

- **Official logo file**: send the real Stock Pickers Academy logo (SVG or PNG) and we will replace the
  recreation.
- **Subscription offboarding**: the flag-and-manual-remove flow is in place. If you later want a fuller admin
  workflow (for example a one-click "remove access" straight from the billing flag), we can add it.

---

*Update shipped 22 July 2026. Source feedback: [2026-07-22-whatsapp-watchtower-feedback.md](2026-07-22-whatsapp-watchtower-feedback.md).*
