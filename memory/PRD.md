# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform. Full 2-way synchronization with "Chipi Wallet" Monday.com board.

## Engineering Principles (Core Rules)
1. **English codebase** — all code, comments, variable names in English
2. **i18n as core feature** — all UI strings externalized via react-i18next, support EN/ES/ZH
3. **Table consistency** — all admin data tables MUST have: search, bulk select, archive, pagination, mobile-responsive columns
4. **Mobile-first** — responsive design is the default, not optional
5. **No redundancy** — don't build features that duplicate existing capabilities

## What's Been Implemented

### i18n Full Rollout (Feb 12) ✅
- react-i18next with EN/ES/ZH locale files (~1400+ lines each)
- Language switcher added to admin header (LanguageSelector component)
- WalletModule fully translated (tabs, labels)
- 78/123 modules with i18n hooks, with translation keys for common, wallet, admin, store, nav
- Infrastructure ready for incremental rollout to remaining modules

### Table Consistency + Mobile-First (Feb 12) ✅
**Shared infrastructure:**
- `AdminTableToolbar` — search, archive toggle, refresh, count badge
- `TablePagination` — page size selector, prev/next, item count
- `usePagination` hook — client-side pagination

**Applied to ALL admin data tables:**
- Wallet Overview: pagination + mobile + i18n
- Wallet Transactions: consistent toolbar + pagination + mobile
- Textbook Orders: pagination + mobile column hiding
- All Students: pagination + mobile column hiding
- Inventory: pagination + mobile column hiding
- Private Catalog (PCA): pagination (50/page)
- Public Catalog: bulk select + pagination + mobile
- Schools Management: search + mobile
- Student Requests: pagination + mobile (card view on small screens)

### 2-Way Monday.com Wallet Sync (Feb 12) ✅
- App → Monday.com: registration creates parent item, transactions create subitems
- Monday.com → App: webhook processes subitems, idempotent via DB tracking
- Sync Dashboard: admin panel with stats, linked users, re-sync, event timeline

### Wallet System (DONE) ✅
- Full CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings
- Customizable transaction descriptions, delete user

### Global Table Enhancement (Feb 11) ✅
- Reusable useTableSelection hook, BulkActionBar, ConfirmDialog

### Telegram Community Feed (DONE) ✅

## Prioritized Backlog
- P0: Continue i18n rollout to remaining 45 modules (incremental, as modules are edited)
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P3: sync-all endpoint fix
