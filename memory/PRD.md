# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync.

## What's Been Implemented

### Gmail-to-Wallet Payment Pipeline (Feb 12-13, 2026) - COMPLETE
- **Pending queue**: approve/reject workflow, manual entry, stats dashboard
- **Gmail IMAP**: inbox scan, email fetching (toolskoh@gmail.com)
- **GPT-4o parsing**: amount, sender, reference, confidence, rule engine
- **Monday.com sync**: creates items with mapped columns + email summary as Updates
- **Monday.com Configuration UI**: admin selects board, maps columns, toggles sync, tests connection
- **4-Layer Deduplication**: Message-ID, bank reference, fingerprint (24h), same-amount (2h)
- **E2E Verified**: Manual entry -> Monday sync -> Approve/Reject -> Monday status update (Pending/Approved/Decline)
- Board ID: 18399959471 (Recharge Approval)

### Telegram Feed Visibility Controls (Feb 13, 2026) - COMPLETE
- **Backend**: Role-based access check on `/feed/posts`, admin visibility endpoints (`GET/PUT /admin/visibility`)
- **Frontend**: Collapsible Visibility Panel for admins with 3 modes:
  - All Users (default) - everyone logged in
  - Admins Only - only administrators
  - Specific Roles - checkbox selection from configured roles (Super Admin, Admin, Moderator, User)
- **Permissions**: Added `community.feed_view` and `community.feed_admin` to role permissions
- **i18n**: EN/ES/ZH translations for access denied messages
- **Testing**: 100% pass (15 backend + all frontend tests, iteration 89)

### Dev Control Section - DONE
- 10-tab observability module: AI Helper (GPT-4o + Claude), Annotations, DB Explorer, Architecture, etc.

### Previously Completed
- 2-Way Monday.com Wallet Sync + Dashboard
- Admin Table Consistency, i18n (EN/ES/ZH 100%), Translation Management Suite

## Architecture
- Backend: FastAPI, MongoDB, 27+ modules
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations
- Integrations: Monday.com, Telegram Bot, Gmail IMAP

## Prioritized Backlog
### P2 - Future
- OneSignal Push, Stripe Payments, Google Sheets
### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications, Landing Page Templates
