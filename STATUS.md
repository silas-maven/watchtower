# Watchtower (SPA - Stock Pickers Academy) — Status

## Current State
Deployed at watchtower-virid.vercel.app (Next.js 16 + Prisma + Supabase `watchtower` schema + Clerk + Stripe). Member app (`/app/*`) and admin console (`/admin/*`) functional. Work paused 2026-05-14; major feature push 2026-06-12/13 (Product v2). Typecheck clean, 26 unit tests pass.

## 2026-06-14 — Watchlists custom modal + SSR perf + CI secret
- **CI fix (no code):** the `market-refresh` GitHub Action was failing with "CRON_SECRET repo secret is not set". Root cause: `CRON_SECRET` was set as a **Vercel env var** but the workflow reads `${{ secrets.CRON_SECRET }}` — a **GitHub Actions repo secret** (separate store). Set the repo secret on `silas-maven/watchtower` from local `.env` (value matches Vercel) via `gh secret set` as account 2. Next run passes.
- **Custom modal:** new `components/ui/Modal.tsx` — themed portal dialog (dark card / gold primary, Escape + backdrop-click close, body-scroll lock). Replaced BOTH native browser dialogs on the watchlists page: `window.prompt` (new list) → input modal; `window.confirm` (delete) → confirm modal.
- **Watchlists SSR (perf):** the page was the only client-side fetch waterfall — painted empty, then fired two `no-store` API calls on mount, each re-running Clerk auth + `getDefaultWatchlist` + the main query (double-auth + "Loading…" flash = the "lists slow to load"). Now server-rendered: new `lib/server/watchlists.ts` (`getWatchlistsPageData` = one auth upstream, then assets + lists in parallel), `app/app/watchlists/page.tsx` is a server component feeding a thin client island `components/watchlists/WatchlistsClient.tsx`. ~6 DB roundtrips + 2 HTTP → 2 parallel queries, data on first paint. Master list now reflects owner overrides (`effectiveSignalState`) and triggers `ensureFreshMarketData` like other data pages.
- **Perf diagnosis (rest):** DB is pooled + co-located (`pooler.supabase.com:6543`, `pgbouncer=true`, eu-central ↔ `fra1` functions) — not the bottleneck; all other pages already server components. Remaining prod slowness is most likely serverless cold starts. Open follow-ups (not done): convert the other 3 client-waterfall tool pages (live/virtual/average portfolios), add `loading.tsx` skeletons, keep-warm ping.
- Verified: typecheck ✓, lint ✓, `next build` ✓ (`/app/watchlists` now ƒ dynamic SSR). Not browser-tested (Clerk-gated). Needs a deploy to reach prod.

