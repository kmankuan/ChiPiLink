# ChiPi Link - Product Requirements Document

## Original Problem Statement
Build a comprehensive school management and e-commerce platform for Panama Christian Academy (PCA) with:
- User authentication via LaoPan OAuth
- Admin dashboard for managing products, orders, users
- Unatienda (store) with public and private catalogs
- Textbook ordering system for students
- PinpanClub tournament system
- Role-based access control

## Current Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── modules/
│   │   ├── auth/     # Authentication (LaoPan OAuth + Admin login)
│   │   ├── store/    # Products, Orders, Private Catalog, Store Config
│   │   ├── admin/    # Admin routes, migrations
│   │   └── pinpanclub/ # Tournament system
│   └── core/         # Base repository, auth middleware
└── frontend/         # React + Tailwind + Shadcn UI
    ├── modules/
    │   ├── account/  
    │   │   ├── students/  # My Students Section
    │   │   ├── wallet/
    │   │   ├── profile/
    │   │   └── pages/
    │   ├── admin/    # Admin dashboard modules
    │   ├── unatienda/ # Store management
    │   └── pinpanclub/ # Tournament UI
    └── pages/        # Main pages
```

## What's Been Implemented

### February 6, 2026 (Latest Session)
- Fixed deployment build failure (orphaned JSX in Unatienda.jsx)
- Fixed missing `Package` and `Send` lucide-react imports
- Fixed frontend route mismatch: `/textbook-orders/direct` -> `/textbook-orders/submit`
- Fixed frontend field naming: `books` -> `items` in order submission
- Fixed frontend URL: `/products-by-grade/` -> `/by-grade/`
- Fixed backend grade format mismatch: now handles both "3" and "G3" formats
- Fixed frontend form config URL: `/order-form-config/client` -> `/order-form-config/fields`
- Verified School Textbooks horizontal tab UI works end-to-end
- All tests passing (100% backend, 100% frontend)

### Previous Sessions
- Exclusive Purchase Flow Redesign with horizontal student tabs
- Quick Reject Workflow with dropdown
- PCA Table Resizable Columns and Horizontal Scrollbar
- Reports & Analytics Module
- Private Catalog inline editing
- Fullscreen mode for PCA table
- Sticky headers and first column

## Known Issues (Prioritized)

### P3 - Medium Priority  
1. **Admin Sidebar Disappears** - Recurring issue after login (testing showed it working now)
2. **Google Sign-Up Loop** - OAuth flow broken (long-standing)

### Resolved
- Order Submission for new students - FIXED (route + field mismatch)
- School Textbooks UI Redesign - COMPLETED (horizontal tabs working)
- Grade format mismatch - FIXED (backend handles G3/3)
- Unatienda data loading 500 error - Products endpoint working correctly

## Upcoming Tasks
1. Admin UI for school year automation
2. Student profile locking UI
3. OneSignal push notifications for order status

## Future Tasks
- Stripe payment integration
- Google Sheets API integration
- Landing page template selector
- Teams/clans with rewards
- Email notifications for role assignments
- ChipiPoints as payment method

## Key API Endpoints
- `POST /api/auth-v2/login` - Admin login
- `GET /api/store/store-config/public` - Public store config
- `GET /api/store/private-catalog/access` - Check textbook access
- `GET /api/store/private-catalog/by-grade/{grade}` - Textbooks by grade
- `POST /api/store/textbook-orders/submit` - Submit textbook order
- `GET /api/store/order-form-config/fields` - Order form fields
- `GET /api/store/products` - Admin products list

## Credentials (Test)
- Super Admin: `teck@koh.one` / `Acdb##0897`
- Test Client: `test@client.com` / `password`

## 3rd Party Integrations
- i18next/react-i18next (translations)
- Monday.com (order fulfillment)
- ipapi.co (geolocation)
- Yappy Comercial BG (payments)
- Invision Community/LaoPan (OAuth)
