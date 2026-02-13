# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, Telegram community features, activity ticker system, and admin-configurable layout/icon customization.

## What's Been Implemented

### Layout Preview & Icon Customization (Feb 13, 2026) - COMPLETE
- **New admin panel tab** "Layouts & Icons" with 4 layout preview cards (Living Grid, Cinematic, Horizon, Mosaic Community)
- SVG thumbnails, "Active" badge, one-click layout activation
- **Icon Picker**: searchable grid of 50+ Lucide icons + custom image URL support
- Per-layout icon configuration: edit labels, routes, colors, icon type (Lucide or image)
- Backend API: `GET /api/ticker/layout-icons` (public), `GET/PUT /api/admin/ticker/layout-icons/{layout_id}`
- `useLayoutIcons()` hook fetches dynamic icons from backend
- MosaicCommunityLanding dynamically renders icons from config with fallback defaults
- **Tested: 100% pass rate (backend 14/14, frontend all verified)**

### Mosaic Community Landing Page (Feb 13, 2026) - COMPLETE
- 4th landing page layout with cultural mosaic grid — no hero section
- 4 AI-generated mosaic images (ping-pong/chess, kids, culture, gathering)
- 6 cultural navigation icons, all admin-customizable
- Registered as `mosaic_community` in layout system
- **Tested: 100% pass rate**

### Landing Page Image Customization (Feb 13, 2026) - COMPLETE
### Activity Ticker + Sponsor Banner System (Feb 13, 2026) - COMPLETE
### Header & Bottom Nav Redesign (Feb 13, 2026) - COMPLETE
### Landing Page Design Templates (4 selectable) - COMPLETE
### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE

## Key Files
- `/app/frontend/src/modules/admin/LayoutPreviewModule.jsx` (layout preview + icon config)
- `/app/frontend/src/hooks/useLayoutIcons.js` (dynamic icon hook)
- `/app/frontend/src/pages/landing-layouts/MosaicCommunityLanding.jsx` (4th layout with dynamic icons)
- `/app/frontend/src/hooks/useLandingImages.js` (dynamic images hook)
- `/app/backend/modules/ticker/routes.py` (ticker + landing images + layout icons APIs)
- `/app/frontend/src/modules/admin/UIStyleModule.jsx` (UI style with mosaic SVG preview)

## Key API Endpoints
- `GET /api/ticker/feed` — Activity ticker feed
- `GET /api/ticker/landing-images` — Landing page images
- `GET /api/ticker/layout-icons` — Layout icon configs (public)
- `GET /api/admin/ticker/layout-icons` — Layout icons (admin)
- `PUT /api/admin/ticker/layout-icons/{layout_id}` — Update icons per layout
- `PUT /api/admin/ticker/landing-images` — Update landing images

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
- Layout system: Admin-selectable layouts in `app_config.ui_style`
- Image system: Dynamic images in `app_config.landing_images`
- Icon system: Per-layout icon config in `app_config.layout_icons`
