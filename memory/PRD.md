# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive wallet system with Monday.com integration, Telegram community feed, and admin tools for ChiPi Link community platform.

## Core Requirements
1. Wallet system with deposits, charges, transfers
2. Monday.com webhook integration for automated wallet top-ups
3. Telegram community feed
4. Admin panel for wallet management

## What's Been Implemented

### Wallet System (DONE)
- Full wallet CRUD: deposit, charge, transfer, points
- Admin panel: Overview, Transactions, Bank Info, Settings tabs
- Manual top-up/deduct from admin UI
- Delete user functionality (Feb 11)

### Monday.com Integration (DONE - Reworked Feb 11)
- **Item-level triggers** (not subitems) — "When Status changes → send webhook"
- Dual amount columns: Top Up + Deduct
- Dynamic board/column mapping via admin UI
- Webhook challenge verification, raw request logging
- Test webhook button for manual testing
- Column mapping: email=email_mm0f7cg8, topup=numeric_mm0ff8j3, deduct=numeric_mm0f60w7, status=status
- Board: Chipi Wallet (18399650704)

### Telegram Community Feed (DONE)
- Background polling of private Telegram channel
- Feed display with likes and comments
- Media proxy for images/videos

### Admin Panel (DONE)
- Centralized Wallet module with 4 tabs
- User management with delete functionality
- Webhook event logs + raw request logs
- Bank info CRUD

## Architecture
- Backend: FastAPI + MongoDB (chipilink_prod)
- Frontend: React + Shadcn/UI
- Auth: LaoPan SSO + JWT
- Integrations: Monday.com GraphQL API, Telegram Bot API

## Prioritized Backlog
- P1: Telegram feed visibility configuration
- P1: Transaction history view for clients in widget
- P2: Wallet balance notifications
- P2: sync-all endpoint fix
- P3: i18n support
- P3: Board selector UX improvements
