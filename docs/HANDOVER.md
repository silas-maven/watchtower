# SPA Platform Handover

Last updated: 2026-05-13

## Project Context

This repository is the implementation for the Stock Pickers Academy (SPA) asset intelligence platform. The repo/project name is `watchtower`, but the business/app users see should be SPA / Stock Pickers Academy.

The product is replacing a Google Sheets/Excel workflow used by SPA to manage a large list of securities, including stocks, ETFs and crypto. The spreadsheet contains target entry/exit levels, daily movement, 52-week ranges, volatility indicators, reasons for entry, and workbook functions for portfolio and averaging calculations.

The product direction is no longer just a POC. It is moving toward product implementation with:

- Clerk for auth and identity.
- Supabase Postgres as the database.
- Prisma as ORM/migrations.
- Stripe for payments/subscriptions.
- Vercel for hosting.
- OpenAI `gpt-5-nano-2025-08-07` for summaries/insights.
- 21st.dev Cursor MCP installed for higher-quality UI work.

## Key Business Rules

- Signals must remain deterministic. AI must not decide buy/sell truth.
- AI is explanatory/summarisation only.
- Users can see the master asset list and build personal watchlists.
- Buy/sell alerts are based on spreadsheet-derived target rules.
- Admins can manage assets, customers, subscription state, access, analytics, and AI briefs.
- Payment failures must alert admins, but must not automatically pause/remove users.
- Admins manually pause/reactivate/remove access.
- New signups are members by default.
- Admin/owner accounts are restricted by allowlist or existing DB role.

## Important Source Documents

The product was informed by:

- `docs/SPA E-Course - SESSION 02.pdf`
- `docs/Insert Name - Portfolio Blotter.xlsx`
- `reference/EXCEL_NOTES.md`
- `reference/portfolio-blotter-upload.xlsx`

Important workbook concepts implemented or planned:

- Daily check 1: what is popping / dropping.
- Daily check 2: buy/sell alerts.
- Target entry and target exit levels.
- Daily low/high target hit logic.
- 52-week high/low context.
- Volatility/range context.
- GBP normalization, including GBX handling.
- Average price calculator logic.
- Due diligence checklist.

## Current App Routes

### Public

- `/` public SPA landing page.
- `/sign-in/[[...sign-in]]` Clerk sign in.
- `/sign-up/[[...sign-up]]` Clerk sign up.
- `/login` redirects to `/sign-in`.

### Member App

- `/app` member command centre/dashboard.
- `/app/daily-checks` daily signal summary.
- `/app/watchlists` master watchlist + personal selected assets.
- `/app/assets` asset library table.
- `/app/portfolio-tools` placeholder for averaging planner and due diligence tools.
- `/app/alerts` signal and notification feed.
- `/app/account` profile/access summary.

### Admin App

- `/admin` admin overview.
- `/admin/assets` asset management and spreadsheet parity proof.
- `/admin/customers` customer management.
- `/admin/subscriptions` currently aliases customer management.
- `/admin/access` currently aliases customer management.
- `/admin/analytics` usage/customer analytics.
- `/admin/ai-briefs` AI brief generation/latest brief.
- `/admin/system-jobs` manual cron/job controls.

### Legacy Redirects

These exist to avoid dead links from the earlier POC:

- `/community` redirects to `/app/watchlists`.
- `/summary` redirects to `/app/daily-checks`.
- `/owner` redirects to `/admin/customers`.

## Auth and Access

Auth is now Clerk-backed.

Main files:

- `lib/auth.ts`
- `lib/server/pageAuth.ts`
- `proxy.ts`
- `components/TopNav.tsx`
- `app/layout.tsx`

### Session Resolution

`lib/auth.ts` resolves the app profile by:

1. Clerk `userId` from `auth()`.
2. Existing `Profile` by `clerkUserId`.
3. If missing, tries to derive email/name from session claims.
4. Falls back to `currentUser()` only for brand-new users when session claims do not contain email.
5. Existing profile by email is linked to Clerk ID.
6. If no profile exists, creates a `MEMBER` profile with default watchlist and active subscription mirror.

Important performance note: `currentUser()` calls Clerk backend and caused 5-10s delays/errors when used on every request. Avoid putting `currentUser()` back into the normal hot path.

### Admin Creation Rule

New users are `MEMBER` by default.

Admin/owner is granted only if:

- Existing DB profile already has `ADMIN` or `OWNER`, or
- Email is listed in `SPA_ADMIN_EMAIL_ALLOWLIST` or `SPA_OWNER_EMAIL_ALLOWLIST`.

Required env vars for this:

