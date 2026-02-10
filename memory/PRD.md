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

## Monday.com
- Orders + Textbooks Board sync (config-driven)

## Known Issues
- P2: sync-all endpoint broken
- P3: i18n, board selector UX

## Bug Fixes
- **Textbook ordering: grade mismatch fix (Feb 10)** — `get_books_for_grade()` no longer requires `is_private_catalog: True`. Now matches any active, non-archived product for the grade. Fixes "No textbooks available" when products exist in the unified inventory without the PCA flag. Also fixed diagnostic endpoint's grade mapping (was missing G7-G12).

## Test Reports (all passed)
- iter 65: Widget display (16/16)
- iter 66: Placement + OAuth (38/38)
- iter 67: Live preview + persistence (14/14)
- iter 68: PCA features (13/13)
- iter 69: Unified inventory (12/12)
- iter 70: Archive system (12/12)
- iter 71: Dynamic & Draggable columns (14/14)
