# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Stock Workflows: Catalog Type Separation (Feb 16, 2026) - COMPLETE
- **Catalog filter tabs**: "All", "PCA Textbooks", "Public Store" at the top of the Workflows view with counts
- **Explicit catalog selection**: Shipment and Adjustment creation dialogs include a CatalogTypeSelector (Public Store / PCA Textbooks)
- **Scoped product search**: ProductPicker filters products by `is_private_catalog` based on selected catalog type
- **Returns default to PCA**: Return workflow shows "PCA Textbooks Inventory" indicator; always tagged as PCA since returns are from linked student orders
- **Visual badges**: Each order row shows a PCA (purple) or Public (green) badge
- **Order detail**: Shows catalog type in detail dialog
- **Backend**: `catalog_type` field added to stock orders; list API supports `catalog_type` filter; `catalog_counts` aggregation in response
- **Backend**: `GET /api/store/inventory/products` supports `catalog_type=pca|public` filter
- **Migration**: Existing orders migrated to `pca` catalog_type
- Frontend: `StockOrdersTab.jsx` — Full redesign with catalog separation
- Backend: `stock_orders.py` — Updated models and list endpoint
- Backend: `inventory.py` — Updated products endpoint with catalog filter

### Stock Workflows System (Feb 16, 2026) - COMPLETE
- **3 workflow types**: Shipment (draft → confirmed → received), Customer Return (registered → inspected → approved|rejected), Stock Adjustment (requested → applied)
- **Stock integrity**: Inventory only updates at terminal workflow steps — not on direct manual edits
- **Customer Returns linked to orders**: Search existing textbook orders and link returns to them
- **Audit trail**: Full status history with timestamps and user info on each transition
- **Step indicator UI**: Visual workflow progress bar for each order
- **Product search**: Autocomplete search for adding products to orders with stock levels
- Backend: `/app/backend/modules/store/routes/stock_orders.py` — CRUD + transitions + summary
- Frontend: `/app/frontend/src/modules/unatienda/tabs/StockOrdersTab.jsx` — Full UI with dialogs
- Admin tab: Unatienda > Workflows

### Media Player Mute Configuration (Feb 16, 2026) - COMPLETE
- **Default with sound**: Videos now play with sound by default (unmuted). If browser blocks unmuted autoplay, automatically falls back to muted playback
- **Admin setting**: New "Video Default Muted" toggle in admin panel (Content > Banners y Medios > Media Player tab)
- **User control**: Mute/unmute button on video slides allows users to toggle audio
- Backend: Added `video_default_muted` field to `DEFAULT_PLAYER_CONFIG`
- Frontend: Updated `MediaPlayer.jsx` with try-with-sound-then-fallback-to-muted logic
- Admin UI: Added checkbox in `ShowcaseAdminModule.jsx`

### Media Player Video Autoplay & Portrait Pairing Fix (Feb 16, 2026) - COMPLETE
### Media Player Controls & Video Fix (Feb 15, 2026) - COMPLETE
### New Animation Types & Lottie Support (Feb 15, 2026) - COMPLETE
### Custom Icon Statuses & Animations (Feb 15, 2026) - COMPLETE
### Horizontal Telegram Feed Redesign (Feb 15, 2026) - COMPLETE
### Module Icon Status Indicators (Feb 15, 2026) - COMPLETE
### Privacy Settings Module (Feb 15, 2026) - COMPLETE
### Monday.com Public Board Widget (Feb 15, 2026) - COMPLETE
### Media Gallery Player (Feb 15, 2026) - COMPLETE
### PinPanClub Super Pin Ranking Layout Fix (Feb 15, 2026) - COMPLETE
### Banner & Telegram Feed UI Fixes (Feb 15, 2026) - COMPLETE
### Per-Column Sync Bug Fix (Feb 15, 2026) - COMPLETE

## Prioritized Backlog

### P1: Implement "Stop" Button for Full Sync
- Refactor full_sync into cancellable background task
- Add stop button in UI

### P2: On-Demand Landing Page Redesign Tool
- Build admin panel tool for layout/component customization

### P3: General Inventory Monday.com Sync
- Extend Monday.com sync to general (non-textbook) inventory

## Architecture

### Backend
- FastAPI with MongoDB (Motor async driver)
- Modular route structure under `/app/backend/modules/`
- Telegram Bot API integration for channel sync

### Frontend
- React with react-i18next for i18n (en, es, zh)
- Shadcn/UI components
- lottie-react for Lottie animations
- Multiple landing page layouts (living_grid, mosaic, cinematic, etc.)
- Admin dashboard with modular tabs

### Key DB Collections
- `app_config` with keys: `ticker_config`, `landing_images`, `layout_icons`, `icon_statuses`
- `store_products` with `is_private_catalog: bool` for catalog type separation
- `stock_orders` with `catalog_type: "public"|"pca"` for workflow catalog separation
- `users`, `community_posts`, `store_textbook_orders`, `pinpanclub_matches`

### Key Files
- `frontend/src/modules/unatienda/tabs/StockOrdersTab.jsx` - Stock Workflows with catalog separation
- `backend/modules/store/routes/stock_orders.py` - Stock Orders API with catalog_type
- `backend/modules/store/routes/inventory.py` - Product inventory API with catalog filter
- `frontend/src/components/MediaPlayer.jsx` - Media player with smart layout
- `frontend/src/modules/admin/tabs/layouts/LayoutPreviewModule.jsx` - Admin status/icon management
- `backend/modules/ticker/routes.py` - Ticker, icon, status API endpoints
- `backend/modules/showcase/__init__.py` - Media player config API