```bash
SPA_OWNER_EMAIL_ALLOWLIST="owner@example.com"
SPA_ADMIN_EMAIL_ALLOWLIST="admin@example.com"
```

Use comma-separated emails for multiple admins.

### Access States

`Profile.accessState` controls product access:

- `ACTIVE`
- `PAUSED`
- `REMOVED`

`requireUser()` rejects non-active access with `ACCESS_SUSPENDED`.

## Database

Database is Supabase Postgres via Prisma.

Important: DB artifacts are namespaced with `watchtower_spa_` to distinguish this app from other projects in the same DB/schema.

Examples:

- `watchtower_spa_profiles`
- `watchtower_spa_assets`
- `watchtower_spa_asset_snapshots`
- `watchtower_spa_user_watchlists`
- `watchtower_spa_subscription_mirrors`
- `watchtower_spa_billing_alerts`

Schema file:

- `prisma/schema.prisma`

Current migrations:

- `prisma/migrations/20260219000000_init/migration.sql`
- `prisma/migrations/20260512180000_product_foundation/migration.sql`

The product foundation migration renames old `watchtower_*` POC tables/enums/indexes/constraints to `watchtower_spa_*`, then creates the product tables.

### Main Models

Legacy/POC models still exist for continuity:

- `User`
- `Session`
- `Subscription`
- `PersonalWatch`

Product models:

- `Profile`
- `StripeCustomer`
- `SubscriptionMirror`
- `PaymentEvent`
- `BillingAlert`
- `UserPortfolio`
- `UserHolding`
- `UserWatchlist`
- `UserWatchlistItem`
- `AveragePlan`
- `DueDiligenceRecord`
- `UsageEvent`
- `AnalyticsRollup`
- `AdminAccessAction`
- `AdminAssetAction`

Asset/signal models:

- `Asset`
- `AssetRule`
- `AssetSnapshot`
- `SignalEvent`
- `DailyBrief`
- `Notification`
- `MockEmailLog`
- `ImportRun`

### Seed

Seed file:

- `prisma/seed.ts`

Run:

```bash
npm run db:seed
```

Seed creates:

- Demo Clerk-linked profiles.
- Subscription mirrors.
- Portfolio fixture data.
- Default watchlists.
- Watchlist items.
- Usage events.
- Spreadsheet import from `reference/portfolio-blotter-upload.xlsx`.

Note: the seed currently uses demo Clerk IDs such as `demo_clerk_owner`. Real Clerk sign-ins may link to seeded profiles by email.

## Environment Variables

See `.env.example`. Do not commit real secrets.

Required for production:

```bash
DATABASE_URL=
DIRECT_URL=
CRON_SECRET=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
OPENAI_API_KEY=
```

Required for Clerk webhooks:

```bash
CLERK_WEBHOOK_SECRET=
```

