# ChiPi Link - Product Requirements Document

## Original Problem Statement
A full-stack textbook ordering application for a Chinese-Panamanian community (ChiPi Link). Super app with textbook ordering, community features, PinPanClub, and Unatienda store.

## Core Architecture
- **Backend**: FastAPI, MongoDB (via Motor), Pydantic
- **Frontend**: React, TailwindCSS, shadcn/ui, Context API
- **Auth**: JWT + LaoPan SSO (OAuth 2.0 popup flow)
- **Integrations**: Monday.com (order sync), Google Sheets

## What's Been Implemented

### Widget System
- **Display Configuration**: Hide URL bar, hide navbar/footer, streamlined textbook flow toggle
- **Streamlined Flow**: LaoPan Login → Link Student → Textbook Orders → Wallet
- **Wallet Feature**: Balance display + recent transactions
- **Floating Button Customization**: 7 positions, custom X/Y offsets, 6 icons, 4 styles
- **In-Widget OAuth**: Popup-based LaoPan OAuth with postMessage relay via loader.js
- **Live Preview** (Feb 9): Visual mini-screen in admin Placement tab showing button appearance in real-time
- **State Persistence** (Feb 9): sessionStorage saves active tab, Link Student form fields, selected student — survives widget close/reopen

### Landing Page
- 5 Structural Layouts: Classic, Bento Grid, Tab Hub, Social Feed, Magazine (admin selectable)
- UI Theme System: 6 palettes, fonts, density
- CSS Overlay Layouts: Storefront, Portal, Single Page, Chat/App, Card Grid, China-Panama

### Textbook Order System
- Monday.com Orders Board Sync: items + subitems + Updates
- Monday.com Textbooks Board Sync: find by code → add student subitem; create if not found
- Full admin config UI for Monday.com field mapping

### Header/Navigation
- Back button (left chevron) in breadcrumb
- Breadcrumb dropdown with direct links

## Monday.com Integration
- Orders Board: TB2026-Orders (ID: 18397140868)
- Textbooks Board: TB2026-Textbooks (ID: 18397140920)

## Known Issues
- P2: `sync-all` admin endpoint references non-existent `push_order` method
- P3: Hardcoded Spanish text in landing hero
- P3: Board selector needs search/filter (100+ boards)

## Upcoming Tasks
- P1: Fix `sync-all` endpoint broken method reference
- P1: Monday.com webhooks for status sync
- P1: i18n fixes
- P2: Board selector UX improvement

## Key Files
- `/app/backend/modules/widget/routes.py` — Loader.js template, embed config endpoints
- `/app/backend/modules/widget/service.py` — Widget config defaults
- `/app/frontend/src/pages/EmbedWidget.jsx` — Streamlined widget with OAuth popup + state persistence
- `/app/frontend/src/pages/LaoPanCallback.jsx` — Popup-aware OAuth callback
- `/app/frontend/src/modules/admin/WidgetManagerModule.jsx` — Widget admin (Display, Placement with live preview, Appearance, Security, Embed)
- `/app/frontend/src/components/layout/BottomNav.jsx` — Hidden on /embed routes

## Test Reports
- iteration_65: Display config (16/16 passed)
- iteration_66: Placement + OAuth popup (38/38 passed)
- iteration_67: Live preview + state persistence (14/14 passed)
