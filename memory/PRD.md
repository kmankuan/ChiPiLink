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
- **Thermal Printer Fix (P0)**: Changed `handleThermalPrint` from `window.open(url)` to `fetch(url)` + `document.write(html)` pattern, matching the working Standard Print approach. Removed dead code (`buildThermalHTML`, `thermalHtml` state).
- Print Preview shows correct book codes and names
- Standard Print shows correct book codes and names
- Backend `GET /api/print/thermal-page` verified to return correct HTML

### Key Files
- `frontend/src/modules/print/PrintDialog.jsx` — Print dialog with LR2000E + Standard Print
- `frontend/src/modules/print/PackageListPreview.jsx` — Package list renderer
- `backend/modules/print/__init__.py` — Print endpoints (thermal-page, jobs, config)
- `frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx` — Orders admin

## Prioritized Backlog

### P3 — Upcoming
- Build on-demand landing page redesign tool for administrators

### P4 — Future
- Extend Monday.com synchronization for general product inventory

## Key API Endpoints
- `POST /api/auth-v2/login` — Admin login
- `GET /api/print/thermal-page?order_ids=&token=` — Server-rendered thermal receipt
- `POST /api/print/jobs` — Create print job, returns orders + format config
- `POST /api/print/monday-trigger` — Monday.com webhook for batch printing

## DB Schema (Key)
- `store_textbook_orders.items[]`: `book_id`, `book_code`, `book_name`, `price`, `quantity_ordered`, `status`
- Soft-delete fields: `is_archived`, `archived_at`

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
