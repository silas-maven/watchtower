# Watchtower POC

Watchtower is a concept-grade replacement for a formula-heavy spreadsheet watchlist used by a finance community.

This implementation includes:
- Admin asset/rule management surfaces
- Member sub-watchlist and signal views
- Mocked subscription lifecycle controls (no Stripe required)
- Real market data ingestion (equities/ETF + crypto)
- Deterministic BUY/SELL signal engine (spreadsheet parity logic)
- Daily AI brief generation via OpenAI `gpt-5-nano-2025-08-07` with deterministic fallback
- POC acceptance proof board at `/proof` with live runtime evidence
- Vercel cron wiring for refresh and briefing jobs

## Stack
- Next.js App Router
- Supabase Postgres + Prisma
- OpenAI Responses API (`gpt-5-nano-2025-08-07`)
- Yahoo Finance + CoinGecko + exchangerate.host

## Naming Convention
- Database artifacts are prefixed with `watchtower_` (tables + enum types).
- Supabase storage buckets should be prefixed with `watchtower_` as well.
- Bucket helper constants are in `/Users/hn52/Desktop/jarvis/projects/watchtower/lib/supabase/naming.ts`.

## Local setup
1. Install dependencies:
```bash
npm install --legacy-peer-deps
```
2. Copy env file:
```bash
cp .env.example .env.local
```
3. Configure Supabase connection strings in `.env.local`.
4. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
5. Seed demo users and import spreadsheet data:
```bash
npm run db:seed
```
6. Start dev server:
```bash
npm run dev
```

## Demo credentials
Created by seed script:
- `owner@watchtower.demo` / `demo-owner-123`
- `admin@watchtower.demo` / `demo-admin-123`
- `member@watchtower.demo` / `demo-member-123`

## Spreadsheet import
One-time importer for `reference/portfolio-blotter-upload.xlsx`:
```bash
npm run import:spreadsheet
```

## Core APIs
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- Assets: `GET /api/assets`, `PATCH /api/admin/assets/:id`, `POST /api/admin/refresh-market`
- Signals: `GET /api/signals/active`, `GET /api/signals/daily`
- Member watchlist: `GET /api/me/watchlist`, `POST/DELETE /api/me/watchlist/:assetId`, `GET /api/me/alerts`
- Subscriptions: `GET /api/admin/subscribers`, `PATCH /api/admin/subscribers/:id`, `POST /api/admin/subscribers/:id/mark-paid`
- Briefing: `GET /api/brief/latest`, `POST /api/admin/brief/regenerate`
- Cron jobs: `/api/cron/refresh-market`, `/api/cron/subscription-overdue-check`, `/api/cron/generate-daily-brief`
- Formula parity proof: `GET /api/admin/formula-parity`

## Vercel cron
Configured in `vercel.json`:
- Every 15 minutes: market refresh
- Daily 07:00 UTC: daily brief generation
- Daily 08:00 UTC: overdue subscription check

Set `CRON_SECRET` in Vercel; cron routes validate Bearer token or `x-cron-secret`.

## Quality checks
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Spreadsheet Function Parity
- Implemented formula library: `/Users/hn52/Desktop/jarvis/projects/watchtower/lib/formulas.ts`
- Runtime integration: `/Users/hn52/Desktop/jarvis/projects/watchtower/lib/jobs/refreshMarket.ts`
- Unit proof tests: `/Users/hn52/Desktop/jarvis/projects/watchtower/tests/formulas.test.ts`
