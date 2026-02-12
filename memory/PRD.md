# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for the "Chipi Wallet" application with:
1. Full 2-Way Monday.com Sync
2. Admin table consistency
3. Full Internationalization (EN/ES/ZH)
4. Gmail-to-Wallet payment pipeline with AI parsing and admin approval
5. Development Control section with AI Dev Helper

## What's Been Implemented

### Gmail-to-Wallet Payment Pipeline (Feb 12, 2026)
- **Step 1 (DONE)**: Pending Transactions System — CRUD, approve/reject workflow, manual entry
- **Step 2 (DONE)**: Gmail IMAP Integration — Connected to toolskoh@gmail.com, fetch/scan emails
- **Step 3 (DONE)**: AI Email Parsing — GPT-4o extracts amount, currency, sender, reference, confidence
- **Rule Engine (DONE)**: Sender whitelist, must-contain/must-not-contain keywords, amount thresholds (auto-approve / max reject)
- **Processing Log (DONE)**: Tracks all processed emails with results (created/skipped/rejected)
- **Admin Settings (DONE)**: Gmail connection status, polling mode (realtime/polling/manual), auto-process, require-approval
- MongoDB: wallet_pending_topups, wallet_topup_rules, wallet_topup_settings, wallet_processed_emails
- Testing: 100% across iterations 86 (27/27) + 87 (17/17)
- **MOCKED**: Monday.com sync for pending items (Step 4)

### Dev Control Section (Feb 12, 2026) - DONE
- 10-tab module: AI Helper (GPT-4o + Claude Sonnet 4.5), Annotations, DB Explorer, Changes, Architecture, Modules, Dependencies, Principles, API Reference, Roadmap
- Production resilience fix for environment-specific features

### Previously Completed
- 2-Way Monday.com Wallet Sync + Dashboard
- Admin Table Consistency Refactor
- i18n Full Rollout (EN/ES/ZH at 100%)
- Translation Management Suite (coverage, dictionary, auto-translate)

## Architecture
- Backend: FastAPI, MongoDB (Motor async), 27+ modules
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations
- Integrations: Monday.com, Telegram Bot API, Gmail IMAP

## Prioritized Backlog

### P0 - In Progress (Payment Pipeline)
- **Step 4**: Monday.com sync for pending top-ups (2-way approval from board/TV)
- **Step 5**: User notifications (pending/approved/rejected)

### P1 - Upcoming
- Telegram Feed Visibility Controls

### P2 - Future
- OneSignal Push Notifications, Stripe Payments, Google Sheets

### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications, Landing Page Templates
