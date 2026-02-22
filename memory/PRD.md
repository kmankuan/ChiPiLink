# ChiPi Link - PRD

## Original Problem Statement
Fix incorrect inventory statistics bug, then separate school textbook ("Sysbook") system from public store ("Unatienda"), with full-stack refactoring of legacy terminology.

## Core Systems
- **Unatienda**: Public-facing store with product inventory → Backend: `modules/store/`, API: `/api/store/`
- **Sysbook**: Private school textbook management → Backend: `modules/sysbook/`, API: `/api/sysbook/`

## Naming Convention
- Files, variables, paths use `sysbook_` or `unatienda_` prefix to distinguish systems
- No "catalog" concept — use "inventory" instead
- API routes: `/api/sysbook/*` for textbooks, `/api/store/*` for public store

## What's Been Implemented

### Previous Sessions
- Sysbook module separation (backend routes, frontend components)
- Per-product custom alert thresholds, stock alerts dashboard
- CSV import & student ordering flow
- DB field standardization: `is_private_catalog` → `is_sysbook`, `catalog_type` → `inventory_source`

### Current Session (Feb 22, 2026)
- **Admin Login Fix (P0)**: Force-update `password_hash` + `is_admin` on every startup
- **Deployment Startup Fix**: Fast path (indexes + seeds ~250ms) + deferred background init
- **Index Conflict Fix**: Per-index `_safe_index()` with `sparse=True` for Atlas
- **Stock Order Delete**: DELETE endpoints (individual, bulk, clear-all) + UI buttons
- **P5 Cosmetic Refactor**: `catalog` → `inventory/sysbook` naming across full-stack
- **Route Migration (P5+)**: Moved 6 sysbook route files from `store/` to `sysbook/` module:
  - `/api/store/sysbook-catalog/*` → `/api/sysbook/browse/*`
  - `/api/store/textbook-access/*` → `/api/sysbook/access/*`
  - `/api/store/textbook-orders/*` → `/api/sysbook/orders/*`
  - `/api/store/presale-import/*` → `/api/sysbook/presale-import/*`
  - `/api/store/school-year/*` → `/api/sysbook/school-year/*`
  - `/api/store/bulk-import/*` → `/api/sysbook/bulk-import/*`
- **Full Backend Separation (P0)**: Completed full architectural separation of sysbook module:
  - Moved services from `store/services/` to `sysbook/services/`: `crm_chat_service.py`, `monday_sync_service.py`, `textbook_order_service.py`, `textbook_access_service.py`, `bulk_import_service.py`, `presale_import_service.py`, `school_year_service.py`
  - Moved models from `store/models/` to `sysbook/models/`: `textbook_access.py`, `textbook_order.py`
  - Moved repositories from `store/repositories/` to `sysbook/repositories/`: `textbook_access_repository.py`, `textbook_order_repository.py`
  - Deleted duplicate files from `store/` after verifying no dependencies
  - Fixed circular import issues with lazy imports in `store/integrations/monday_textbook_adapter.py` and `store/services/monday_sync_service.py`
  - Shared infrastructure stays in `store/`: Monday.com adapters, config services, and shared routes (inventory_import, form_config, order_form_config, monday_sync)
- **Testing**: 100% pass rate (iteration_192) — all sysbook and store endpoints verified

## Architecture
```
/api/sysbook/              ← All school textbook functionality
  /inventory/*             ← Admin inventory management
  /stock-orders/*          ← Stock movements
  /analytics/*             ← Sysbook analytics
  /alerts/*                ← Low-stock alerts
  /browse/*                ← User-facing product browsing
  /access/*                ← Student-parent linking
  /orders/*                ← Textbook orders
  /presale-import/*        ← Pre-sale import from Monday.com
  /school-year/*           ← School year config
  /bulk-import/*           ← Bulk import from sheets

/api/store/                ← Public store (Unatienda)
  /products/*              ← Product CRUD
  /categories/*            ← Category management
  /inventory/*             ← Public inventory
  /public/*                ← Public endpoints
  /analytics/*             ← Store analytics
  /stock-orders/*          ← Unatienda stock orders
```

## Remaining Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- Remove diagnostic info from `/api/health` (temporary debug tool)

## Credentials
- Admin: teck@koh.one / Acdb##0897
- Auth: POST /api/auth-v2/login
