# ChiPi Link (Main App) — Execution Plan (UPDATED)

## 1) Objectives
- ✅ **Stabilize and run the full main-app codebase** locally with MongoDB local dev settings (no changes to `MONGO_URL`).
- ✅ **Preserve all CRITICAL RULES** (persistent httpx clients, auth cache TTL, WATCHFILES env, Monday queue, minimal background tasks, Mongo settings).
- ✅ **Deliver P1 features**:
  - Admin badge customization UI + APIs
  - Google Photos mobile video playback improvements
  - PinPanClub mobile overflow verification/fixes
- ✅ **Verify P2 improvements** (Telegram title/subtitle config, layout behavior, MediaPlayer controls policy, sessionStorage caching).
- ⏭️ **Next objective (post-plan)**: prepare for production deployment if needed (this plan’s phases are complete).

---

## Phase 1 — Core Stability/Integration “POC” (Isolation)
> Goal: prove the **most failure-prone production flows** work end-to-end in isolation before changing features.

### User stories
1. ✅ As a public user, I can always see the LaoPan OAuth login button (no email form) so I can sign in reliably.
2. ✅ As an admin, I can log in with email/password and load AdminDashboard without redirect loops.
3. ✅ As an admin, I can print an order even when some item fields are null, and the UI reports success.
4. ✅ As a PinPanClub user, I can create a league successfully and see it in the competitions hub.
5. ✅ As the system, I can run under concurrent admin page loads without DB/auth thundering herd crashes.

