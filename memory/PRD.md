# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform. Full 2-way synchronization with "Chipi Wallet" Monday.com board.

## What's Been Implemented

### Bank Alert Parser (Feb 12) ✅
- Admin tool at Wallet > Bank Alerts tab to parse bank transfer notifications
- Extracts: amount (US$/USD/$), email (from "recarga email@domain.com" description), sender name, product number
- Auto-matches user by email, shows current balance
- Editable fields for email/amount before confirmation
- One-click top-up processing with Monday.com sync
- Processing logs with history view
- Endpoints: POST parse-bank-alert, POST process-bank-alert, GET bank-alert-logs

### Sync Dashboard (Feb 12) ✅
- Admin panel under Integrations > Monday.com > Sync Dashboard tab
- Real-time stats: linked users, processed transactions, webhook OK/errors/ignored
- Linked users list with per-user re-sync button
- Recent webhook events timeline, bulk "Sync All Users" action

### 2-Way Monday.com Wallet Sync (Feb 12) ✅
- App → Monday.com: User registration creates parent item, transactions create subitems
- Monday.com → App: Webhook processes subitems, idempotent via DB tracking
- Correct status labels: Added/Deducted for subitems, Top Up/Deduct for parent

### Global Table Enhancement (Feb 11) ✅
- Reusable useTableSelection hook, BulkActionBar, ConfirmDialog
- Applied to: Wallet Overview, Transactions, Orders, Inventory, Students

### Wallet System (DONE) ✅
- Full CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings, Bank Alerts
- Customizable transaction descriptions, delete user functionality

### Telegram Community Feed (DONE) ✅

## Prioritized Backlog
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P2: sync-all endpoint fix
- P3: i18n support
