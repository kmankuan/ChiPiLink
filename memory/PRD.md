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

### Phase 1 - Core Platform (Complete)
- Authentication (OAuth + admin login)
- Student management with enrollment workflows
- Textbook catalog and ordering system
- Monday.com inventory sync
- Admin panel with dashboard

### Phase 2 - Enhanced Admin (Complete)
- Progress-based status icon system with 4 themes
- Unatienda UI reorganization (grouped tabs: CATALOG, ORDERS, SCHOOL, SETTINGS)
- Feature-rich Students table (sorting, pagination, compact layout, inline pre-sale toggle)
- Monday.com pre-sale order import with suggestion-based linking

### Phase 3 - CRM Chat System (Complete - Feb 2026)
- **Multi-topic CRM Chat** backed by Monday.com Admin Customers board
  - Each student linked to a CRM item via email (auto-linking)
  - Topics = Monday.com Updates, Messages = Replies
  - Support for creating new topics, replying to existing ones
  - Quick subject selection for common topics
- **Admin Messages Hub** - centralized inbox in Unatienda module
  - Shows all customer conversations with unread indicators
  - Search by student name or email
  - CRM board configuration panel (Board ID, email column)
- **Chat integration points**:
  - Textbook Orders admin tab (chat icon per order)
  - Students admin tab (chat icon per student)
  - Messages admin tab (centralized inbox)
  - Client Orders page (Support button)
- **Push Notifications** via Monday.com webhooks
  - Webhook endpoint receives update events from CRM board
  - Creates in-app notifications for linked client users
  - Unread badge counts on Support buttons and admin inbox
  - One-click webhook registration from admin config panel
  - Mark-as-read functionality for both clients and admin

## Key Data Models
- `crm_student_links` - Maps student_id to monday_item_id for CRM linking
- `crm_chat_messages` - Local message records (topics, replies, read status)
- `stock_orders` - Orders with statuses including `awaiting_link`, `awaiting_suggestion`
- `store_students` - Students with `presale_enabled` field

## Key API Endpoints

### CRM Chat (New)
- `GET /api/store/crm-chat/{student_id}/topics` - Client: get topics
- `POST /api/store/crm-chat/{student_id}/topics` - Client: create topic
- `POST /api/store/crm-chat/{student_id}/topics/{update_id}/reply` - Client: reply
- `GET /api/store/crm-chat/admin/inbox` - Admin: all conversations
- `GET /api/store/crm-chat/admin/{student_id}/topics` - Admin: student topics
- `POST /api/store/crm-chat/admin/{student_id}/topics` - Admin: create topic
- `POST /api/store/crm-chat/admin/{student_id}/topics/{update_id}/reply` - Admin: reply
- `GET/PUT /api/store/crm-chat/admin/config` - CRM board configuration
- `GET /api/store/crm-chat/admin/config/board-columns` - Get board columns

### Student Linking (Bug Fixed Feb 2026)
- `GET /api/store/textbook-access/schools` - Public: get schools list
- `POST /api/store/textbook-access/students` - User: link student (fixed: presale grade reference)
- `GET /api/store/textbook-access/my-students` - User: get linked students

### Pre-Sale Import
- `GET /api/admin/monday-import/preview-import`
- `POST /api/admin/monday-import/trigger-import`
- `GET /api/admin/presale-orders`
- `POST /api/admin/presale-orders/{id}/confirm-suggestion`
- `POST /api/admin/presale-orders/{id}/reject-suggestion`
- `POST /api/admin/presale-orders/{id}/unlink`

### Phase 4 - Mobile Fix & Login Design Config (Complete - Feb 2026)
- **Login Page Mobile Fix**: Rewrote Login.jsx as mobile-first. Image panel hidden on mobile, buttons fit viewport, proper font sizes and padding
- **Register Page Mobile Fix**: Adjusted padding, font sizes, and layout for mobile
- **Login Page Design Config** (admin → Config. del Sitio → Login Page Design):
  - Layout selector: Split (image left + form right), Centered (card), Fullscreen (bg image fills screen)
  - Background image upload with overlay color & opacity controls
  - Custom heading text and subtitle text
  - Logo size selector (SM, MD, LG)
- All config stored in `site_config` collection and served via public API
- Login page reads siteConfig context and renders dynamically

### Phase 5 - Link Student Bug Fixes (Complete - Feb 2026)
- **Bug 1 Fix**: Fixed intermittent submission failure in Link Student form. Root cause: `data.initial_grade` (non-existent field) in backend presale suggestion, and `onBack()` in onSuccess causing premature navigation away.
- **Bug 2 Fix**: Fixed school dropdown emptying after linking. Root cause: `onSuccess` called `onBack()` which unmounted the component, losing state. Now user stays on School Textbooks page after linking.
- **Improvement**: Added error handling + retry button for schools fetch (was silently swallowed)

