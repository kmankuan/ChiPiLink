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
- Nginx reverse proxy configuration, deployment health check fixes
- **Thermal Printer Fix (P0)**: Changed `handleThermalPrint` from `window.open(url)` to `fetch(url)` + `document.write(html)` pattern
- Print Preview shows correct book codes and names
- **Wallet Transactions Delete**: Improved error handling with specific error messages
- **Pre-Sale Import Pagination**: Implemented cursor-based pagination in Monday.com API client to fetch ALL board items (previously limited to 200, missing items at position 430+)
- **Pre-Sale Import Robustness**: Added retry logic (3 attempts with exponential backoff) for Monday.com API calls, handles rate limits and complexity budget errors
- **Sync Trigger Labels**: Added "Listo" (Spanish) alongside "Ready" as accepted trigger labels for import

### Key Files
- `frontend/src/modules/print/PrintDialog.jsx` — Print dialog with LR2000E + Standard Print
- `backend/modules/print/__init__.py` — Print endpoints
- `backend/modules/integrations/monday/core_client.py` — Monday.com API client (pagination, retry)
- `backend/modules/sysbook/services/presale_import_service.py` — Pre-sale import logic
- `frontend/src/modules/wallet/tabs/WalletTransactionsTab.jsx` — Wallet transactions
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
- `GET /api/sysbook/presale-import/preview` — Preview Monday.com import
- `POST /api/sysbook/presale-import/execute` — Execute import
- `POST /api/wallet/admin/transactions/bulk-delete` — Permanently delete transactions

## DB Schema (Key)
- `chipi_transactions`: transaction_id, user_id, transaction_type, amount, archived
- `store_textbook_orders.items[]`: book_id, book_code, book_name, price, quantity_ordered
- `store_products`: book_id, name, code, is_sysbook, archived

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
