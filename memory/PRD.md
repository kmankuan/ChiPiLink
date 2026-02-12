# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform. Full 2-way synchronization with "Chipi Wallet" Monday.com board.

## What's Been Implemented

### Sync Dashboard (Feb 12) ✅
- Admin panel under Integrations > Monday.com > Sync Dashboard tab
- Real-time stats: linked users, processed transactions, webhook OK/errors/ignored
- Linked users list with per-user re-sync button
- Recent webhook events timeline with success/error badges
- Bulk "Sync All Users" action
- Backend endpoints: GET sync-dashboard, POST resync-user, POST sync-all-users

### 2-Way Monday.com Wallet Sync (Feb 12) ✅
**App → Monday.com:**
- User registration creates parent item on Chipi Wallet board (Name + Email)
- Wallet transactions (top-up/deduct) create subitems with correct status labels (Added/Deducted)
- Event bus subscription + asyncio.create_task for non-blocking sync

**Monday.com → App:**
- Webhook processes subitems when parent status = "Process"
- Idempotency via `monday_processed_subitems` DB collection
- Confirmation update posted as comment on Monday item

### Global Table Enhancement (Feb 11) ✅
- Reusable `useTableSelection` hook, `BulkActionBar`, `ConfirmDialog`
- Applied to: Wallet Overview, Transactions, Orders, Inventory, Students

### Wallet System (DONE) ✅
- Full CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings
- Customizable transaction descriptions, delete user functionality

### Telegram Community Feed (DONE) ✅
- Background polling, feed with likes/comments, media proxy

## Prioritized Backlog
- P1: Advanced Bank Transfer Parsing (AI column on Monday.com)
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P2: sync-all endpoint fix
- P3: i18n support
