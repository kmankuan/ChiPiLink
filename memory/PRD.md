# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for the "Chipi Wallet" application with:
1. Full 2-Way Monday.com Sync (wallet, users, transactions)
2. Admin table consistency (mobile-first, search, filters, pagination, bulk actions)
3. Full Internationalization (EN/ES/ZH)
4. AI-driven bank alert parsing via Monday.com
5. Development Control section with AI Dev Helper for architecture monitoring and dev management

## User Personas
- **Admin**: Manages wallets, users, orders, roles, integrations, site config, dev control, AI assistant
- **Parent/Guardian (Acudido)**: Links students, places textbook orders, manages wallet
- **Student**: Views catalog, uses wallet for purchases

## Core Requirements
- All code and agent communication in English
- App UI supports EN, ES, ZH (react-i18next)
- Mobile-first responsive design
- Consistent table patterns across admin

## What's Been Implemented

### Completed (P0)
- **2-Way Monday.com Wallet Sync**: User creation, transaction logging, webhook processing
- **Monday.com Sync Dashboard**: UI + API for monitoring sync status, logs, manual re-sync
- **Admin Table Consistency Refactor**: All major admin tables standardized
- **i18n Full Rollout**: All 3 languages at 100% coverage (2005+ keys)
- **Translation Management Suite**: Coverage card, dictionary manager, auto-translate (GPT-4o)
- **Dev Control Section** (Feb 12, 2026):
  - 10-tab admin module: AI Helper, Annotations, DB Explorer, Changes, Architecture, Modules, Dependencies, Principles, API Reference, Roadmap
  - Architecture: Dynamic file tree introspection with filter
  - API Reference: 782 auto-discovered endpoints, grouped by tag, color-coded methods
  - Annotations: Full CRUD with categories, pinning, search (MongoDB-persisted)
  - Roadmap: P0-P3 items with editable status
- **AI Dev Helper** (Feb 12, 2026):
  - Dual-model auto-routing: GPT-4o (general/security/strategy) + Claude Sonnet 4.5 (code review/architecture)
  - Real-time app context injection: DB collections, endpoint counts, modules, git history, env vars
  - Quick actions: Health Check, Security Scan, Architecture Review, Dependency Audit
  - Session-based chat with MongoDB persistence (dev_ai_sessions, dev_ai_messages)
  - System prompt: CTO-level advisor with full knowledge of ChiPi's tech stack
- **Database Explorer** (Feb 12, 2026): 123 collections with doc counts, field lists, sample documents
- **Changes Log** (Feb 12, 2026): Git commit history with expandable file diffs
- **Dependencies Viewer** (Feb 12, 2026): 129 Python + 77 Node packages with versions
- **Dynamic Modules Detection** (Feb 12, 2026): 26 modules auto-detected from filesystem

### Architecture
- **Backend**: FastAPI, MongoDB (Motor async), Modular Monolith (26 modules)
- **Frontend**: React, Shadcn/UI, TanStack Table, react-i18next
- **LLM**: GPT-4o + Claude Sonnet 4.5 via emergentintegrations (Emergent Universal Key)
- **Integrations**: Monday.com (GraphQL + Webhooks), Telegram Bot API

## Prioritized Backlog

### P1 - Upcoming
- Guide Monday.com AI Parser Setup (documentation)
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