### Phase 5b - i18n Language Consistency Fix (Complete - Feb 2026)
- Fixed all hardcoded English strings in Link Student form (GRADE_OPTIONS, RELATIONSHIP_OPTIONS, validation toasts, success/error toasts, select placeholders, input placeholders)
- Fixed PendingStudentCard badge ("Pending" → "Pendiente" in Spanish)
- Fixed 2 English strings left in Spanish texts object (orderError, selectAtLeastOne)
- Fixed hardcoded Spanish toasts in TextbookOrderView.jsx (file upload, required field validation)
- Added missing translation keys to constants/translations.js (itemsUnavailable, outOfStock, reorderApproved, fileUploaded, fileUploadError, fieldRequired)

### Phase 5c - Admin Mobile Responsiveness (Complete - Feb 2026)
- Made UnatiendaModule tab navigation horizontally scrollable with hidden scrollbar
- Made stats badges horizontally scrollable with shrink-0 items
- Made StudentsTab stats, toolbar, and table responsive for mobile
- Student table forced to min-w-[640px] enabling horizontal scroll on mobile
- Toolbar stacks vertically on mobile (search full width, buttons below)
- AdminDashboard main content uses responsive padding (p-3 sm:p-4 lg:p-6)
- Added .scrollbar-hide CSS utility to index.css

### Phase 5d - Card View Toggle for Students (Complete - Feb 2026)
- Added card/table view toggle (LayoutGrid / List icons) to StudentsTab toolbar
- Card view is default - shows each student as a compact card with all info
- Responsive grid: 1 col mobile, 2 cols sm breakpoint, 3 cols lg breakpoint
- Cards include: name, ID, grade badge, status badge, pre-sale toggle, school name, action buttons (chat, view, lock/unlock), checkbox
- Table view still available via toggle for data-dense workflows

### Phase 5e - Mobile Floating Action Bar (Complete - Feb 2026)
- Added floating bottom action bar on Students tab (mobile only, sm:hidden) when cards are selected
- Shows selected count, Pre-sale On/Off buttons, and Clear (X) button
- Positioned above bottom navigation (bottom-16) for easy touch access

### Phase 5f - Merged Students + Access Requests Tabs (Complete - Feb 2026)
- Combined Students tab and Access Requests tab into a single unified tab
- Section toggle at top: "Estudiantes (count)" | "Solicitudes (count)" with pending count badge
- Requests section shows request cards with Approve/Reject buttons directly visible on mobile
- Reject uses dropdown with quick reject reasons (6 presets + custom)
- Approve opens confirmation dialog with admin notes
- Status filter (Pending/In Review/All) and school filter included
- Removed separate "Access Requests" tab from UnatiendaModule nav

### Phase 5g - Approve/Reject Bug Verification + StudentsTab Rewrite (Feb 2026)
- Verified Approve/Reject buttons work correctly (desktop + mobile) — bug not reproducible
- Clean rewrite of StudentsTab.jsx from scratch: 946 → 772 lines (18% reduction)
  - Shared `api()` helper eliminates all fetch boilerplate
  - Combined state: `lockDialog` replaces `actionStudent`+`actionType`; `reqDialog`/`reqForm` replaces `reqActionDialog`/`reqActionData`
  - `SortHeader` and `StatusBadge` extracted as pure components outside main function
  - Stats, section toggles, view mode toggles rendered via array maps
  - All data-testid attributes and functionality preserved
- Testing agent verified 100% pass rate (backend + frontend, desktop + mobile)

### Phase 5h - Presale Fix + UI Cleanup (Feb 2026)
- **Critical Bug Fix**: Presale students were seeing all items as "Agotado" (out of stock) even with presale mode ON
  - Root cause: `get_or_create_order()` and `_refresh_order_items()` in `textbook_order_service.py` only checked `inventory_quantity - reserved_quantity > 0`, ignoring student's `presale_mode`
  - Fix: Added `is_presale` check — when `presale_mode=True`, items show as "available" regardless of stock level
  - Presale orders correctly increment `reserved_quantity` on submission (existing logic was fine)
- **UI Fix**: Removed duplicate "Agregar estudiante" (Add Student) card from bottom of student grid in `SchoolTextbooksView.jsx` — header already has the + button
- Testing agent verified 100% pass rate

### P1 - Global Progress Icon System
Abstract the progress icon system from landing page-specific components into a truly global resource.

### P2 - Stop Button for Monday.com Sync
Add a cancellable background task with a "Stop" button for the full Monday.com sync operation.

### P3 - On-demand Landing Page Redesign Tool
Build an admin panel tool for on-demand landing page redesign.

### P4 - General Inventory Monday.com Sync
Extend synchronization to general product inventory.

## Configuration
- **CRM Board ID**: 5931665026 (Admin Customers board)
- **Email Column**: `email`
- Monday.com API Token: configured in backend/.env