## Product v2 build (2026-06-13) — what shipped this session
- **Market data engine (Phase 1):** replaced the dead Yahoo v7 HTTP path with `yahoo-finance2` (`lib/market/yahoo.ts`), symbol mapping `LON:VLS`→`VLS.L` (`lib/market/symbols.ts`, per-asset `quoteSymbol` override), CoinGecko crypto fallback, per-asset `fetchError` capture + `JobRun` audit, currency-mismatch guard, market-hours gating (`lib/time.ts`), on-view freshness (`lib/server/marketFreshness.ts`), GitHub Actions scheduler (`.github/workflows/market-refresh.yml`, every 10 min in hours). VERIFIED LIVE: 14/19 assets pull real quotes; the 5 failures are delisted tickers (TOOP/CWBR/HZD/GNUS/CPE) correctly flagged.
- **Summaries (Phase 2):** AI brief now captures + logs `generationError` (the silent-failure bug is fixed; root cause = blank `OPENAI_API_KEY`). Deterministic per-member brief (`lib/server/memberBrief.ts`) on Daily Checks. Owner weekly digest (`lib/ai/weeklyDigest.ts`) + cron (Mon 07:00) + regenerate. Admin controls (`/admin/ai-briefs` toggles via `PlatformSetting`, `lib/server/settings.ts`).
- **Manual signal override (Phase 3a):** owner forces/suppresses BUY/SELL per asset (`effectiveSignalState` in engine, `/api/admin/assets/[id]/override`, "Owner call" badge), emits manual SignalEvent, AdminAssetAction audit. Asset CRUD completed: dark-themed `AssetCatalogManager`, `quoteSymbol`, verify-symbol endpoint, archive/delete.
- **Admin member intelligence (Phase 3b):** `lib/server/memberIntelligence.ts` (declared portfolios, holdings value, most-held/most-watched, recent closed positions). `/admin/members` restructured into tabbed hub (Overview | Members | Billing | Audit) via `MembersHub`.
- **Stripe (Phase 3c):** checkout takes `{ product: membership | ecourse }` (sub vs payment mode), `checkout.session.completed` handled, billing portal route, member subscribe/manage UI (`BillingPanel` on `/app/account`). No-auto-cut rule preserved.
- **Member sublists + Virtual Portfolio (Phase 4):** members CRUD multiple personal lists from the read-only master list (`/api/me/watchlists*`, rebuilt `/app/watchlists`). Virtual Portfolio paper-trading tool (`/app/portfolio-tools/virtual-portfolio`, `lib/server/virtualPortfolio.ts`). Blotter parity engine `lib/portfolio.ts` (summary strip, 4-tranche averaging w/ halving + multi-currency) + `profitGBP`/`priceVsYearHighPct` in `lib/formulas.ts`. 12 new unit tests.
- **Alert delivery (Phase 8):** INERT skeleton only (`lib/alerts/dispatch.ts`), gated behind `alert_delivery_enabled` (default false), in-app Notifications + stubbed channels. Not live, not documented for users — pending owner decision.
- **Schema:** additive migration `20260612030000_product_v2_foundation` applied to prod (SignalOverride, PortfolioKind, PlatformSetting, WeeklyDigest, JobRun, virtual-portfolio fields, quoteSymbol, fetchError, generationError, 4th averaging tranche). Did NOT drop the stray `dossier_visitors` table (belongs to another project, 2 rows).
- **AI providers (2026-06-13):** shared caller `lib/ai/llm.ts` tries OpenRouter first (`openai/gpt-oss-120b:free`) then OpenAI (`gpt-5-nano`) as fallback, both via Chat Completions JSON mode. dailyBrief/weeklyDigest/ai-insight all migrated onto it. 120s OpenRouter timeout → fails over to OpenAI on hang; `maxDuration` 300/180 on all AI routes (free model latency is ~160s). Em/en dashes stripped from model output (house style). VERIFIED LIVE: real brief persisted via gpt-oss-120b (`isFallback:false`), accurate movers, dash-clean. `OPENAI_API_KEY` no longer mandatory in prod env check (either provider satisfies). Note: dropped strict json_schema (OpenAI Responses-only) for json_object mode for cross-provider compat; server-side validation makes this safe.
- **Finance news (Phase 5):** `lib/news/aggregator.ts` aggregates 4 free RSS feeds (BBC Business, CNBC, MarketWatch, Cointelegraph) with entity decoding + dash normalisation + dedupe; `/api/news` (member-gated); `NewsFeedCard` (auto-refresh 10 min) + `XTimelineCard` (official embed, 5s fallback) on the member dashboard "Market Pulse" row. Admin-configurable via `news_feed_urls` / `news_x_handle` settings. VERIFIED: 40 clean items in 3.5s.
- **Marketing pages (Phase 6):** rebuilt landing (`app/page.tsx`) + new `app/pricing` to advanced standard. WebGL hero (`components/marketing/HeroCanvas.tsx`: gold wireframe market terrain, three + @react-three/fiber) loaded `ssr:false` behind content (LCP-safe), reduced-motion fallback via `useSyncExternalStore`, tab-hidden pause, DPR cap 2. GSAP ScrollTrigger reveals (`Reveal.tsx`). Shared `MarketingNav`/`MarketingFooter` (not-financial-advice disclaimer). One `TopNav` line so `/pricing` bypasses the app shell. Copy: UK English, no em/en dashes, no banned words, no return promises.
- **NOTE on subagents:** the two background subagents originally spawned for news + marketing were orphaned at a session-context boundary (did not survive) and produced nothing; both phases were rebuilt directly in the main session.

