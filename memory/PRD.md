# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform. Full 2-way synchronization with "Chipi Wallet" Monday.com board.

## What's Been Implemented

### 2-Way Monday.com Wallet Sync (Feb 12) ✅
**App → Monday.com:**
- User registration automatically creates a parent item on the Chipi Wallet board (Name + Email)
- Wallet transactions (top-up/deduct) create subitems under the user's parent item
- Subitems include amount, note, date, and status label (Added/Deducted)
- Uses event bus subscription (`auth.user.registered`) for registration sync
- Uses `asyncio.create_task()` for non-blocking transaction sync

**Monday.com → App:**
- Webhook endpoint at `/api/monday/webhooks/incoming` receives Monday.com events
- Status="Process" on parent item triggers processing of all unprocessed subitems
- Subitem status "Added" → wallet top-up, "Deducted" → wallet deduction
- Idempotency via `monday_processed_subitems` DB collection prevents duplicate processing
- Confirmation update posted as comment on Monday item after processing

**Key files:**
- `/app/backend/modules/users/integrations/monday_wallet_adapter.py` - Main adapter
- `/app/backend/modules/users/routes/wallet.py` - Route-level sync hooks
- `/app/backend/modules/integrations/monday/webhook_router.py` - Webhook dispatch
- `/app/backend/modules/integrations/monday/core_client.py` - GraphQL client

### Global Table Enhancement (Feb 11)
Reusable components for consistent table features across all admin modules:
- `useTableSelection` hook — multi-select with toggle all/single
- `BulkActionBar` — floating bar with archive/delete actions + count
- `ConfirmDialog` — reusable confirmation with destructive/warning variants

**Applied to:**
| Module | Multi-Select | Archive | Delete | Search |
|--------|:-:|:-:|:-:|:-:|
| Wallet Overview | Yes | Yes | Yes | Yes |
| Wallet Transactions | Yes | Yes | No | Yes |
| Textbook Orders | Yes | Yes | No | Yes |
| Inventory/Products | Yes | Yes | Yes | Yes |
| All Students | Yes | Yes | No | Yes |

### Wallet System (DONE)
- Full wallet CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings tabs
- Customizable transaction descriptions (admin-configurable)
- Delete user functionality

### Monday.com Integration (DONE - 2-Way Sync)
- Board: Chipi Wallet (18399650704)
- Parent items = Users, Subitems = Transactions
- Dual direction: App→Monday + Monday→App
- Board status labels: Parent (Top Up / Deduct / Stuck), Subitems (Added / Deducted / Stuck)

### Telegram Community Feed (DONE)
- Background polling, feed with likes/comments, media proxy

## Prioritized Backlog
- P1: Advanced Bank Transfer Parsing (AI column on Monday.com to parse bank transfer notifications)
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P2: sync-all endpoint fix
- P3: i18n support
