# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform.

## What's Been Implemented

### Global Table Enhancement (Feb 11)
Reusable components for consistent table features across all admin modules:
- `useTableSelection` hook — multi-select with toggle all/single
- `BulkActionBar` — floating bar with archive/delete actions + count
- `ConfirmDialog` — reusable confirmation with destructive/warning variants

**Applied to:**
| Module | Multi-Select | Archive | Delete | Search | Notes |
|--------|:-:|:-:|:-:|:-:|-------|
| Wallet Overview | Yes | Yes | Yes | Yes | Users: archive soft-deletes, delete is permanent |
| Wallet Transactions | Yes | Yes | No | Yes | Financial records: archive only, no permanent delete |
| Textbook Orders | Yes | Yes | No | Yes | Orders: archive only (financial records) |
| Inventory/Products | Yes | Yes | Yes | Yes | Products: can archive or permanently delete |
| All Students | Yes | Yes | No | Yes | Student data: archive only (sensitive) |

**Backend bulk endpoints:**
- `POST /api/wallet/admin/users/bulk-archive` & `bulk-delete`
- `POST /api/wallet/admin/transactions/bulk-archive`
- `POST /api/store/textbook-orders/admin/bulk-archive`
- `POST /api/store/inventory/products/bulk-archive` & `bulk-delete`
- `POST /api/users/admin/bulk-archive` & `bulk-delete`

### Wallet System (DONE)
- Full wallet CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings tabs
- Customizable transaction descriptions (admin-configurable)
- Delete user functionality

### Monday.com Integration (DONE - Item-Level)
- Item-level triggers: "When Status changes → send webhook"
- Dual amount columns: Top Up + Deduct
- Dynamic board/column mapping via admin UI
- Board: Chipi Wallet (18399650704)

### Telegram Community Feed (DONE)
- Background polling, feed with likes/comments, media proxy

## Prioritized Backlog
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P2: sync-all endpoint fix
- P3: i18n support