## Feedback round (2026-06-13, post-review) — all 8 items addressed
- **Sign-in routing:** modal sign-in/up now carry `forceRedirectUrl="/app"` (was leaving users on the landing page).
- **Mock data purged:** deleted dead `lib/mock.ts`; non-admin dashboard now values real holdings (`lib/server/livePortfolio.ts`) or shows an empty state, not a hardcoded £5,000 (removed `getPortfolioSummary`).
- **Live data on asset pages:** archived 5 dead/broken tickers (CWBR/GNUS/HZD/TOOP/CPE — CPE was the "0 MXN" stale Mexican listing); Asset Library reskinned dark with 14 live assets; asset detail rebuilt with a real Yahoo historical chart (`fetchYahooChart`, `/api/assets/[id]/history`, range selector) replacing the empty sparse one.
- **Live Portfolio:** new real-holdings view + API (`/app/portfolio-tools/live-portfolio`, `/api/me/portfolio/live`), the missing blotter "Live Portfolio" tab.
- **Performance:** `getAssetsForDashboard` cut from 30 snapshots/asset to 1 with a projected select (was building an unrendered sparkline); asset-detail API trimmed to 1 snapshot; watchlist-add de-duplicated + usage tracking made fire-and-forget. (Some of the observed lag was `next dev` per-route compile, gone in build.)
- **News rail:** `MarketPulseRail` — news + X moved to a collapsible sticky right rail on the Command Centre (collapse persists to localStorage); Portfolio Tools tidied into a card row.
- **Members table:** split mislabeled "Portfolio Signal" into aligned Declared/Avg columns; actions made contextual (3-4 relevant buttons, not 6 always-on).
- **Base currency (app-wide):** `Profile.baseCurrency` (migration `20260613040000_profile_base_currency`), `lib/money.ts` + `lib/server/displayCurrency.ts`, Account setting (`BaseCurrencySelect` + `/api/me/profile`), Average Planner currency dropdown (defaults to base), and GBP→base conversion on the dashboard cards, Live Portfolio and Virtual Portfolio displays.
- Blotter tab mapping (answer to owner): Virtual Portfolio / Average Planner / Trade Journal (Closed Positions) / Due Diligence all present; Live Portfolio was the gap, now built.

## Verification (2026-06-13, full)
- `npm run typecheck`: clean. `npm run lint`: 0 errors (7 pre-existing warnings). `npm run test`: 26/26 pass. `npm run build`: success, all routes compile.
- Live-DB verified: market refresh (14/19 real quotes), member brief, daily brief + weekly digest via OpenRouter gpt-oss-120b (dash-clean), member intelligence, news aggregator.

## Goal (set 2026-06-12, scoping decisions locked with Kyser)
Take SPA from POC-grade to a production subscription product:
1. **Admin command of the platform**: aggregated view of member portfolios/trading activity; full CRUD control of the master asset list (all asset types); **manual signal override** (owner can force/suppress BUY/SELL regardless of calculation, clearly badged) on top of the existing owner-set target entry/exit levels.
2. **Member sublists** (DECIDED): master list is admin-controlled and read-only for members; members create their own multiple personal sublists of securities to track from it. No admin-curated themed lists for now.
3. **Real live market data** (DECIDED: 1-5 min polling in market hours via external free scheduler hitting the CRON_SECRET-guarded refresh endpoint). Current Yahoo path is dead, needs provider replacement + abstraction. Implement remaining Portfolio Blotter workbook tabs as user-facing tools (Virtual Portfolio missing; average calculator / closed positions / due diligence exist).
4. **Finance news card** (DECIDED: BOTH free news APIs/RSS aggregation AND an official X embedded timeline).
5. **Summaries**: fix AI brief generation in prod (currently 100% deterministic fallback, errors swallowed); add member-personalised summary (their sublists + portfolio) and owner weekly digest, with admin controls over these functions.
6. **User management**: layout cleanup; complete Stripe (checkout.session.completed handler, membership vs eCourse product selection); keep the rule "payment failure alerts admin, never auto-cuts access".
7. **Marketing surfaces**: landing/pricing pages rebuilt to advanced standard (Three.js/WebGL/GSAP, premium fintech aesthetic, artistic direction delegated to Claude). Note: no pricing page exists yet.

