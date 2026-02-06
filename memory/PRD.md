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
    │   │   ├── students/  # NEW: My Students Section
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
- ✅ **My Students Section** - New compact card grid in Account Dashboard
  - Visual status indicators (green/yellow/red/orange)
  - "Order Textbooks" button for validated students
  - Multi-language support (EN/ES/ZH)
- ✅ **Store Configuration API** - Configurable textbooks visibility
  - `textbooks_public_visibility` setting
  - Localized category labels
- ✅ **PCA Table Resizable Columns** - Drag to resize column widths
- ✅ **PCA Table Horizontal Scrollbar** - Fixed scrollbar visibility
- ✅ **Textbook Request Quick Reject** - Dropdown with predefined reasons

### Previous Sessions
- ✅ Reports & Analytics Module (`/admin#analytics`)
- ✅ Private Catalog inline editing
- ✅ Fullscreen mode for PCA table
- ✅ Sticky headers and first column
- ✅ Grade mismatch fix (G3 vs 3)

## Known Issues (Prioritized)

### P1 - Critical
1. **Order Submission Regression** - "Please select at least one new book to order"
   - File: `/app/frontend/src/pages/Unatienda.jsx`
   - Backend: `/app/backend/modules/store/services/textbook_order_service.py`

### P2 - High Priority
2. **Complete Unatienda Integration** - Use store config for textbooks category visibility
3. **Client Orders View** - Create orders section under Unatienda

### P3 - Medium Priority  
4. **Admin Sidebar Disappears** - Recurring issue after login
5. **Google Sign-Up Loop** - OAuth flow broken (long-standing)

## Upcoming Tasks
1. Phase 2 of purchase flow redesign:
   - Update Unatienda to use store config
   - Create client orders view
   - Add quick navigation from student cards
2. Admin UI for school year automation
3. Student profile locking UI
4. OneSignal push notifications for order status

## Key API Endpoints
- `POST /api/auth-v2/login` - Admin login
- `GET /api/store/store-config/public` - Public store config (NEW)
- `PUT /api/store/store-config/admin` - Update store config (NEW)
- `GET /api/store/private-catalog/admin/products` - PCA products
- `GET /api/store/textbook-access/my-students` - User's linked students
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
