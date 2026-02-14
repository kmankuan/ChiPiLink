# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### TXB Inventory Bidirectional Monday.com Sync (Feb 14, 2026) - COMPLETE
- **Full Sync:** Push all 15 private textbooks to Monday.com board (create or update)
- **App → Monday.com:** Stock adjustments auto-sync to Monday.com via inventory adjust endpoint
- **Monday.com → App:** Webhook receives stock column changes and updates local inventory + logs movements
- **Per-student order subitems:** When orders are placed, student name + order reference added as subitems under textbook items
- **Grade-based grouping:** Optional auto-create groups by grade on Monday.com
- **Enhanced Admin UI:** Full Sync button, webhook management (register/unregister), stock column mapping, sync stats
- **Backward compatibility:** Handles legacy `stock` and new `stock_quantity` config keys
- **Tested: 100%** — 23/23 backend tests (iteration_113)

### Telegram Feed Album Carousel & Multi-Container System (Feb 14, 2026) - COMPLETE
- Album View: Posts with same `media_group_id` grouped into carousel with arrows, dots, badge
- Multi-Container System: Admin creates multiple feed containers with customizable title, colors, card style, CTA
- Duplicate Container ability for different channels/groups
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
- `GET/PUT /api/store/order-summary-config` — Order summary modal config

## Key Files
- `/app/backend/modules/store/integrations/monday_txb_inventory_adapter.py` — Full bidirectional sync adapter
- `/app/backend/modules/store/routes/monday_sync.py` — Sync routes + webhook
- `/app/backend/modules/store/routes/inventory.py` — Inventory adjust (Monday sync hook)
- `/app/frontend/src/modules/monday/components/TxbInventoryTab.jsx` — Enhanced admin UI
- `/app/frontend/src/components/TelegramFeedCard.jsx` — Album carousel + multi-container
- `/app/frontend/src/modules/admin/TelegramAdminModule.jsx` — Feed container management

## Database Collections
- `store_products` — Products (with `monday_item_id` for linked items, `is_private_catalog` for textbooks)
- `inventory_movements` — Stock change log (includes `reason: "monday_webhook"` for Monday.com changes)
- `monday_config` — Monday.com integration configs (key: `store.textbook_orders.txb_inventory`)
- `telegram_feed_containers` — Feed container configs
- `community_posts` — Telegram posts (with `media_group_id` for albums)

## 3rd Party Integrations
- Monday.com API v2 (GraphQL) — Board 18397140920 for TXB Inventory
- Telegram Bot API
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 — Emergent LLM Key
- Gmail (IMAP)

## Backlog
### P0 - General Unatienda Inventory → Monday.com (Bidirectional)
- New board for public catalog products
- Full CRUD sync + stock bidirectional
### P1 - On-Demand Landing Page Designer (Planned)
- Phase 1: Layout switcher, section manager, live preview
- Phase 2: Theme/color customizer, per-section config
- Phase 3: AI-generated layout suggestions
- Phase 4: Drag-and-drop page builder
### P2 - Evolve Landing Page Layout
