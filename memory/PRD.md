# ChiPi Link - Product Requirements Document

## Original Problem Statement
A full-stack textbook ordering application built with a FastAPI backend and a React frontend for a Chinese-Panamanian community (ChiPi Link). The application serves as a super app with textbook ordering, community features (news, events, gallery), PinPanClub (table tennis club), and Unatienda (store).

## Core Architecture
- **Backend**: FastAPI, MongoDB (via Motor), Pydantic
- **Frontend**: React, TailwindCSS, shadcn/ui, Context API
- **Auth**: JWT + LaoPan SSO
- **External Integrations**: Monday.com (order sync), Google Sheets

## What's Been Implemented

### UI/UX Features
- **5 Structural Page Layouts** (Feb 9, 2026): Classic, Bento Grid, Tab Hub, Social Feed, Magazine — selectable from admin UI Style panel
- **UI Theme System**: Separate public/admin themes with 6 color palettes, font choices, density options
- **CSS Overlay Layouts**: Storefront, Portal, Single Page, Chat/App, Card Grid, China-Panama
- **Widget Module**: Embeddable widget for external sites with configurable Site URL + Reset to Defaults
- **Manual Translation**: Icon-driven translation in Forms Manager

### Widget Display Configuration (Feb 9, 2026)
- **Display tab** in admin Widget Manager with toggles:
  - Hide URL / Address Bar
  - Hide Navbar & Footer (BottomNav hidden on /embed routes)
  - Streamlined Textbook Flow (Login → Link Student → Textbooks → Wallet)
- **Wallet feature** added to widget (balance + recent transactions)
- **Link Student** workflow for users with no linked students
- **Textbook Orders** view showing ordered/available books
- All options saved to DB and served via /api/widget/embed-config

### Textbook Order System
- **Test Data**: 10 orders across grades 3-6
- **Monday.com Orders Board Sync**: Creates items with mapped columns, subitems per book, order summary Updates
- **Monday.com Textbooks Board Sync** (verified Feb 9, 2026):
  - Finds textbook by code → adds student as subitem
  - Code not found → creates textbook item with code+name → adds student subitem
  - Multiple students per book supported (4/4 tests passed)
- **Monday.com Config UI**: Full configuration panel at Integrations → Monday.com → Book Orders

### Header/Navigation
- Back button (left chevron) in breadcrumb for navigation
- Breadcrumb dropdown with direct links

## Monday.com Integration Details
- **Orders Board**: TB2026-Orders (ID: 18397140868)
- **Textbooks Board**: TB2026-Textbooks (ID: 18397140920)
  - Subitems: Students who ordered (with order reference)

## Known Issues
- P2: `sync-all` admin endpoint references non-existent `push_order` method
- P3: Hardcoded Spanish text in landing hero (should use i18n)
- P3: React key prop warning in Unatienda
- P3: Board selector dropdown needs search/filter (100+ boards)
- P4: Google Sign-Up OAuth flow broken (long-standing)

## Upcoming Tasks
- P1: Fix `sync-all` endpoint broken method reference
- P1: Monday.com webhooks for status sync back to app
- P1: i18n fixes across the app
- P2: Board selector UX improvement (search/filter)

## External Services
- Monday.com API (Board sync)
- LaoPan.online (SSO)
- ipapi.co (IP geolocation)

## Test Scripts
- `/app/backend/tests/test_textbook_board_sync.py`: Live integration test for Textbooks board sync (4/4 passed)
- `/app/backend/tests/test_widget_display_config.py`: Widget display config tests (16/16 passed)
