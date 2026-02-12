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

## Core Requirements
- All code and agent communication in English
- App UI supports EN, ES, ZH (react-i18next)
- Mobile-first responsive design
- Consistent table patterns across admin

## What's Been Implemented

### Completed (P0)
- **2-Way Monday.com Wallet Sync**: User creation, transaction logging, webhook processing, idempotency
- **Monday.com Sync Dashboard**: UI + API for monitoring sync status, logs, manual re-sync
- **Admin Table Consistency Refactor**: All major admin tables standardized (mobile-first, pagination, bulk actions)
- **Redundant Bank Alert Parser Removal**: Cleaned from frontend and backend
- **P0 i18n Full Rollout (95%+ coverage)**:
  - 163/180 frontend files now use `useTranslation` hook
  - 2100+ translation keys in each locale file (en.json, es.json, zh.json)
  - Admin sidebar navigation, all admin modules, shared components, toast messages, page titles all translated
  - Language selector in admin header works across EN/ES/ZH
  - Remaining 7 files are utility/callback/third-party components with no translatable UI
- **Translation Coverage Indicator (Feb 12, 2026)**:
  - New backend API: GET /api/translations/admin/coverage (analyzes locale files, returns per-language coverage %, missing keys, category breakdown)
  - New TranslationCoverageCard component in Admin > Administration > Translations tab
  - Shows progress bars per language, clickable missing-keys badges, expandable category breakdown table
  - Fixed sidebar useMemo dependency to properly re-render on language change
  - Fixed hardcoded strings: Admin module descriptions, "Go to Home"/"Log Out", PinPanClubFeedBlock "Total"

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
- Multi-tenant support
- Advanced reporting dashboard
- Mobile app (React Native)
