# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" -- evolved into a full-featured community app with dynamic, admin-configurable UI elements, landing page customization, rich media, and Monday.com workflow integration.

## What's Been Implemented

### Telegram Feed Album Carousel & Multi-Container System (Feb 14, 2026) - COMPLETE
- **Album View:** Posts sharing the same `media_group_id` are automatically grouped into a single album post with merged media arrays
- **Carousel UI:** Album posts display a full-width carousel with left/right navigation arrows, touch swipe support, dot indicators, and current position badge (e.g., "1/3")
- **Multi-Container System:** Admin can create multiple independent feed containers, each with its own channel, title, colors, card style, and CTA
- **Container Customization:** Per-container settings: title, subtitle, channel_id, post_limit, bg_color, accent_color, header_bg, icon_color, card_style (compact/expanded/minimal), border_radius, CTA text/link, show_footer, show_post_count, is_active
- **Duplicate Container:** Ability to clone an existing container for quick setup of a new channel/group feed
- **Admin UI:** Full container management panel under the Telegram admin section with add/edit/delete/duplicate functionality
- **API Endpoints:**
  - `GET /api/community-v2/feed/public/containers` - public feed containers with grouped posts
  - `GET /api/community-v2/feed/admin/containers` - admin list all containers
  - `POST /api/community-v2/feed/admin/containers` - create container
  - `PUT /api/community-v2/feed/admin/containers/{id}` - update container
  - `DELETE /api/community-v2/feed/admin/containers/{id}` - delete container
  - `POST /api/community-v2/feed/admin/containers/reorder` - reorder containers
- **Tested: 100%** — Backend (13/13) + Frontend (all UI elements) verified (iteration_112)

### Telegram Feed Card Video/Media Support (Feb 14, 2026) - COMPLETE
- Rewritten TelegramFeedCard to handle photo, video, animation, and document media types
- Video posts show thumbnails with play icon overlay and duration badge
- Tap video thumbnail opens expanded modal player with controls
- **Tested: 100%**

### Telegram Admin Configuration Panel (Feb 14, 2026) - COMPLETE
- Telegram tab in admin dashboard with stats, channel settings, sync, visibility controls
- **Tested: 100%**

### Order Summary Preview Modal (Feb 14, 2026) - COMPLETE
- OrderSummaryModal.jsx confirmation dialog before textbook order submission
- Shows student name, selected books with prices, form data, total, wallet balance
- Backend config GET/PUT /api/store/order-summary-config
- **Tested: 100%** (iteration_111)

### Textbook Multi-Select Bug Fix (Feb 14, 2026) - COMPLETE
- Fixed out-of-stock items being visually selectable but not counted
- **Tested: 100%** (iteration_110)

### Previous Features - ALL COMPLETE
- Touch-Swipe Gestures for Carousels
- Slide Transition Animations
- MediaPlayer Parallax Depth Effect
- Admin Panel Navigation Refactor (single-level sidebar)
- Landing Page Fallback Content Fix
- Landing Page Showcase Module Async Refactoring
- Wallet + Monday.com Dual Board Integration
- Automated Monday.com Banner Sync
- Banner Carousel & Media Player
- Custom Cultural Icons & Layout Preview
- Mosaic Community Landing Page
- Wallet Payment Workflow

## Key API Endpoints

### Telegram Feed
- `GET /api/community-v2/feed/public/recent` -- Public posts (grouped by media_group_id)
- `GET /api/community-v2/feed/public/containers` -- Public feed containers with posts
- `GET /api/community-v2/feed/admin/containers` -- Admin: list all containers
- `POST /api/community-v2/feed/admin/containers` -- Admin: create container
- `PUT /api/community-v2/feed/admin/containers/{id}` -- Admin: update container
- `DELETE /api/community-v2/feed/admin/containers/{id}` -- Admin: delete container
- `POST /api/community-v2/feed/admin/containers/reorder` -- Admin: reorder containers
- `GET /api/community-v2/feed/media/{file_id}` -- Proxy media from Telegram CDN

### Showcase (Banner + Media Player)
- `GET /api/showcase/banners` -- Active banners (public, schedule-filtered)
- `GET /api/showcase/media-player` -- Media player config + items (public)

### Store
- `GET /api/store/order-summary-config` -- Order summary modal config
- `PUT /api/store/order-summary-config` -- Update order summary config

## Key Files
- `/app/backend/modules/community/routes/telegram_feed.py` -- Feed routes + container CRUD + media grouping
- `/app/backend/modules/community/services/telegram_service.py` -- Telegram bot service + polling
- `/app/frontend/src/components/TelegramFeedCard.jsx` -- Album carousel + multi-container feed
- `/app/frontend/src/modules/admin/TelegramAdminModule.jsx` -- Admin container management
- `/app/frontend/src/pages/landing-layouts/LivingGridLanding.jsx` -- Landing with TelegramFeedCard

## Database Collections
- `community_posts` -- Telegram posts (with media_group_id for album grouping)
- `community_config` -- Telegram channel config (type: "telegram")
- `telegram_feed_containers` -- Feed container configs (container_id, title, colors, etc.)
- `showcase_banners` -- Banner items
- `app_config` -- Media player config, Monday banner config

## 3rd Party Integrations
- Monday.com API v2 (GraphQL) -- Env: MONDAY_API_KEY
- Gmail (IMAP) -- Env: GMAIL_EMAIL, GMAIL_APP_PASSWORD
- Telegram Bot API -- Env: TELEGRAM_BOT_TOKEN
- OpenAI GPT-4o / Anthropic Claude Sonnet 4.5 -- Emergent LLM Key
- Google Photos -- Public URLs

## Backlog
### P1 - Evolve Landing Page Layout
### P2 - On-Demand Landing Page Redesign via Admin
