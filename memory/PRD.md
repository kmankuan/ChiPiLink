# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, and Monday.com workflow integration.

## What's Been Implemented

### Automated Monday.com Banner Sync (Feb 13, 2026) - COMPLETE
- **Background scheduler** using APScheduler: auto-syncs banners from Monday.com at configurable intervals
- **Default 10-minute interval**, admin-configurable (1 min to 24 hours)
- Admin UI: enable/disable toggle, interval dropdown selector, real-time status display (Running/Paused, next sync, last sync)
- **Sync History Log**: timeline of past syncs showing status (success/error), trigger (auto/manual), items synced count, timestamps. Capped at 50 entries.
- Scheduler starts on app startup, pauses when not configured, resumes when both Monday integration and auto-sync enabled
- **Tested: 100% (13 auto-sync + 14 history = 27 backend tests passed)**

### Scheduled Banners & Monday.com Sync (Feb 13, 2026) - COMPLETE
- **Scheduled banners**: start_date/end_date fields — banners auto-show/hide based on dates
- **Monday.com → App sync**: Canva design URL → Monday.com board → auto-sync to app banner carousel
- **Admin panel**: 3-tab layout (Banners, Monday.com, Media Player)
- Monday.com tab: enable toggle, board selector (lists all boards), 8 column mappings (canva_url, text, bg_color, link_url, start_date, end_date, status, banner_type)
- Workflow guide: Canva → Monday.com → App
- Sync now button + last sync timestamp
- Banners from Monday.com show "Synced from Monday.com" badge
- **Tested: 100% (12 backend, 10 frontend code review + landing page verified)**

### Banner Carousel & Media Player (Feb 13, 2026) - COMPLETE
- Banner carousel (image + text/Facebook-style with colors/gradients)
- Media player: hero-sized 16:9 auto-slideshow, Google Photos URL fetch + manual add
- Full admin CRUD

### Custom Cultural Icons (Feb 13, 2026) - COMPLETE
### Layout Preview & Icon Customization (Feb 13, 2026) - COMPLETE
### Mosaic Community Landing Page (Feb 13, 2026) - COMPLETE
### All Previous Features - COMPLETE

## Key API Endpoints
### Showcase
- `GET /api/showcase/banners` — Schedule-filtered active banners
- `POST/PUT/DELETE /api/admin/showcase/banners` — Banner CRUD
- `GET /api/showcase/media-player` — Media player config
- `POST /api/admin/showcase/media-player/add-item` — Add media item
- `POST /api/admin/showcase/media-player/fetch-album` — Google Photos fetch
### Monday.com Banner Sync
- `GET /api/admin/showcase/monday-banners/config` — Sync config
- `PUT /api/admin/showcase/monday-banners/config` — Save config
- `GET /api/admin/showcase/monday-banners/boards` — List boards + columns
- `POST /api/admin/showcase/monday-banners/sync` — Trigger manual sync
### Auto-Sync
- `GET /api/admin/showcase/monday-banners/auto-sync` — Auto-sync config + scheduler status
- `PUT /api/admin/showcase/monday-banners/auto-sync` — Enable/disable auto-sync, set interval
- `GET /api/admin/showcase/monday-banners/sync-history` — Recent sync history log (last 20)

## Key Files
- `/app/backend/modules/showcase/__init__.py` — All showcase API routes (banners, media, monday, auto-sync)
- `/app/backend/modules/showcase/monday_banner_adapter.py` — Monday.com sync adapter
- `/app/backend/modules/showcase/scheduler.py` — APScheduler-based auto-sync scheduler
- `/app/frontend/src/components/BannerCarousel.jsx` — Banner carousel
- `/app/frontend/src/components/MediaPlayer.jsx` — Media player
- `/app/frontend/src/modules/admin/ShowcaseAdminModule.jsx` — Admin panel (3 tabs + auto-sync controls)

## Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - On-Demand Landing Page Redesign via Admin
### P2 - OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