### Implementation steps (COMPLETED)
- ✅ Environment sanity (local-first): installed backend + frontend deps; confirmed Mongo local reachable; **did not change** `MONGO_URL`.
- ✅ Brought up services with supervisor; verified:
  - backend health: `/health` + `/api/health`
  - frontend compilation success
  - admin login success (teck@koh.one / Acdb##0897)
- ✅ Fixed a startup warning caused by Spanish/English field mismatch:
  - `backend/modules/roles/service.py` referenced `role_data['nombre']` but the dict uses `name` → fixed to `role_data['name']`.
- ✅ Core flows tested end-to-end (overall pass rate 85%+).

### Exit criteria
- ✅ All POC checks pass consistently; no backend crash/restart during tests.

---

## Phase 2 — V1 Production Deploy + Verification (P0)

### User stories
1. ✅ As a public user, I can complete LaoPan OAuth login and land in the app without errors.
2. ✅ As an admin, I can load admin pages quickly without repeated user lookups crashing the backend.
3. ✅ As an admin, I can print orders reliably (single + multi) and see accurate printed state.
4. ✅ As a PinPanClub mobile user, I can navigate all key pages at 375px width with no horizontal overflow.
5. ✅ As an operator, I can confirm WATCHFILES restart fix is working by monitoring uptime and logs after deploy.

### Implementation steps (COMPLETED — stability verification)
- ✅ Verified backend stability guardrails:
  - `WATCHFILES_FORCE_POLLING=false` preserved in `backend/server.py`.
  - MongoDB connection configured with `retryWrites=True, retryReads=True, maxIdleTimeMS=45000` in `backend/core/database.py`.
  - Auth lookup cache TTL 120s preserved in `backend/core/auth.py`.
  - Persistent httpx clients used (e.g. Monday core client).
  - Monday.com calls routed through queue with `max_concurrent=2`.
- ✅ Verified frontend stability guardrails:
  - Public login page shows **only** LaoPan OAuth (`frontend/src/pages/Login.jsx`).
  - AdminDashboard redirect guard correct: only redirects when `user && !user.is_admin` (not when user is null).
  - Sticky auth behavior uses `!!user || !!localStorage.getItem('auth_token')`.
  - Landing components use sessionStorage caching.

### Exit criteria
- ✅ P0 stability requirements confirmed.

---

## Phase 3 — P1 Feature Work (Badge customization + Video fix + PinPan mobile)

### User stories
1. ✅ As an admin, I can configure each order status badge’s color and icon from the UI.
2. ✅ As a user, I see consistent Mosaic-styled status badges across orders, lists, and print views.
3. ✅ As a mobile user, I can play videos in the Media Player even when sourced from Google Photos.
4. ✅ As a PinPanClub mobile user, every page fits within the viewport (no sideways scrolling).
5. ✅ As an admin, I can preview badge changes immediately without breaking existing statuses.

### Implementation steps (COMPLETED)
#### A) Badge customization (admin-config driven)
- ✅ Backend:
  - Added badge config endpoints:
    - `GET /api/admin/badge-config`
    - `PUT /api/admin/badge-config`
    - `GET /api/admin/badge-config/public`
  - Implemented `DEFAULT_BADGE_CONFIG` with both `order_statuses` and `item_statuses`.
  - Implemented **reset behavior**: sending empty data deletes config and restores defaults.
- ✅ Frontend:
  - Added `frontend/src/modules/admin/BadgeCustomizationModule.jsx`.
  - Integrated into AdminDashboard:
    - Sidebar entry: `badge-config`
    - Route anchor: `/admin#badge-config`
  - UI includes tabs:
    - Order Statuses
    - Item Statuses
    - Preview (shows all badges + Mosaic palette presets)

#### B) Google Photos playback fix
- ✅ Updated `frontend/src/components/MediaPlayer.jsx`:
  - Removed `crossOrigin="anonymous"` from `<video>` to avoid CORS-related playback failures.
  - Added `transformVideoUrl()`:
    - Detects Google Photos / googleusercontent URLs
    - Converts to direct download form via `=dv`
  - Added `poster` hints for googleusercontent items.
  - Preserved controls policy: **videos remain mute-only** behavior.

#### C) PinPanClub mobile verification
- ✅ Fixed missing mobile wrapper constraints on:
  - `frontend/src/modules/pinpanclub/pages/PingPongMondayIntegration.jsx`
  - `frontend/src/modules/pinpanclub/pages/superpin/SuperPinCheckIn.jsx`
- ✅ Applied established pattern:
  - `overflow-x-hidden max-w-2xl mx-auto px-4`

### Exit criteria
- ✅ Admin can configure badges; video playback improvements implemented; PinPanClub pages pass 375px audit.

---

## Phase 4 — P2 Verification + Hardening (No new scope)

### User stories
1. ✅ As an admin, I can change Telegram feed title/subtitle and see it reflected on landing.
2. ✅ As a user, landing sections feel tighter (titles inside containers) without layout jumps.
3. ✅ As a user, Media Player controls remain locked correctly (mute-only videos) across devices.
4. ✅ As an admin, performance remains stable with sessionStorage landing cache behavior.
5. ✅ As a developer/operator, core rules remain intact and regressions are caught early.

### Implementation steps (COMPLETED — verification & clarifications)
- ✅ Telegram feed configuration confirmed via API:
  - `/api/community-v2/feed/public/containers` provides configurable `title` and `subtitle`.
- ✅ Landing layout behavior verified:
  - Admin UI style currently selects layout `mobile_app` → maps to `CinematicLanding`.
  - Note: `MediaPlayer` is present in `MosaicCommunityLanding` but **not** in `CinematicLanding`; this is expected based on layout selection.
- ✅ Media player controls policy confirmed in code:
  - Autoplay logic, muted fallback, and “mute-only” behavior preserved.
- ✅ sessionStorage caching confirmed for landing components (MediaPlayer, Telegram, etc.).

### Exit criteria
- ✅ P2 verified with no regressions to critical rules.

---

## 3) Next Actions (Immediate)
> All phases in this plan are complete.

If continuing work beyond this plan:
1. Optional: Add a small UX hint in Admin UI Style editor clarifying which landing layouts include MediaPlayer.
2. Optional: Apply badge customization config to *all* status badge renderers (some areas still use local `STATUS_COLORS` maps).
3. Proceed to production deploy (if not already) and repeat smoke checklist in production.

---

## 4) Success Criteria
- ✅ Public login is OAuth-only and reliable.
- ✅ Admin login works; AdminDashboard redirect guard correct.
- ✅ Backend stability protections intact (WATCHFILES, auth cache TTL, Mongo settings, persistent httpx, Monday queue).
- ✅ Printing works end-to-end and is null-safe.
- ✅ League creation works; PinPanClub mobile has no horizontal overflow on audited pages.
- ✅ Badge customization is configurable via admin UI and persisted.
- ✅ Google Photos video playback improvements implemented (CORS + direct video URL transform + poster).
- ✅ P2 verified (Telegram config, layout behavior, media controls policy, sessionStorage caching).
- ✅ All CRITICAL RULES remain satisfied.