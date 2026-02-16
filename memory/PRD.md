# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Community Feed: Hide Auto/See All + Admin Link Buttons (Feb 16, 2026) - COMPLETE
- **Hidden by default**: "Auto" (autoplay toggle) and "See all" buttons now hidden by default on ChiPi Community feed
- **Admin-configurable**: New toggles `show_autoplay_btn` and `show_see_all_btn` in Telegram admin (Integrations > Telegram > container settings > Toggles)
- **Header Link Buttons**: New admin section to add/remove custom link buttons (label + URL pairs) that appear in the feed header. Supports both external URLs (opens new tab) and internal app paths
- Files: `TelegramFeedCard.jsx` (HorizontalFeedContainer + VerticalFeedContainer), `TelegramAdminModule.jsx`

### Stock Movements: Naming Update & Summary Cards (Feb 16, 2026) - COMPLETE
- **Renamed** "Workflows" → "Stock Mov." / "Stock Movements", "PCA Textbooks" → "School Textbooks" across entire app
- **Summary cards**: Dynamic stats (Total, Pending, Completed, type breakdown) that update per catalog filter

### Stock Movements: Catalog Type Separation (Feb 16, 2026) - COMPLETE
- Catalog filter tabs (All / School Textbooks / Public Store), explicit catalog selection in create dialogs
- Scoped product search, visual badges, backend `catalog_type` field + filtering

### Stock Movements System (Feb 16, 2026) - COMPLETE
- 3 workflow types: Shipment, Customer Return, Stock Adjustment with state machine transitions

### Media Player Features (Feb 15-16, 2026) - COMPLETE
- Video autoplay with unmute/mute fallback, smart portrait image pairing, admin muted config

### Other Completed Features
- Animation Types & Lottie, Custom Icon Statuses, Horizontal Telegram Feed
- Module Icon Status Indicators, Privacy Settings, Monday.com Widget
- Media Gallery Player, PinPanClub Ranking Fix, Banner/Feed UI Fixes

## Prioritized Backlog

### P1: Implement "Stop" Button for Full Sync
- Refactor full_sync into cancellable background task
- Add stop button in UI

### P2: On-Demand Landing Page Redesign Tool
- Admin panel tool for layout/component customization

### P3: General Inventory Monday.com Sync
- Extend Monday.com sync to general (non-textbook) inventory

## Architecture

### Key DB Collections
- `store_products` with `is_private_catalog: bool` for catalog type
- `stock_orders` with `catalog_type: "public"|"pca"`
- `telegram_feed_containers` with `show_autoplay_btn`, `show_see_all_btn`, `header_links[]`

### Key Files
- `frontend/src/components/TelegramFeedCard.jsx` - Community feed with configurable buttons
- `frontend/src/modules/admin/TelegramAdminModule.jsx` - Feed container admin config
- `frontend/src/modules/unatienda/tabs/StockOrdersTab.jsx` - Stock Movements
- `backend/modules/store/routes/stock_orders.py` - Stock Orders API
- `backend/modules/store/routes/inventory.py` - Product inventory API
