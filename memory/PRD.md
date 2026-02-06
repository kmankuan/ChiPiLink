# ChiPi Link - Product Requirements Document

## Original Problem Statement
School management and e-commerce platform for Panama Christian Academy (PCA) with user auth, admin dashboard, store (Unatienda), textbook ordering, PinpanClub tournaments, and role-based access control.

## Current Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── modules/
│   │   ├── auth/     # Authentication (LaoPan OAuth + Admin login)
│   │   ├── store/    # Products, Orders, Private Catalog, Textbook Orders, School Year
│   │   ├── admin/    # Admin routes, migrations
│   │   └── pinpanclub/ # Tournament system
│   └── core/         # Base repository, auth middleware
└── frontend/         # React + Tailwind + Shadcn UI
    ├── modules/
    │   ├── admin/store/  # TextbookOrdersAdminTab (reorder approval)
    │   ├── unatienda/
    │   │   ├── tabs/
    │   │   │   ├── SchoolYearTab.jsx  # NEW - School year config
    │   │   │   ├── StudentsTab.jsx    # ENHANCED - Lock/unlock profiles
    │   │   │   └── ...other tabs
    │   │   └── UnatiendaModule.jsx
    │   └── ...
    └── pages/
        └── Unatienda.jsx  # SchoolTextbooksView with reorder request
```

## What's Been Implemented

### February 6, 2026 — Session 2

**Feature 1: Re-order Request Flow (Client-side)**
- Locked textbook items now show "Purchased · Request Reorder" link
- Clicking opens a bottom sheet (mobile-first) with reason textarea
- Submits via POST /textbook-orders/{order_id}/reorder/{book_id}
- After request: item shows amber clock icon + "Reorden pendiente"
- Admin sees pending requests in TextbookOrdersAdminTab

**Feature 2: Admin School Year Configuration Tab**
- New SchoolYearTab in Unatienda admin module
- Status cards: Current Year, Next Year, Enrollment Status
- Config form: Calendar Type, School Year, Enrollment Start Month/Day
- Auto-Enrollment toggle with months-before-year-end setting
- Manual auto-enrollment trigger with confirmation dialog

**Feature 3: Admin Student Profile Lock/Unlock**
- Enhanced StudentsTab showing 20 students in table
- Stats: Total Students, Locked Profiles, Active Grades
- Search by name/student ID
- Lock/Unlock buttons with confirmation dialogs
- View detail dialog showing enrollments
- Unlock includes optional reason field

### February 6, 2026 — Session 1
- Fixed 6 textbook flow bugs (routes, imports, grade format)
- Redesigned SchoolTextbooksView with order-aware item statuses
- Items show LOCKED (purchased) or AVAILABLE (checkbox)
- Order status correctly "submitted" after any submission

## Business Rules
1. Each textbook item can only be ordered ONCE per student
2. Ordered items are LOCKED — shown as "Purchased", not selectable
3. Parents can buy partial textbooks and return for remaining ones
4. To re-buy a locked item: Request Reorder → Admin Approves → Item unlocks
5. Locked profiles prevent parents from editing student info

## Known Issues
- P3: Admin Sidebar occasionally disappears (tested OK both sessions)
- P4: Google Sign-Up OAuth flow broken (long-standing)

## Upcoming Tasks
1. OneSignal push notifications for order status changes
2. User-facing student profile form: disable fields when locked

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
- POST /api/store/textbook-orders/{order_id}/reorder/{book_id}
- GET /api/store/textbook-orders/admin/pending-reorders
- PUT /api/store/textbook-orders/admin/{order_id}/items/{book_id}/approve-reorder
- GET /api/store/school-year/config
- PUT /api/store/school-year/config
- GET /api/store/school-year/status
- POST /api/store/school-year/trigger-auto-enrollment
- POST /api/store/school-year/students/{id}/lock
- POST /api/store/school-year/students/{id}/unlock
- GET /api/store/textbook-access/admin/all-students

## Test Credentials
- Super Admin: teck@koh.one / Acdb##0897
- Test Client: test@client.com / password

## 3rd Party Integrations
- i18next/react-i18next, Monday.com, ipapi.co, Yappy Comercial BG, Invision Community/LaoPan OAuth
