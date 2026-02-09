# ChiPi Link - Product Requirements Document

## Original Problem Statement
A full-stack textbook ordering application built with a FastAPI backend and a React frontend for a Chinese-Panamanian community (ChiPi Link). The application serves as a super app with textbook ordering, community features (news, events, gallery), PinPanClub (table tennis club), and Unatienda (store).

## Core Architecture
- **Backend**: FastAPI, MongoDB (via Motor), Pydantic
- **Frontend**: React, TailwindCSS, shadcn/ui, Context API
- **Auth**: JWT + LaoPan SSO (OAuth 2.0)
- **External Integrations**: Monday.com (order sync), Google Sheets

## What's Been Implemented

### Widget System (Feb 9, 2026)
- **Display Configuration**: Admin toggles for hide URL bar, hide navbar/footer, streamlined textbook flow
- **Streamlined Flow**: LaoPan Login → Link Student → Textbook Orders → Wallet
- **Wallet Feature**: Balance display + recent transactions in widget
- **Floating Button Customization**:
  - 7 positions: bottom-right/left/center, top-right/left, middle-right/left
  - Custom X/Y offsets to avoid conflicts with other widgets
  - 6 icons: Book, Chat, Store, Graduation, Circle, Plus
  - 4 styles: Pill (icon+text), Square, Icon-only, Circle
- **In-Widget OAuth**: Login opens popup for LaoPan OAuth, token relayed back via postMessage
  - LaoPanCallback detects popup mode via `window.opener`
  - loader.js relays auth messages from popup → parent page → widget iframe

### UI/UX Features
- 5 Structural Page Layouts: Classic, Bento Grid, Tab Hub, Social Feed, Magazine
- UI Theme System: 6 color palettes, font choices, density options
- CSS Overlay Layouts: Storefront, Portal, Single Page, Chat/App, Card Grid, China-Panama
- Widget embed code generation with configurable Site URL + Reset to Defaults

### Textbook Order System
- Monday.com Orders Board Sync: Creates items with mapped columns, subitems per book
- Monday.com Textbooks Board Sync (verified): Find by code → add student subitem; create if not found
- Full admin config UI for Monday.com field mapping

### Header/Navigation
- Back button (left chevron) in breadcrumb
- Breadcrumb dropdown with direct links

## Monday.com Integration
- **Orders Board**: TB2026-Orders (ID: 18397140868)
- **Textbooks Board**: TB2026-Textbooks (ID: 18397140920)

## Known Issues
- P2: `sync-all` admin endpoint references non-existent `push_order` method
- P3: Hardcoded Spanish text in landing hero (should use i18n)
- P3: React key prop warning in Unatienda
- P3: Board selector needs search/filter (100+ boards)
- P4: Google Sign-Up OAuth flow broken

## Upcoming Tasks
- P1: Fix `sync-all` endpoint broken method reference
- P1: Monday.com webhooks for status sync
- P1: i18n fixes across the app
- P2: Board selector UX improvement
- P2: Live preview of floating button in admin Placement tab

## Key Files
- `/app/backend/modules/widget/routes.py` — Loader.js template, embed config endpoints
- `/app/backend/modules/widget/service.py` — Widget config with display/placement defaults
- `/app/frontend/src/pages/EmbedWidget.jsx` — Streamlined widget with popup OAuth
- `/app/frontend/src/pages/LaoPanCallback.jsx` — Popup-aware OAuth callback
- `/app/frontend/src/modules/admin/WidgetManagerModule.jsx` — Full widget admin panel
- `/app/backend/modules/store/integrations/monday_txb_inventory_adapter.py` — Textbooks board sync

## Test Reports
- `/app/test_reports/iteration_65.json` — Display config tests (16/16 passed)
- `/app/test_reports/iteration_66.json` — Placement + OAuth popup tests (38/38 passed)
- `/app/backend/tests/test_textbook_board_sync.py` — Textbooks board sync (4/4 passed)
