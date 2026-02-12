# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for the "Chipi Wallet" application with:
1. Full 2-Way Monday.com Sync (wallet, users, transactions)
2. Admin table consistency (mobile-first, search, filters, pagination, bulk actions)
3. Full Internationalization (EN/ES/ZH)
4. AI-driven bank alert parsing via Monday.com
5. Development Control section for architecture visualization and dev management

## User Personas
- **Admin**: Manages wallets, users, orders, roles, integrations, site config, dev control
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
- **i18n Full Rollout**: All 3 languages at 100% coverage (2005+ keys each)
- **Translation Coverage Indicator** (Feb 12, 2026): Progress bars, missing-key badges, category breakdown
- **Permission-Gated Translation Management** (Feb 12, 2026): `translations.view/edit/manage` permissions, inline editing, search/filter
- **AI Auto-Translate** (Feb 12, 2026): GPT-4o via Emergent Universal Key, batches 40 keys/call
- **Dev Control Section** (Feb 12, 2026):
  - New sidebar nav item "Dev Control" (admin-only)
  - Architecture tab: Dynamic file tree introspection (backend + frontend) with filter
  - Modules tab: 13 module cards with status badges, descriptions, key endpoints
  - Principles tab: Categorized dev guidelines (Backend, Frontend, Database, Integrations)
  - API Reference tab: Auto-discovered 773 endpoints grouped by tag with method badges, filter, copy
  - Roadmap tab: P0-P3 items with editable status (planned/in_progress/done/blocked)
  - Annotations tab: Full CRUD notebook for admin dev notes with categories, pinning, search/filter
  - Backend endpoints: `/api/dev-control/{architecture,endpoints,modules,principles,roadmap,annotations}`
  - All persisted to MongoDB (dev_annotations, dev_roadmap collections)
  - i18n keys added for EN/ES/ZH
  - Testing: 100% pass rate (20/20 backend + all frontend features)

### Architecture
- **Backend**: FastAPI, MongoDB (Motor async), Modular Monolith
- **Frontend**: React, Shadcn/UI, TanStack Table, react-i18next
- **Integrations**: Monday.com (GraphQL + Webhooks), Telegram Bot API, OpenAI GPT-4o (via Emergent Universal Key)

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
