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
- Pre-Sale Import from Monday.com (pagination, code parsing, fuzzy matching)
- Universal archive/soft-delete system (backend + frontend)
- Thermal Printer Fix: `fetch()` + `document.write(html)` pattern
- Subitem Name Format: `"CODE BookName"` for Monday.com sync
- **Order Activity Tracking**: Print tracking (`printed_at`, `print_count`, `last_activity`) with visual indicators in table
- **Activity Column**: Green printer-check icon (printed) vs gray printer (not printed), blue link icon (linked)
- **Quick Print Button**: Printer icon directly in table row Actions column
- **Status Dropdown in Table**: Already functional for inline status changes
- Pre-sale import: cursor-based pagination, `/` in codes, fuzzy book matching, "Listo" trigger label

### Key Files
- `frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx` — Orders table with activity column
- `frontend/src/modules/print/PrintDialog.jsx` — Print dialog with `onPrintComplete` callback
- `backend/modules/sysbook/routes/orders.py` — `PUT /admin/mark-printed` endpoint
- `backend/modules/integrations/monday/core_client.py` — Paginated Monday.com client
- `backend/modules/sysbook/services/presale_import_service.py` — Import with fuzzy matching

## Prioritized Backlog
- (P3) Build on-demand landing page redesign tool for administrators
- (P4) Extend Monday.com synchronization for general product inventory

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
