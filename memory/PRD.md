# ChiPi Link - Product Requirements Document

## Original Problem Statement
School management and e-commerce platform for Panama Christian Academy (PCA) with user auth, admin dashboard, store (Unatienda), textbook ordering, PinpanClub tournaments, and role-based access control.

## Current Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── modules/
│   │   ├── auth/     # Authentication (LaoPan OAuth + Admin login)
│   │   ├── store/    # Products, Orders, Private Catalog, Textbook Orders, School Year, Form Config
│   │   ├── admin/    # Admin routes, UI Style, migrations
│   │   ├── landing/  # Public routes (UI style, site config)
│   │   └── pinpanclub/ # Tournament system
│   └── core/         # Base repository, auth middleware
└── frontend/         # React + Tailwind + Shadcn UI
    ├── modules/
    │   ├── account/     # User portal (students, profile)
    │   ├── admin/       # Admin modules (Forms Manager, UI Style, Dictionary, etc.)
    │   ├── unatienda/   # Store management
    │   └── ...
    ├── contexts/        # ThemeContext (scope: public/admin), AuthContext, etc.
    ├── hooks/           # useAutoTranslate, usePermissions, etc.
    ├── config/          # uiStylePresets (templates, fonts, density)
    └── pages/           # Route pages
```

## What's Been Implemented

### February 8, 2026 — Session 5 (Current)

**Widget Module (Embeddable for laopan.online):**
- Full mini-dashboard widget embeddable via iframe or floating button
- 4 feature views: Textbook Orders, My Students, Order Status, Notifications
- Auto-authenticates via existing LaoPan SSO token from localStorage
- Login prompt with "Log in with LaoPan" for unauthenticated users
- PostMessage API for parent↔iframe communication (close, resize)
- Vanilla JS loader script served at `/api/widget/loader.js` with embedded config
- Admin Widget Manager: toggle features, customize appearance (colors, font, radius, compact mode), configure placement (position, width, label), manage allowed origins, generate embed code
- 3 embed options: Floating Button (recommended), Full-Page iframe, Sidebar iframe
- Preview button to test widget in new tab

**Structural Page Layouts (NEW — Feb 9, 2026):**
- 5 structural layouts that change the actual page component tree (not just CSS):
  - **Classic** — Hero carousel, icon grid, stacked sections (original)
  - **Bento Grid** — Asymmetric tile dashboard, no hero, Notion/Apple-inspired
  - **Tab Hub** — Greeting + horizontal tabs (Services/Community/Events/Gallery), WeChat/Grab-inspired
  - **Social Feed** — Stories carousel + unified mixed-content timeline, Instagram-inspired
  - **Magazine** — Featured article + 2-column editorial with sidebar, Medium-inspired
- Admin UI Style panel shows all 5 with SVG preview thumbnails
- Shared component library (`landing-layouts/shared.jsx`) for reuse across layouts
- 6 additional CSS overlay layouts (Storefront, Portal, Single Page, Chat/App, Card Grid, China-Panama) available under "Advanced" collapsible

**Layout Templates System (CSS overlays):**
- LayoutProvider applies layout-specific CSS dynamically (header, nav, content area behavior)
- China-Panama cultural layout: lattice-inspired double-frame hero, gold-accented cards, gradient header
- China-Panama color theme: red/gold primary with Panama blue accent, light and dark modes

**UI Theme Enhancement:**
- Separate Public Site / Admin Panel themes with independent configuration
- 12 font families: Inter, Poppins, DM Sans, Nunito, Lora, Source Sans 3, Noto Sans, Rubik, Outfit, Space Grotesk, Merriweather, Playfair Display
- 3 density options: Compact (native-app feel), Comfortable (default), Spacious
- 5 color templates: Default, Elegant, Warm, Ocean, Minimal
- ThemeContext supports scope switching (admin pages auto-switch to admin theme)
- Live preview in admin settings
- **"Preview as User" button**: Opens public site in new tab with unsaved theme applied + orange preview banner

**Order Form Seeded in Forms Manager:**
- 4 default fields: Payment Method (select), Payment Reference (text), Payment Receipt (file), Notes (textarea)
- Fully multilingual (EN/ES/ZH)

**Code Cleanup:**
- Removed dead local TRANSLATIONS dictionary from FormsManagerModule.jsx (replaced by useAutoTranslate hook)

### Earlier Sessions
- Student Name Refactor (first_name/last_name split)
- Monday.com Sub-item Workflow
- Textbook Ordering UI Redesign (accordion-style)
- Centralized Forms Manager with field CRUD
- Core Auto-Translate Service (bidirectional EN<>ES<>ZH) with explicit translate icon buttons
- Translate icon (Languages) replaces auto-translate-on-typing: user types label, clicks icon to fill other languages
- Fallback on save: empty ES/ZH fields auto-fill with EN content
- Form Manager UX Fixes (inline editor, reset button)
- User-facing Student Profile Lock/Unlock
- Re-order request flow, Admin School Year config
- Textbook flow bug fixes
- RBAC roles and permissions

## Business Rules
1. Each textbook item ordered ONCE per student, locked after purchase
2. Re-order: Request → Admin Approves → Item unlocks
3. Parents can buy partial textbooks, return for remaining
4. Locked profiles prevent parents from editing student info
5. Admin can lock/unlock any student profile
6. Forms are database-driven, configurable via Forms Manager

## Known Issues
- P4: Google Sign-Up OAuth flow broken (long-standing)
- P3: Hardcoded Spanish text in landing hero (should use i18n t() function)
- P3: React key prop warning in Unatienda component

## Translation Dictionary
- 104 entries total, including 32 "options" category terms for dropdown auto-translate
- Common dropdown values: Cash, Bank Transfer, Credit Card, Male, Female, Yes, No, Pending, Approved, etc.

## Test Credentials
- Admin: admin@libreria.com / admin (endpoint: /api/auth-v2/login)
- Admin Dashboard: /admin/login

## 3rd Party Integrations
- i18next/react-i18next, Monday.com, ipapi.co, Yappy Comercial BG, Invision Community/LaoPan OAuth
