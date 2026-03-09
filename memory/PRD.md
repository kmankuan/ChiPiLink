# ChiPi Link — PRD (Product Requirements Document)

## Original Problem Statement
Community super app for a school in Panama. Manages textbook ordering, wallet payments, PinPanClub (table tennis), community Telegram feed, and Monday.com integrations. Built with React + FastAPI + MongoDB.

## Architecture
- **Frontend**: React (CRA) with Shadcn/UI, i18n (EN/ES/ZH), React Router
- **Backend**: FastAPI with Motor (async MongoDB)
- **Database**: MongoDB Atlas (`chipilink_prod`)
- **Auth**: LaoPan OAuth (public) + JWT email/password (admin)
- **Integrations**: Monday.com (3 boards), Telegram, OneSignal, Gmail
- **Deployment**: Emergent platform (0.5 vCPU, 2GB RAM)
- **Production URL**: https://chipilink.me

## Critical Known Issues
1. **Backend restarts randomly** — `--reload` flag in supervisor config. Fixed with `WATCHFILES_FORCE_POLLING=false` in server.py but needs production deploy verification.
2. **MongoDB Atlas stale connections** — Fixed with `retryWrites=True, retryReads=True, maxIdleTimeMS=45000`
3. **All httpx clients now use persistent connection pools** (Monday, Telegram, LaoPan OAuth)

## What's Been Implemented (This Session - Mar 2026)

### Order Management
- Add Item to Order with search dialog + "NEW" badge for recently added items
- Remove Item from Order (null-price safe)
- Bold pill status badges with icons (Option A style)
- Order status stepper (Submitted → Paid → Processing → Ready)
- Wallet top-up prompt with inline deposit dialog
- Auto-refresh wallet balance (polls every 10s after deposit)
- Per-item presale lock toggle in inventory
- Print: one-by-one mode (auto-cut), auto-close dialog (2s single, manual multi)
- Print: "Sent to printer" status badge, already-printed detection
- Top pagination bar for orders table
- Select-all only selects current page (was selecting all pages)
- Floating bulk action bar (fixed to viewport)

### Monday.com Integration
- API Queue: max 2 concurrent, priority levels, rate limiting
- Order status webhook sync (board → app)
- Textbook board sync (manual button, creates subitems per student)
- Presale import: background job pattern (no HTTP timeout)
- Widget: search-only sends ALL items, configurable search columns, text highlighting
- Unified Monday.com admin hub (top-level sidebar)

### Landing Page & UI
- Mosaic Community style applied to all components
- SectionTitle component (6 configurable styles, admin selectable)
- Titles moved inside sections (reduce white space)
- Transparent auto-hide bottom nav (Mosaic palette)
- Media player: controls locked (only mute for videos), shuffle, i18n album title
- Telegram feed: title configurable from Channel Settings, show_post_count toggle
- sessionStorage caching for all landing components (MediaPlayer, Telegram, Widget)
- Landing page renders instantly (no blocking spinner)
- Lazy-loaded layout components (MosaicCommunity eager, rest lazy)
- Footer text configurable with i18n (EN/ES/ZH)
- Login page: always shows LaoPan OAuth (no email form on public login)

### PinPanClub
- Mosaic Community style applied to Dashboard, RapidPin, Hall of Fame, Arena, Ranking
- All 25 sub-pages fixed for mobile (overflow-x-hidden, max-w-2xl)
- Unified Competitions Hub (/pinpanclub/competitions) merging League + Arena + RapidPin
- Dashboard nav simplified: Competitions | Ranking | Hall of Fame
- League creation fixed (Spanish→English field name mapping)

### System & Performance
- System Monitor (admin): CPU, memory, requests, errors, active users, frontend perf
- Admin Status Bar (VS Code style): configurable indicators, draggable top/bottom
- PerfBeacon: reports page load time + JS errors from browser
- Auth user cache (120s TTL) — prevents thundering herd
- Permissions request deduplication (_inflight promise)
- Middleware: pre-cached imports, lightweight tracking
- Deposit payment methods: admin toggle + bank transfer details editor + receipt upload

### Code Quality
- English-first codebase rule (variables/state in English, DB fields keep Spanish)
- MongoDB: retryWrites, retryReads, connection pool limits
- All httpx clients use persistent connection pools

## Key Files
- `backend/server.py` — Entry point with WATCHFILES fix
- `backend/core/auth.py` — Auth with 120s user cache
- `backend/core/database.py` — MongoDB with Atlas-optimized settings
- `backend/modules/integrations/monday/queue.py` — API queue
- `backend/modules/integrations/monday/core_client.py` — Persistent httpx client
- `backend/modules/admin/system_monitor.py` — Health monitoring
- `backend/modules/sysbook/services/textbook_board_sync.py` — Textbook board sync
- `frontend/src/components/layout/BottomNav.jsx` — Mosaic styled nav
- `frontend/src/components/ui/SectionTitle.jsx` — Configurable section titles
- `frontend/src/modules/admin/AdminStatusBar.jsx` — VS Code status bar
- `frontend/src/modules/pinpanclub/pages/CompetitionsHub.jsx` — Unified competitions

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`

## Prioritized Backlog
### P0 — Critical
- Build Integration Worker as separate app (move background tasks out of main app)
- Verify production stability after WATCHFILES fix deployment

### P1 — High
- Admin UI config for badge customization (color + icon per status)
- Video playback fix for Google Photos (consider re-hosting videos)
- Continue PinPanClub sub-page mobile verification

### P2 — Medium
- Landing page redesign tool for administrators
- Extend Monday.com sync for general product inventory
- DB migration: Spanish field names → English (user.nombre → user.name)

### P3 — Low
- ChipiPoints gamification system
- Email notifications for key events
- Google Analytics integration
