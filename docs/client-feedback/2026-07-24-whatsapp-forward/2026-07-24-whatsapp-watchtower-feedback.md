# Watchtower Client Feedback — 2026-07-24 WhatsApp Forward

Source: forwarded WhatsApp text and screenshots from Stock Pickers Academy / Watchtower review.
Project: Watchtower / Stock Pickers Academy
Raw feedback: `raw/001-whatsapp-text-feedback.md`
Image evidence: `images/` and `image-manifest.md`
Audio status: no voice note/audio was received in this batch.

## Executive summary

- Show one unified averaging-plan visual matching the supplied ideal layout; this is the confirmed meaning of “unnecessary complexity.”
- Promote Personal Finance from a Portfolio card to a top-level navigation tab.
- Fix Daily Checks reporting `Invested £0 · Value £0` while holdings are visibly listed.
- Use the supplied tranche layout as the default/ideal; prefill Trade 2 at 50% below Trade 1 and Trade 3 at 50% below Trade 2.
- Confirm whether the product covers the intended universe of roughly 1,000 stocks, ETFs, and crypto assets from watchlists.
- Expand the Academy daily brief with day-over-day signals, corporate-action dates, extreme ranges, all-time lows, and watchlist earnings.
- Generate one common website brief daily; allow users to generate a personalised watchlist brief and optionally receive it by email.
- Freemium boundaries, subscriber entitlements, and subscriber management remain product decisions.
- Investigate a live investing tweets/news feed; the supplied POWR Twitter Feed link is only a candidate, not an approved implementation.
- Client position: after the immediate UI/default/data issues are complete, the product is close to beta launch.

## Amendments / additions

### 1. Simplify the averaging-plan output

Priority: P0
Evidence: `images/002-execution-plan-summary.jpg`, `images/006-ideal-tranche-defaults.jpg`

- The end user wants one visual only, matching the supplied ideal screenshot.
- Do not show separate or duplicated plan/result visuals.
- The single unified visual contains allocation, tranche inputs, summary metrics, sell target, and projected target outcome.

### 2. Make Personal Finance a top-level tab

Priority: P0
Evidence: `images/003-personal-finance-card.jpg`, `images/004-portfolio-nav-annotated.jpg`

- Move Personal Finance out of the Portfolio feature-card area.
- Add it to the main/top navigation alongside the existing product areas.
- Mobile navigation needs to remain usable with the additional item; do not simply compress labels until unreadable.

### 3. Correct the holdings summary

Priority: P0 / bug
Evidence: `images/005-daily-checks-holdings-zero-annotated.jpg`

- Daily Checks currently displays holding pills for NKE, DIS, and SNAP while the summary says `Invested £0 · Value £0`.
- The summary must derive from the same portfolio/holding source as the displayed holdings.
- Verify whether this is a live-vs-virtual portfolio mismatch, missing valuation data, or a presentation/calculation bug.

### 4. Use the ideal tranche defaults and layout

Priority: P0
Evidence: `images/001-input-parameters-tranches.jpg`, `images/006-ideal-tranche-defaults.jpg`

Required default:
- Trade 1 uses the selected/current base entry price.
- Trade 2 defaults to a 50% drop from Trade 1.
- Trade 3 defaults to a 50% drop from Trade 2.
- Example from screenshot: Trade 1 $92.96 → Trade 2 $46.48 → Trade 3 $23.24.
- Treat these as editable prefilled defaults, not fixed values.
- Use the compact ideal presentation shown in image 006.

Calculation/UX guardrails:
- Make clear that the percentage is sequential: Trade 3 is 50% below Trade 2, equivalent to 75% below Trade 1.
- Recalculate downstream default prices when an upstream price changes unless the downstream value has been manually overridden; exact override behaviour needs a product decision.
- Do not trust the screenshot’s derived share totals without verifying the calculation, because blank allocations are shown for Trades 2 and 3 while the summary reports 86 shares.

### 5. Confirm the supported asset universe

Priority: P0 before beta
Evidence: client question; possible visual context in `images/007-portfolio-allocation.jpg`

- Confirm whether watchlists, alerts, portfolio tools, and briefs operate across the intended roughly 1,000 assets.
- Scope explicitly includes stocks, ETFs, and crypto.
- Verify actual provider/database coverage rather than answering from UI copy.
- Confirm whether all asset types support the same features; dividends, rights issues, earnings, fundamentals, and exchange calendars do not apply uniformly to crypto.

### 6. Expand the Academy daily brief

Priority: P1
Evidence: `images/008-academy-daily-brief.jpg`

Add:
- New buy alerts compared with yesterday.
- New sell alerts compared with yesterday.
- Upcoming dividend ex-dates.
- Upcoming rights-issue ex-dates, if reliable data is available.
- Assets whose prior-day intraday range exceeded 40% of the previous close.
- Assets that hit all-time lows.
- Watchlist stocks reporting earnings during the current week.

