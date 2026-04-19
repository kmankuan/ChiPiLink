# ChiPi Link - Super App

## Architecture (5 Services)
| Service | Port | Description |
|---------|------|-------------|
| Main App | 8001 | Auth, Users, Wallet, Community, Admin, Landing |
| Integration Hub | 8002 | Monday.com, Telegram, Gmail, webhooks |
| Tutor Engine | 8003 | AI tutoring, worksheets, school reader |
| Sport Engine | 8004 | Table tennis scoring, live matches, TV, tournaments |
| Commerce Engine | 8005 | Store (Unatienda), Sysbook (Textbooks), Platform Store |

## Extracted Services

### Sport Engine (port 8004) ✅
- `/app/sport-engine/main.py` — Standalone FastAPI service
- `/app/sport-engine/bootstrap.sh` — Creates supervisor config
- `/app/backend/modules/sport_proxy.py` — Proxies /api/sport/* from 8001 → 8004
- Source: `/app/backend/modules/sport/`

### Commerce Engine (port 8005) ✅
- `/app/commerce-engine/main.py` — Standalone FastAPI service
- `/app/commerce-engine/bootstrap.sh` — Creates supervisor config  
- `/app/backend/modules/commerce_proxy.py` — Proxies /api/store/*, /api/sysbook/*, /api/platform-store/* from 8001 → 8005
- Source: `/app/backend/modules/store/`, `/app/backend/modules/sysbook/`, `/app/backend/routes/platform_store.py`

### Pattern Used
All extractions follow the Tutor Engine pattern:
1. Standalone FastAPI app imports modules from `/app/backend/modules/`
2. Patches `core.*` modules (database, auth) with own implementations
3. Stubs optional cross-module deps (ably, notifications, Monday)
4. Bootstrap script creates supervisor config and starts service
5. Main app proxy forwards API calls transparently
6. Frontend code unchanged — calls /api/* which gets proxied

## Test Accounts
- Super Admin: teck@koh.one / Acdb##0897
- Moderator: moderator@chipilink.com / ChiPi@Mod2026
- Regular User: user@chipilink.com / ChiPi@User2026

## Known Deployment Notes
- Production site: https://chipilink.me (uses Atlas MongoDB `backend-cleanup-10-chipilink_prod`)
- Preview: https://deployment-blocker-11.preview.emergentagent.com (uses local MongoDB `chipilink_prod`)
- `.env` files MUST be tracked in git for Emergent deployment (fixed: removed duplicate `*.env` gitignore entries added by prev agent)
- database.py routes to Atlas automatically when MONGO_URL is non-localhost (intentional for production)

## Backlog
- CS-Cart Multi-Vendor Integration (P1) — not started
- Parent Portal real student progress data replacing mocked charts (P1)
- Tutor Engine TinyCommand orchestration final wiring (P1)
- Commerce Engine proxy re-enable for multi-container networking (P2)

## Stability Fixes Applied
- 2026-04-19: **ChiPi Tutor module fully deleted (frontend + backend + subservice).**
  - Frontend: deleted `/app/frontend/src/modules/tutor/` (10 components + flow-builder), removed 8 imports + 7 routes from `App.js`, removed `TutorDashboard` lazy import from `AdminDashboard.jsx`, removed tutor tab from admin menu config.
  - Backend: deleted `/app/backend/modules/tutor/` (13 files) and `/app/backend/modules/tutor_proxy.py`. Removed all router includes + proxy middleware + service_manager wiring from `main.py`.
  - Subservice: deleted `/app/tutor-engine/` directory and `tutor-engine` supervisor config.
  - Kept: `/api/tutor/*` catch-all router in `main.py` returning `HTTP 410 Gone` with `{code: "TUTOR_MODULE_DEPRECATED"}` so lingering mobile caches / webhooks / bookmarks get a clear deprecation signal (hidden from OpenAPI schema).
  - Note: `/app/backend/modules/ai_tutor/` is a different module (AI chat helper) — untouched.
- 2026-04-19: Hardened startup for production deployment. Introduced explicit `DEPLOYMENT_MODE` env var (`preview` / `production`). In production mode `main.py` skips: `yarn build` auto-rebuild, Integration Hub supervisor bootstrap, and tutor/sport side-engine subprocess spawning. Fixes deployment timeouts caused by missing `/root/.venv/bin/uvicorn` and missing `yarn`/`supervisorctl` binaries in the production container. Added `24e15873` to known-broken bundle hashes.
- 2026-04-19: Added global React `ErrorBoundary` (`/app/frontend/src/components/ErrorBoundary.jsx`) wrapping `<App/>` in `index.js`. Catches any render-phase crash and shows a branded fallback with "Reload app / Hard reload (clear cache) / Go to home" buttons instead of a blank white screen. Errors are POSTed via `sendBeacon` to new backend endpoint `POST /api/_client-errors` for visibility in backend logs.

## Environment Variables (new)
- `DEPLOYMENT_MODE` (backend): `"preview"` (default — full dev workflow) or `"production"` (skips subprocess-heavy startup tasks)
