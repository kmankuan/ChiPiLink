# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, Telegram community features, and activity ticker system.

## What's Been Implemented

### Mosaic Community Landing Page (Feb 13, 2026) - COMPLETE
- **4th landing page layout** blending ping-pong, chess, kids, Chinese/Panamanian/Christian culture
- NO hero section — uses mosaic grid approach with cultural icon navigation
- 4 AI-generated mosaic images (pingpong-chess, kids-learning, culture, community-gathering)
- 6 cultural navigation icons: PinPan, Tienda, Ranking, Aprender, Cultura, Fe
- 4 mosaic image tiles + 4 info cards in a responsive grid
- CTA banner "Join the Mosaic" + activity ribbon for latest posts
- All images admin-customizable via `/api/ticker/landing-images` (keys: `mosaic_*`)
- Registered as `mosaic_community` in layout selection system
- **Tested: 100% pass rate (backend 10/10, frontend all elements verified)**

### Landing Page Image Customization (Feb 13, 2026) - COMPLETE
- Admin configurable: Landing images customizable from Admin > Activity Ticker > Landing Page Images
- Backend API: `GET /api/ticker/landing-images` (public), `GET/PUT /api/admin/ticker/landing-images`
- Hook: `useLandingImages()` fetches from backend, falls back to defaults

### Activity Ticker + Sponsor Banner System (Feb 13, 2026) - COMPLETE
- Ticker Bar with source label badges, auto-rotation, sponsor interleaving, full admin config

### Header & Bottom Nav Redesign (Feb 13, 2026) - COMPLETE
### Landing Page Design Templates (4 selectable) - COMPLETE
- Living Grid, Cinematic, Horizon, Mosaic Community
### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE

## Key Files
- `/app/frontend/src/pages/landing-layouts/MosaicCommunityLanding.jsx` (4th layout)
- `/app/frontend/src/hooks/useLandingImages.js` (shared hook for dynamic images)
- `/app/backend/modules/ticker/routes.py` (ticker + landing images API)
- `/app/frontend/src/modules/admin/TickerAdminModule.jsx` (admin config)
- `/app/frontend/src/pages/SuperAppLanding.jsx` (layout router)

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
After all 4 designs are ready, user picks the default.

### P2 - On-Demand Landing Page Redesign via Admin
Ability to request new designs directly from admin panel.

### P2 - Other integrations
OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans

## Architecture
- Frontend: React + Tailwind + Shadcn/UI
- Backend: FastAPI + MongoDB
- Layout system: Admin-selectable layouts stored in `app_config.ui_style`
- Image system: Dynamic images stored in `app_config.landing_images`, fetched via `useLandingImages()` hook
