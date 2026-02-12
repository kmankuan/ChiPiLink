# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform. Full 2-way synchronization with "Chipi Wallet" Monday.com board.

## Engineering Principles (Core Rules)
1. **English codebase** — all code, comments, variable names in English
2. **i18n as core feature** — all UI strings externalized, support EN/ES/ZH
3. **Table consistency** — all admin data tables MUST have: search, bulk select, archive, pagination, mobile-responsive columns
4. **Mobile-first** — responsive design is not optional, it's the default
5. **No redundancy** — don't build features that duplicate existing capabilities

## What's Been Implemented

### Table Consistency + Mobile-First (Feb 12) ✅
**Shared infrastructure:**
- `AdminTableToolbar` — consistent search bar, archive toggle, refresh, count badge
- `TablePagination` — page size selector, prev/next, item count display
- `usePagination` hook — client-side pagination with page size options

**Applied to:**
- Wallet Overview: pagination + mobile (Email hidden <640px, Deposited/Spent <768px)
- Wallet Transactions: consistent toolbar + pagination + mobile
- Textbook Orders: pagination + mobile column hiding
- All Students: pagination + mobile column hiding
- Inventory: pagination + mobile column hiding

### 2-Way Monday.com Wallet Sync (Feb 12) ✅
- App → Monday.com: registration creates parent item, transactions create subitems
- Monday.com → App: webhook processes subitems, idempotent via DB tracking
- Sync Dashboard: admin panel with stats, linked users, re-sync, event timeline

### Wallet System (DONE) ✅
- Full CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings
- Customizable transaction descriptions, delete user functionality

### Global Table Enhancement (Feb 11) ✅
- Reusable useTableSelection hook, BulkActionBar, ConfirmDialog

### Telegram Community Feed (DONE) ✅

## i18n Setup
- react-i18next configured with EN/ES/ZH locale files at `/app/frontend/src/i18n/`
- Language detection via browser-languagedetector
- Partially applied (StudentRequestsTab uses it); needs full app-wide rollout

## Prioritized Backlog
- P0: Complete i18n rollout across ALL UI strings (EN/ES/ZH)
- P0: Table consistency for remaining tables (PrivateCatalogTab, PublicCatalogTab, AdminUsuariosConexiones, SchoolsManagementTab, StudentRequestsTab)
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P3: sync-all endpoint fix
