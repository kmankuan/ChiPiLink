# ChiPi Link - Product Requirements Document

## Original Problem Statement
ChiPi Link is a comprehensive school management and e-commerce platform (React + FastAPI + MongoDB) that enables:
- User authentication via LaoPan OAuth and email/password
- Student profile management with linking system
- Textbook ordering through Unatienda store
- Private catalog access for approved students
- Admin dashboard for managing users, products, orders, and site configuration
- Multi-language support (i18n)

The primary goal of recent sessions has been to establish a robust, English-first codebase by migrating all Spanish field names in the database and code to English.

## User Personas
1. **Super Admin**: Full access to all admin modules, site configuration, and database migration
2. **Admin/Moderator**: Access to user management, orders, and content
3. **Client/Parent**: Can link students, access private catalog, order textbooks
4. **Student**: Linked to parent accounts, has assigned textbooks

## Core Requirements
- English-only codebase (no Spanish backward compatibility)
- Database field names must be in English
- All API routes use English naming conventions
- Frontend uses i18n for all user-facing text

## Architecture
```
/app/
├── backend/
│   ├── scripts/
│   │   └── migrate_spanish_to_english.py
│   ├── modules/
│   │   ├── admin/routes/migrations.py
│   │   ├── store/
│   │   │   ├── routes/ (private_catalog.py, bulk_import.py)
│   │   │   ├── services/ (textbook_order_service.py)
│   │   │   └── models/ (schemas.py)
│   │   └── invision/ (oauth_service.py)
└── frontend/
    └── src/
        ├── modules/
        │   ├── admin/
        │   │   ├── AdminModule.jsx
        │   │   ├── DatabaseMigrationModule.jsx
        │   │   └── users/components/StudentRequestsTab.jsx
        │   ├── account/linking/LinkingPage.jsx
        │   └── unatienda/
        └── pages/Unatienda.jsx
```

## Key API Endpoints
- `GET /api/migrations/status` - Check if DB needs migration (admin only)
- `POST /api/migrations/spanish-to-english` - Run migration (admin only)
- `GET /api/store/private-catalog/access` - Check user's private catalog access
- `GET /api/store/textbook-orders/student/{student_id}` - Get textbooks for student

## Database Collections
- `auth_users` - User accounts
- `store_products` - Store products/textbooks
- `store_student_records` - Student profiles
- `store_textbook_orders` - Textbook orders

## Current Status

### ✅ Completed (Feb 2025)
- [x] Database Migration System created (script + API + UI)
- [x] Full codebase refactor to English-only
- [x] Fixed LinkingPage.jsx "body stream already read" error (switched to axios)
- [x] Fixed LaoPan OAuth "User not found" error
- [x] Fixed language selector bug (reverted user selection)
- [x] Mobile UI improvements for Unatienda and admin tables
- [x] Migration UI integrated into Admin Panel → Administration → Migration tab

### 🔶 Blocked / Needs User Action
- [ ] **"View Textbooks" bug** - Shows empty list because production DB has Spanish field names
  - **Resolution**: User must run the database migration from Admin Panel

### 🔴 Known Issues (Recurring)
- [ ] Admin Sidebar modules disappear after login
- [ ] Google Sign-Up flow stuck in infinite loop
- [ ] `emergent-main.js` development script error

### 📋 Backlog (P1-P2)
- [ ] Admin UI for school year automation
- [ ] Admin UI for student profile locking
- [ ] User-facing profile form disabled fields when locked
- [ ] OneSignal push notifications for order status

### 📋 Future Tasks (P3+)
- [ ] Stripe payment integration
- [ ] Google Sheets API for data import
- [ ] ChipiPoints as payment method
- [ ] Teams/clans with collective rewards
- [ ] Email notifications for role assignments

## Third-Party Integrations
- **i18next**: Internationalization
- **Monday.com**: Order fulfillment
- **ipapi.co**: IP geolocation
- **Yappy Comercial**: Payment processing
- **Invision Community (LaoPan.online)**: OAuth authentication

## Test Credentials
- **Super Admin**: teck@koh.one / Acdb##0897
- **Test Client**: test@client.com / password
