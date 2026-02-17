# Watchtower (Mock)

A lightweight mock-up to visualise replacing a large community Google Sheet watchlist with a purpose-built web UI.

## Context / Problem
Current workflow is a large spreadsheet (watchlist + buy/sell alerts). It doesn't scale for a community:
- Manual monitoring is time-consuming and error-prone (missed alerts)
- Hard to produce consistent daily summaries (what’s new, what dropped off)
- Hard to manage access if it’s “just a random website”

## Key requirements from voice note
- **Access control / subscription management** is important.
  - The friend explored Google Sheets “web app”/sharing but hit walls.
  - Desired outcome: only subscribed/approved people can access the watchlist.
  - In a real build, this becomes auth + entitlements (paid/private community).

- **Reflect everything on the watchlist** in a clean UI.
  - Assets/securities with categories/tags, prices, and alert states.

- **Admin inputs**
  - There should be a backend/admin area to change watchlist data/levels/notes (even if community view is read-only).

- **AI integration**
  - An AI should “sweep” the watchlist and produce:
    - Daily summary: current buy alerts / sell alerts
    - What became new today
    - What dropped off today
    - Optional insights the operator didn’t think of
  - The goal is to reduce manual daily effort and avoid missed signals.

## Mock scope (this repo)
- NO database
- NO authentication
- Uses **mock data** only
- Includes **simulated AI output** (stub endpoint)

## What we implemented in the mock
- Dashboard with assets + tags
- Asset detail page with mock chart + levels
- Mock alerts endpoint: `GET /api/alerts`
- Simulated AI endpoint: `POST /api/ai-insight` (no real model call)
- Daily Summary mock page to demonstrate the “AI sweep” idea
- Admin mock page to visualise the “backend inputs” idea (UI only)

## Next steps (real build, later)
- Data source: Google Sheets import OR market data provider + admin CRUD
- Alert engine (cron/worker) + cooldown + multi-channel delivery
- Auth + roles + subscription entitlements
- AI summariser + insight agent (Gemini/OpenAI/etc.) running on schedule
