# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for the "Chipi Wallet" application with:
1. Full 2-Way Monday.com Sync
2. Admin table consistency
3. Full Internationalization (EN/ES/ZH)
4. AI-driven bank alert parsing via Monday.com
5. Development Control section with AI Dev Helper
6. Gmail-to-Wallet payment pipeline with admin approval

## Core Requirements
- All code and agent communication in English
- App UI supports EN, ES, ZH (react-i18next)
- Mobile-first responsive design

## What's Been Implemented

### Dev Control Section (Feb 12, 2026) - DONE
- 10-tab admin module: AI Helper, Annotations, DB Explorer, Changes, Architecture, Modules, Dependencies, Principles, API Reference, Roadmap
- **AI Dev Helper**: Dual-model (GPT-4o + Claude Sonnet 4.5, auto-routed by query type)
- Real-time app context injection, 4 quick actions, session persistence
- DB Explorer (123 collections), Changes Log (git history), Dependencies (129 Python + 77 Node)
- Production resilience fix: all system-introspection endpoints gracefully handle missing git/filesystem

### Payment Alerts System - Step 1 (Feb 12, 2026) - DONE
- **Pending Approval Queue**: Create, list, approve, reject pending top-ups with full audit trail
- **Email Rules Engine**: Sender whitelist, must-contain/must-not-contain keywords, amount thresholds (auto-approve below X, reject above Y)
- **Admin Settings**: Gmail connection status, polling mode (real-time/polling/manual), auto-process, require-approval toggles
- **Stats Dashboard**: Pending/approved/rejected counts, total approved amount
- **Manual Entry**: Test flow for creating pending top-ups without email integration
- New sidebar nav "Alertas de Pago" with 3 tabs
- MongoDB: wallet_pending_topups, wallet_topup_rules, wallet_topup_settings
- Testing: 100% (27/27 backend, all frontend verified)
- **MOCKED**: Monday.com sync for pending items (placeholder), wallet credit depends on user existence

### Previously Completed
- 2-Way Monday.com Wallet Sync
- Monday.com Sync Dashboard
- Admin Table Consistency Refactor
- i18n Full Rollout (EN/ES/ZH at 100%)
- Translation Management Suite (coverage, dictionary, auto-translate GPT-4o)

## Architecture
- Backend: FastAPI, MongoDB (Motor async), 26+ modules
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations
- Integrations: Monday.com, Telegram Bot API

## Prioritized Backlog

### P0 - In Progress (Payment Pipeline)
- **Step 2**: Gmail API integration (Google OAuth for inbox access, email polling/push)
- **Step 3**: AI email parsing (GPT-4o) + rule engine integration
- **Step 4**: Monday.com sync for pending top-ups (create items, 2-way approval)
- **Step 5**: User notifications (pending/approved/rejected)

### P1 - Upcoming
- Telegram Feed Visibility Controls

### P2 - Future
- OneSignal Push Notifications
- Stripe Payment Integration
- Google Sheets Integration

### P3 - Backlog
- ChipiPoints System, Teams/Clans, Email Notifications, Landing Page Templates
