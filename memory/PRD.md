# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Stock Movements: Naming Update & Summary Cards (Feb 16, 2026) - COMPLETE
- **Renamed "Workflows" tab → "Stock Mov."** (tab) / "Stock Movements" (heading) — better describes the feature
- **Renamed "PCA Textbooks" → "School Textbooks"** throughout the entire app (StockOrdersTab, UnatiendaModule, PrivateCatalogTab, DashboardModule, LinkingPage)
- **Badge label**: "PCA" → "Textbooks" (purple), "Public" stays as-is (green)
- **Summary cards added**: Dynamic stats at top of Stock Movements view — Total Orders, Pending, Completed, and type breakdown (Ship/Ret/Adj). All update based on selected catalog filter.
- Files changed: `StockOrdersTab.jsx`, `UnatiendaModule.jsx`, `PrivateCatalogTab.jsx`, `DashboardModule.jsx`, `LinkingPage.jsx`

### Stock Movements: Catalog Type Separation (Feb 16, 2026) - COMPLETE
- **Catalog filter tabs**: "All", "School Textbooks", "Public Store" at the top of the Stock Movements view with counts
- **Explicit catalog selection**: Shipment and Adjustment creation dialogs include a CatalogTypeSelector (Public Store / School Textbooks)
- **Scoped product search**: ProductPicker filters products by `is_private_catalog` based on selected catalog type
- **Returns default to Textbooks**: Return workflow shows "School Textbooks Inventory" indicator; always tagged as `pca` since returns are from linked student orders
- **Visual badges**: Each order row shows a Textbooks (purple) or Public (green) badge
- **Order detail**: Shows catalog type in detail dialog
- **Backend**: `catalog_type` field on stock orders; list API supports `catalog_type` filter; `catalog_counts` aggregation
- **Backend**: `GET /api/store/inventory/products` supports `catalog_type=pca|public` filtering
- **Migration**: Existing orders migrated to `pca` catalog_type
- Frontend: `StockOrdersTab.jsx`, Backend: `stock_orders.py`, `inventory.py`

### Stock Movements System (Feb 16, 2026) - COMPLETE
- **3 workflow types**: Shipment (draft → confirmed → received), Customer Return (registered → inspected → approved|rejected), Stock Adjustment (requested → applied)
- **Stock integrity**: Inventory only updates at terminal workflow steps
- **Customer Returns linked to orders**: Search existing textbook orders and link returns
- **Audit trail**: Full status history with timestamps and user info

### Media Player Features (Feb 15-16, 2026) - COMPLETE
- Video autoplay with unmute/mute fallback, admin-configurable default muted setting
- Smart portrait image pairing, shuffle, fit modes, dot styles, lock navigation

### Other Completed Features
- New Animation Types & Lottie Support
- Custom Icon Statuses & Animations (24 types)
- Horizontal Telegram Feed Redesign
- Module Icon Status Indicators
- Privacy Settings Module
- Monday.com Public Board Widget
- Media Gallery Player
- PinPanClub Super Pin Ranking Layout Fix
- Banner & Telegram Feed UI Fixes
- Per-Column Sync Bug Fix

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

### Frontend
- React with react-i18next for i18n (en, es, zh)
- Shadcn/UI components, lottie-react for animations

### Key DB Collections
- `store_products` with `is_private_catalog: bool` for catalog type
- `stock_orders` with `catalog_type: "public"|"pca"` for movement catalog separation
- `app_config`, `users`, `store_textbook_orders`, `inventory_movements`

### Key Files
- `frontend/src/modules/unatienda/tabs/StockOrdersTab.jsx` - Stock Movements with catalog separation
- `backend/modules/store/routes/stock_orders.py` - Stock Orders API
- `backend/modules/store/routes/inventory.py` - Product inventory API with catalog filter
- `frontend/src/modules/unatienda/UnatiendaModule.jsx` - Unatienda main module
