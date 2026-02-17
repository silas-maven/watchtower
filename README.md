# Watchtower (Mock)

A lightweight **user-first** mock-up that visualises replacing a large community spreadsheet watchlist with a purpose-built web app.

This repo is intentionally **mock-only** for now:
- **No database**
- **No auth**
- **No payments/subscriptions**
- Uses **mock data** and **simulated AI** endpoints to demonstrate UX and workflow.

## What the business owner asked for (from VNs)
- Replace the spreadsheet workflow (it’s slow/brittle and easy to miss alerts).
- **Access control matters** (subscription-style onboarding/offboarding). They explored Google Sheets web-app/sharing but hit walls.
- The app should reflect the full master watchlist, with an **owner/admin “backend”** to manage inputs.
- Add an **AI sweep** that learns the watchlist and produces:
  - Daily summary of current **BUY** alerts and **SELL** alerts
  - What became **new today**
  - What **dropped off** today
  - Extra insights/anomalies the operator might miss

## Two user types

### 1) Community members (varying market knowledge)
Goal: a clean, concise experience that answers:
- What is triggering **BUY** / **SELL** alerts right now?
- What should I focus on today?
- What are the key targets and a plain-English summary?

Entry point:
- `/community` — triggered alerts + “my curated watchlist” (mocked)

### 2) Owner / business admin
Goal: manage the system:
- User access / membership (planned)
- Master watchlist entries (planned)
- Automation schedule + alert rules (planned)

Entry point:
- `/owner` (high-level owner view)
- `/admin` (existing mock admin UI)

## Routes
- `/` — dashboard (portfolio summary + watchlist)
- `/community` — community-first landing view
- `/summary` — daily brief (AI-style sweep; mock)
- `/owner` — owner/admin overview (mock)
- `/admin` — admin UI (mock)
- `/assets/[id]` — asset detail (chart + targets + simulated AI sweep)

## Simulated AI
We stub AI integration to demonstrate where an "agent" would:
- sweep the watchlist
- generate a daily brief (buy/sell/new/dropped)
- produce concise insights on an asset

Endpoint:
- `POST /api/ai-insight` with `{ "assetId": "..." }`

## Spreadsheet reference
An older portfolio blotter Excel was uploaded via TextPad and copied into:
- `reference/portfolio-blotter-upload.xlsx`

Notes extracted from the sheet:
- `reference/EXCEL_NOTES.md`

(Excel files are ignored by git via `.gitignore`.)

## Run locally
```bash
npm install
npm run dev
```
Dev server runs on:
- http://127.0.0.1:3007

## Next mock improvements (no backend)
- “Pin to my watchlist” using browser localStorage (per-user curated list)
- A watchlist **table view** matching spreadsheet columns with hide/show advanced columns
- Plain-English tooltips for terms (beta, PE, volatility)
