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
