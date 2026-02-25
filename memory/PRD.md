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
7. **Monday.com Print Button Webhook** — Connected button column `button_mm0xa5t0` on TB2026-Orders board. Includes 15s batch window for bulk button clicks.
8. **Data Cleanup** — All demo/test data wiped, configs preserved
9. **Delete → Archive → Permanent Delete Workflow** — Generic archive system across all modules (25/25 tests passing)
10. **Direct-to-Printer Integration (LR2000E)** — WebUSB-based direct thermal printer connection:
    - `ThermalPrinterService` — ESC/POS encoder for LR2000E (72mm, 512 dots/line)
    - `useThermalPrinter` hook — React hook for connect/disconnect/print
    - PrintConfigPanel — Live USB connection panel with test print
    - PrintDialog — "USB Print" button alongside browser print
    - usePrintListener — Auto-print via WebSocket when thermal printer is connected
11. **Presale Import Trigger** — Simplified to "Ready" label only

### Key Endpoints
- **Archive System:** `POST/GET /api/archive/{entity_type}/archive|restore|permanent-delete|counts`
- **Print System:** `GET/POST /api/print/config/format|printer`, `POST /api/print/jobs`, `GET /api/print/jobs/{job_id}`, `POST /api/print/monday-trigger`
- **Monday Webhook:** `POST /api/print/monday-trigger` (webhook ID: 541186620)
- **Deposit Methods:** `GET/POST/PUT /api/wallet/deposit-methods`
- **Platform Orders:** `GET /api/platform-store/my-orders`

## Prioritized Backlog

### P0 (Critical)
- None

### P3 (Low)
- **On-Demand Landing Page Redesign Tool** — Admin customization tool for landing page
- **Extend Monday.com Sync** — Expand sync to general product inventory beyond Sysbook orders

## Key Technical Details
- **Thermal Printer:** Logic Controls LR2000E, ESC/POS protocol, WebUSB API, USB Type B
- **Monday.com Board:** TB2026-Orders (18397140868), button column: button_mm0xa5t0
- **Presale Sync Trigger Column:** color_mm0mnmrs, accepted label: "Ready"
- **Archive Entity Types:** students, orders, store_orders, movements, alerts, print_jobs, products, schools

## Credentials
- Admin: teck@koh.one / Acdb##0897
- Monday.com Webhook ID: 541186620
