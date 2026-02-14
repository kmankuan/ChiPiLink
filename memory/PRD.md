# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" -- evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, and Monday.com workflow integration.

## What's Been Implemented

### Wallet + Monday.com Dual Board Integration (Feb 14, 2026) - COMPLETE
**Two separate Monday.com integrations for the wallet system:**

1. **Chipi Wallet Board (18399650704)** - 2-way sync:
   - Each item = a user, subitems = wallet transactions (top-up/deduct)
   - App -> Monday.com: User registration creates parent item; wallet transactions create subitems
   - Monday.com -> App: Admin adds subitems, changes parent status to "Process" -> webhook fires -> backend processes subitems
   - 24 users linked, 4 processed subitems
   - Dynamic subitem board ID detection (removed hardcoded values)

2. **Recharge Approval Board (18399959471)** - 2-way sync:
   - App -> Monday.com: Gmail payment alerts create pending topups -> synced as Monday.com items
   - Monday.com -> App: Admin changes status to "Approved"/"Decline" -> webhook fires -> wallet credited/rejected
   - Both directions working and tested

**Key fixes applied:**
- Fixed critical server hang: synchronous IMAP calls in gmail_poller.py blocking async event loop (wrapped with asyncio.to_thread)
- Implemented RechargeApprovalWebhookHandler (was completely missing)
- Fixed hardcoded subitem board ID in wallet adapter
- Fixed blocking Gmail calls in wallet-topups API routes
- Fixed process_email() bug referencing doc["id"] before doc was defined
- Fixed React Hook violations in PlayerRankBadge.jsx and ScoreBoard.jsx

**Tested: 100% (13/13 backend + frontend homepage)**

### Previous Features - ALL COMPLETE
- Automated Monday.com Banner Sync (webhooks + polling fallback + sync history)
- Scheduled Banners with start/end dates
- Banner Carousel & Media Player
- Custom Cultural Icons & Layout Preview
- Mosaic Community Landing Page
- Wallet Payment Workflow for textbook orders
- SchoolTextbooksView UI fixes

## Key API Endpoints

### Wallet Monday.com Integration
- `GET /api/monday/adapters/wallet/sync-dashboard` -- Chipi Wallet board stats
- `GET /api/monday/adapters/wallet/logs` -- Wallet webhook logs
- `POST /api/monday/adapters/wallet/test-webhook` -- Test wallet webhook
- `POST /api/monday/adapters/wallet/resync-user/{user_id}` -- Re-sync single user
- `POST /api/monday/adapters/wallet/sync-all-users` -- Sync all users

### Recharge Approval Integration
- `GET /api/monday/adapters/recharge-approval/dashboard` -- Recharge approval stats
- `GET /api/monday/adapters/recharge-approval/logs` -- Approval webhook logs
- `GET /api/monday/adapters/recharge-approval/config` -- Board config

### Webhook
- `POST /api/monday/webhooks/incoming` -- Receives all Monday.com webhooks, routes by boardId
- `GET /api/monday/webhooks/registered` -- Lists registered boards

### Wallet Topups
- `POST /api/wallet-topups/pending` -- Create pending topup
- `PUT /api/wallet-topups/pending/{id}/approve` -- Approve from app
- `PUT /api/wallet-topups/pending/{id}/reject` -- Reject from app
- `GET /api/wallet-topups/gmail/status` -- Gmail connection check

### Showcase
- `GET /api/showcase/banners` -- Active banners
- Banner CRUD, Media Player, Monday.com Banner Sync endpoints (unchanged)

## Key Files
- `/app/backend/modules/wallet_topups/monday_sync.py` -- PaymentAlertsMondaySync + RechargeApprovalWebhookHandler
- `/app/backend/modules/users/integrations/monday_wallet_adapter.py` -- Chipi Wallet board adapter
- `/app/backend/modules/integrations/monday/webhook_router.py` -- Webhook routing by board ID
- `/app/backend/modules/integrations/monday/routes.py` -- All Monday.com REST endpoints
- `/app/backend/modules/wallet_topups/routes.py` -- Wallet topup routes
- `/app/backend/modules/wallet_topups/gmail_poller.py` -- Gmail background poller
- `/app/backend/main.py` -- Startup: registers both webhook handlers

## Database Collections
- `monday_user_items` -- User <-> Monday.com Chipi Wallet item mappings
- `monday_processed_subitems` -- Processed subitems from Chipi Wallet board
- `wallet_webhook_logs` -- Chipi Wallet webhook event logs
- `monday_topup_items` -- Pending topup <-> Monday.com Recharge Approval item mappings
- `wallet_pending_topups` -- All pending top-ups (gmail/manual)
- `recharge_approval_webhook_logs` -- Recharge Approval webhook event logs
- `wallet_topup_monday_config` -- Recharge Approval board configuration
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
