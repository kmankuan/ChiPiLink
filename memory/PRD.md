# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for the "Chipi Wallet" application with:
1. Full 2-Way Monday.com Sync (wallet, users, transactions)
2. Admin table consistency (mobile-first, search, filters, pagination, bulk actions)
3. Full Internationalization (EN/ES/ZH)
4. AI-driven bank alert parsing via Monday.com

## User Personas
- **Admin**: Manages wallets, users, orders, roles, integrations, site config
- **Parent/Guardian (Acudido)**: Links students, places textbook orders, manages wallet
- **Student**: Views catalog, uses wallet for purchases
- **Translator**: Bilingual community member who contributes translations (via roles)

## Core Requirements
- All code and agent communication in English
- App UI supports EN, ES, ZH (react-i18next)
- Mobile-first responsive design
- Consistent table patterns across admin

## What's Been Implemented

### Completed (P0)
- **2-Way Monday.com Wallet Sync**: User creation, transaction logging, webhook processing, idempotency
- **Monday.com Sync Dashboard**: UI + API for monitoring sync status, logs, manual re-sync
- **Admin Table Consistency Refactor**: All major admin tables standardized
- **i18n Full Rollout**: All 3 languages at 100% coverage (2005 keys each)
- **Translation Coverage Indicator** (Feb 12, 2026): Progress bars, missing-key badges, category breakdown
- **Permission-Gated Translation Management** (Feb 12, 2026): `translations.view/edit/manage` permissions, inline editing, search/filter
- **AI Auto-Translate** (Feb 12, 2026):
  - Backend: `POST /api/translations/admin/auto-translate?target_lang=zh` using OpenAI GPT-4.1-mini via Emergent Universal Key
  - Batches 40 keys per LLM call, preserves brand names (ChiPi, PinPan, Unatienda)
  - Successfully translated all 192 missing Chinese keys to reach 100% coverage
  - Frontend: "Auto-translate" button in Coverage Card next to missing-key badge
  - Permission-gated: requires `translations.manage`

### Architecture
- **Backend**: FastAPI, SQLAlchemy, MongoDB
- **Frontend**: React, Shadcn/UI, TanStack Table, react-i18next
- **Integrations**: Monday.com (GraphQL + Webhooks), Telegram Bot API, OpenAI (via Emergent Universal Key)

## Prioritized Backlog

### P1 - Upcoming
- Guide Monday.com AI Parser Setup (documentation for user)
- Telegram Feed Visibility Controls (admin role-based settings)

### P2 - Future
- OneSignal Push Notifications
- Stripe Payment Integration
- Google Sheets Integration
- Transaction history view for clients in widget
- Wallet balance notifications

### P3 - Backlog
- ChipiPoints System
- Teams/Clans System
- Email Notifications
- Landing Page Templates
- sync-all endpoint fix
