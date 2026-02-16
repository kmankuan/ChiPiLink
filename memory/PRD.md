# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Media Player Mute Configuration (Feb 16, 2026) - COMPLETE
- **Default with sound**: Videos now play with sound by default (unmuted). If browser blocks unmuted autoplay, automatically falls back to muted playback
- **Admin setting**: New "Video Default Muted" toggle in admin panel (Content > Banners y Medios > Media Player tab)
- **User control**: Mute/unmute button on video slides allows users to toggle audio
- Backend: Added `video_default_muted` field to `DEFAULT_PLAYER_CONFIG`
- Frontend: Updated `MediaPlayer.jsx` with try-with-sound-then-fallback-to-muted logic
- Admin UI: Added checkbox in `ShowcaseAdminModule.jsx`

### Media Player Video Autoplay & Portrait Pairing Fix (Feb 16, 2026) - COMPLETE
- **Video Autoplay Fix**: Added `autoPlay` HTML attribute, ref callback to ensure `muted` DOM attribute is set (React JSX `muted` prop only sets JS property), retry useEffect at 50ms/300ms after slide change
- **Portrait Pairing Fix**: Rewrote `buildSlides()` to collect ALL portrait images regardless of position in source array and pair them together. Old logic only paired consecutive portraits. New logic separates portraits from non-portraits, pairs all portraits, then interleaves evenly among other slides
- **Orientation Detection**: Improved `useImageOrientations` hook to track loading completion (`allLoaded`), preventing slides from being built with incomplete orientation data
- Files: `frontend/src/components/MediaPlayer.jsx`

### Media Player Controls & Video Fix (Feb 15, 2026) - COMPLETE
- Added admin-configurable settings: `show_dots`, `dot_style` (auto/dots/progress_bar/counter/none), `shuffle` (random order), `video_autoplay`, `video_max_duration_ms`
- **Dot Style 'auto'**: Shows individual dots for <=10 items, switches to compact progress bar for >10 items
- **Shuffle**: Fisher-Yates randomization on load
- **Disable Swipe / Lock Navigation**: `disable_swipe` setting removes touch handlers, hides prev/next arrows, disables dot clicks — for random-only display mode
- **Image Fit Mode**: `fit_mode` setting with 3 modes:
  - `smart` (default): Detects portrait images and pairs consecutive portraits side-by-side with blurred background fill
  - `contain`: Shows full image with blurred background behind
  - `cover`: Crops image to fill the container (classic behavior)
- Admin panel: New controls in Banners y Medios > Media Player tab (Fit Mode dropdown, Lock Navigation checkbox)
- Files: `frontend/src/components/MediaPlayer.jsx`, `frontend/src/modules/admin/ShowcaseAdminModule.jsx`, `backend/modules/showcase/__init__.py`

### New Animation Types & Lottie Support (Feb 15, 2026) - COMPLETE
- Added 3 new animation types: `coding_scene`, `building_progress`, `lottie_url`
- Added `lottie-react` v2.4.1 dependency
- Updated admin preview and landing page

### Custom Icon Statuses & Animations (Feb 15, 2026) - COMPLETE
- 24 animation types total including Chinese cultural styles
- Backend CRUD API for icon statuses

### Horizontal Telegram Feed Redesign (Feb 15, 2026) - COMPLETE
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
- `frontend/src/components/MediaPlayer.jsx` - Media player with smart layout
- `frontend/src/modules/admin/tabs/layouts/LayoutPreviewModule.jsx` - Admin status/icon management
- `frontend/src/pages/landing-layouts/MosaicCommunityLanding.jsx` - Landing page
- `backend/modules/ticker/routes.py` - Ticker, icon, status API endpoints
- `backend/modules/showcase/__init__.py` - Media player config API
