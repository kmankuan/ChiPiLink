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
- **4-Layer Deduplication**: Message-ID, bank reference match, amount+sender fingerprint (24h), low-risk same-amount (2h)
- **Real-time Background Polling**: Gmail poller auto-starts at server startup, scans every N minutes (configurable)
  - Starts/stops automatically based on settings (realtime vs manual mode)
  - Shows live status indicator in Settings tab ("Background scanner active" with green pulse)
  - Logs last scan timestamp and new items found
- **E2E Verified**: Manual entry -> Monday sync -> Approve (Approved) / Reject (Decline) -> Monday status update
- Board ID: 18399959471 (Recharge Approval)

### Telegram Feed Visibility Controls (Feb 13, 2026) - COMPLETE
- **Backend**: Role-based access check on `/feed/posts`, admin visibility endpoints
- **Frontend**: Collapsible Visibility Panel with 3 modes: All Users, Admins Only, Specific Roles
- **Permissions**: `community.feed_view` and `community.feed_admin` added to role system
- Testing: 100% pass (iteration 89)

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

## Key Files
- `/app/backend/modules/wallet_topups/gmail_poller.py` - Background polling service
- `/app/backend/modules/wallet_topups/routes.py` - All payment alerts endpoints
- `/app/backend/modules/wallet_topups/monday_sync.py` - Monday.com sync logic
- `/app/backend/modules/community/routes/telegram_feed.py` - Feed visibility
- `/app/frontend/src/modules/admin/PaymentAlertsModule.jsx` - Payment alerts UI
- `/app/frontend/src/modules/community/CommunityFeedModule.jsx` - Community feed UI

## Prioritized Backlog
### P2 - Future
- OneSignal Push, Stripe Payments, Google Sheets
### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications, Landing Page Templates
