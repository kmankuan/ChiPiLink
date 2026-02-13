# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved from backend integrations to a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, and rich media support.

## What's Been Implemented

### Banner Carousel & Media Player (Feb 13, 2026) - COMPLETE
- **Banner Carousel** replaces top brand header — supports image banners (overlay text + click links) and Facebook-style text banners (colored backgrounds, gradients, rich text, responsive)
- **Media Player** — hero-sized 16:9 auto-playing slideshow below icon nav. Supports images (smooth transitions) and videos (autoplay muted). Google Photos album URL fetcher + manual URL entry.
- **Admin Panel** — new "Banners & Media" tab with:
  - Banner CRUD: add/edit/delete, toggle active, image/text type selector
  - Color presets for text banners (8 gradient presets + custom picker)
  - Media Player: Google Photos album URL fetch, manual item add, player settings (interval, autoplay, controls)
  - Media items grid view with delete
- **Backend**: Full CRUD at `/api/showcase/banners` and `/api/showcase/media-player`
- **Tested: 100% (21 backend, 14 frontend)**

### Custom Cultural Icon Images (Feb 13, 2026) - COMPLETE
- 6 AI-generated mosaic-style icons: PinPan, Tienda, Ranking, Aprender, Cultura, Fe
- Stored in layout_icons config, admin-customizable via Layouts & Icons tab

### Layout Preview & Icon Customization (Feb 13, 2026) - COMPLETE
- Admin tab with 4 layout preview cards, one-click activate, icon picker (50+ Lucide + custom image URLs)

### Mosaic Community Landing Page (Feb 13, 2026) - COMPLETE
- 4th landing page layout with cultural mosaic grid

### Previous Features - ALL COMPLETE
- Activity Ticker, Header/Nav redesign, Landing Pages (4 selectable), Gmail Pipeline, Telegram Feed, Dev Control

## Key API Endpoints
- `GET /api/showcase/banners` — Active banners for carousel
- `POST/PUT/DELETE /api/admin/showcase/banners` — Banner CRUD
- `GET /api/showcase/media-player` — Media player config + items
- `PUT /api/admin/showcase/media-player` — Update player settings
- `POST /api/admin/showcase/media-player/add-item` — Add media item
- `DELETE /api/admin/showcase/media-player/items/{id}` — Remove item
- `POST /api/admin/showcase/media-player/fetch-album` — Fetch from Google Photos URL

## Key Files
- `/app/backend/modules/showcase/__init__.py` — Banner + Media Player APIs
- `/app/frontend/src/components/BannerCarousel.jsx` — Banner carousel component
- `/app/frontend/src/components/MediaPlayer.jsx` — Media player component
- `/app/frontend/src/modules/admin/ShowcaseAdminModule.jsx` — Admin panel

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - On-Demand Landing Page Redesign via Admin
### P2 - Other integrations: OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
