# Sysbook / Unatienda — Product Requirements Document

## Original Problem Statement
Build and maintain a private school inventory system ("Sysbook") alongside a public e-commerce store ("Unatienda"). Features include cart/orders management, wallet with deposits, printing package lists, Monday.com integration, and full i18n support.

## Core Architecture
- **Frontend:** React (CRA) with Shadcn/UI, i18n (en/es/zh), React Router
- **Backend:** FastAPI + MongoDB (chipilink_prod)
- **Integrations:** Monday.com, OneSignal, Google Photos, Gmail, Telegram Bot, OpenAI, Anthropic, ElevenLabs, LaoPan OAuth, WebSockets (socket.io)

## What's Been Implemented

### Completed Features
1. **Refactored Cart & Orders** — Unified two-tab interface (My Cart + My Orders)
2. **Full i18n** — English-first system across all components (en/es/zh)
3. **Unified Order History** — Combined Sysbook + Unatienda orders display
4. **Backend-Driven Deposit Flow** — Dynamic multi-step deposit (Yappy, Cash, Card, Transfer)
5. **Print Package List** — Multi-select orders, configurable format, Monday.com webhook trigger, WebSocket real-time notifications
6. **Print History** — Staff can view past print jobs with who/when/status
7. **Monday.com Print Button Webhook** — Connected button column `button_mm0xa5t0` on TB2026-Orders board (ID: 18397140868) to the print system. Webhook ID: 541186620. Includes time-window batching (15s) for bulk button clicks.
8. **Data Cleanup** — All demo/test data wiped across all collections, keeping configs, translations, roles, and admin users.
9. **Delete → Archive → Permanent Delete Workflow** — Generic archive system across all modules:
   - Backend: `POST /api/archive/{entity}/archive`, `POST /api/archive/{entity}/restore`, `POST /api/archive/{entity}/permanent-delete`, `GET /api/archive/{entity}`, `GET /api/archive/{entity}/counts`
   - Entity types: students, orders, store_orders, movements, alerts, print_jobs, products, schools
   - All listing endpoints filter out archived items automatically
   - Frontend: ArchiveTab reusable component integrated in Students, Alerts, Stock Movements tabs
   - Safety guard: permanent delete only works on archived items
   - 25/25 backend tests passing

### Key Endpoints
- **Archive System:** `POST/GET /api/archive/{entity_type}/archive|restore|permanent-delete|counts`
- **Deposit Methods:** `GET/POST/PUT /api/wallet/deposit-methods`
- **Platform Orders:** `GET /api/platform-store/my-orders`, `POST /api/platform-store/create-order`
- **Printing:** `GET/POST /api/print/config`, `POST /api/print/jobs`, `GET /api/print/jobs`, `POST /api/print/monday-trigger`, `GET /api/print/monday-webhook-status`
- **Monday Webhook:** `POST /api/monday/print-order`

## Prioritized Backlog

### P0 (Critical)
- None

### P2 (Medium)
- **Direct-to-Printer Integration** — Browser USB printing to Logic Controls thermal printer via WebUSB API
- **On-Demand Landing Page Redesign Tool** — Admin customization tool for landing page

### P3 (Low)
- **Extend Monday.com Sync** — Expand sync to general product inventory beyond Sysbook orders

## Key Database Collections
- `print_jobs` — Print job records with status tracking
- `app_config` — Print format config, printer config, webhook config
- `store_textbook_orders` — Sysbook textbook orders (linked to Monday.com items)
- `store_students` — Student records with enrollments
- `sysbook_alerts` — Stock alert records
- `stock_orders` — Stock movements (shipments, returns, adjustments)
- `deposit_methods` — Wallet deposit method configuration
- `store_orders` — Unatienda public store orders

## Credentials
- Admin: teck@koh.one / Acdb##0897
- Monday.com Board: TB2026-Orders (18397140868)
- Print Button Column: button_mm0xa5t0
- Webhook ID: 541186620
