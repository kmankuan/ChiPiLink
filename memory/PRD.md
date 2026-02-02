# ChiPi Link - PRD (Product Requirements Document)

## Original Problem Statement
Build a "super app" for ChiPi Link - a full-stack system (React, FastAPI, MongoDB) with multiple modules including store management (Unatienda), user management, textbook ordering, student linking, and integrations with Monday.com, Yappy payments, and LaoPan.online OAuth.

## Current Session Focus
Complete Spanish to English refactoring of the entire codebase to ensure consistency and professionalism.

---

## What's Been Implemented

### December 2025 - Spanish to English Refactoring (In Progress)
**Completed modules:**

#### Frontend Components Refactored:
- **DashboardModule.jsx** - All stats, labels, and descriptions now in English
- **AdminDashboard.jsx** - Sidebar navigation, module descriptions, dropdown menus
- **UnatiendaModule.jsx** - Stats headers, tab labels
- **CatalogoPublicoTab.jsx** - All labels, buttons, dialogs, table headers
- **CatalogoPrivadoTab.jsx** - Form fields, buttons, table content
- **EstudiantesTab.jsx** - Complete rewrite with English labels
- **DemoDataTab.jsx** - Complete rewrite with English content
- **ConfiguracionTab.jsx** - All configuration labels and descriptions
- **InventoryImport.jsx** - Import wizard steps and messages
- **OrderFormConfigTab.jsx** - Field management UI
- **RolesModule.jsx** - Role management labels

#### Backend Endpoints Refactored:
- `/api/admin/dashboard/stats` - Returns English field names
- `/api/admin/unatienda/stats` - Returns English field names
- `/api/admin/unatienda/demo-stats` - Returns English field names

### Previously Completed Features:
- LaoPan.online OAuth 2.0 integration
- CSV Inventory Import System
- Student Linking Flow
- Legacy `pedidos` system removal
- Legacy `vinculacion` nomenclature cleanup
- Deployment configuration fixes

---

## Remaining Work

### P0 - Spanish to English Refactoring (Remaining ~190 UI instances)
Files still requiring translation:
- `/app/frontend/src/modules/monday/MondayModule.jsx`
- `/app/frontend/src/modules/account/profile/ProfilePage.jsx`
- `/app/frontend/src/modules/account/connections/ConnectionsPage.jsx`
- `/app/frontend/src/modules/account/wallet/*.jsx`
- Backend services (variable names, comments)

### P1 - Known Bugs
1. **Admin Sidebar Disappears** - Recurring issue after login
2. **Google Sign-Up Loop** - OAuth flow broken
3. **emergent-main.js error** - Platform script overlay

### P2 - Upcoming Features
- Frontend for Student Locking & School Year Config
- Reflect Student Lock State in UI
- OneSignal push notifications

### Future/Backlog
- Stripe payment integration
- Google Sheets API integration
- Template selector for landing pages
- Teams/clans system
- ChipiPoints as payment method

---

## Code Architecture

```
/app/
├── backend/
│   ├── modules/
│   │   ├── admin/routes.py (stats endpoints refactored)
│   │   ├── store/services/
│   │   └── auth/
│   └── core/
└── frontend/
    └── src/
        ├── pages/AdminDashboard.jsx (refactored)
        ├── modules/
        │   ├── dashboard/DashboardModule.jsx (refactored)
        │   ├── unatienda/ (mostly refactored)
        │   ├── admin/RolesModule.jsx (partially refactored)
        │   └── account/ (needs refactoring)
        └── components/
```

---

## Key Database Collections
- `users` - User accounts
- `store_textbook_orders` - Textbook orders
- `store_textbook_access_requests` - Student link requests
- `private_catalog_products` - Inventory items
- `libros` - Products/books
- `notificaciones` - Notifications

---

## Third-Party Integrations
- **Monday.com** - Order fulfillment sync
- **i18next** - Multi-language support
- **Yappy Commercial** - Payment processing
- **LaoPan.online** - OAuth 2.0
- **OneSignal** - Push notifications (planned)

---

## Test Credentials
- **Admin Email**: `teck@koh.one`
- **Admin Password**: `Acdb##0897`

---

## Notes
- User preferred language for communication: **Spanish**
- Code and UI should be in **English**
- Backend field names in MongoDB remain in Spanish for backward compatibility with existing data
