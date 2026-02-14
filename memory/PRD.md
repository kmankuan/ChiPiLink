# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" -- evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, and Monday.com workflow integration.

## What's Been Implemented

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

## Backlog
### P1 - Evolve Mosaic Grid Layout
### P2 - On-Demand Landing Page Redesign via Admin
### P3 - Refactor AdminModule.jsx into sidebar navigation
