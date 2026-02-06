# ChiPi Link - Product Requirements Document

## Original Problem Statement
School management and e-commerce platform for Panama Christian Academy (PCA) with user auth, admin dashboard, store (Unatienda), textbook ordering, PinpanClub tournaments, and role-based access control.

## Current Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── modules/
│   │   ├── auth/     # Authentication (LaoPan OAuth + Admin login)
│   │   ├── store/    # Products, Orders, Private Catalog, Textbook Orders
│   │   ├── admin/    # Admin routes, migrations
│   │   └── pinpanclub/ # Tournament system
│   └── core/         # Base repository, auth middleware
└── frontend/         # React + Tailwind + Shadcn UI
    ├── modules/      # Feature modules (account, admin, unatienda, pinpanclub)
    └── pages/        # Main pages (Unatienda.jsx, Login.jsx, etc.)
```

## What's Been Implemented

### February 6, 2026 (Latest Session)

**Textbook Ordering Flow Redesign (P0):**
- Redesigned SchoolTextbooksView with order-aware item statuses
- Items show as LOCKED (green check + "Comprado") when already purchased
- Items show as AVAILABLE (checkbox) when not yet ordered
- Order status now correctly set to "submitted" after any submission (was "draft")
- Progress indicator: "X de Y comprado" with total purchased amount
- Sticky bottom submit bar only appears when items are available to order
- Mobile-first design: compact layout, truncated tabs, single-column items

**Bug Fixes:**
- Fixed missing Package/Send lucide-react imports
- Fixed frontend route: /textbook-orders/direct → /textbook-orders/submit
- Fixed frontend field: books → items in order submission payload
- Fixed frontend URL: /products-by-grade/ → /by-grade/
- Fixed backend grade format: handles both "3" and "G3"
- Fixed form config URL: /order-form-config/client → /order-form-config/fields

**Business Rules Implemented:**
1. Each textbook item can only be ordered ONCE per student
2. Ordered items are LOCKED and shown as "Purchased" (not selectable)
3. Parents can buy partial textbooks and return later for remaining ones
4. Locked items prevent accidental duplicate orders
5. Re-order flow: student requests → admin approves → item unlocks

### Previous Sessions
- Exclusive Purchase Flow with horizontal student tabs
- Quick Reject Workflow, PCA Table improvements
- Reports & Analytics, Private Catalog inline editing
- Fullscreen mode, sticky headers

## Known Issues

### Resolved This Session
- ~~Order stays "Draft" after submission~~ → Fixed: now "Submitted"
- ~~Order submission fails for new students~~ → Fixed: route + field mismatch
- ~~Textbooks don't load by grade~~ → Fixed: grade format + URL path

### Remaining (Lower Priority)
- P3: Admin Sidebar occasionally disappears (tested OK this session)
- P4: Google Sign-Up OAuth flow broken (long-standing)
- Minor: React key console warning in Unatienda.jsx

## Upcoming Tasks
1. Admin UI for school year automation & student profile locking
2. OneSignal push notifications for order status
3. Re-order request flow (student requests, admin approves)

## Future/Backlog
- Stripe payment, Google Sheets API, landing page templates
- Teams/clans with rewards, ChipiPoints as payment
- Email notifications for role assignments

## Key API Endpoints
- POST /api/auth-v2/login
- GET /api/store/private-catalog/access
- GET /api/store/private-catalog/by-grade/{grade}
- GET /api/store/textbook-orders/student/{student_id}
- POST /api/store/textbook-orders/submit
- GET /api/store/order-form-config/fields

## Test Credentials
- Super Admin: teck@koh.one / Acdb##0897
- Test Client: test@client.com / password

## 3rd Party Integrations
- i18next/react-i18next, Monday.com, ipapi.co, Yappy Comercial BG, Invision Community/LaoPan OAuth
