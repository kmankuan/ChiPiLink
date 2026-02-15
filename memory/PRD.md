# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Custom Icon Statuses & Animations (Feb 15, 2026) - COMPLETE
- Replaced fixed 4-status dropdown with fully customizable status system
- Admin can create/edit/delete custom statuses with: ID, display name, color, animation type
- 11 animation types: none, building_bars, pulse, bounce, spinner, blocks, hammer, wrench, rocket, wave, custom_gif
- Custom GIF/image URL support for status animations (paste any GIF URL)
- Status label override per icon (e.g. "En progreso", "Phase 2", etc.)
- StatusAnimation preview in admin status manager rows
- CulturalNav updated to render all animation types inside icon box
- Backend CRUD API: GET/PUT /api/ticker/icon-statuses + admin variants
- Files: `LayoutPreviewModule.jsx`, `MosaicCommunityLanding.jsx`, `backend/modules/ticker/routes.py`

### Horizontal Telegram Feed Redesign (Feb 15, 2026) - COMPLETE
- Redesigned Telegram feed from vertical list to horizontal scrollable carousel
- Cards display media thumbnail, truncated description, time ago, likes/comments
- Clicking a card opens a detail modal with full text and media gallery navigation
- "Load older" button at end of scroll to fetch more posts
- **Autoplay**: Cards auto-scroll like stories with configurable interval (default 4s), pauses on hover, loops back to start
- Configurable from admin panel: layout_mode (horizontal/vertical), card_width, card_height, description_max_lines, autoplay, autoplay_interval
- Backend ContainerCreate/ContainerUpdate models extended with new fields
- i18n translations added for en/es/zh (telegramFeed.seeAll, loadOlder, noPosts, seeMore, close, autoplayOn, autoplayOff)
- Files: `frontend/src/components/TelegramFeedCard.jsx`, `frontend/src/modules/admin/TelegramAdminModule.jsx`, `backend/modules/community/routes/telegram_feed.py`, i18n locales

### Module Icon Status Indicators (Feb 15, 2026) - COMPLETE
- Admin-configurable status for each landing page icon (Ready, Building, Coming Soon, Maintenance)
- Animated "building" indicator (pulsing amber bars) below icon labels

### Privacy Settings Module (Feb 15, 2026) - COMPLETE
- Admin-configurable search engine indexing control
- Dynamic robots.txt generation at `/robots.txt`

### Monday.com Public Board Widget (Feb 15, 2026) - COMPLETE
- Admin-configurable landing page widget showing Monday.com board content

### Media Gallery Player (Feb 15, 2026) - COMPLETE
- Edge-to-edge fullscreen gallery with auto-advance

### PinPanClub Super Pin Ranking Layout Fix (Feb 15, 2026) - COMPLETE
- Fixed mobile layout overflow in "Super Pin Ranking" banner section

### Banner & Telegram Feed UI Fixes (Feb 15, 2026) - COMPLETE
- Banner: No rounded corners, no gap between ticker and banner
- Telegram feed: Edge-to-edge on mobile, consistent 72px thumbnails

### Per-Column Sync Bug Fix (Feb 15, 2026) - COMPLETE
- Fixed "Server error (400)" — route handler uses JSONResponse + try/except

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
- Multiple landing page layouts (living_grid, mosaic, cinematic, etc.)
- Admin dashboard with modular tabs

### Key DB Collections
- `telegram_feed_containers`: Feed container configs with layout_mode, card_width, card_height, description_max_lines
- `community_posts`: Telegram channel posts
- `app_settings`: Site-wide settings (privacy, etc.)
