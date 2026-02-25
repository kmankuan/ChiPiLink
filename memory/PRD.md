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
7. **Monday.com Print Button Webhook (2026-02-25)** — Connected button column `button_mm0xa5t0` on TB2026-Orders board (ID: 18397140868) to the print system. Webhook ID: 541186620. Clicking the button in Monday.com triggers a print job and broadcasts to admin browsers via WebSocket.

### Key Endpoints
- `GET/POST /api/print/config/format` — Print format configuration
- `POST /api/print/jobs` — Create print job
- `GET /api/print/jobs` — List print job history
- `POST /api/print/jobs/{job_id}/complete` — Mark job as printed
- `POST /api/print/monday-trigger` — Monday.com webhook endpoint
- `GET /api/print/monday-webhook-status` — Check webhook configuration
- `GET/POST/PUT /api/wallet/deposit-methods` — Deposit method config
- `GET /api/platform-store/my-orders` — User's store orders

## Prioritized Backlog

### P0 (Critical)
- None

### P1 (High)
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
- `deposit_methods` — Wallet deposit method configuration
- `store_orders` — Unatienda public store orders

## Credentials
- Admin: teck@koh.one / Acdb##0897
- Monday.com Board: TB2026-Orders (18397140868)
- Print Button Column: button_mm0xa5t0
- Webhook ID: 541186620
