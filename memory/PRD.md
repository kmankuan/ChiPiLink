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
- **P0 i18n Full Rollout (95%+ coverage)**: 2000+ translation keys in en/es/zh
- **Translation Coverage Indicator (Feb 12, 2026)**:
  - Backend: `GET /api/translations/admin/coverage` - coverage stats per language, missing keys, category breakdown
  - Frontend: TranslationCoverageCard with progress bars, clickable missing-key badges, category breakdown table
  - Quick-edit on missing keys: inline editing directly in the missing keys dialog
  - Fixed sidebar useMemo dependency for proper language switching

- **Permission-Gated Translation Management (Feb 12, 2026)**:
  - Added `translations` permission group: `translations.view`, `translations.edit`, `translations.manage`
  - Admins get `translations.*` by default
  - Backend endpoints use `get_authenticated_user` wrapper + `_check_permission()` for proper auth
  - All endpoints return 401 without token, 403 without required permission
  - Rewritten TranslationsModule with:
    - Full i18n (all UI text via `t()` calls)
    - Search, category filter, missing-only filter
    - Inline cell editing (click to edit, Enter to save, Escape to cancel)
    - Permission-aware UI (edit/delete buttons only shown if user has permission)
    - Sync from files, new key creation, key deletion
    - Pagination with proper page controls
  - 100% backend tests passed (11/11), 100% frontend verified

### Architecture
- **Backend**: FastAPI, SQLAlchemy, MongoDB
- **Frontend**: React, Shadcn/UI, TanStack Table, react-i18next
- **Integrations**: Monday.com (GraphQL + Webhooks), Telegram Bot API

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
