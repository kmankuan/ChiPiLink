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
- 2026-04-24: **Non-blocking startup — fixes Kubernetes readiness probe timeout (round 2 of production HTTP 520).**
  - Round 1 (2026-04-20) added `ably==3.1.1` to requirements.txt. That unblocked uvicorn's module-level imports but a follow-up deploy still returned 520 because the deploy logs showed `timeout waiting for container to be ready: context deadline exceeded` — the log fetcher couldn't attach to a running container, indicating CrashLoopBackOff.
  - Round 2 root cause: with an unreachable/slow MongoDB Atlas cluster, the `startup_event` synchronously awaited `create_indexes()` (30s timeout) and seed operations (30s timeout), delaying `/health` from responding for up to ~70 seconds. Kubernetes readiness probes give up well before that → pod killed → CrashLoopBackOff → Cloudflare 520.
  - Fix: in `backend/main.py`, wrapped the index + seed work in a `_db_bootstrap()` coroutine scheduled via `asyncio.create_task(...)`. Startup event now returns in <1s regardless of MongoDB state. `/health` and `/api/health` respond 200 immediately; DB bootstrap completes in the background.
  - Also in `backend/core/database.py` reduced `serverSelectionTimeoutMS` from 10s→5s and `connectTimeoutMS` 10s→5s so downstream DB calls fail fast instead of hanging.
  - Verified in a clean venv with a fake Atlas URL: HTTP 200 at t=2s (was 70s); background bootstrap finished at t=25s with the expected warnings. Sandbox login still passes.
- 2026-04-20: **Fixed production HTTP 520 round 1 — missing `ably` package in `requirements.txt`.**
  - Root cause: `/app/backend/modules/ably_integration/__init__.py` line 8 does `from ably import AblyRest` at module level. The `ably` package was installed in the sandbox venv but was never listed in `requirements.txt`, so production Kubernetes pods (which install only what's in requirements.txt) crashed with `ModuleNotFoundError: No module named 'ably'` during uvicorn startup.
  - Symptom: deployed app logs showed `Starting FastAPI backend: uvicorn server:app ...` + `Waiting for backend to start...` then nothing. Uvicorn never bound to port 8001; Kubernetes readiness probes failed; Cloudflare returned HTTP 520 on chipilink.me/api/health and chipilink.me/admin/login.
  - Fix: ran `pip freeze > /app/backend/requirements.txt` to pin `ably==3.1.1` (plus its transitive deps h2/hpack/hyperframe already installed). Verified in a clean venv that `DEPLOYMENT_MODE=production python -c "import server"` succeeds and `uvicorn server:app` serves both `/health` and `/api/health` with HTTP 200.
  - Added `backend/tests/test_deploy_imports.py` — a 2-test pytest guard (one does `import server`, one AST-scans all module-level imports and verifies each third-party package is listed in requirements.txt) so this class of bug is caught before deploy.
  - User action required: click **Re-Deploy** on the Emergent platform to push the fixed requirements.txt to production.
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
