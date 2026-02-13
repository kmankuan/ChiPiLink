# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, and Telegram community features.

## What's Been Implemented

### Landing Page Design Templates (Feb 13, 2026) - COMPLETE
- **3 selectable design templates** available via Admin > UI Style settings:
  1. **Living Grid**: Bento-style dashboard with time greeting, cultural tiles, modular layout
  2. **Cinematic**: Dark full-screen hero, parallax scrolling, bold editorial typography
  3. **Horizon** (NEW): Native app feel. Split-screen hero, warm cream (#FAF7F2), 4 unique action cards (Shop/Play/Discover/Search), warm amber PinPanClub with vivid kids ping pong image, community photo section
- All registered in backend `AVAILABLE_LAYOUTS` and frontend `LAYOUT_COMPONENTS`
- SVG layout previews in admin UI Style selector
- Key files:
  - `/app/frontend/src/pages/landing-layouts/HorizonLanding.jsx`
  - `/app/frontend/src/pages/landing-layouts/LivingGridLanding.jsx`
  - `/app/frontend/src/pages/landing-layouts/CinematicLanding.jsx`
  - `/app/frontend/src/pages/SuperAppLanding.jsx` (layout router)
  - `/app/backend/modules/admin/services/ui_style_service.py` (layout registry)
  - `/app/frontend/src/modules/admin/UIStyleModule.jsx` (admin UI + SVG previews)

### Gmail-to-Wallet Payment Pipeline (Feb 12-13, 2026) - COMPLETE
- Pending queue, Gmail IMAP, GPT-4o parsing, Monday.com sync, 4-Layer Deduplication
- Real-time Background Polling (configurable interval, default 1 min)
- E2E Verified

### Telegram Feed Visibility Controls (Feb 13, 2026) - COMPLETE
- Role-based access, admin visibility endpoints, 3 modes

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
- Admin image customization for PinPanClub section

### P2 - Future
- OneSignal Push, Stripe Payments, Google Sheets

### P3 - Backlog
- ChipiPoints, Teams/Clans, Email Notifications