Required for Stripe checkout/webhooks:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRODUCT_ID=
STRIPE_PRICE_ID=
STRIPE_MEMBERSHIP_PRICE_ID=
STRIPE_ECOURSE_PRICE_ID=
```

Admin restriction:

```bash
SPA_OWNER_EMAIL_ALLOWLIST=
SPA_ADMIN_EMAIL_ALLOWLIST=
```

Optional/config:

```bash
OPENAI_MODEL="gpt-5-nano-2025-08-07"
APP_TIMEZONE="Europe/London"
SUPABASE_BUCKET_PREFIX="watchtower_spa"
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWENTYFIRST_API_KEY=
```

## Clerk

Webhook URL for deployed app:

```text
https://watchtower-virid.vercel.app/api/webhooks/clerk
```

Events listened for:

- `user.created`
- `user.updated`
- `user.deleted`

Behavior:

- Creates/updates `Profile`.
- Lowercases email.
- Links profile by Clerk ID or email.
- Deleted users are marked `REMOVED`.
- Role is never trusted directly from arbitrary signup metadata. Role is decided by existing DB role or allowlist.

## Stripe

Webhook URL for deployed app:

```text
https://watchtower-virid.vercel.app/api/webhooks/stripe
```

Events currently handled:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

Important note: `checkout.session.completed` is not yet handled. Add this if you need to reliably create/update `StripeCustomer` / `SubscriptionMirror` immediately after checkout.

### Stripe Product/Prices Already Created

Created in Stripe, not just locally:

- Product: `Stock Pickers Academy (SPA)`
- Monthly membership: `£50/month`
- SPArtan Investing eCourse: `£1,000` one-time

Local `.env` was updated with:

- `STRIPE_PRODUCT_ID`
- `STRIPE_PRICE_ID` pointing to monthly membership
- `STRIPE_MEMBERSHIP_PRICE_ID`
- `STRIPE_ECOURSE_PRICE_ID`

### Checkout

Current checkout route:

- `POST /api/stripe/checkout`

Current limitation:

- It only uses `STRIPE_PRICE_ID`, which currently points to membership.
- It does not yet support selecting eCourse vs membership.
- Add a payload such as `{ product: "membership" | "ecourse" }` and choose mode `subscription` or `payment` accordingly.

## OpenAI

Model target:

```bash
OPENAI_MODEL="gpt-5-nano-2025-08-07"
```

AI files:

- `lib/ai/dailyBrief.ts`
- `app/api/ai-insight/route.ts`

Behavior:

- Uses OpenAI when `OPENAI_API_KEY` is available.
- Falls back to deterministic summaries if OpenAI is missing/fails.
- AI should summarise and explain deterministic signal state only.

## Market Data and Signal Logic

Market/service files:

- `lib/market/equities.ts`
- `lib/market/crypto.ts`
- `lib/market/fx.ts`
- `lib/jobs/refreshMarket.ts`

Signal logic:

- `lib/signals/engine.ts`

Signal rules:

- Entry target hit => `BUY`
- Exit target hit => `SELL`
- Both hit => `BOTH`
- No hit => `NONE`

Entry hit logic includes spreadsheet behavior:

- Target entry inside daily low/high range, or
- Target entry greater than daily high.

Daily summaries:

- `lib/server/signals.ts`

## Spreadsheet Import and Formula Parity

Importer:

- `lib/spreadsheet/importer.ts`
- `scripts/import_spreadsheet.ts`

Formula parity:

- `lib/formulas.ts`
- `lib/server/formulaParity.ts`
- `app/api/admin/formula-parity/route.ts`

Tests:

- `tests/formulas.test.ts`
- `tests/fx.test.ts`
- `tests/signals.test.ts`

Admin UI shows formula proof in `/admin/assets`.

## UI State

21st.dev Cursor MCP was installed using:

```bash
npx -y @21st-dev/cli@latest install cursor --api-key "$TWENTYFIRST_DEV_MCP_KEY"
```

Do not paste the raw key into command output or docs.

Current UI improvements made:

- Public landing page is now SPA-branded and premium/dark finance styled.
- Landing page includes member sign in, admin login and waitlist CTA.
- App shell is now a darker finance console with separated member/admin navigation.
- Navigation no longer fetches `/api/auth/session` client-side.

Still to improve:

- Several internal pages still use earlier POC card/table styling.
- `/admin/assets` and `/app/watchlists` are functional but not visually premium enough.
- Need stronger visual system across all pages, not only landing/shell.
- Need real loading/skeleton states for heavy DB-backed pages.
- Need admin/customer screens to be more productized, not just tables.

## Performance Notes

Observed issue:

- `/api/auth/session` and `/app` sometimes took 5-10s or 30s because `currentUser()` hit Clerk backend on every session resolution.

Fix applied:

- `currentUser()` removed from normal path.
- Session resolver uses Clerk auth claims and DB first.
- React `cache()` dedupes session resolution inside a request.
- TopNav no longer does client fetch to `/api/auth/session`.

Remaining possible bottlenecks:

- Server pages query Supabase directly and sometimes pull too much data.
- `getAssetsForDashboard()` loads up to 30 snapshots per asset.
- Watchlist/assets tables do not paginate yet.
- Some pages catch DB errors and show fallback rather than exposing them.

Recommended next steps:

- Add pagination/search server-side for asset library.
- Add `take` limits where missing.
- Avoid repeated `findMany` with full includes where summary counts are enough.
- Consider cached summaries for dashboard.

## Cron / Job Endpoints

- `POST /api/cron/refresh-market`
- `POST /api/cron/subscription-overdue-check`
- `POST /api/cron/generate-daily-brief`

Protected by `CRON_SECRET` via `lib/security.ts`.

Manual admin controls:

- `/admin/system-jobs`
- `/admin/ai-briefs`
- `/admin/assets`

## API Surface

### Auth/session

- `GET /api/auth/session`
- `POST /api/auth/login` returns 410 because password login is replaced by Clerk.
- `POST /api/auth/logout` returns 410 because logout is handled by Clerk.

### Assets/admin

- `GET /api/assets`
- `GET /api/assets/:id`
- `GET /api/admin/assets`
- `POST /api/admin/assets`
- `PATCH /api/admin/assets/:id`
- `POST /api/admin/refresh-market`
- `GET /api/admin/formula-parity`

### Member

- `GET /api/me/watchlist`
- `POST /api/me/watchlist/:assetId`
- `DELETE /api/me/watchlist/:assetId`
- `GET /api/me/alerts`

### Admin subscribers/customers

- `GET /api/admin/subscribers`
- `PATCH /api/admin/subscribers`
- `PATCH /api/admin/subscribers/:id`
- `POST /api/admin/subscribers/:id/mark-paid`

### Signals/brief

- `GET /api/signals/active`
- `GET /api/signals/daily`
- `GET /api/brief/latest`
- `POST /api/admin/brief/regenerate`
- `POST /api/ai-insight`

### Stripe/Clerk

- `POST /api/stripe/checkout`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/clerk`

