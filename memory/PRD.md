# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, and Telegram community features.

## What's Been Implemented

### Landing Page Design Templates (Feb 13, 2026) - COMPLETE
- **3 selectable design templates** via Admin > UI Style:
  1. **Living Grid**: Bento-style dashboard with time greeting, cultural tiles
  2. **Cinematic**: Dark full-screen hero, parallax, bold editorial typography
  3. **Horizon**: Native app feel, split-screen hero, warm cream, 4 unique action cards, professional indoor table tennis image, no dark sections
- Key files: `HorizonLanding.jsx`, `LivingGridLanding.jsx`, `CinematicLanding.jsx`, `SuperAppLanding.jsx`

### Header & Bottom Nav Redesign (Feb 13, 2026) - COMPLETE
- **Header**: Cleaner, thinner (h-14), frosted glass bg, no duplicate Unatienda link. Login is pill button. User avatar shows initial. Breadcrumb-only navigation.
- **BottomNav**: Fixed duplicate Cart/Store bug. Now: Home, Explore, Store (with badge), Club, Me. Pill-shaped active indicator. No redundant icons.
- Key files: `Header.jsx`, `BottomNav.jsx`

### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE
### Previously Completed: Monday.com Sync, i18n, Admin Tables

## Architecture
- Backend: FastAPI, MongoDB, 27+ modules
- Frontend: React, Shadcn/UI, Tailwind, react-i18next
- LLM: GPT-4o + Claude Sonnet 4.5 via emergentintegrations

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - Admin image customization for landing sections
### P3 - OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
