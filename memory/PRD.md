# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Per-Column Sync & Grade Fix (Feb 14, 2026) - COMPLETE
- **Grade column fix:** `_format_column_value` now detects Monday.com column types (dropdown, status, text) and formats values accordingly — dropdowns use `{labels: [value]}`, status uses `{label: value}`
- **Per-column sync:** New endpoint `POST /api/store/monday/txb-inventory/sync-column/{column_key}` syncs a single column across all textbooks
- **Frontend:** Each column mapping field now has an individual "Sync" button to push just that column
- **Valid column keys:** code, name, grade, publisher, subject, unit_price, stock_quantity
- **Tested: 100%** — Backend (5/5) + Frontend code review (iteration_116)

### Monday.com Create-Item Auto-Import (Feb 14, 2026) - COMPLETE
- New `create_item` webhook handler: when items are added on Monday.com board, they auto-import into private catalog
- Fetches column values from Monday.com API and maps to product fields (name, code, grade, price, stock)
- Deduplication: checks by `monday_item_id` and `code` before creating
- New registration endpoints: register/unregister create-item webhook
- Frontend: "Auto-Import New Items" card in TXB Inventory admin tab
- **Tested: 100%** — Backend (15/15) + Frontend (all) (iteration_115)

### Monday.com Sync Dashboard Widget (Feb 14, 2026) - COMPLETE
- **Unified widget** on admin dashboard home showing real-time sync health across all 3 Monday.com boards
- **Board status cards:** TXB Inventory (healthy), Textbook Orders (healthy), Wallet Recharge (degraded)
- **Health indicators:** green/amber/red per board + overall aggregated health
- **Quick actions:** Sync Now (TXB), Sync All (Orders), View Config arrows
- **Recent Sync Activity:** Mixed timeline from all boards sorted by time
- **Webhook status badges:** Live indicator for boards with active webhooks
- **API endpoint:** `GET /api/monday/sync-dashboard` aggregating data from all boards
- **Tested: 100%** — Backend (18/18) + Frontend (all) (iteration_114)

### TXB Inventory Bidirectional Monday.com Sync (Feb 14, 2026) - COMPLETE
- **Full Sync:** Push all 15 private textbooks to Monday.com board (create or update)
- **App -> Monday.com:** Stock adjustments auto-sync to Monday.com via inventory adjust endpoint
- **Monday.com -> App:** Webhook receives stock column changes and updates local inventory + logs movements
- **Per-student order subitems:** When orders are placed, student name + order reference added as subitems under textbook items
- **Grade-based grouping:** Optional auto-create groups by grade on Monday.com
- **Enhanced Admin UI:** Full Sync button, webhook management (register/unregister), stock column mapping, sync stats
- **Tested: 100%** — 23/23 backend tests (iteration_113)

### Telegram Feed Album Carousel & Multi-Container System (Feb 14, 2026) - COMPLETE
- Album View: Posts with same `media_group_id` grouped into carousel with arrows, dots, badge
- Multi-Container System: Admin creates multiple feed containers with customizable title, colors, card style, CTA
- **Tested: 100%** — Backend (13/13) + Frontend (all) (iteration_112)

### Previous Features - ALL COMPLETE
- Order Summary Preview Modal
- Textbook Multi-Select Bug Fix
- Touch-Swipe Gestures, Slide Animations, Parallax
- Admin Panel Refactor
- Monday.com Dual Board Integration
- Banner Carousel & Media Player
- Wallet Payment Workflow

## Key API Endpoints

### TXB Inventory Per-Column Sync
- `POST /api/store/monday/txb-inventory/sync-column/{column_key}` — Sync a single column across all textbooks (grade, stock, price, etc.)

### Monday.com Sync Dashboard
- `GET /api/monday/sync-dashboard` — Unified sync health across all boards

### TXB Inventory Monday.com Sync
- `GET /api/store/monday/txb-inventory-config` — Config with column mappings, webhook, sync stats
- `PUT /api/store/monday/txb-inventory-config` — Save config
- `POST /api/store/monday/txb-inventory/full-sync` — Push all textbooks to Monday.com
- `POST /api/store/monday/txb-inventory/sync-stock/{book_id}` — Sync single book's stock
- `POST /api/store/monday/txb-inventory/webhook` — Monday.com stock change webhook
- `POST /api/store/monday/txb-inventory/webhook/register` — Register webhook
- `DELETE /api/store/monday/txb-inventory/webhook` — Unregister webhook

### Telegram Feed
- `GET /api/community-v2/feed/public/containers` — Public feed containers with grouped posts
- `POST/PUT/DELETE /api/community-v2/feed/admin/containers` — Container CRUD

### Store
- `POST /api/store/inventory/adjust` — Stock adjust (now includes monday_sync for private catalog)

## Key Files
- `/app/backend/modules/integrations/monday/routes.py` — Sync dashboard endpoint + Monday.com integration routes
- `/app/frontend/src/modules/dashboard/MondaySyncWidget.jsx` — Sync dashboard widget component
- `/app/frontend/src/modules/dashboard/DashboardModule.jsx` — Admin dashboard (includes widget)
- `/app/backend/modules/store/integrations/monday_txb_inventory_adapter.py` — Full bidirectional sync adapter
- `/app/backend/modules/store/routes/monday_sync.py` — Sync routes + webhook
- `/app/frontend/src/modules/monday/components/TxbInventoryTab.jsx` — Enhanced admin UI
- `/app/frontend/src/components/TelegramFeedCard.jsx` — Album carousel + multi-container

## Database Collections
- `monday_integration_config` — Monday.com integration configs (namespaced keys)
- `store_products` — Products (with `monday_item_id` for linked items)
- `inventory_movements` — Stock change log (includes `reason: "monday_webhook"`)
- `wallet_topup_monday_config` — Wallet recharge board config
- `wallet_webhook_logs` — Wallet webhook event logs
- `telegram_feed_containers` — Feed container configs
- `community_posts` — Telegram posts (with `media_group_id` for albums)

## 3rd Party Integrations
- Monday.com API v2 (GraphQL) — Boards: TXB Inventory, Textbook Orders, Wallet Recharge
- Telegram Bot API
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 — Emergent LLM Key
- Gmail (IMAP)

## Backlog
### P0 - On-Demand Landing Page Designer (Planned)
- Phase 1: Layout switcher, section manager, live preview
- Phase 2: Theme/color customizer, per-section config
- Phase 3: AI-generated layout suggestions
- Phase 4: Drag-and-drop page builder
### P1 - General Unatienda Inventory -> Monday.com (Bidirectional)
- New board for public catalog products
- Full CRUD sync + stock bidirectional
### P2 - Fix React "unique key prop" warning - DONE (Feb 14, 2026)
- Root cause: Duplicate `product_id` on public products ("Updated Test Book", "Hotdog Especial") caused duplicate keys in CatalogTable
- Fix: Added fallback ID generation and dedup logic in `PrivateCatalogTab.jsx` line 647-660
