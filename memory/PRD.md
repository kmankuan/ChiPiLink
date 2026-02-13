# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync.

## What's Been Implemented

### Gmail-to-Wallet Payment Pipeline (Feb 12-13, 2026) - Steps 1-5 COMPLETE
- **Step 1**: Pending queue, approve/reject workflow, manual entry, stats dashboard
- **Step 2**: Gmail IMAP (toolskoh@gmail.com), inbox scan, email fetching
- **Step 3**: GPT-4o email parsing (amount, sender, reference, confidence), rule engine (whitelist, keywords, thresholds)
- **Step 4**: Monday.com sync - creates items with mapped columns + posts email summary as item Update
- **Step 5**: Monday.com Configuration UI - admin can select board, map columns, toggle sync, test connection
- **4-Layer Deduplication**: Message-ID, bank reference match, amount+sender fingerprint (24h), low-risk same-amount (2h)
- **Warning System**: Clear/Low Risk/Potential Duplicate/Duplicate badges on each item
- **Processing Log**: All scanned emails tracked with results
- **Monday.com Config**: Board selection (Recharge Approval ID:18399959471), column mapping, group selection, save/test
- MongoDB: wallet_pending_topups, wallet_topup_rules, wallet_topup_settings, wallet_processed_emails, monday_topup_items, wallet_topup_monday_config
- Testing: 100% iterations 84-88

### Dev Control Section - DONE
- 10-tab module: AI Helper (GPT-4o + Claude), Annotations, DB Explorer, Changes, Architecture, Modules, Dependencies, Principles, API Reference, Roadmap

### Previously Completed
- 2-Way Monday.com Wallet Sync + Dashboard
- Admin Table Consistency, i18n (EN/ES/ZH 100%), Translation Management Suite

## Architecture
- Backend: FastAPI, MongoDB, 27+ modules
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations
- Integrations: Monday.com, Telegram Bot, Gmail IMAP

## Prioritized Backlog
### P0 - Next
- End-to-end verification: Gmail scan -> pending item -> Monday.com sync -> approve -> status update in Monday
### P1 - Upcoming
- Telegram Feed Visibility Controls
### P2 - Future
- OneSignal Push, Stripe Payments, Google Sheets
### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications, Landing Page Templates
