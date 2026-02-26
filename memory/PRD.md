# Sysbook / Unatienda / ChiPi Link — Product Requirements Document

## Original Problem Statement
School textbook order management platform with Monday.com integration for order syncing and print triggering. Key workflows: pre-sale import from Monday.com, order management, thermal receipt printing via Logic Controls LR2000E printer.

## Architecture
- **Frontend**: React (CRA) with Shadcn/UI, i18n, React Router
- **Backend**: FastAPI with Motor (async MongoDB)
- **Database**: MongoDB (`chipilink_prod`)
- **Integrations**: Monday.com (bi-directional sync, webhook print triggers)
- **Auth**: LaoPan OAuth + JWT (auth-v2 prefix)

## What's Been Implemented

### Completed (Feb 2026)
- Pre-Sale Import from Monday.com (with price, book code, bulk print fixes)
- Universal archive/soft-delete system (backend + frontend)
- Nginx reverse proxy configuration
- Deployment health check fixes
- **Thermal Printer Fix (P0)**: Changed `handleThermalPrint` from `window.open(url)` to `fetch(url)` + `document.write(html)` pattern
- Print Preview shows correct book codes and names
- **Wallet Transactions Delete**: Improved error handling with specific error messages, logging, and console diagnostics

### Key Files
- `frontend/src/modules/print/PrintDialog.jsx` — Print dialog with LR2000E + Standard Print
- `frontend/src/modules/print/PackageListPreview.jsx` — Package list renderer
- `backend/modules/print/__init__.py` — Print endpoints
- `frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx` — Orders admin
- `frontend/src/modules/wallet/tabs/WalletTransactionsTab.jsx` — Wallet transactions with archive/delete
- `backend/modules/users/routes/wallet.py` — Wallet API routes

## Prioritized Backlog

### P3 — Upcoming
- Build on-demand landing page redesign tool for administrators

### P4 — Future
- Extend Monday.com synchronization for general product inventory

## Key API Endpoints
- `POST /api/auth-v2/login` — Admin login
- `GET /api/print/thermal-page?order_ids=&token=` — Server-rendered thermal receipt
- `POST /api/print/jobs` — Create print job
- `POST /api/wallet/admin/transactions/bulk-delete` — Permanently delete transactions
- `POST /api/wallet/admin/transactions/bulk-archive` — Archive transactions
- `POST /api/wallet/admin/transactions/bulk-unarchive` — Restore transactions

## DB Schema (Key)
- `chipi_transactions`: transaction_id, user_id, transaction_type, amount, description, status, archived, archived_at, created_at
- `store_textbook_orders.items[]`: book_id, book_code, book_name, price, quantity_ordered, status
- Soft-delete fields: `archived`, `archived_at`

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
