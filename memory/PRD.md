# Sysbook / Unatienda / ChiPi Link — Product Requirements Document

## Original Problem Statement
School textbook order management platform with Monday.com integration for order syncing and print triggering. Key workflows: pre-sale import from Monday.com, order management, thermal receipt printing via Logic Controls LR2000E printer.

## Architecture
- **Frontend**: React (CRA) with Shadcn/UI, i18n, React Router
- **Backend**: FastAPI with Motor (async MongoDB)
- **Database**: MongoDB (`chipilink_prod`)
- **Integrations**: Monday.com (bi-directional sync, webhook print triggers)
- **Auth**: LaoPan OAuth + JWT (auth-v2 prefix)

## What's Been Implemented

### Completed (Feb 2026)
- Pre-Sale Import from Monday.com (pagination, code parsing, fuzzy matching)
- Universal archive/soft-delete system (backend + frontend)
- Thermal Printer Fix: `fetch()` + `document.write(html)` pattern
- Subitem Name Format: `"CODE BookName"` for Monday.com sync
- **Order Activity Tracking**: Print tracking (`printed_at`, `print_count`, `last_activity`) with visual indicators in table
- **Activity Column**: Green printer-check icon (printed) vs gray printer (not printed), blue link icon (linked)
- **Quick Print Button**: Printer icon directly in table row Actions column
- Pre-sale import: cursor-based pagination, `/` in codes, fuzzy book matching, "Listo" trigger label
- **Chatbot Help Guide**: Public `/help-guide` page with structured content for chatbot training, animated GIFs
- **Print Configuration (Feb 27, 2026)**: Configurable font family/size for thermal prints, template CRUD system (create, clone, edit, delete, activate). Moved from Sysbook to **Configuration** section in sidebar since printing is app-wide. Templates tab integrated into the existing Print & Package panel alongside Package List Format, Printer Settings, and Print History.
- **Help Guide Editor (Feb 27, 2026)**: Dual-mode editor (structured form + raw JSON code) in Dev Control > Help Guide tab. Content stored in MongoDB, public page renders dynamically from API
- **Presale Sync to Inventory (Feb 28, 2026)**: New `POST /api/sysbook/presale-import/sync-inventory` endpoint that auto-creates inventory products from presale order items, re-links all items to inventory (`matched: true`), and recalculates `reserved_quantity` on each product. Idempotent — safe to run multiple times. "Sync to Inventory" button added to Pre-Sale Import admin page.
- **Paid Date Column (Feb 28, 2026)**: Added `paid_date` field to orders. Presale import auto-detects "Date Paid" column from Monday.com board. Customer orders auto-set `paid_date` on submission. Orders table has sortable "Paid" column with inline date editor. Paid date shown in both thermal and browser print output. Admin endpoint `PUT /api/sysbook/orders/admin/{order_id}/paid-date` for manual updates.
- **Strict Code-First Matching (Feb 28, 2026)**: Fixed critical bug where fuzzy name matching caused cross-grade item linking. Item `code` is now the primary matching key.
- **Automated Presale-to-Inventory Sync (Feb 28, 2026)**: Presale import auto-creates missing inventory products and sets `reserved_quantity` at import time.
- **Editable Grade on Orders (Feb 28, 2026)**: Admin can edit order grade, which triggers re-linking of all order items to new grade's inventory and updates reserved quantities.
- **Remove Order Item (Feb 28, 2026)**: Admin can remove individual items from orders via order details dialog. Automatically decrements `reserved_quantity`.
- **"Purchased" Column (Feb 28, 2026)**: Inventory table shows clickable "Purchased" column with drill-down dialog listing all students who bought each item.
- **Monday.com Public Widget Overhaul (Feb 28, 2026)**: Search-only mode, i18n for EN/ES/ZH, correct column header display.
- **Telegram Embed Fixes (Feb 28, 2026)**: Fixed "Load Older" button pagination and broken image fallback.
- **Client-Side Retry Logic (Feb 28, 2026)**: Robust fetch wrapper with retry and exponential backoff for presale imports.

### Completed (Mar 1, 2026)
- **Add Item to Order (Mar 1, 2026)**: Admin can add inventory products to existing orders via a search dialog in the order details panel. Search is filtered by order's grade, excludes already-added items, and auto-updates `reserved_quantity` on the product. Backend: `POST /api/sysbook/orders/admin/{order_id}/items`. Frontend: `AddItemToOrder` component in `TextbookOrdersAdminTab.jsx`. Tested: 14/14 backend + all frontend flows passed.
- **Recently Added Badge (Mar 1, 2026)**: Newly added items in the order details dialog show a green "NEW" badge and subtle emerald row highlight. Badge is session-scoped — clears when the dialog is closed. Helps admins quickly distinguish newly added items from original order items.

### Key Files
- `frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx` — Order management with add/remove item, editable grade, paid date
- `frontend/src/modules/admin/DevControlModule.jsx` — Dev Control with all admin tabs
- `frontend/src/modules/admin/PrintConfigTab.jsx` — Print template config UI
- `frontend/src/modules/admin/HelpGuideEditorTab.jsx` — Help guide editor UI
- `frontend/src/pages/HelpGuide.jsx` — Public help guide (API-driven)
- `backend/modules/print/__init__.py` — Print module with template CRUD, thermal HTML builder
- `backend/modules/dev_control/routes.py` — Dev control + help guide CRUD + public help guide endpoint
- `frontend/src/modules/print/PrintDialog.jsx` — Core printing logic
- `backend/modules/monday/service.py` — Core import/sync logic
- `backend/modules/sysbook/routes/orders.py` — Order admin endpoints (add/remove items, grade edit, paid date)

### Key API Endpoints
- `GET /api/print/templates` — List print templates
- `POST /api/print/templates` — Create template (with optional clone_from)
- `PUT /api/print/templates/{id}` — Update template config
- `DELETE /api/print/templates/{id}` — Delete template (not active)
- `POST /api/print/templates/{id}/activate` — Set as active, apply to print config
- `GET /api/dev-control/help-guide` — Get help guide content (admin)
- `PUT /api/dev-control/help-guide` — Save help guide content (admin)
- `GET /api/help-guide/content` — Public help guide content (no auth)
- `POST /api/sysbook/presale-import/sync-inventory` — Sync presale orders to inventory
- `PUT /api/sysbook/orders/admin/{order_id}/grade` — Edit order grade, re-link items
- `DELETE /api/sysbook/orders/admin/{order_id}/items/{book_id}` — Remove item from order
- `POST /api/sysbook/orders/admin/{order_id}/items` — Add item to order from inventory
- `GET /api/sysbook/products/purchased-summary` — Aggregated purchase data for all products

### Key DB Collections
- `print_templates` — Print template configurations
- `help_guide_content` — Help guide structured content
- `app_config` (key: `print_format`) — Active print format config used by thermal HTML builder
- `store_textbook_orders` — Textbook orders with `paid_date`, editable `grade`, mutable `items` array
- `store_products` — Products with `reserved_quantity` updated by add/remove/grade-change operations

## Prioritized Backlog
- (P1) Explore automatic help guide updates linked to feature development
- (P2) On-demand landing page redesign tool for administrators
- (P3) Extend Monday.com synchronization for general product inventory
- (P3) ChipiPoints gamification system
- (P3) Email notifications for key events
- (Refactor) Delete likely unused `PrintConfigTab.jsx` in dev_control
- (Refactor) Break down `TextbookOrdersAdminTab.jsx` into smaller child components

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
