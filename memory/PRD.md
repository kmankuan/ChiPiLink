# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" -- evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, and Monday.com workflow integration.

## What's Been Implemented

### Telegram Feed Card on Landing Page (Feb 14, 2026) - COMPLETE
- Added public endpoint `GET /api/community-v2/feed/public/recent` (no auth required)
- Created `TelegramFeedCard.jsx` component showing latest Telegram channel posts with thumbnails, timestamps, likes/comments
- Replaced the mosaic grid with the Telegram Feed Card as the 3rd landing page section
- Landing page layout: Banner Carousel → Cultural Icons → Media Player → Telegram Feed → CTA → Footer
- **Tested: 100%** — Backend (7/7) + Frontend (all UI elements + navigation) verified (iteration_103)

### Landing Page Fallback Content Fix (Feb 14, 2026) - COMPLETE
**Root cause:** Production database had no banner/media player data, causing both components to render nothing.
**Fix applied (two-layer safeguard):**
1. **Frontend fallback:** BannerCarousel and MediaPlayer now have DEFAULT_BANNERS and DEFAULT_MEDIA_ITEMS constants — they always display content even if the API returns empty.
2. **Backend seed:** `seed_showcase_defaults()` seeds 3 default banners and 4 media player items on startup if none exist.
- **Tested: 100%** — All API endpoints + frontend rendering verified on both desktop and mobile viewports (iteration_102)

### Landing Page Showcase Module - Async Refactoring (Feb 14, 2026) - COMPLETE
**Root cause fix:** The showcase module (banners + media player) was using synchronous PyMongo inside async handlers, blocking the FastAPI event loop. This is the same pattern that previously caused a server-wide hang with the Gmail service.
- Migrated `showcase/__init__.py` from sync PyMongo to async motor (`from core.database import db`)
- Migrated `monday_banner_adapter.py` - all methods now fully async
- Migrated `scheduler.py` - removed sync `_get_db()` function
- Updated `main.py` startup to use async `ensure_local_handler()`
- Eliminated connection leak (new MongoClient on every request)
- **Tested: 100% (11/11 backend + frontend both BannerCarousel and MediaPlayer rendering)**

### Wallet + Monday.com Dual Board Integration (Feb 14, 2026) - COMPLETE
**Two separate Monday.com integrations for the wallet system:**
1. **Chipi Wallet Board (18399650704)** - 2-way sync
2. **Recharge Approval Board (18399959471)** - 2-way sync
**Tested: 100% (13/13 backend + frontend)**

### Previous Features - ALL COMPLETE
- Automated Monday.com Banner Sync (webhooks + polling fallback + sync history)
- Scheduled Banners with start/end dates
- Banner Carousel & Media Player
- Custom Cultural Icons & Layout Preview
- Mosaic Community Landing Page
- Wallet Payment Workflow for textbook orders
- SchoolTextbooksView UI fixes
- Production Server Hang Fix (async Gmail IMAP)
- Frontend React Hook fixes

## Key API Endpoints

### Showcase (Banner + Media Player)
- `GET /api/showcase/banners` -- Active banners (public, schedule-filtered)
- `GET /api/showcase/media-player` -- Media player config + items (public)
- `POST /api/admin/showcase/banners` -- Create banner
- `PUT /api/admin/showcase/banners/{banner_id}` -- Update banner
- `DELETE /api/admin/showcase/banners/{banner_id}` -- Delete banner
- `GET /api/admin/showcase/media-player` -- Admin media player config
- `PUT /api/admin/showcase/media-player` -- Update media player config
- `POST /api/admin/showcase/media-player/add-item` -- Add media item
- `DELETE /api/admin/showcase/media-player/items/{item_id}` -- Delete media item
- `POST /api/admin/showcase/media-player/fetch-album` -- Fetch Google Photos album
- `POST /api/admin/showcase/monday-banners/sync` -- Manual Monday.com sync

### Wallet Monday.com Integration
- `GET /api/monday/adapters/wallet/sync-dashboard` -- Chipi Wallet board stats
- `POST /api/monday/webhooks/incoming` -- Receives all Monday.com webhooks
- `POST /api/wallet-topups/pending` -- Create pending topup
- `GET /api/wallet-topups/gmail/status` -- Gmail connection check

## Key Files
- `/app/backend/modules/showcase/__init__.py` -- Showcase routes (async motor)
- `/app/backend/modules/showcase/monday_banner_adapter.py` -- Monday banner sync (async)
- `/app/backend/modules/showcase/scheduler.py` -- Auto-sync scheduler (async)
- `/app/backend/modules/wallet_topups/monday_sync.py` -- PaymentAlertsMondaySync
- `/app/backend/modules/users/integrations/monday_wallet_adapter.py` -- Chipi Wallet adapter
- `/app/backend/modules/integrations/monday/webhook_router.py` -- Webhook routing
- `/app/backend/main.py` -- App startup

