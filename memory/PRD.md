# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Monday.com Stock Approval Integration (Feb 16, 2026) - COMPLETE
- **Stock changes routed through Stock Movements**: Monday.com stock changes no longer directly update inventory. Instead, they create pending Stock Adjustment orders
- **"Stock Approval" column on Monday.com**: Created a status column (Pending/Approved/Rejected) on the TXB Inventory board (column_id: color_mm0mtf8f)
- **Bidirectional approval**: Admin can approve/reject from the app (Stock Movements tab) OR directly from Monday.com by changing the Stock Approval column
  - Approved → inventory updates, movement logged
  - Rejected → stock reverts on Monday.com, adjustment cancelled
- **New products start at 0 stock**: Products created from Monday.com don't get stock synced — stock must go through Stock Movements
- **Admin setup UI**: "Stock Approval Control" card in TXB Inventory settings (Integrations) with one-click column creation
- **Monday.com badge**: Orders from Monday.com show a blue "Monday.com" badge with Zap icon in Stock Movements tab and detail dialog
- Files: `monday_txb_inventory_adapter.py`, `monday_sync.py`, `StockOrdersTab.jsx`, `TxbInventoryTab.jsx`

### Community Feed: Hide Auto/See All + Admin Link Buttons (Feb 16, 2026) - COMPLETE
- Hidden "Auto" and "See all" buttons by default (admin-configurable)
- Admin-configurable header link buttons (label + URL pairs)

### Stock Movements: Naming Update & Summary Cards (Feb 16, 2026) - COMPLETE
- Renamed "Workflows" → "Stock Movements", "PCA Textbooks" → "School Textbooks"
- Dynamic summary cards (Total, Pending, Completed, type breakdown)

### Stock Movements: Catalog Type Separation (Feb 16, 2026) - COMPLETE
- Catalog filter tabs (All / School Textbooks / Public Store)
- Explicit catalog selection, scoped product search, visual badges

### Stock Movements System (Feb 16, 2026) - COMPLETE
- 3 workflow types: Shipment, Customer Return, Stock Adjustment

### Media Player Features (Feb 15-16, 2026) - COMPLETE
### Other Completed Features (Feb 15, 2026) - COMPLETE

### Progress-Based Status Icon System (Feb 16, 2026) - COMPLETE
- **4 CSS-animated Chinese-themed icon sets**: Chinese Journey (Seedling → Phoenix), Chinese Architecture (Foundation → Palace), Celestial Path (New Moon → Golden Sun), Ink & Brush (First Stroke → Masterpiece)
- **5 progress levels per theme**: starting (0-25%), developing (25-50%), advancing (50-75%), mastering (75-95%), complete (100%)
- **Core shared resource**: `ProgressIcons.jsx` in `/components/ui/` — reusable across all modules via import
- **Lottie animation support**: via `lottie-react` with URL-based loading; sources from LottieFiles.com and Creattie.com
- **Admin integration**: Progress Icons Gallery in admin panel (admin#layouts) with theme browser, size variants, all themes overview
- **Status Animation dropdown**: 44 animation options including all 20 progress icons selectable per navigation icon
- **Landing page integration**: `MosaicCommunityLanding.jsx` StatusAnimation renders progress icons via `isProgressAnimation()` adapter
- Files: `ProgressIcons.jsx`, `LayoutPreviewModule.jsx`, `MosaicCommunityLanding.jsx`

### Pre-Sale Import from Monday.com (Feb 16, 2026) - COMPLETE
- **Backend**: 7 API endpoints (`/api/store/presale-import/` — preview, execute, orders, link, unlink, suggestions, confirm, reject)
  - Imports orders from Monday.com using sync trigger column (`color_mm0mnmrs`)
  - **Suggestion-based linking**: student registration creates suggestions for admin to confirm/reject (not auto-link)
  - Admin can manually link, **unlink** wrongly linked orders
- **Frontend**: "Pre-Sale Import" tab with suggestions panel (Confirm/Reject), unlink button, stats, filters
- Files: `presale_import_service.py`, `presale_import.py`, `PreSaleImportTab.jsx`, `textbook_access.py`

### Status Packs — One-Click Themed Icon Assignment (Feb 16, 2026) - COMPLETE
- **5 themed packs**: Chinese New Year, Construction Progress, Nature Journey, Celestial Night, Calligraphy Master
- Each pack auto-assigns progress animations to all navigation icons of the active layout with one click
- Shows preview strip of 5 themed icons + "Apply to [Layout Name]" button
- Auto-saves to backend on apply (PUT /api/admin/ticker/layout-icons/{layoutId})
- Files: `LayoutPreviewModule.jsx` (STATUS_PACKS array, handleApplyPack function)

### Students Table Enhancement (Feb 16, 2026) - COMPLETE
- Compact table with sortable columns, pagination (25/page), inline pre-sale toggle
- 4 large stat cards → inline badges
- Files: `StudentsTab.jsx`

### Unatienda Admin UI Reorganization (Feb 16, 2026) - COMPLETE
- **Grouped navigation**: 10 flat tabs reorganized into 4 logical groups (Catalog, Orders, School, Settings) with visual dividers
- **Compact stats**: Module-level 4 large stat cards → 4 inline badges; Inventory tab 6 stat cards → inline badge row
- **Reduced visual noise**: Removed info banner, compacted toolbar buttons, smaller filters
- Files: `UnatiendaModule.jsx`, `PrivateCatalogTab.jsx`

## Prioritized Backlog

### P1: Implement "Stop" Button for Full Sync
- Refactor full_sync into cancellable background task

### P2: On-Demand Landing Page Redesign Tool

### P3: General Inventory Monday.com Sync

## Key Architecture Notes

### Stock Flow
- Monday.com stock change → Webhook → Create Stock Adjustment (Pending) → Set "Stock Approval" to Pending
- Admin approves (app or Monday.com) → Inventory updated → Movement logged
- Admin rejects (app or Monday.com) → Monday.com stock reverted → Adjustment cancelled

### Key DB Collections
- `stock_orders` with `source: "monday_sync"`, `monday_item_id`, `monday_old_stock`, `monday_new_stock`
- `monday_integration_config` with `stock_approval_column_id` in TXB inventory config
- `store_products` with `is_private_catalog: bool`

### Key Files
- `backend/modules/store/integrations/monday_txb_inventory_adapter.py` - Core adapter with stock approval logic
- `backend/modules/store/routes/monday_sync.py` - API endpoints including setup-stock-approval
- `frontend/src/modules/unatienda/tabs/StockOrdersTab.jsx` - Stock Movements UI
- `frontend/src/modules/monday/components/TxbInventoryTab.jsx` - TXB Inventory admin with Stock Approval card
