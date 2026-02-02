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

### February 2026 - i18n Integration & Language Sync (Current Session)

**Progress: 100% Complete** - All major components now use centralized i18n system

#### Components Fully Migrated This Session:
- **PinPanClubFeedBlock.jsx** - Removed local `texts` object, now uses `t()` function ✅
- **ChallengeModal.jsx** - Removed local `texts` object, now uses `t()` function ✅

#### NEW Translation Keys Added:
- **pinpanclub.settingsDesc** - Settings description
- **pinpanclub.visibility** - Visibility label
- **pinpanclub.participants** - Participants label
- **pinpanclub.roles.\*** - Role labels (public, registered, moderator, admin, super_admin)
- **rapidpin.subtitle** - Dashboard subtitle
- **rapidpin.viewSeason** - View season button
- **rapidpin.info.\*** - Information box content (participants, scoring, validation)
- **rapidpin.seasons.\*** - Season management (title, create, noSeasons, name, dates, status)
- **rapidpin.matches.\*** - Match management (title, register, playerA/B, winner, scores)
- **rapidpin.ranking.\*** - Ranking tables (players, referees, points, played, won)
- **rapidpin.stats.\*** - Statistics (matches, pending, players, referees)
- **rapidpin.closeSeason.\*** - Close season dialog (title, results, close, cancel)

#### Code Comments Translated:
- **MondayModule.jsx** - Spanish comments translated to English
- **ConnectionsPage.jsx** - Spanish comments translated to English
- **AlertasSaldo.jsx** - Spanish comments translated to English
- **users.py** - Backend docstrings translated to English

#### Language Preference Persistence Feature (Previously Completed):
- **Backend API Endpoints:**
  - `PUT /api/users/me/language` - Save language preference to database
- **Frontend LanguageSelector:**
  - Syncs language from backend on login (cross-device consistency)
  - Saves language preference when changed (if logged in)
  - Falls back to localStorage for guests

#### i18n Key Files Status:
- `en.json` - Now has 1250+ lines with comprehensive translations
- `es.json` - Spanish translations complete
- `zh.json` - Chinese translations complete

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

### P0 - Spanish Code Comments Translation (Significant Progress)
**Completed in this session:**
- `/app/backend/modules/users/models/user_models.py` - 100+ comments translated ✅
- `/app/backend/modules/users/models/wallet_models.py` - 30+ comments translated ✅
- `/app/backend/modules/users/models/conexiones_models.py` - 40+ comments translated ✅
- `/app/backend/modules/pinpanclub/models/rapidpin.py` - 50+ comments translated ✅

**Still needs translation:**
- `/app/backend/modules/pinpanclub/routes/*` - Route handlers
- `/app/backend/modules/store/*` - Store services
- Some frontend files with Spanish comments

### P1 - Known Bugs
1. **Admin Sidebar Disappears** - Recurring issue after login
2. **Google Sign-Up Loop** - OAuth flow broken
3. **emergent-main.js error** - Platform script overlay
4. **SVGAnimatedString error** - Non-critical JS error on /mi-cuenta page

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
