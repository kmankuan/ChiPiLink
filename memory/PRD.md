# ChiPi Link - PRD

## Original Problem Statement
Build and enhance a community/school management platform (ChiPi Link) with features including:
- Textbook ordering and inventory management synced with Monday.com
- Student registration and enrollment management
- Admin panel for managing products, orders, students, and configurations
- Community features (feed, clubs, events)
- Payment/wallet system
- Multi-language support (ES/EN/ZH)

## Core Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Monday.com API v2, Google Photos, Gmail, Telegram Bot, OpenAI, Anthropic, Lottie

## What's Been Implemented

### Phase 1-5z (Complete)
See CHANGELOG.md for full history of all phases.

### Phase 6a - Critical Order Submission NameError Fix (Complete - Feb 20, 2026)
- **Root Cause**: `textbook_order_service.py` line 720 used undefined variable `year` instead of `current_year` in `create_and_submit_order` method (step 8b: update draft order)
- **Impact**: NameError occurred AFTER wallet was charged and order was created, causing user to see error despite order being successful. On retry, "Insufficient wallet balance" because wallet was already charged.
- **Backend Fix 1**: Changed `year` → `current_year` at line 720
- **Backend Fix 2**: Wrapped steps 8 (stock deduction) and 8b (draft order update) in try/except blocks so post-order-creation errors are non-blocking
- **Backend Fix 3**: Changed wallet insufficient error message to Spanish ("Saldo insuficiente. Disponible: $X, Requerido: $Y")
- **Frontend Fix 1**: Both SchoolTextbooksView.jsx and TextbookOrderView.jsx now refresh wallet balance from API before submitting order (prevents stale data)
- **Frontend Fix 2**: Both views refresh wallet balance on error too (in case wallet was charged before error)
- **Frontend Fix 3**: Added timeout: 30000 to SchoolTextbooksView submit call
- Testing: 100% pass rate (15/15 tests)

### Phase 6b - Archive Fix + Delete Orders + Admin Alert (Complete - Feb 20, 2026)
- **Archive Bug Fix**: `bulk-archive` endpoint was writing to `db.textbook_orders` (wrong collection) instead of `db.store_textbook_orders`. Archiving now works correctly.
- **Delete Orders**: New `POST /api/store/textbook-orders/admin/bulk-delete` endpoint permanently removes orders from database. Frontend adds a red "Delete" button next to "Archive" in the bulk action bar, with a destructive confirmation dialog.
- **Admin Alert on Post-Order Failure**: New `_notify_admin_post_order_failure` method creates a notification in the `notifications` collection when wallet is charged but a subsequent step (stock deduction or draft update) fails.
- Testing: 100% pass rate (17/17 tests)

### Phase 6c - Draft Filter + Double-Submit Prevention (Complete - Feb 20, 2026)
- **Draft Orders Hidden from Admin**: `get_all` repository query now includes `{"status": {"$ne": "draft"}}` — draft orders (internal tracking) no longer clutter the admin Textbook Orders tab. Reduced from 30 to 25 visible orders.
- **useGuardedAction Hook**: New reusable hook at `/app/frontend/src/hooks/useGuardedAction.js` — uses a `useRef` guard to immediately block re-entry before React state updates. Returns `[execute, isRunning]`. Applied to both `SchoolTextbooksView` and `TextbookOrderView` order submission flows.
- **Impact**: Prevents duplicate orders caused by multiple clicks on the submit button during loading.
- Testing: 100% pass rate (15/15 tests)

### Phase 6d - Admin Sidebar Reorganization (Complete - Feb 20, 2026)
- **New "School Textbooks" sidebar group**: Textbook Catalog, Students & Schools, Pre-Sale Import, Monday.com Sync, Form Settings
- **Messages moved to Commerce**: Same level as Orders — both serve textbook and public store workflows
- **Wallet Sync moved to Wallet module**: WalletMondayTab added as a tab inside WalletModule
- **Monday.com slimmed**: Removed textbook-specific + wallet tabs. Keeps only: Workspaces, Webhooks, General, Public Widget
- **UnatiendaModule slimmed to retail-only**: Inventory, Public Store, Stock Movements, Store Checkout Form, Config, Demo Data
- **i18n translations added**: All 3 languages (en/es/zh) for new nav items
- **Bug fix**: BookOrdersMondayTab `allBoards` prop crash fixed (testing agent)
- Testing: 100% pass rate (12/12 tests)

### Phase 6e - Push Notifications for Student Access Requests (Complete - Feb 20, 2026)
- **Admin push on new request**: When a parent submits a student access request, all admin users receive a push notification via OneSignal ("Nueva solicitud de acceso: StudentName (Grade - School)")
- **User push on status change**: When admin approves/rejects a request, the requesting parent receives a push notification with status-specific title (aprobada/rechazada/en revisión/info requerida)
- **Non-blocking**: Push calls wrapped in try/except — if OneSignal fails, WebSocket events still work
- **Implementation**: Added `_send_push_to_admins` and `_send_push_to_user` helpers in `/app/backend/modules/realtime/events.py`
- Testing: 100% pass rate (14/14 tests)

## Upcoming Tasks
- **(P1)** Abstract the progress icon system into a global resource
- **(P2)** Implement a "Stop" button for the full Monday.com sync operation

## Future/Backlog Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory

## Configuration
- **CRM Board ID**: 5931665026 (Admin Customers board)
- **Email Column**: `email`
- Monday.com API Token: configured in backend/.env