### Build order
Phase 1 market data engine (everything depends on real prices) → Phase 2 summaries (fix AI + personalised member brief + owner weekly + controls) → Phase 3 admin power (asset CRUD complete, manual override, member portfolio aggregation, user mgmt layout, Stripe completion) → Phase 4 member sublists + Virtual Portfolio tool → Phase 5 news card (RSS + X embed) → Phase 6 marketing pages.

## Session Log

### 2026-06-12
- Full codebase familiarisation + verification pass. Tests 14/14 pass, typecheck clean.
- **Found: market data pipeline has never worked in prod.** All 2,128 asset snapshots since the 12 May spreadsheet import are `source: fallback-previous` (zero successful Yahoo/CoinGecko fetches). Yahoo v7/v8 endpoints return 429 even with browser UA. Prices are frozen at import values; signal events stopped 15 May; the daily brief reports the same "8 buy signals" every day.
- **Found: AI brief never engages in prod.** All 111 daily briefs are `isFallback: true` (deterministic template). Cron + persistence layer works (brief generated daily 07:00 UTC). Cause unknown (env key missing on Vercel or API failure) because errors are swallowed silently in `lib/ai/dailyBrief.ts`.
- **Verified: user management wiring is correct.** Panel → role-gated PATCH `/api/admin/subscribers/:id` + mark-paid → AdminAccessAction audit trail. Stripe webhook maps payment failure → BillingAlert + OVERDUE mirror without touching accessState (matches owner requirement). Gaps: checkout only sells membership, no `checkout.session.completed`, waitlist is fake (signup = instant active member).
- DB is the shared Supabase instance; watchtower tables live in dedicated `watchtower` schema (DATABASE_URL has `?schema=watchtower`). All 3 migrations applied.
- vercel.json crons: refresh-market daily 00:00 UTC (README's "every 15 min" is stale), brief 07:00, overdue check 08:00.
- Created STATUS.md (this file). Repo not yet in ~/Desktop/jarvis/REGISTRY.md.

## Known Issues
- Market refresh fetches zero real quotes (Yahoo blocked). Needs provider replacement/abstraction (e.g. yahoo-finance2 npm with crumb handling, plus fallback chain) and a faster-than-daily trigger (Vercel cron is daily; external scheduler or on-demand refresh needed for "live").
- OpenAI brief generation silently fails in prod; no error logging.
- `app/api/cron/refresh-market` etc. guarded by CRON_SECRET (fine), but refresh loops assets serially with no rate limiting or per-asset error capture.
- Legacy POC models (User/Session/Subscription/PersonalWatch) still in schema.
- `.git/config` remote URL embeds a GitHub token (silas-maven account).
- README cron section stale; demo-credential section stale (Clerk replaced password auth).

## Next Steps
1. Kyser to answer scoping questions (sublists ownership, "pricing control" meaning, live-data cadence, news source).
2. Design + build in this order: market data fix (everything depends on real prices) → admin asset/levels/sublists control → member portfolio aggregation for admin → summaries (fix AI, personalise, weekly owner digest + controls) → Stripe completion + user management layout → news feed card → marketing pages overhaul.
3. Add watchtower to REGISTRY.md.
