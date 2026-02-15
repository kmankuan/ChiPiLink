# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" — evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, Monday.com workflow integration, and inventory management.

## What's Been Implemented

### Privacy Settings Module (Feb 15, 2026) - COMPLETE
- Admin-configurable search engine indexing control
- Dynamic robots.txt generation at `/robots.txt`
- Block/allow toggle for search engines (default: blocked for private community)
- Custom path rules (allow/disallow specific paths)
- Custom robots.txt override option
- Real-time preview of robots.txt content
- Backend endpoints: `GET/PUT /api/admin/privacy`, `POST /api/admin/privacy/reset`
- Public endpoints: `GET /robots.txt`, `GET /privacy/meta-robots`
- Files: `backend/modules/admin/privacy_routes.py`, `frontend/src/modules/admin/PrivacyModule.jsx`

### Monday.com Public Board Widget (Feb 15, 2026) - COMPLETE
- Admin-configurable landing page widget showing Monday.com board content
- Backend: Cached data with configurable refresh interval, public (no auth) endpoint
- Admin panel: Board selection, column picker (chips UI), group filter, display style (cards/table/list), max items, refresh interval
- Frontend: `MondayBoardWidget` component with 3 display modes, auto-cache refresh
- Endpoints: `GET/PUT /api/monday/public-board-widget/config`, `POST /refresh`, `GET /api/monday/public-board-widget` (public)
- Files: `backend/modules/integrations/monday/public_board_widget.py`, `frontend/src/components/MondayBoardWidget.jsx`, `frontend/src/modules/monday/components/PublicBoardWidgetTab.jsx`

### Media Gallery Player (Feb 15, 2026) - COMPLETE
- Edge-to-edge fullscreen gallery replacing old rounded video modal
- Left/right arrows for navigation, dot indicators, counter
- Photos auto-advance (4s), pause on touch, resume on touch again
- Videos auto-advance on finish, gallery auto-closes after last file

### PinPanClub Super Pin Ranking Layout Fix (Feb 15, 2026) - COMPLETE
- Fixed mobile layout overflow in "Super Pin Ranking" banner section
- Made title/description responsive with `text-lg sm:text-2xl`
- Buttons now stack properly on mobile with shortened labels ("Ranking", "Admin")
- Uses `flex-col sm:flex-row` for proper responsive stacking

### Banner & Telegram Feed UI Fixes (Feb 15, 2026) - COMPLETE
- Banner: No rounded corners, no gap between ticker and banner
- Telegram feed: Edge-to-edge on mobile, consistent 72px thumbnails
- Thumbnails + description inline layout (flex, text beside thumbnails)

### Per-Column Sync Bug Fix (Feb 15, 2026) - COMPLETE
- Fixed "Server error (400)" — route handler uses JSONResponse + try/except
- Better error logging with stack traces in background tasks

### Earlier Features - ALL COMPLETE
- Column Matcher UI, Telegram Feed Album Carousel
- Order Summary Preview Modal, Textbook Multi-Select Bug Fix
- Touch-Swipe Gestures, Admin Panel Refactor, Monday.com Dual Board Integration
- Banner Carousel & Media Player, Wallet Payment Workflow

## Key API Endpoints

### Monday.com Public Board Widget
- `GET /api/monday/public-board-widget` — Public cached board data (no auth)
- `GET /api/monday/public-board-widget/config` — Admin config
- `PUT /api/monday/public-board-widget/config` — Save config
- `POST /api/monday/public-board-widget/refresh` — Force cache refresh

### TXB Inventory Per-Column Sync
- `POST /api/store/monday/txb-inventory/sync-column/{column_key}` — Sync single column
- `GET /api/store/monday/txb-inventory/sync-column-status/{column_key}` — Poll status

### Other Core Endpoints
- `GET /api/monday/sync-dashboard` — Unified sync health
- `GET /api/store/monday/txb-inventory-config` — TXB config
- `PUT /api/store/monday/txb-inventory-config` — Save TXB config

## Database Collections
- `monday_public_board_widget` — Widget config
- `monday_public_board_cache` — Cached board items
- `monday_integration_config` — Monday.com integration configs
- `monday_column_sync_status` — Per-column sync tracking
- `store_products` — Products
- `telegram_feed_containers` — Feed container configs

## 3rd Party Integrations
- Monday.com API v2 (GraphQL)
- Telegram Bot API
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 — Emergent LLM Key
- Gmail (IMAP)

## Backlog
### P1 - Stop Sync Button (Upcoming)
- Cancel in-progress Full Sync to Monday.com

### P2 - On-Demand Landing Page Designer (Planned)
- Layout switcher, section manager, live preview
- Theme/color customizer, AI-generated suggestions

### P3 - General Inventory Monday.com Sync (Future)
- New board for public catalog products
