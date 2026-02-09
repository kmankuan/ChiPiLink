# ChiPi Link - Product Requirements Document

## Core Architecture
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Frontend**: React, TailwindCSS, shadcn/ui
- **Auth**: JWT + LaoPan SSO (OAuth 2.0, in-frame flow for widget)
- **Integrations**: Monday.com (order sync)

## Implemented Features

### Widget System
- **In-Frame OAuth** (Feb 9): Login navigates iframe directly to LaoPan OAuth, callback redirects back to `/embed/widget` — works on mobile (no popup)
- Display Config: Hide URL, navbar/footer, streamlined flow
- Streamlined Flow: Login → Link Student → Textbooks → Wallet
- Floating Button: 7 positions, custom offsets, 6 icons, 4 styles
- Live Preview in admin Placement tab
- State Persistence via sessionStorage

### PCA Private Catalog (Feb 9)
- Multi-select with checkboxes + bulk action bar (Set Active/Inactive, Delete)
- Sort by any column header (asc/desc)
- Filter: Search + Grade + Subject + Status + Clear All

### Textbook Order System
- Monday.com Orders + Textbooks Board sync (config-driven)

### Landing Page
- 5 Structural Layouts (admin selectable)

## Known Issues
- P2: `sync-all` admin endpoint broken method reference
- P3: i18n fixes needed
- P3: Board selector needs search/filter

## Test Reports
- iter 65-68: All passed (widget display, placement, OAuth, PCA catalog)
