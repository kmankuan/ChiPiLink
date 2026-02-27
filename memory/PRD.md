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
- Pre-sale import: cursor-based pagination, `/` in codes, fuzzy book matching, "Listo" trigger label
- **Chatbot Help Guide**: Public `/help-guide` page with structured content for chatbot training, animated GIFs
- **Print Configuration (Feb 27, 2026)**: Configurable font family/size for thermal prints, template CRUD system (create, clone, edit, delete, activate) in Dev Control > Print Config tab
- **Help Guide Editor (Feb 27, 2026)**: Dual-mode editor (structured form + raw JSON code) in Dev Control > Help Guide tab. Content stored in MongoDB, public page renders dynamically from API

### Key Files
- `frontend/src/modules/admin/DevControlModule.jsx` — Dev Control with all admin tabs
- `frontend/src/modules/admin/PrintConfigTab.jsx` — Print template config UI (NEW)
- `frontend/src/modules/admin/HelpGuideEditorTab.jsx` — Help guide editor UI (NEW)
- `frontend/src/pages/HelpGuide.jsx` — Public help guide (now API-driven)
- `backend/modules/print/__init__.py` — Print module with template CRUD, thermal HTML builder
- `backend/modules/dev_control/routes.py` — Dev control + help guide CRUD + public help guide endpoint
- `frontend/src/modules/print/PrintDialog.jsx` — Core printing logic
- `backend/modules/monday/service.py` — Core import/sync logic

### Key API Endpoints
- `GET /api/print/templates` — List print templates
- `POST /api/print/templates` — Create template (with optional clone_from)
- `PUT /api/print/templates/{id}` — Update template config
- `DELETE /api/print/templates/{id}` — Delete template (not active)
- `POST /api/print/templates/{id}/activate` — Set as active, apply to print config
- `GET /api/dev-control/help-guide` — Get help guide content (admin)
- `PUT /api/dev-control/help-guide` — Save help guide content (admin)
- `GET /api/help-guide/content` — Public help guide content (no auth)

### Key DB Collections
- `print_templates` — Print template configurations
- `help_guide_content` — Help guide structured content
- `app_config` (key: `print_format`) — Active print format config used by thermal HTML builder

## Prioritized Backlog
- (P1) Explore automatic help guide updates linked to feature development
- (P2) On-demand landing page redesign tool for administrators
- (P3) Extend Monday.com synchronization for general product inventory
- (P3) ChipiPoints gamification system
- (P3) Email notifications for key events

## Admin Credentials
- Email: `teck@koh.one` / Password: `Acdb##0897`