Specified range calculation:

`intraday range % = (high - low) / previous close × 100`

Behaviour rules:
- Define the comparison snapshots and timezone/session boundary for “yesterday.”
- Label newly triggered signals separately from signals that remain active.
- Avoid claiming a corporate action, earnings date, or all-time low when provider history/coverage is incomplete.
- Fix the current daily-brief consistency issue: image 008’s narrative reports 5 advancers/6 decliners, while the visible statistic cards report 1 advancer/9 decliners.

### 7. Daily generation and email delivery

Priority: P1
Evidence: client text linked to `images/008-academy-daily-brief.jpg`

Proposed model:
- Generate the common Academy/site-wide brief once per day and let all visitors view that cached result.
- Do not regenerate the same common brief separately for every visitor.
- Give signed-in users an option to generate a personalised brief for their watchlist.
- Allow users to opt into a daily email containing their personalised watchlist brief.

Data/system implications:
- One scheduled site-wide generation job and persisted daily result.
- Per-user watchlist generation with caching/deduplication.
- Email preferences, consent/unsubscribe handling, send status, retry policy, and delivery provider.
- Timezone/cutoff policy for when “daily” briefs are generated and delivered.

### 8. Freemium and subscriber management

Priority: P1/P2 product decision

Decide:
- Which site-wide brief content remains publicly/free viewable.
- Whether personalised watchlist generation is free, metered, or paid.
- Whether daily personalised email is paid-only.
- Usage limits for AI-generated summaries.
- How subscription entitlement is granted and removed.
- How administrators inspect subscriber status and failed entitlement changes.

Recommendation for beta framing:
- Keep the common daily brief free.
- Put personalised watchlist briefs and daily email delivery behind a paid entitlement or tightly limited beta access.
- Avoid building elaborate tiering before real usage data exists; one free tier and one paid/beta entitlement is enough initially.

### 9. Live investing tweets/news feed

Priority: P2 / discovery
Evidence: client-supplied candidate URL: `https://www.powr.io/twitter-feed-website-app?utm_src=watermark-twitter-feed`

- Investigate a live or near-live feed combining investing news and social posts.
- The supplied POWR Twitter Feed widget is a candidate only.
- Before implementation, assess moderation, relevance filtering, reliability, branding/watermarks, mobile performance, privacy/cookie impact, licensing/API restrictions, and whether the feed can be constrained to approved sources or watchlist symbols.
- A curated news feed is safer for beta than an unfiltered investing-tweet stream.

## Data / integration implications

- Historical signal snapshots are required to identify new buy/sell alerts versus yesterday.
- Corporate actions require a dependable provider for dividend and rights-issue ex-dates.
- Earnings-week data requires symbol/calendar coverage and exchange-aware dates.
- All-time-low detection requires sufficiently complete adjusted historical data and a documented definition.
- Extreme range detection requires prior-day high, low, and previous close for every covered instrument.
- Site-wide and per-user daily briefs need scheduled jobs, persisted outputs, deduplication, and freshness/status metadata.
- Email alerts need preferences, templates, unsubscribe controls, retries, and delivery observability.
- Subscriber management needs entitlement state linked to the billing/subscription source.
- Cross-asset support must account for feature differences between equities, ETFs, and crypto.

## Priority pass

### P0 / beta blockers and immediate amendments

- Replace the current averaging-plan presentation with one unified visual matching the confirmed ideal layout.
- Add Personal Finance to top navigation.
- Fix the holdings £0 inconsistency.
- Implement the ideal tranche defaults/layout, including sequential 50% price drops.
- Audit and document actual coverage across the intended stock/ETF/crypto universe.

### P1 / bounded beta features

- Add the requested daily-brief intelligence where data coverage is reliable.
- Generate and cache one site-wide brief daily.
- Support personalised watchlist brief generation.
- Add opt-in daily email delivery.
- Define a minimal free-versus-paid entitlement model.

### P2 / post-beta or discovery

- Live investing tweets/news feed.
- More elaborate subscription tiers/admin tooling.
- Rights-issue coverage if the current provider cannot supply reliable events.

## Open questions / unclear points

- Should Trade 2/3 default prices continue recalculating after the user manually edits one of them?
- Which portfolio should Daily Checks summarise when both live and virtual portfolios exist?
- What is the authoritative intended universe: exactly 1,000 assets, approximately 1,000, or every asset available from the provider?
- Which watchlist is used for personalised daily email when a user owns multiple lists?
- What timezone and market-session cutoff defines yesterday and the daily generation time?
- What look-ahead window should apply to ex-dates: next day, seven days, or current week?
- Does “hit all-time lows” mean intraday low, closing low, adjusted low, or provider-history low?
- What entitlement system/billing source will control free versus paid access?
- Should the social/news feed be curated globally, tailored to a user’s watchlist, or both?

## Image references

See `image-manifest.md` for all eight copied screenshots and their associations.
