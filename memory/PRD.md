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
- **Integrations**: Monday.com API v2, Google Photos, Gmail, Telegram Bot, OpenAI, Anthropic, Lottie, OneSignal

## What's Been Implemented

### Phase 1-5z (Complete)
See CHANGELOG.md for full history of all phases.

### Phase 6a - Critical Order Submission NameError Fix (Complete - Feb 20, 2026)
- Fixed `NameError` in `textbook_order_service.py` (`year` → `current_year`)
- Made post-payment steps non-blocking with try/except wrappers
- Frontend refreshes wallet balance before/after order submission

### Phase 6b - Archive Fix + Delete Orders + Admin Alert (Complete - Feb 20, 2026)
- Fixed archive writing to wrong collection
- Added delete endpoint for textbook orders
- Admin alert notification on post-order failure

### Phase 6c - Draft Filter + Double-Submit Prevention (Complete - Feb 20, 2026)
- Filtered "draft" orders from admin view
- Created `useGuardedAction` hook for preventing duplicate submissions

### Phase 6d - Admin Sidebar Reorganization (Complete - Feb 20, 2026)
- New "School Textbooks" sidebar group consolidating textbook features
- Messages moved to Commerce, Wallet Sync moved to Wallet module

### Phase 6e - Push Notifications for Student Access Requests (Complete - Feb 20, 2026)
- OneSignal push notifications for admin and parent users on access request events

### Phase 6f - URL State Persistence + Performance (Complete - Feb 20, 2026)
- URL-based state persistence with `useSearchParams` in public store views
- Admin module prefetching and backend parallel startup

### Phase 6g - Mobile UX Enhancements (Complete - Feb 20, 2026)
- Dynamic header in public store for textbook section (back button, lock icon)
- Clear distinction between public retail and private textbook sections

### Phase 7a - Global StatusAnimation + Full Sync Stop Button (Complete - Feb 20, 2026)
- **StatusAnimation shared component**: Extracted duplicated `StatusAnimation` from `MosaicCommunityLanding.jsx` and `LayoutPreviewModule.jsx` into a single shared component at `/app/frontend/src/components/ui/StatusAnimation.jsx`. Includes CSS keyframe injection (one-time via JS), `LottieAnimation` helper, and `ANIMATION_OPTIONS` dropdown list. Both consumer files now import from the shared resource.
- **Full Sync Stop Button**: Converted Monday.com full sync from synchronous to background task pattern. Added `GET /full-sync/status` (polling progress), `POST /full-sync/cancel` (graceful cancellation via `_full_sync_cancel` flag). Frontend shows real-time progress bar (processed/total, created/updated/failed counts) and a red Stop button (Square icon) during sync. Dashboard widget also updated for async response.
- Testing: 100% pass rate (15/15 tests)

## Upcoming Tasks
None - all P1 and P2 tasks from the backlog are now complete.

## Future/Backlog Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory

## Configuration
- **CRM Board ID**: 5931665026 (Admin Customers board)
- **Email Column**: `email`
- Monday.com API Token: configured in backend/.env

## Key Files
- `/app/frontend/src/components/ui/StatusAnimation.jsx` - Shared status animation system
- `/app/frontend/src/components/ui/ProgressIcons.jsx` - Progress icon themes (Chinese-themed)
- `/app/frontend/src/modules/monday/components/TxbInventoryTab.jsx` - Monday.com sync config with Stop button
- `/app/frontend/src/hooks/useGuardedAction.js` - Reusable hook for preventing duplicate submissions
- `/app/frontend/src/modules/admin/views/dashboard/DashboardModule.jsx` - Admin sidebar and navigation
- `/app/backend/modules/store/integrations/monday_txb_inventory_adapter.py` - Monday.com sync adapter
- `/app/backend/modules/store/routes/monday_sync.py` - Monday.com sync API routes
