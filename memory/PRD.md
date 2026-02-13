# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, Telegram community features, and activity ticker system.

## What's Been Implemented

### Landing Page Image Customization (Feb 13, 2026) - COMPLETE
- **Generated AI image**: Chinese kids in sport jerseys playing professional indoor table tennis (Butterfly table, LED-lit gym)
- Updated across ALL 3 layouts (Cinematic, LivingGrid, Horizon)
- **Admin configurable**: Landing images (hero, pinpanclub, lanterns, community) customizable from Admin > Activity Ticker > Landing Page Images
- Backend API: `GET /api/ticker/landing-images` (public), `GET/PUT /api/admin/ticker/landing-images`
- Hook: `useLandingImages()` fetches from backend, falls back to defaults

### Activity Ticker + Sponsor Banner System (Feb 13, 2026) - COMPLETE
- Ticker Bar with source label badges, auto-rotation, sponsor interleaving, full admin config

### Header & Bottom Nav Redesign (Feb 13, 2026) - COMPLETE
### Landing Page Design Templates (3 selectable) - COMPLETE
### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE

## Key Files
- `/app/frontend/src/hooks/useLandingImages.js` (shared hook for dynamic images)
- `/app/backend/modules/ticker/routes.py` (ticker + landing images API)
- `/app/frontend/src/modules/admin/TickerAdminModule.jsx` (admin config with images section)

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
