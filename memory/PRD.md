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

**Layout Templates System:**
- 7 public site layouts: Mobile App, Storefront, Portal, Single Page, Chat/App, Card Grid, China-Panama
- LayoutProvider applies layout-specific CSS dynamically (header, nav, content area behavior)
- China-Panama cultural layout: lattice-inspired double-frame hero, gold-accented cards, gradient header
- China-Panama color theme: red/gold primary with Panama blue accent, light and dark modes
- Layout selector in admin UI Style module (Page Layout section)
- Each layout changes actual page structure (nav visibility, header style, content width)

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
- Core Auto-Translate Service (bidirectional EN<>ES<>ZH)
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
- P3: Admin Sidebar occasionally disappears
- P4: Google Sign-Up OAuth flow broken (long-standing)

## Test Credentials
- Admin: admin@libreria.com / admin (endpoint: /api/auth-v2/login)
- Admin Dashboard: /admin/login

## 3rd Party Integrations
- i18next/react-i18next, Monday.com, ipapi.co, Yappy Comercial BG, Invision Community/LaoPan OAuth
