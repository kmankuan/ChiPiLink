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
    │   ├── account/students/MyStudentsSection.jsx  # ENHANCED - edit profile + lock awareness
    │   ├── admin/store/TextbookOrdersAdminTab.jsx  # Reorder approval
    │   ├── unatienda/
    │   │   ├── tabs/SchoolYearTab.jsx              # School year config
    │   │   ├── tabs/StudentsTab.jsx                # Admin student lock/unlock
    │   │   └── UnatiendaModule.jsx
    │   └── ...
    └── pages/Unatienda.jsx  # SchoolTextbooksView with reorder request
```

## What's Been Implemented

### February 7, 2026 — Session 3

**User-facing Student Profile Lock/Unlock:**
- Added edit (pencil) button on approved student cards in My Students section
- Edit dialog with fields: Full Name, Student Number, Relation
- When LOCKED: Lock icon in title, amber banner explaining lock, all fields DISABLED, no Save button
- When UNLOCKED: Pencil icon in title, all fields editable, Guardar (Save) button visible
- Backend correctly rejects edits to locked profiles with "This student record is locked" error
- Lock badge (amber) visible on student card when locked

### February 6, 2026 — Session 2
- Re-order request flow on locked textbook items
- Admin School Year configuration tab
- Admin Student profile lock/unlock management

### February 6, 2026 — Session 1
- Fixed 6 textbook flow bugs
- Redesigned SchoolTextbooksView with order-aware item statuses
- Order status correctly "submitted" after any submission

## Business Rules
1. Each textbook item ordered ONCE per student, locked after purchase
2. Re-order: Request → Admin Approves → Item unlocks
3. Parents can buy partial textbooks, return for remaining
4. Locked profiles prevent parents from editing student info
5. Admin can lock/unlock any student profile

## Known Issues
- P3: Admin Sidebar occasionally disappears (tested OK all sessions)
- P4: Google Sign-Up OAuth flow broken (long-standing)

## Upcoming Tasks
1. OneSignal push notifications for order status changes
2. P3/P4 bug fixes

## Future/Backlog
- Stripe payment, Google Sheets API, landing page templates
- Teams/clans with rewards, ChipiPoints as payment
- Email notifications for role assignments

## Test Credentials
- Super Admin: teck@koh.one / Acdb##0897
- Test Client: test@client.com / password

## 3rd Party Integrations
- i18next/react-i18next, Monday.com, ipapi.co, Yappy Comercial BG, Invision Community/LaoPan OAuth
