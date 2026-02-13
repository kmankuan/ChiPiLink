# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, Telegram community features, and activity ticker system.

## What's Been Implemented

### Activity Ticker + Sponsor Banner System (Feb 13, 2026) - COMPLETE
- **Ticker Bar**: Dark sticky bar at top of page showing live app activities (auto-rotates every 4s)
- **Real data sources**: PinPanClub matches, new users, store orders, community posts, wallet transactions, custom messages
- **Sponsor banners**: Interleaved with activities at configurable frequency (every N items)
- **Full admin panel** (Admin > Activity Ticker tab):
  - Toggle sources on/off with color picker per source
  - Add/edit/delete sponsor banners (name, image, link, colors)
  - Customize style (background, text, accent colors, height)
  - Page visibility controls (show/hide per page path)
  - Rotation speed, max activities, pause on hover
- **Backend**: `/api/ticker/feed` (public), `/api/admin/ticker/config` (CRUD), `/api/admin/ticker/sponsors` (CRUD)
- **Testing**: 100% pass (17/17 backend, all frontend verified)

### Header & Bottom Nav Redesign (Feb 13, 2026) - COMPLETE
- **Header**: Clean, thin (h-14), frosted glass, no duplicate links. Login pill button. Breadcrumb navigation.
- **BottomNav**: Fixed duplicate Cart/Store. Now: Home, Explore, Store (badge), Club, Me.
- Key files: `Header.jsx`, `BottomNav.jsx`, `TickerBar.jsx`

### Landing Page Design Templates (Feb 13, 2026) - COMPLETE
- 3 selectable templates: Living Grid, Cinematic, Horizon (native app feel)

### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE
### Previously Completed: Monday.com Sync, i18n, Admin Tables

## Architecture
- Backend: FastAPI, MongoDB, 28+ modules (including ticker)
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations

## Key Files
- `/app/backend/modules/ticker/routes.py`
- `/app/frontend/src/components/layout/TickerBar.jsx`
- `/app/frontend/src/modules/admin/TickerAdminModule.jsx`
- `/app/frontend/src/pages/landing-layouts/HorizonLanding.jsx`
- `/app/frontend/src/components/layout/Header.jsx`
- `/app/frontend/src/components/layout/BottomNav.jsx`

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - Admin image customization for landing sections
### P3 - OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
