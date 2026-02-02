# ChiPi Link - PRD (Product Requirements Document)

## Original Problem Statement
Build a "super app" for ChiPi Link - a full-stack system (React, FastAPI, MongoDB) with multiple modules including store management (Unatienda), user management, textbook ordering, student linking, and integrations with Monday.com, Yappy payments, and LaoPan.online OAuth.

---

## Development Principles

### 1. Language Standards
- **Code and technical terms**: ALWAYS in English, even when instructions are given in Spanish or Chinese
- **Variable names, function names, comments**: English only
- **Special names/titles**: Ask for confirmation if user provides non-English names that might be intentional (brand names, proper nouns)

### 2. Internationalization (i18n)
- **ALWAYS use the i18n system** for user-facing text - NO hardcoded strings
- Supported languages: English (en), Spanish (es), Chinese (zh)
- Translation files location: `/app/frontend/src/i18n/locales/`
- Use `t('key.path')` pattern for all UI text
- Add translations to ALL THREE language files when adding new text

### 3. Communication Style
- Agent acts as a professional coder/engineer using English terminology
- When user's explanation or terms are incorrect, proactively suggest the correct technical version
- Ask for confirmation on terminology corrections

### 4. Backend Configuration
- ALL new features MUST include admin configuration options
- Create backend endpoints for admin customization
- Store configurations in database for runtime changes

### 5. Scalable Architecture
- Design for future growth
- Use modular, reusable components
- Follow DRY (Don't Repeat Yourself) principles
- Proper separation of concerns

### 6. Efficiency & Proactivity
- Always provide alternative solutions for user to choose
- Optimize for credit consumption and development time
- Suggest the most efficient approach

### 7. Quality Assurance
- Proactively detect flaws or improvement opportunities in user instructions
- Suggest corrections and improvements before implementation
- Validate requirements before coding

---

## Current Session Focus
Complete Spanish to English refactoring using the i18n system for multi-language support.

---

## What's Been Implemented

### February 2026 - i18n Integration (Current Session)

**Progress: ~97% Complete** - Major account/wallet/profile components now use i18n system

#### New i18n Keys Added (en.json now has 916 lines):
- `wallet.*` - Complete wallet UI translations
- `profile.*` - Profile management translations
- `membershipCard.*` - Membership card translations
- `capabilities.*` - User capabilities translations
- `dependents.*` - Dependent management translations
- `transfers.*` - Transfer dialog translations
- `qrCode.*` - QR code component translations
- `account.*` - Account dashboard translations

#### Components Refactored to Use i18n:
- **WalletPage.jsx** - Now uses `t()` function ✅
- **MembershipCard.jsx** - Full i18n integration ✅
- **ProfilePage.jsx** - Uses i18n with locale detection ✅
- **MisCapacidades.jsx** - Renamed to UserCapabilities, uses i18n ✅
- **MisAcudidos.jsx** - Renamed to MyDependents, uses i18n ✅
- **TransferenciasDialog.jsx** - Renamed to TransfersDialog, uses i18n ✅
- **UserQRCode.jsx** - Uses i18n with all languages ✅
- **AccountDashboard.jsx** - Uses i18n for all labels ✅

### December 2025 - Spanish to English Refactoring (Previous Session)

**Progress: ~94% Complete** (from ~2870 instances to ~159 remaining)

#### Frontend Components Fully Refactored:
- **DashboardModule.jsx** - All stats, labels, descriptions ✅
- **AdminDashboard.jsx** - Sidebar navigation, module descriptions, dropdown menus ✅
- **UnatiendaModule.jsx** - Stats headers, tab labels ✅
- **CatalogoPublicoTab.jsx** - All labels, buttons, dialogs, table headers ✅
- **CatalogoPrivadoTab.jsx** - Form fields, buttons, table content ✅
- **EstudiantesTab.jsx** - Complete rewrite with English labels ✅
- **DemoDataTab.jsx** - Complete rewrite with English content ✅
- **ConfiguracionTab.jsx** - All configuration labels and descriptions ✅
- **InventoryImport.jsx** - Import wizard steps and messages ✅
- **OrderFormConfigTab.jsx** - Field management UI ✅
- **RolesModule.jsx** - Role management labels ✅
- **MondayModule.jsx** - Full integration configuration ✅
- **ConnectionsPage.jsx** - User connections management ✅
- **AuthCallback.jsx / Login.jsx** - Welcome messages ✅

#### Backend Endpoints Refactored:
- `/api/admin/dashboard/stats` - Returns English field names ✅
- `/api/admin/unatienda/stats` - Returns English field names ✅
- `/api/admin/unatienda/demo-stats` - Returns English field names ✅

### Previously Completed Features:
- LaoPan.online OAuth 2.0 integration
- CSV Inventory Import System
- Student Linking Flow
- Legacy `pedidos` system removal
- Legacy `vinculacion` nomenclature cleanup
- Deployment configuration fixes

---

## Remaining Work

### P0 - i18n Migration (Remaining ~159 UI instances)
Files requiring i18n integration:
- `/app/frontend/src/modules/account/profile/` - Profile UI labels
- `/app/frontend/src/modules/account/wallet/` - Wallet management
- `/app/frontend/src/modules/pinpanclub/` - Ping pong club features
- `/app/frontend/src/pages/SuperAppLanding.jsx` - Landing page content

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
│   │   ├── admin/routes.py
│   │   ├── store/services/
│   │   └── auth/
│   └── core/
└── frontend/
    └── src/
        ├── i18n/
        │   ├── index.js
        │   └── locales/
        │       ├── en.json (English)
        │       ├── es.json (Spanish)
        │       └── zh.json (Chinese)
        ├── pages/
        ├── modules/
        └── components/
```

---

## i18n Key Structure
```
{
  "common": { "save", "cancel", "delete", "edit", "search", ... },
  "admin": { "dashboard", "sidebar", "settings", ... },
  "unatienda": { "catalog", "orders", "inventory", ... },
  "auth": { "login", "logout", "welcome", ... },
  "errors": { "required", "invalid", "notFound", ... }
}
```

---

## Test Credentials
- **Admin Email**: `teck@koh.one`
- **Admin Password**: `Acdb##0897`

---

## Notes
- User communicates in Spanish, agent responds professionally in English for technical matters
- All UI text must use i18n system for multi-language support
- Database field names remain in current state for backward compatibility
