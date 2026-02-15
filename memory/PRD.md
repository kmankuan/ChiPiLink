# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Banner UI Fix (Feb 15, 2026) - COMPLETE
- Removed rounded corners from banner carousel (container, image, text banners all `rounded-none`)
- Removed gap between ticker bar and banner (zeroed padding on parent header wrapper)

### Per-Column Sync Bug Fix (Feb 15, 2026) - COMPLETE
- **Root cause:** Route handler used `HTTPException` which could return non-JSON on some proxies. Frontend catch block showed generic "Server error (400)" instead of actual error.
- **Fix:** Route handler now uses `JSONResponse` + try/except for all error paths, guaranteeing JSON responses
- **Backend:** `start_column_sync()` wrapped in try/except at every level, detailed logging with exc_info
- **Frontend:** `handleSyncColumn` now shows actual server response body on error, not generic message
- **Also fixed:** `_build_single_column_value` now correctly handles `stock` as alias for `stock_quantity`
- **Tested: 100%** — Backend (11/11) + Frontend UI verified (iteration_117)

### Per-Column Sync & Grade Fix (Feb 14, 2026) - COMPLETE
- Grade column fix: `_format_column_value` detects Monday.com column types (dropdown, status, text)
- Per-column sync: `POST /api/store/monday/txb-inventory/sync-column/{column_key}` syncs a single column
- Frontend: Each column mapping field has an individual "Sync" button
- **Tested: 100%** — Backend (5/5) + Frontend (iteration_116)

### Monday.com Create-Item Auto-Import (Feb 14, 2026) - COMPLETE
- New `create_item` webhook handler: items added on Monday.com auto-import into private catalog
- Frontend: "Auto-Import New Items" card in TXB Inventory admin tab
- **Tested: 100%** — Backend (15/15) + Frontend (iteration_115)

### Monday.com Sync Dashboard Widget (Feb 14, 2026) - COMPLETE
- Unified widget on admin dashboard showing real-time sync health across all 3 Monday.com boards
- **Tested: 100%** — Backend (18/18) + Frontend (iteration_114)

### TXB Inventory Bidirectional Monday.com Sync (Feb 14, 2026) - COMPLETE
- Full Sync, App->Monday, Monday->App, Per-student order subitems, Grade-based grouping
- **Tested: 100%** — 23/23 backend tests (iteration_113)

### Previous Features - ALL COMPLETE
- Telegram Feed Album Carousel & Multi-Container System
- Order Summary Preview Modal, Textbook Multi-Select Bug Fix
- Touch-Swipe Gestures, Slide Animations, Parallax
- Admin Panel Refactor, Monday.com Dual Board Integration
- Banner Carousel & Media Player, Wallet Payment Workflow

## Key API Endpoints

### TXB Inventory Per-Column Sync
- `POST /api/store/monday/txb-inventory/sync-column/{column_key}` — Sync a single column (returns 202, polls status)
- `GET /api/store/monday/txb-inventory/sync-column-status/{column_key}` — Poll sync progress

### Monday.com Sync Dashboard
- `GET /api/monday/sync-dashboard` — Unified sync health across all boards

### TXB Inventory Monday.com Sync
- `GET /api/store/monday/txb-inventory-config` — Config with column mappings
- `PUT /api/store/monday/txb-inventory-config` — Save config
- `POST /api/store/monday/txb-inventory/full-sync` — Push all textbooks
- `POST /api/store/monday/txb-inventory/webhook` — Monday.com webhook handler
- `POST /api/store/monday/txb-inventory/webhook/register` — Register webhook
- `DELETE /api/store/monday/txb-inventory/webhook` — Unregister webhook

## Key Files
- `/app/backend/modules/store/routes/monday_sync.py` — Sync routes + webhook
- `/app/backend/modules/store/integrations/monday_txb_inventory_adapter.py` — Full sync adapter
- `/app/frontend/src/modules/monday/components/TxbInventoryTab.jsx` — Admin UI
- `/app/backend/modules/integrations/monday/core_client.py` — Monday.com API client
- `/app/backend/modules/integrations/monday/routes.py` — Monday.com integration routes

## Database Collections
- `monday_integration_config` — Monday.com integration configs
- `monday_column_sync_status` — Per-column sync task tracking
- `store_products` — Products (with `monday_item_id` for linked items)
- `inventory_movements` — Stock change log
- `telegram_feed_containers` — Feed container configs
- `community_posts` — Telegram posts

## 3rd Party Integrations
- Monday.com API v2 (GraphQL)
- Telegram Bot API
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 — Emergent LLM Key
- Gmail (IMAP)

## Backlog
### P1 - Stop Sync Button (Upcoming)
- Cancel in-progress Full Sync to Monday.com
- Background task refactoring with cancellation support

### P2 - On-Demand Landing Page Designer (Planned)
- Phase 1: Layout switcher, section manager, live preview
- Phase 2: Theme/color customizer, per-section config
- Phase 3: AI-generated layout suggestions
- Phase 4: Drag-and-drop page builder

### P3 - General Inventory Monday.com Sync (Future)
- New board for public catalog products
- Full CRUD sync + stock bidirectional
