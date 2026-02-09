# ChiPi Link - Product Requirements Document

## Original Problem Statement
Full-stack textbook ordering app for Chinese-Panamanian community. Super app with textbook ordering, community features, PinPanClub, Unatienda store.

## Core Architecture
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Frontend**: React, TailwindCSS, shadcn/ui
- **Auth**: JWT + LaoPan SSO (OAuth 2.0 popup)
- **Integrations**: Monday.com (order sync)

## Implemented Features

### PCA Private Catalog (Feb 9, 2026)
- **Multi-select**: Row checkboxes + select-all + bulk action bar (Set Active/Inactive, Delete Selected)
- **Sort**: Click column headers for asc/desc sort on all 8 columns
- **Filter**: Search + Grade + Subject + Status dropdowns + Clear All button
- Shared CatalogTable component (deduped from normal + fullscreen views)

### Widget System
- Display Config: Hide URL, hide nav/footer, streamlined textbook flow
- Streamlined Flow: LaoPan Login → Link Student → Textbooks → Wallet
- Floating Button: 7 positions, custom offsets, 6 icons, 4 styles
- In-Widget OAuth: Popup-based with postMessage relay
- **Live Preview**: Visual mini-screen in admin Placement tab
- **State Persistence**: sessionStorage saves tab, form, selected student

### Landing Page
- 5 Structural Layouts (admin selectable)
- UI Theme System, CSS Overlay Layouts

### Textbook Order System
- Monday.com Orders + Textbooks Board Sync (config-driven)
- Admin config UI for field mapping

## Known Issues
- P2: `sync-all` admin endpoint broken method reference
- P3: Hardcoded Spanish in landing hero
- P3: Board selector needs search/filter

## Upcoming Tasks
- P1: Fix `sync-all` endpoint
- P1: Monday.com webhooks for status sync
- P2: i18n fixes, Board selector UX

## Test Reports
- iter 65: Widget display config (16/16)
- iter 66: Placement + OAuth (38/38)
- iter 67: Live preview + state persistence (14/14)
- iter 68: PCA multi-select, sort, filter (13/13)
