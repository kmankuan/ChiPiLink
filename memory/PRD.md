# ChiPi Link - PRD

## Original Problem Statement
Fix incorrect inventory statistics bug, then separate school textbook ("Sysbook") system from public store ("Unatienda"), with full-stack refactoring of legacy terminology.

## Core Systems
- **Unatienda**: Public-facing store with product inventory
- **Sysbook**: Private school textbook management system (inventory, analytics, alerts, student ordering)

## What's Been Implemented

### Session 1-10 (Previous forks)
- Sysbook module separation (backend routes, frontend components)
- Per-product custom alert thresholds
- Stock alerts system with dashboard
- CSV import & student ordering flow
- DB field standardization: `is_private_catalog` → `is_sysbook`, `catalog_type` → `inventory_source`
- `pca` references removed, replaced with `sysbook`
- .gitignore fix for deployment

### Session 11 (Current - Feb 22, 2026)
- **Admin Login Fix (P0)**: Root cause was stale password hash in `auth_users` collection. Seed function now force-updates `password_hash` + `is_admin` on every startup. `verify_password()` handles empty/corrupted hashes.
- **Deployment Startup Fix**: Restructured startup into fast path (indexes + seeds ~250ms) + deferred background init (modules, webhooks, pollers). Eliminated 120s timeout warning.
- **Index Conflict Fix**: Each MongoDB index created independently with `_safe_index()` + `sparse=True` to match Atlas existing indexes.
- **Stock Order Delete**: Added DELETE endpoints (individual, bulk, clear-all) + frontend buttons.
- **P5 Cosmetic Refactor COMPLETE**: 
  - Backend: `private_catalog.py` → `sysbook_catalog.py`, route `/private-catalog` → `/sysbook-catalog`
  - Frontend: `privateCatalogAccess` → `sysbookAccess`, `catalogFilter` → `inventoryFilter`, `PublicCatalogTab` → `PublicInventoryTab`
  - Tab label "Catalog" → "Inventory"
  - All tested: 100% pass rate backend + frontend

## Key Architecture
- Backend: FastAPI with modular monolith, MongoDB (Atlas in prod, local in preview)
- Frontend: React + Shadcn/UI
- Auth: JWT-based with admin seed on startup, LaoPan OAuth for users
- Collections: `auth_users` (login), `users` (OAuth), `store_products`, `stock_orders`

## Remaining Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- Remove diagnostic info from `/api/health` endpoint (temporary debug tool)

## 3rd Party Integrations
- OneSignal, Monday.com API v2, Google Photos, Gmail, Telegram Bot
- OpenAI & Anthropic LLMs, OpenAI TTS (Emergent key), ElevenLabs TTS
- WebSockets (socket.io), LaoPan OAuth

## Credentials
- Admin: teck@koh.one / Acdb##0897
- Auth endpoint: POST /api/auth-v2/login
