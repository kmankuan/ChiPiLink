# ChiPi Link - PRD

## Original Problem Statement
Build a comprehensive admin dashboard for "Chipi Wallet" with Gmail-to-Wallet payment pipeline, AI-powered parsing, admin approval workflow, deduplication, and Monday.com sync. Extended to include landing page design exploration, Dev Control observability, Telegram community features, activity ticker system, and admin-configurable layout/icon customization.

## What's Been Implemented

### Custom Cultural Icon Images (Feb 13, 2026) - COMPLETE
- 6 AI-generated mosaic-style cultural icons applied to Mosaic Community layout:
  - PinPan (red ping-pong paddle), Tienda (Chinese-Panamanian market), Ranking (dragon trophy)
  - Aprender (book with calligraphy/mola), Cultura (dragon-mola medallion), Fe (golden cross)
- Icons stored as custom image URLs in `layout_icons` DB config
- All icons render as `<img>` tags on both desktop and mobile
- Fully customizable via admin panel "Layouts & Icons" tab
- **Tested: 100% pass rate (backend 9/9, frontend 16/16)**

### Layout Preview & Icon Customization (Feb 13, 2026) - COMPLETE
- Admin tab "Layouts & Icons" with 4 layout preview cards, activate buttons, icon editor
- Icon Picker: 50+ Lucide icons searchable grid + custom image URL support
- Backend APIs: `GET /api/ticker/layout-icons`, `PUT /api/admin/ticker/layout-icons/{layout_id}`
- `useLayoutIcons()` hook for dynamic icon rendering
- **Tested: 100% (14/14 backend, all frontend)**

### Mosaic Community Landing Page (Feb 13, 2026) - COMPLETE
### Landing Page Image Customization - COMPLETE
### Activity Ticker + Sponsor Banner System - COMPLETE
### Header & Bottom Nav Redesign - COMPLETE
### Landing Page Design Templates (4 selectable) - COMPLETE
### Gmail-to-Wallet Payment Pipeline - COMPLETE
### Telegram Feed Visibility Controls - COMPLETE
### Dev Control Section - COMPLETE

## Key API Endpoints
- `GET /api/ticker/layout-icons` — Layout icon configs (public)
- `PUT /api/admin/ticker/layout-icons/{layout_id}` — Update icons per layout
- `GET /api/ticker/landing-images` — Landing page images
- `GET /api/ticker/feed` — Activity ticker feed

## Prioritized Backlog
### P1 - User Chooses Final Landing Page Design
### P2 - On-Demand Landing Page Redesign via Admin
### P2 - Other integrations: OneSignal Push, Stripe, Google Sheets, ChipiPoints, Teams/Clans
