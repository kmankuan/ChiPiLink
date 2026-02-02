# ChiPi Link - Product Requirements Document

## Original Problem Statement
Build a "super app" for managing textbook orders, student linking, and school administration. The application integrates with LaoPan.online for OAuth authentication and Monday.com for order fulfillment.

## Current State (December 2025)

### ✅ Completed Features

#### Session 1 (Previous)
- **OAuth 2.0 Integration** - LaoPan.online login flow fully implemented
- **CSV Inventory Import** - Bulk inventory management via CSV for private catalog
- **Student Linking Flow** - Users can submit link requests, admins can approve

#### Session 2 (Current - Feb 2, 2025)
- **Massive Codebase Cleanup - Phase 2 COMPLETED**
  - Removed ALL legacy `pedidos` system files:
    - `backend/modules/store/routes/pedidos.py` (DELETED)
    - `backend/modules/store/services/pedidos_service.py` (DELETED)
    - `backend/modules/store/services/monday_pedidos_service.py` (DELETED)
    - `backend/modules/store/models/pedidos_schemas.py` (DELETED)
    - `backend/modules/store/routes/monday.py` (DELETED)
  - Created clean `monday_config_service.py` for Monday.com configuration
  - Updated all API endpoints to use new English naming conventions:
    - `store_orders` collection instead of `pedidos`
    - `textbook_orders` collection for textbook system
    - Updated dashboard stats: `orders.pending` instead of `pedidos.pendientes`
  - Updated frontend components to use new API response format
- **Deployment Fixes**
  - Removed hardcoded preview URLs from:
    - `oauth_service.py`
    - `config.py`
    - `notifications.py`
  - All URLs now read from environment variables

### 🔴 Known Issues (Priority)
1. **P1: Admin Sidebar Disappears** - Navigation modules vanish after login (RECURRING - NOT ADDRESSED)
2. **P2: Google Sign-Up Loop** - OAuth flow stuck in infinite loop (RECURRING - NOT ADDRESSED)
3. **P3: emergent-main.js Error** - External script error overlays UI (NOT ADDRESSED)

### 🟡 Pending Tasks
- Frontend for student locking & school year config
- Reflect student lock state in UI
- OneSignal push notifications integration
- Stripe payment integration

## Architecture

### Tech Stack
- **Frontend:** React 18 + Craco + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (async MongoDB)
- **Database:** MongoDB (Atlas in production)
- **Auth:** JWT + LaoPan OAuth 2.0

### Key Collections (UPDATED)
- `users` - All user data
- `store_textbook_access_students` - Approved student profiles
- `store_textbook_access_requests` - Pending link requests
- `private_catalog_products` - Private textbook inventory
- `textbook_orders` - Textbook orders (replaces pedidos_libros)
- `store_orders` - Platform store orders (replaces pedidos)
- `store_monday_config` - Monday.com configuration (NEW)

### Deleted Legacy Collections
- ~~pedidos~~ → replaced by `store_orders`
- ~~pedidos_libros~~ → replaced by `textbook_orders`

## 3rd Party Integrations
- Monday.com (order fulfillment) - Configuration stored in `store_monday_config`
- i18next (multi-language)
- ipapi.co (geolocation)
- Yappy Comercial (payments)
- LaoPan.online (OAuth) ✅
- OneSignal (planned)
- Stripe (planned)

## Credentials
- Super Admin: `teck@koh.one` / `Acdb##0897`
- Test User: `testuser_regular@test.com` / `Test123!`
- Auth endpoint: `/api/auth-v2/login`

## API Changes (Feb 2, 2025)

### Dashboard Stats Response
**Before:**
```json
{
  "pedidos": {"total": 0, "pendientes": 0},
  "productos": {"total": 0, "bajo_stock": 0}
}
```

**After:**
```json
{
  "orders": {"total": 0, "pending": 0},
  "products": {"total": 0, "low_stock": 0}
}
```

### Unatienda Stats Response
**Before:**
```json
{
  "pedidos_pendientes": 0
}
```

**After:**
```json
{
  "orders_pending": 0,
  "student_requests_approved": 0,
  "student_requests_pending": 0
}
```

## Last Updated
February 2, 2025 - Complete legacy pedidos system removal
