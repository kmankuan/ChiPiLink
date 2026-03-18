# E2 Agent Handoff Prompt for ChiPi Link

## Copy everything below this line when starting the new E2 task:

---

## Project: ChiPi Link — Chinese-Panamanian Community Super App

**Production URL**: https://chipilink.me
**Admin credentials**: teck@koh.one / Acdb##0897
**Stack**: React (CRA) + FastAPI + MongoDB Atlas (M0 Free) + Shadcn/UI
**Auth**: LaoPan OAuth (public users) + JWT email/password (admin only)
**Language**: English-first codebase. UI supports i18n (EN/ES/ZH)

Pull the code from the GitHub repo. Full documentation is in `/app/memory/PRD.md`.

---

## CRITICAL RULES (learned from 50+ bug fixes)

### Backend Stability
1. **NEVER use `async with httpx.AsyncClient()` per request** — always use persistent shared clients with connection pool limits
2. **Auth user lookups MUST be cached** — without cache, 47+ concurrent DB queries crash the backend on every admin page load. Current: 120s TTL in `/app/backend/core/auth.py`
3. **The `--reload` flag causes random restarts** — `WATCHFILES_FORCE_POLLING=false` is set in `server.py`. NEVER remove this
4. **MongoDB Atlas M0 does NOT support Change Streams** — use polling fallback
5. **All Monday.com API calls go through the queue** (`/app/backend/modules/integrations/monday/queue.py`, max 2 concurrent). NEVER call Monday API directly
6. **Background tasks (fire-and-forget) must be minimal** — too many `asyncio.create_task()` overwhelms the event loop on 0.5 vCPU
7. **MongoDB connection**: must have `retryWrites=True, retryReads=True, maxIdleTimeMS=45000` for Atlas

### Frontend Stability
1. **Public Login page shows ONLY LaoPan OAuth** — no email form, no conditions, no API dependency. File: `/app/frontend/src/pages/Login.jsx`
2. **AdminDashboard redirect**: only redirect when `user && !user.is_admin` (NOT when user is null). Null user = loading state, NOT unauthorized
3. **isAuthenticated must be sticky**: `!!user || !!localStorage.getItem('auth_token')` — stays true while token exists
4. **All landing page components use sessionStorage cache** — load cached data first, update from API in background
5. **usePermissions hook has request deduplication** (`_inflight` promise) — prevents thundering herd
6. **Bulk operations must capture IDs as snapshot** (not live reference) — `[...selection.ids]`

### API Design
1. **Long-running operations → background job pattern** (presale import, textbook sync). Return `job_id` immediately, frontend polls `/job/{job_id}`
2. **All API endpoints must handle null prices/quantities** — use `(value or 0)` not `.get("field", 0)` (the latter returns None when field exists with null value)
3. **Deposit methods endpoint is PUBLIC** (no auth) — users need it even when session drops
4. **Print endpoint must handle null values gracefully** — `float(price or 0)` with try/except

### Style Guide
1. **Mosaic Community palette**: cream `#FBF7F0→#F5EDE0`, dark brown `#2d2217`, warm brown `#8b7355`, red accent `#C8102E`, gold `#B8860B`
2. **SectionTitle component** for all section headers (configurable style from admin)
3. **Bottom nav**: Mosaic styled, transparent, auto-hide on scroll
4. **All PinPanClub pages**: `overflow-x-hidden`, `max-w-2xl mx-auto px-4`
5. **Mobile-first**: always test at 375px width

---

## CURRENT PRIORITIES

### P0 — Build Integration Hub (separate app)
Skeleton is ready in `/app/integration-hub/`. This is a separate FastAPI + React app that handles ALL background integrations:
- Monday.com sync (3 boards: orders 18397140868, textbooks 18397140920, wallet 18399650704)
- Telegram channel polling
- Gmail wallet receipt polling
- Push notifications (OneSignal)
- Future: FuseBase, LaoPan.online sync

**Architecture**: Both apps share the same MongoDB Atlas. Main app writes to `hub_jobs` collection, Hub picks up and processes. Admin UI for managing integrations, testing connections, viewing logs.

After Hub is deployed and verified, remove background tasks from the main app (Telegram polling, Gmail polling, Monday queue workers).

### P1 — Production Stability
- Verify WATCHFILES fix stops random restarts
- Monitor with the admin status bar (VS Code style at bottom)
- Auth cache (120s TTL) + permissions deduplication must stay

### P2 — Pending Features
- Admin UI config for badge customization (color + icon per status)
- Video playback fix for Google Photos media player
- Complete PinPanClub mobile verification (25 pages, some may still overflow)

### P3 — Future
- Multi-store commerce platform (marketplace for Chinese businesses)
- FuseBase integration
- LaoPan.online user sync
- WhatsApp Business integration

---

## KEY FILES REFERENCE

### Backend Core
- `backend/server.py` — Entry point with WATCHFILES fix
- `backend/core/auth.py` — Auth with 120s user cache + thundering herd prevention
- `backend/core/database.py` — MongoDB Atlas optimized connection
- `backend/main.py` — App with pre-cached middleware imports

### Monday.com Integration
- `backend/modules/integrations/monday/queue.py` — API queue (max 2 concurrent)
- `backend/modules/integrations/monday/core_client.py` — Persistent httpx client
- `backend/modules/sysbook/services/textbook_board_sync.py` — Textbook board sync

### Frontend Critical
- `frontend/src/contexts/AuthContext.js` — Sticky auth, cached user, retry logic
- `frontend/src/hooks/usePermissions.js` — Request deduplication
- `frontend/src/pages/Login.jsx` — LaoPan only, no email form
- `frontend/src/pages/AdminDashboard.jsx` — Safe redirect guard (user && !user.is_admin)
- `frontend/src/components/layout/BottomNav.jsx` — Mosaic styled
- `frontend/src/components/ui/SectionTitle.jsx` — 6 configurable styles

### Integration Hub (to complete)
- `integration-hub/main.py` — FastAPI app skeleton
- `integration-hub/jobs/processor.py` — Job queue with Change Streams + polling fallback
- `integration-hub/integrations/telegram_poller.py` — Telegram polling module
- `integration-hub/routes/` — Dashboard, integrations, jobs, debug endpoints