## Testing and Quality Commands

Run before handoff/deploy:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Recently passing:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Known Issues / Technical Debt

1. UI is partially upgraded only.
   - Landing and shell improved.
   - Internal screens still need premium treatment.

2. Admin login UX is currently a button to Clerk sign-in.
   - Admin authorization still happens after sign-in through DB role/allowlist.
   - Consider dedicated `/admin-login` page with explanation.

3. Stripe checkout supports only the membership price.
   - Need product selector for membership vs eCourse.
   - Need `checkout.session.completed` webhook handling.

4. Access/payments separation needs refinement.
   - Payment mirror and access state are separate, correctly.
   - UI should make this distinction clearer.

5. Old POC models still exist.
   - They were kept to avoid destructive migration risk.
   - Future cleanup should remove or fully migrate `User`, `Session`, `Subscription`, `PersonalWatch`.

6. No RLS policies yet.
   - Current access control is app-layer via Clerk/Prisma.
   - If Supabase direct client access is introduced, add RLS policies with `watchtower_spa_` naming.

7. No production analytics rollup job yet.
   - `UsageEvent` exists.
   - `AnalyticsRollup` exists.
   - Need scheduled aggregation.

8. No real waitlist model yet.
   - The UI says waitlist, but Clerk sign-up creates a member profile.
   - If true approval workflow is required, add `PENDING` access state or a dedicated `WaitlistEntry` model.

9. `OPENAI_API_KEY` may be blank locally.
   - The app has deterministic fallback.
   - Production should set the real key.

10. Demo seed data uses demo emails.
   - Real admins should be allowlisted in env and/or promoted in DB.

## Recommended Next Engineering Tasks

### Priority 1: Stabilize Auth/Admin

- Add `PENDING` access state if signup should be a true waitlist.
- Add dedicated `/admin-login` route or admin sign-in explanation.
- Build admin role management screen restricted to owner.
- Add a safe server action for owner to promote/demote admins.

### Priority 2: Stripe Completion

- Add checkout product selection:
  - Membership => `mode: subscription`, price `STRIPE_MEMBERSHIP_PRICE_ID`.
  - eCourse => `mode: payment`, price `STRIPE_ECOURSE_PRICE_ID`.
- Handle `checkout.session.completed`.
- Store entitlements separately from subscription state if eCourse grants course access.

### Priority 3: UI Upgrade Across Product

- Use 21st.dev/Magic MCP patterns for internal pages.
- Redesign:
  - `/app`
  - `/app/watchlists`
  - `/app/assets`
  - `/admin/assets`
  - `/admin/customers`
  - `/admin/analytics`
- Add skeletons and empty states.
- Add better tables with sticky headers, filters, status chips, and quick actions.

### Priority 4: Portfolio Tools

- Build actual averaging planner UI and persistence using `AveragePlan`.
- Build due diligence checklist using `DueDiligenceRecord`.
- Add tests for staged buy calculations matching workbook examples.

### Priority 5: Data/Performance

- Add pagination for asset library.
- Reduce dashboard snapshot loading.
- Cache daily summaries.
- Add usage event tracking for key product interactions.

## Deployment Notes

Before deploying:

1. Push latest code.
2. Ensure Vercel env vars are set.
3. Run migrations against Supabase:

```bash
npx prisma migrate deploy
```

4. Seed only if you need demo/product fixture data:

```bash
npm run db:seed
```

5. Configure Clerk webhook:

```text
https://watchtower-virid.vercel.app/api/webhooks/clerk
```

6. Configure Stripe webhook:

```text
https://watchtower-virid.vercel.app/api/webhooks/stripe
```

7. Redeploy Vercel.

## Security Notes

- Do not commit `.env`.
- `.env.example` must contain placeholders only.
- Treat Supabase, Clerk, Stripe, OpenAI and 21st.dev keys as sensitive.
- Do not grant admin role from user-controlled signup fields.
- Keep admin role creation controlled through owner/allowlist.
- Payment failure must not automatically remove access unless business rules change.

