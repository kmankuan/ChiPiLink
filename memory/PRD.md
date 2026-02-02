# ChiPi Link - Product Requirements Document

## Original Problem Statement
Build a "super app" for managing textbook orders, student linking, and school administration. The application integrates with LaoPan.online for OAuth authentication and Monday.com for order fulfillment.

## Current State (December 2025)

### ✅ Completed Features
- **OAuth 2.0 Integration** - LaoPan.online login flow fully implemented
- **CSV Inventory Import** - Bulk inventory management via CSV for private catalog
- **Student Linking Flow** - Users can submit link requests, admins can approve
- **Massive Codebase Refactoring** - All legacy Spanish naming conventions removed (`cliente_id` → `user_id`, `db.clientes` → `db.users`)
- **Deployment Fixes** - Hardcoded URLs removed from production code

### 🔴 Known Issues (Priority)
1. **P1: Admin Sidebar Disappears** - Navigation modules vanish after login (RECURRING)
2. **P2: Google Sign-Up Loop** - OAuth flow stuck in infinite loop (RECURRING)
3. **P3: emergent-main.js Error** - External script error overlays UI

### 🟡 Pending Tasks
- Frontend for student locking & school year config
- Reflect student lock state in UI
- OneSignal push notifications integration
- Stripe payment integration

### 📦 Technical Debt
- Legacy `pedidos`/`pedidos_service.py` system still exists (needs user confirmation to remove)

## Architecture

### Tech Stack
- **Frontend:** React 18 + Craco + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (async MongoDB)
- **Database:** MongoDB (Atlas in production)
- **Auth:** JWT + LaoPan OAuth 2.0

### Key Collections
- `users` - All user data (formerly `clientes`)
- `store_textbook_access_students` - Approved student profiles
- `store_textbook_access_requests` - Pending link requests
- `private_catalog_products` - Private textbook inventory

## 3rd Party Integrations
- Monday.com (order fulfillment)
- i18next (multi-language)
- ipapi.co (geolocation)
- Yappy Comercial (payments)
- LaoPan.online (OAuth) ✅
- OneSignal (planned)
- Stripe (planned)

## Credentials
- Super Admin: `teck@koh.one` / `Acdb##0897`
- Test User: `testuser_regular@test.com` / `Test123!`

## Last Updated
December 2025 - Deployment fixes applied
