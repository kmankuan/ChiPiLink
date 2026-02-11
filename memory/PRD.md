# ChiPi Link - PRD

## Widget Maintenance Mode (Feb 9, 2026)
- Toggle in admin Display tab: `maintenance.active` boolean
- Custom message: `maintenance.message` editable text
- Widget stays visible (floating button), inside shows "Under Maintenance" screen
- Instant on/off — no deployment needed

## Archive System (Feb 9)
- Archive: products → hidden layer (not deleted)
- Restore: back to main view
- Permanent Delete: only from archive (hard delete)
- Catalog filter: All / PCA / Public / Archived

## Unified Inventory (Feb 9)
- Merged Private PCA + old Inventory → single "Inventory" tab
- Products + Movements views, Stock Adjust Dialog
- Multi-select, bulk actions, sort, filter, inline edit

## Dynamic & Draggable Columns (Feb 9)
- Dynamic columns per catalog type: PCA (Book Name, Code, Grade, Subject, Publisher, Price, Stock, Status), Public (Product Name, SKU, Category, Type, Brand, Price, Stock, Status), All/Archived (Name, Code/SKU, Grade, Category, Publisher/Brand, Price, Stock, Status)
- Native HTML5 drag-and-drop column reordering (except sticky Name column)
- Column order persisted per catalog type in localStorage (chipi_inv_col_order)
- Column widths persisted in localStorage (chipi_inv_col_widths)
- "Reset Columns" button appears when order has been customized, restores default layout
- GripVertical icon on draggable headers
- Tested: iteration 71 — 14/14 features verified, 100% pass

## Widget System
- Server-side token relay for cross-origin iframe OAuth
- In-widget ordering: select textbooks → submit
- Floating button: 7 positions, 6 icons, 4 styles, live preview
- State persistence via sessionStorage
- **Logout button** in widget header (Feb 10)
- **Orders tab** showing order status per student with status badges (Feb 10)
- Debug info shown on "No textbooks" screen: grade searched, products found + Refresh button

## Monday.com
- Orders + Textbooks Board sync (config-driven)

## Known Issues
- P2: sync-all endpoint broken
- P3: i18n, board selector UX

## Bug Fixes
- **Textbook ordering: grade mismatch fix (Feb 10)** — `get_books_for_grade()` no longer requires `is_private_catalog: True`. Now matches any active, non-archived product for the grade. Fixes "No textbooks available" when products exist in the unified inventory without the PCA flag. Also fixed diagnostic endpoint's grade mapping (was missing G7-G12).
- **Textbook ordering: item preservation fix (Feb 10)** — `_refresh_order_items()` no longer wipes existing items when products can't be found in the catalog. Existing items are preserved and marked as `out_of_stock` instead of being deleted. New catalog items are added to the order.
- **Widget: error state display (Feb 10)** — Widget now differentiates between "API failed" and "no textbooks exist." Shows actual error message with retry button instead of misleading "No textbooks available" message. Also added Out of Stock section for items with `out_of_stock` status.

## Pre-sale Inventory System (Feb 10)
- Admin can toggle "Pre-sale Mode" per student from the Students tab (multi-select + bulk action)
- When pre-sale is ON for a student: orders increment `reserved_quantity` (Pre-sale column) — stock is NOT deducted
- When pre-sale is OFF (normal): orders deduct from `inventory_quantity` directly
- Pre-sale is invisible to the client user — ordering looks identical from the widget
- New "Pre-sale" column in inventory table shows pending reservations (amber badge)
- When admin adds stock via Stock Adjust: pre-sale orders auto-fulfilled first, remaining becomes available
- Students tab: multi-select checkboxes, bulk "Enable/Disable Pre-sale" actions, Pre-sale Active stat card, orange "Pre-sale" badge on student rows

## Codebase Cleanup: Spanish → English (Feb 10)
- Replaced all `libro`/`libros` variable names, comments, and constants with English equivalents
- Changed book_id prefix from `libro_` to `book_` for new products (existing data unaffected)
- Updated category seed data: `libros` → `books`, `bebidas` → `beverages`, etc.
- Removed `USE_NEW_ENDPOINTS` ternary from store product/category/student API paths in `config/api.js`
- Cleaned legacy collection mapping in `constants.py`
- Updated all frontend components: StoreModule, CartDrawer, Dashboard, Catalog, OrderForm, etc.
- Backend: events, bulk_import_service, admin routes, category repository all use English terms now

## Test Reports (all passed)
- iter 65: Widget display (16/16)
- iter 66: Placement + OAuth (38/38)
- iter 67: Live preview + persistence (14/14)
- iter 68: PCA features (13/13)
- iter 69: Unified inventory (12/12)
- iter 70: Archive system (12/12)
- iter 71: Dynamic & Draggable columns (14/14)
- iter 73: Wallet Payment System — backend 18/18, frontend 100%
- iter 74: Wallet Admin Module — backend 19/19, frontend 100%
- iter 75: Community Telegram Feed — backend 21/21, frontend 100%

## Wallet Payment System (Feb 10)
- **Widget Payment Flow**: Users see wallet balance when ordering textbooks. "Pay with Wallet" button charges wallet atomically before creating order. Insufficient balance shows warning + bank transfer info.
- **Monday.com Wallet Adapter** (`modules/users/integrations/monday_wallet_adapter.py`):
  - Extends `BaseMondayAdapter` (namespace: `users.wallet`)
  - Board "Customers Admin" (5931665026): Items = customers (email column), Subitems = wallet events
  - Subitem columns: `Chipi Wallet` (amount), `Chipi Note` (description), `Status` (Add Wallet / Deduct Wallet)
  - Webhook triggers on subitem status change → deposits or charges user wallet
  - Config-driven: board_id, column_mapping, subitem_column_mapping stored in `monday_integration_config` collection
  - Admin config routes: `GET/PUT /api/monday/adapters/wallet/config`
  - **Admin UI**: "Wallet" tab in Monday.com Integration page with board config, column mapping, webhook URL, status label reference
  - **Webhook URLs**: Fixed to use `window.location.origin` (auto-adapts to preview/production domain)
- **Admin Adjust API**: `POST /api/wallet/admin/adjust/{user_id}` — supports topup and deduct actions.

## Wallet Admin Module (Feb 11)
- **Dedicated Sidebar Item**: "Wallet" menu between Orders and Reports
- **4 Tabs**:
  - **Overview**: Stats cards + user table with Top Up / Deduct buttons
  - **Transactions**: Full history with type filter, pagination, user enrichment
  - **Bank Info**: Multi-context bank configs (e.g. `wallet_general` = Banco General, `pca_private` = BAC Panama). Add/Edit/Delete.
  - **Settings**: Monday.com webhook config (board ID, column mappings)
- **Bank Info API**: CRUD at `/api/wallet/admin/bank-info`, public `GET /api/wallet/bank-info/{context}`
- Old "Wallets" tab removed from Users module

## Upcoming Tasks
- Transaction history view for clients in the widget
- Wallet balance notifications (low balance alerts)
- P2: sync-all endpoint fix
- P3: i18n, board selector UX
