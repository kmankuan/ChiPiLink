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
│   │   ├── store/    # Products, Orders, Private Catalog
│   │   ├── admin/    # Admin routes, migrations
│   │   └── pinpanclub/ # Tournament system
│   └── core/         # Base repository, auth middleware
└── frontend/         # React + Tailwind + Shadcn UI
    ├── modules/
    │   ├── admin/    # Admin dashboard modules
    │   ├── unatienda/ # Store management
    │   └── pinpanclub/ # Tournament UI
    └── pages/        # Main pages
```

## What's Been Implemented

### February 6, 2026
- ✅ **PCA Table Horizontal Scrollbar** - Fixed scrollbar visibility issue
  - Added `.scrollable-table-container` CSS class
  - Custom scrollbar styling for WebKit/Firefox
  - Stock column now accessible via horizontal scroll

### Previous Sessions
- ✅ Reports & Analytics Module (`/admin#analytics`)
- ✅ Private Catalog inline editing
- ✅ Fullscreen mode for PCA table
- ✅ Sticky headers and first column
- ✅ Grade mismatch fix (G3 vs 3)
- ✅ CORS error fix (production environment)

## Known Issues (Prioritized)

### P1 - Critical
1. **Order Submission Regression** - "Please select at least one new book to order"
   - File: `/app/frontend/src/pages/Unatienda.jsx`
   - Backend: `/app/backend/modules/store/services/textbook_order_service.py`
   
2. **Re-order Flow Incomplete** - Started but not finished in Unatienda.jsx

### P2 - High Priority
3. **500 Error on /api/store/products** - Needs production verification
   - Diagnostic endpoint: `/api/store/products/admin/diagnostic/raw-products`

### P3 - Medium Priority  
4. **Admin Sidebar Disappears** - Recurring issue after login
5. **Google Sign-Up Loop** - OAuth flow broken (long-standing)

## Upcoming Tasks
1. Admin UI for school year automation
2. Student profile locking UI
3. OneSignal push notifications for order status

## Future/Backlog
- Stripe payment integration
- Google Sheets API integration
- ChipiPoints as payment method
- Teams/clans system with rewards

## Key API Endpoints
- `POST /api/auth-v2/login` - Admin login
- `GET /api/store/private-catalog/admin/products` - PCA products
- `POST /api/store/textbook-orders/direct` - Direct order submission
- `GET /api/store/analytics/comprehensive` - Analytics data

## Credentials (Test)
- Super Admin: `teck@koh.one` / `Acdb##0897`
- Test Client: `test@client.com` / `password`

## 3rd Party Integrations
- i18next/react-i18next (translations)
- Monday.com (order fulfillment)
- ipapi.co (geolocation)
- Yappy Comercial BG (payments)
- Invision Community/LaoPan (OAuth)
