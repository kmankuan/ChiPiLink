# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### New Animation Types & Lottie Support (Feb 15, 2026) - COMPLETE
- Added 3 new animation types: `coding_scene` (person at laptop), `building_progress` (building 0-100%), `lottie_url` (Lottie JSON from URL)
- `coding_scene`: CSS-animated scene showing person sitting at laptop with typing code lines and screen glow
- `building_progress`: CSS-animated building filling from bottom to top with floors, windows, crane, and % indicator
- `lottie_url`: Loads and renders Lottie JSON from any URL using `lottie-react` library
- Added `lottie-react` v2.4.1 dependency
- Added info banner in Custom Statuses section explaining how to apply statuses to frontend icons
- Updated both admin preview (LayoutPreviewModule.jsx) and landing page (MosaicCommunityLanding.jsx)
- Backend DEFAULT_ICON_STATUSES updated with 12 default statuses (added coding_scene, building_progress)
- ANIMATION_OPTIONS dropdown now has 24 animation types total

### Custom Icon Statuses & Animations (Feb 15, 2026) - COMPLETE
- Replaced fixed 4-status dropdown with fully customizable status system
- Admin can create/edit/delete custom statuses with: ID, display name, color, animation type
- **24 animation types total**: none, building_bars, pulse, bounce, spinner, blocks, hammer, wrench, rocket, wave, lantern (Chinese), dragon (Chinese), crane (construction), bamboo (growth), fireworks (celebration), coding (tech), data_sync (tech), progress_bar (progress), temple/pagoda (Chinese), sparkle (celebration), coding_scene (scene), building_progress (scene), lottie_url, custom_gif
- Chinese cultural style: lantern glow/sway, dragon floating, bamboo growing, temple pagoda stacking
- Custom GIF/image URL support for status animations (paste any GIF URL)
- Lottie animation URL support (paste any Lottie JSON URL)
- Status label override per icon
- StatusAnimation preview in admin status manager rows
- CulturalNav updated to render all animation types inside icon box
- Backend CRUD API: GET/PUT /api/ticker/icon-statuses + admin variants, 12 default statuses
- Files: `LayoutPreviewModule.jsx`, `MosaicCommunityLanding.jsx`, `backend/modules/ticker/routes.py`

### How Statuses Connect to Icons (User Guide)
1. Go to Admin > Content > Diseños e Iconos
2. Custom Statuses section: Define your statuses (name, color, animation)
3. Click "Icons" on a layout card (e.g. Mosaic Community)
4. Each icon has a "Status" dropdown that lists all custom statuses
5. Select desired status per icon, click "Save Icons"
6. Landing page will show the animation on the icon

### Horizontal Telegram Feed Redesign (Feb 15, 2026) - COMPLETE
- Redesigned Telegram feed from vertical list to horizontal scrollable carousel
- Cards display media thumbnail, truncated description, time ago, likes/comments
- Clicking a card opens a detail modal with full text and media gallery navigation
- "Load older" button at end of scroll to fetch more posts
- **Autoplay**: Cards auto-scroll like stories with configurable interval (default 4s), pauses on hover, loops back to start
- Configurable from admin panel: layout_mode (horizontal/vertical), card_width, card_height, description_max_lines, autoplay, autoplay_interval
- Backend ContainerCreate/ContainerUpdate models extended with new fields
- i18n translations added for en/es/zh

### Module Icon Status Indicators (Feb 15, 2026) - COMPLETE
### Privacy Settings Module (Feb 15, 2026) - COMPLETE
### Monday.com Public Board Widget (Feb 15, 2026) - COMPLETE
### Media Gallery Player (Feb 15, 2026) - COMPLETE
### PinPanClub Super Pin Ranking Layout Fix (Feb 15, 2026) - COMPLETE
### Banner & Telegram Feed UI Fixes (Feb 15, 2026) - COMPLETE
### Per-Column Sync Bug Fix (Feb 15, 2026) - COMPLETE

## Prioritized Backlog

### P1: Implement "Stop" Button for Full Sync
- Refactor full_sync into cancellable background task
- Add stop button in UI

### P2: On-Demand Landing Page Redesign Tool
- Build admin panel tool for layout/component customization

### P3: General Inventory Monday.com Sync
- Extend Monday.com sync to general (non-textbook) inventory

## Architecture

### Backend
- FastAPI with MongoDB (Motor async driver)
- Modular route structure under `/app/backend/modules/`
- Telegram Bot API integration for channel sync

### Frontend
- React with react-i18next for i18n (en, es, zh)
- Shadcn/UI components
- lottie-react for Lottie animations
- Multiple landing page layouts (living_grid, mosaic, cinematic, etc.)
- Admin dashboard with modular tabs

### Key DB Collections
- `app_config` with keys: `ticker_config`, `landing_images`, `layout_icons`, `icon_statuses`
- `users`, `community_posts`, `store_textbook_orders`, `pinpanclub_matches`

### Key Files
- `frontend/src/modules/admin/LayoutPreviewModule.jsx` - Admin status/icon management
- `frontend/src/pages/landing-layouts/MosaicCommunityLanding.jsx` - Landing page with animations
- `backend/modules/ticker/routes.py` - Ticker, icon, status API endpoints
- `frontend/src/hooks/useLayoutIcons.js` - Hook for fetching layout icons