## Database Collections
- `showcase_banners` -- Banner items (image + text types)
- `app_config` -- Media player config, Monday banner config
- `showcase_sync_history` -- Banner sync logs
- `monday_user_items` -- User <-> Monday.com item mappings
- `chipi_wallets` -- User wallets
- `chipi_transactions` -- Wallet transactions

## 3rd Party Integrations
- Monday.com API v2 (GraphQL) -- Env: MONDAY_API_KEY
- Gmail (IMAP) -- Env: GMAIL_EMAIL, GMAIL_APP_PASSWORD
- Telegram Bot API -- Env: TELEGRAM_BOT_TOKEN
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 -- Emergent LLM Key
- Google Photos -- Public URLs

### Touch-Swipe Gestures for Carousels (Feb 14, 2026) - COMPLETE
- Added native touch-swipe support to BannerCarousel and MediaPlayer
- Swipe left = next slide, swipe right = previous slide (50px threshold)
- **Tested: 100%** — 11/11 frontend tests passed on both desktop and mobile (375x812) viewports (iteration_104)

### Slide Transition Animations (Feb 14, 2026) - COMPLETE
- Added smooth 0.35s slide-in animations to both BannerCarousel and MediaPlayer
- Direction-aware: slides animate from the right when going forward, from the left when going backward
- Works on button clicks, swipe gestures, and auto-rotate
- **Tested: 100%** — 14/14 frontend tests passed (iteration_105)

### Telegram Feed Card Video/Media Support (Feb 14, 2026) - COMPLETE
- Rewritten TelegramFeedCard to handle photo, video, animation, and document media types
- Video posts show thumbnails with play icon overlay and duration badge
- Tap video thumbnail opens expanded modal player with controls
- Fallback text: "Shared a video", "Shared a photo", "Shared a GIF" instead of generic "New post"
- **Tested: 100%** — (iteration_106)

### MediaPlayer Parallax Depth Effect (Feb 14, 2026) - COMPLETE
- Caption, controls, and progress dots shift subtly based on scroll position
- Creates immersive depth effect as user scrolls past the media player
- **Tested: 100%** — Parallax transform values verified (iteration_106)

### Telegram Admin Configuration Panel (Feb 14, 2026) - COMPLETE
- New "Telegram" tab in admin dashboard (TelegramAdminModule.jsx)
- Shows stats: total posts, likes, comments
- Channel settings: ID (auto-detected), title, auto-sync toggle, poll interval
- Manual sync button for on-demand pulls from Telegram
- Visibility controls: all users / admin only / specific roles
- Bot connection status indicator
- **Tested: 100%** — All admin UI elements and backend APIs verified (iteration_106)

### Admin Panel Navigation Refactor (Feb 14, 2026) - COMPLETE
- **Level 1 (Dashboard Sidebar):** Reorganized 15 flat items into 5 collapsible groups: Overview, Commerce, Community, Management, System
- **Level 2 (Administration Panel):** Replaced 14 tabs with sidebar layout grouped into: General, Content, Community, Data & System
- Both levels support mobile responsive views with hamburger/dropdown navigation
- **Tested: 100%** — 27/27 tests passed on desktop + mobile (iteration_107)

### Admin Single-Level Navigation (Feb 14, 2026) - COMPLETE
- Flattened 2-level navigation into single-level sidebar
- Removed "Administración" intermediate page; promoted all 14 sub-items directly into main sidebar
- 8 groups: Overview, Commerce, Community, Management, Configuration, Content, Integrations, Developer
- New groups start collapsed; original groups expanded by default
- Search filter works across all items (by id, label, group name)
- All 14 new translation keys added (en, es, zh)
- **Tested: 100%** — 18/18 tests passed (iteration_109)

### Textbook Multi-Select Bug Fix (Feb 14, 2026) - COMPLETE
- **Root cause:** Out-of-stock textbook items displayed active/clickable checkboxes. Users could visually select them, but the counter and submission only processed 'available' items — causing mismatch (e.g., "5 checked but counter shows 2").
- **Fix applied:**
  1. `SchoolTextbooksView.jsx`: Checkbox disabled for non-available items with proper disabled styling + out-of-stock label added
  2. `TextbookOrderView.jsx`: Out-of-stock items filtered into a separate non-selectable section
  3. Backend `textbook_orders.py`: Submit endpoint now returns `warnings`, `items_failed`, `items_succeeded` fields
  4. Frontend shows warning toast when some items fail on submission
- **Tested: 100%** — Backend + Frontend verified (iteration_110)

### AdminModule.jsx Cleanup (Feb 14, 2026) - COMPLETE
- Deleted `/app/frontend/src/modules/admin/AdminModule.jsx` (dead code after nav refactor to AdminDashboard.jsx)
- Confirmed no leftover imports in the codebase
- **Tested: 100%** — Admin panel verified working after deletion (iteration_110)

## Backlog
### P1 - Evolve Landing Page Layout
### P2 - On-Demand Landing Page Redesign via Admin
