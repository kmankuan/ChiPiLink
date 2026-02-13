# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, and Telegram community features.

## What's Been Implemented

### Landing Page Design Templates (Feb 13, 2026) - COMPLETE
- **3 selectable design templates** available via Admin > UI Style settings:
  1. **Living Grid**: Bento-style dashboard with time greeting, cultural tiles, modular layout
  2. **Cinematic**: Dark full-screen hero, parallax scrolling, bold editorial typography
  3. **Horizon** (NEW): Split-screen hero, warm cream background (#FAF7F2), horizontal pill navigation, floating depth cards, red (#C8102E) accents
- All templates registered in backend `AVAILABLE_LAYOUTS` and frontend `LAYOUT_COMPONENTS`
- SVG layout previews added to admin UI Style selector
- Key files:
  - `/app/frontend/src/pages/landing-layouts/LivingGridLanding.jsx`
  - `/app/frontend/src/pages/landing-layouts/CinematicLanding.jsx`
  - `/app/frontend/src/pages/landing-layouts/HorizonLanding.jsx`
  - `/app/frontend/src/pages/SuperAppLanding.jsx` (layout router)
  - `/app/backend/modules/admin/services/ui_style_service.py` (layout registry)
  - `/app/frontend/src/modules/admin/UIStyleModule.jsx` (admin UI + SVG previews)

### Gmail-to-Wallet Payment Pipeline (Feb 12-13, 2026) - COMPLETE
- **Pending queue**: approve/reject workflow, manual entry, stats dashboard
- **Gmail IMAP**: inbox scan, email fetching (toolskoh@gmail.com)
- **GPT-4o parsing**: amount, sender, reference, confidence, rule engine
- **Monday.com sync**: creates items with mapped columns + email summary as Updates
- **Monday.com Configuration UI**: admin selects board, maps columns, toggles sync, tests connection
- **4-Layer Deduplication**: Message-ID, bank reference match, amount+sender fingerprint (24h), low-risk same-amount (2h)
- **Real-time Background Polling**: Gmail poller auto-starts at server startup, scans every N minutes (configurable)
- **E2E Verified**: Manual entry -> Monday sync -> Approve/Reject -> Monday status update

### Telegram Feed Visibility Controls (Feb 13, 2026) - COMPLETE
- Role-based access check, admin visibility endpoints, 3 modes

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
### P1 - User Chooses Final Landing Page Design
- User to select preferred default from the 3 templates

### P2 - Future
- OneSignal Push, Stripe Payments, Google Sheets

### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications
