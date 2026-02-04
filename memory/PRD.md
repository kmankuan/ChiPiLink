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
**PinpanClub Module English Refactoring - IN PROGRESS**

The session is focused on completing the 100% English-only refactoring mandate, particularly in the `pinpanclub` module.

---

## What's Been Implemented

### December 2025 - PinpanClub Module English Refactoring (Current Session)

**Progress: ~60% Complete** - Backend models and schemas refactored, frontend components partially updated

#### Backend Model Files Fully Refactored:
- `/app/backend/modules/pinpanclub/models/schemas.py` - All enums, player/match/tournament models refactored ✅
- `/app/backend/modules/pinpanclub/models/challenges.py` - Challenge models and auto-generated challenge text ✅
- `/app/services/pinpanclub/app/models/superpin.py` - League, match, ranking models refactored ✅
- `/app/backend/modules/pinpanclub/services/match_service.py` - Match service logic refactored ✅

#### Frontend Components Refactored:
- `SuperPinMatch.jsx` - Updated param names (partidoId → matchId), recordPoint logic ✅
- `RankingSeasons.jsx` - Updated prop names (jugadorId → playerId), component exports ✅
- `WeeklyChallenges.jsx` - Removed legacy prop fallbacks, updated leaderboard rendering ✅
- `PlayerRankBadge.jsx` - Removed legacy prop fallbacks ✅
- `SocialFeatures.jsx` - Removed legacy prop fallbacks ✅
- `AchievementShowcase.jsx` - Removed legacy prop fallbacks ✅
- `RankRewardsDisplay.jsx` - Removed legacy prop fallbacks ✅
- `PingPongMobileArbiter.jsx` - Updated action handlers, UI text ✅

#### Field Name Changes Applied:
| Spanish Field       | English Field       |
|--------------------|---------------------|
| `jugador_id`       | `player_id`         |
| `jugador_a_id`     | `player_a_id`       |
| `jugador_b_id`     | `player_b_id`       |
| `ganador_id`       | `winner_id`         |
| `partido_id`       | `match_id`          |
| `liga_id`          | `league_id`         |
| `torneo_id`        | `tournament_id`     |
| `puntos_totales`   | `total_points`      |
| `partidos_jugados` | `matches_played`    |
| `partidos_ganados` | `matches_won`       |
| `racha_actual`     | `current_streak`    |
| `estado`           | `status`            |
| `nombre`           | `name`              |
| `apodo`            | `nickname`          |
| `apellido`         | `last_name`         |
| `puntos_por_set`   | `points_per_set`    |
| `set_actual`       | `current_set`       |
| `mejor_de`         | `best_of`           |
| `historial_sets`   | `sets_history`      |
| `nivel`            | `level`             |
| `temporada`        | `season`            |
| `foto_url`         | `photo_url`         |
| `telefono`         | `phone`             |

#### Remaining Work (P0 - High Priority):
- **~72 files still contain Spanish terms** in frontend/backend
- Key backend files pending: websocket.py, rapidpin_service.py, public_feed.py, monday_service.py
- Key frontend files pending: PingPongTV.jsx, PingPongDashboard.jsx, PlayerComparison.jsx, AnalyticsDashboard.jsx

#### Database Decision:
- User confirmed they will redeploy with a fresh database
- All backward-compatibility fallbacks being removed from code
- Code now uses pure English field names only

### February 2026 - i18n Integration & Language Sync (Previous Session)

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

### February 2026 - Complete Database Field Names Refactoring ✅

**Progress: 100% Complete** - All Spanish field names have been converted to English

#### Database Field Names Updated:
| Spanish Field       | English Field       |
|--------------------|---------------------|
| `grado`            | `grade`             |
| `grados`           | `grades`            |
| `materia`          | `subject`           |
| `codigo`           | `code`              |
| `precio`           | `price`             |
| `precio_oferta`    | `sale_price`        |
| `cantidad_inventario` | `inventory_quantity` |
| `nombre`           | `name`              |
| `descripcion`      | `description`       |
| `activo`           | `active`            |
| `destacado`        | `featured`          |
| `editorial`        | `publisher`         |
| `es_catalogo_privado` | `is_private_catalog` |
| `tiene_acceso`     | `has_access`        |
| `estudiantes`      | `students`          |

#### Files Completely Rewritten:
- `/app/backend/modules/store/routes/inventory_import.py` - CSV template and processing with English field names
- `/app/backend/modules/store/routes/private_catalog.py` - All API responses use English field names

#### CSV Template Updated:
New column names: `code`, `name`, `grade`, `quantity`, `price`, `subject`, `publisher`, `isbn`, `description`

#### Multiple Grades Feature:
- CSV import now supports multiple grades separated by comma (e.g., "K4,K5")
- Products store both `grade` (primary) and `grades` (array) fields
- Queries check both fields for grade filtering

### December 2025 - Spanish to English Refactoring (Previous Session)

**Progress: 100% Complete** (All Spanish comments and code translated)

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

### P0 - Spanish Code Comments Translation (100% Complete) ✅
**Completed Feb 2026:**
- All backend model files translated ✅
- All backend route files translated ✅
- All backend service files translated ✅
- All Spanish special characters (áéíóúñ) removed from code ✅
- 0 Spanish character instances remaining (down from 1216) ✅

**API Route Prefix Updates:**
- `/api/conexiones/*` → `/api/connections/*` ✅

**File Renaming:**
- `conexiones_models.py` → `connections_models.py` ✅
- `conexiones.py` → `connections.py` ✅
- `conexiones_service.py` → `connections_service.py` ✅
- `catalogo_privado.py` → `private_catalog.py` ✅

### P0 - PinpanClub English Refactoring (IN PROGRESS - 95%)
**Remaining Work:**
- Complete frontend component refactoring for ~10 remaining pinpanclub pages (rapidpin, tournaments, etc.)
- User will redeploy with fresh database (no backward-compatibility needed)

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
