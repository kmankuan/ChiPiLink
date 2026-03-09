# ChiPi Link (Main App) — Execution Plan

## 1) Objectives
- Deploy the latest main-app code to production and verify stability (no random restarts; core flows work).
- Preserve all CRITICAL RULES (persistent httpx clients, auth cache TTL, WATCHFILES env, Monday queue, minimal background tasks, Mongo settings).
- Complete P1 features (badge customization UI, Google Photos mobile playback fix, finish PinPanClub mobile verification).
- Verify P2 improvements are functioning in production (Telegram title/subtitle config, section titles spacing, media player controls).

---

## Phase 1 — Core Stability/Integration “POC” (Isolation)
> Goal: prove the **most failure-prone production flows** work end-to-end in isolation before changing features.

### User stories
1. As a public user, I can always see the LaoPan OAuth login button (no email form) so I can sign in reliably.
2. As an admin, I can log in with email/password and load AdminDashboard without redirect loops.
3. As an admin, I can print an order even when some item fields are null, and the UI reports success.
4. As a PinPanClub user, I can create a league successfully and see it in the competitions hub.
5. As the system, I can run under concurrent admin page loads without DB/auth thundering herd crashes.

### Implementation steps
- Environment sanity (local-first): install backend+frontend deps; confirm Mongo local reachable; ensure **no change to MONGO_URL**.
- Create minimal **verification scripts** (not app features):
  - `scripts/poc_health.py`: hit `/health` and `/api/health` and assert fast responses.
  - `scripts/poc_auth_admin.py`: seed admin exists (`/api/health/admin-check`), then perform admin login endpoint + fetch `/api/...` admin protected route.
  - `scripts/poc_print.py`: create/locate a test order with null-safe fields then call print endpoint.
  - `scripts/poc_pinpan_league.py`: create league and verify retrieval.
- Run POC scripts locally against running backend; fix only blockers found (no refactors).

### Exit criteria
- All POC scripts pass consistently (3 runs) and no backend crash/restart during tests.

---

## Phase 2 — V1 Production Deploy + Verification (P0)

### User stories
1. As a public user, I can complete LaoPan OAuth login and land in the app without errors.
2. As an admin, I can load admin pages quickly without repeated user lookups crashing the backend.
3. As an admin, I can print orders reliably (single + multi) and see accurate printed state.
4. As a PinPanClub mobile user, I can navigate all key pages at 375px width with no horizontal overflow.
5. As an operator, I can confirm WATCHFILES restart fix is working by monitoring uptime and logs after deploy.

### Implementation steps
- Deploy latest code to production (main app only; **do not touch integration-hub**).
- Production smoke checklist (manual + scripted where possible):
  - Login page content (OAuth-only) + OAuth callback.
  - Admin login + AdminDashboard redirect guard behavior (`user && !user.is_admin`).
  - Print flow: one-by-one auto-cut + dialog close timing + null-safe rendering.
  - League creation flow + competitions hub.
  - Mobile verification pass for PinPanClub primary routes.
- Stability verification:
  - Confirm `WATCHFILES_FORCE_POLLING=false` remains in `backend/server.py` and no `--reload` behavior impacts runtime.
  - Quick concurrency check: open multiple admin pages simultaneously; verify auth cache prevents DB saturation.

### Exit criteria
- Production: no unexpected backend restarts over a sustained observation window; P0 flows validated.

---

## Phase 3 — P1 Feature Work (Badge customization + Video fix + PinPan mobile)

### User stories
1. As an admin, I can configure each order status badge’s color and icon from the UI.
2. As a user, I see consistent Mosaic-styled status badges across orders, lists, and print views.
3. As a mobile user, I can play videos in the Media Player even when sourced from Google Photos.
4. As a PinPanClub mobile user, every page fits within the viewport (no sideways scrolling).
5. As an admin, I can preview badge changes immediately without breaking existing statuses.

### Implementation steps
- Badge customization (admin-config driven):
  - Add/update backend config model + endpoints (stored in existing config collection) to map `status -> {color, icon}`.
  - Frontend: admin UI editor + live preview; update badge renderer to use config with safe defaults.
- Google Photos playback fix:
  - Identify current media URL patterns; implement a mobile-safe strategy (direct file URLs where possible, proper `<video>` attributes, fallback UX when URL is not streamable).
  - Ensure controls policy remains: **videos only allow mute** (per requirement).
- PinPanClub mobile verification:
  - Systematically review remaining overflow offenders (375px) and patch layouts following established rules (`overflow-x-hidden`, `max-w-2xl mx-auto px-4`).

### Exit criteria
- Admin can configure badges; mobile video playback works for target sources; PinPanClub pages pass 375px audit.

---

## Phase 4 — P2 Verification + Hardening (No new scope)

### User stories
1. As an admin, I can change Telegram feed title/subtitle and see it reflected on landing.
2. As a user, landing sections feel tighter (titles inside containers) without layout jumps.
3. As a user, Media Player controls remain locked correctly (mute-only videos) across devices.
4. As an admin, performance remains stable with sessionStorage landing cache behavior.
5. As a developer/operator, core rules remain intact and regressions are caught early.

### Implementation steps
- Verify Telegram title/subtitle config in production; add small fixes only if mismatched.
- Confirm landing titles spacing is correct across locales (EN/ES/ZH) and cached-first rendering still works.
- Confirm media controls + shuffle + i18n album title behavior on mobile/desktop.
- Add/adjust targeted regression tests (backend) for:
  - auth cache behavior under concurrency
  - Monday queue usage (no direct calls)
  - null-safe price/quantity handling in print + order APIs

### Exit criteria
- P2 items verified in production; no regressions to critical rules.

---

## 3) Next Actions (Immediate)
1. Install deps and run backend+frontend locally; confirm `/health` responds.
2. Run Phase 1 POC scripts (health/auth/print/pinpan) and fix blockers only.
3. Deploy to production and complete Phase 2 smoke checklist.
4. Start Phase 3 work: badge customization (backend config + admin UI) first, then video, then PinPanClub overflow sweep.

---

## 4) Success Criteria
- Production uptime stable (no random restarts) and `/health` stays responsive.
- Public login is OAuth-only and reliable; admin login works; AdminDashboard redirect guard correct.
- Printing works end-to-end and is null-safe.
- League creation works; PinPanClub mobile has no horizontal overflow on all pages.
- Badge customization is configurable via admin UI and applied consistently.
- Google Photos videos play on mobile (or degrade gracefully with clear UX if unplayable).
- All CRITICAL RULES remain satisfied (httpx persistence, auth cache TTL, Monday queue, Mongo settings, sessionStorage caches, Mosaic palette).