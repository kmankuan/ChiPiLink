# ChiPi Link - Product Requirements Document

## Original Problem Statement
Sistema multi-módulo "Super App" con enfoque principal en el módulo **PinpanClub** para gestión de clubes de ping pong, incluyendo el sistema de ranking **Super Pin**.

## Target Users
- Administradores de clubes de ping pong
- Jugadores registrados
- Espectadores y visitantes

## Core Requirements

### Architecture (COMPLETED ✅)
- ✅ Modular Monolith architecture (microservices-ready)
- ✅ Backend organized into modules: auth, store, pinpanclub, community
- ✅ Database collections with module-specific prefixes (auth_users, pinpanclub_players, etc.)
- ✅ Service Layer + Repository Pattern
- ✅ In-memory Event Bus for inter-module communication

### Super Pin Feature (P0 - COMPLETED ✅)
**Implemented Features:**
1. ✅ League management (create, activate, list)
2. ✅ Multiple check-in methods selection (QR, Manual, Geolocation)
3. ✅ "Back to PinpanClub" navigation button
4. ✅ Player source selection in new match modal:
   - PinpanClub registered players
   - App registered users
   - Monday.com integration
5. ✅ Ranking system with ELO or Simple Points
6. ✅ Match tracking and scoring
7. ✅ Admin Dashboard at /pinpanclub/superpin/admin
8. ✅ Public Ranking View at /pinpanclub/superpin/ranking
9. ✅ League Detail View with ranking table

### Multi-language Support (P1 - COMPLETED ✅)
- ✅ i18next integrated for ALL Super Pin components
- ✅ SuperPinAdmin.jsx fully translated
- ✅ SuperPinRanking.jsx fully translated
- ✅ SuperPinLeagueDetail.jsx fully translated (Jan 2026)
- ✅ SuperPinMatch.jsx fully translated (Jan 2026)
- ✅ SuperPinCheckIn.jsx fully translated (Jan 2026)
- Languages: Spanish (ES), English (EN), Chinese (ZH)

### Check-in Functionality (P1 - COMPLETED ✅)
- ✅ Manual check-in implementation
- ✅ QR Code check-in implementation (QR generation + validation)
- ✅ Geolocation check-in implementation (with coordinates validation)
- ✅ Check-in tab in League Detail page (only for active leagues)
- ✅ Present Players list with check-out functionality
- ✅ Backend endpoints: checkin, checkout, available-players

### Season Tournaments (P2 - PENDING ⏳)
- ⏳ Bracket view for top 8 players
- ⏳ Tournament creation and management

## Key API Endpoints
- `GET /api/pinpanclub/superpin/leagues` - List leagues
- `POST /api/pinpanclub/superpin/leagues` - Create league (admin)
- `GET /api/pinpanclub/superpin/leagues/{id}` - League detail
- `GET /api/pinpanclub/superpin/leagues/{id}/ranking` - Ranking table
- `POST /api/pinpanclub/superpin/matches` - Create match
- `POST /api/pinpanclub/superpin/leagues/{id}/checkin` - Player check-in
- `POST /api/pinpanclub/superpin/leagues/{id}/checkout` - Player check-out
- `GET /api/pinpanclub/superpin/leagues/{id}/available-players` - Checked-in players
- `GET /api/auth-v2/users` - List registered users (admin)
- `GET /api/pinpanclub/monday/players` - Get players from Monday.com (admin)

## Database Collections
- `auth_users` - Registered users
- `pinpanclub_players` - Registered players
- `pinpanclub_superpin_leagues` - Super Pin leagues
- `pinpanclub_superpin_matches` - Super Pin matches
- `pinpanclub_superpin_rankings` - Player rankings per league
- `pinpanclub_superpin_checkins` - Check-in records

## Tech Stack
- **Backend:** FastAPI, Pydantic, MongoDB (motor)
- **Frontend:** React, TailwindCSS, i18next, Shadcn/UI
- **Integrations:** Monday.com API, qrcode.react

## Test Credentials
- Email: admin@libreria.com
- Password: admin

## Current Status
✅ **P0 + P1 Complete** - Super Pin feature fully functional with all 3 check-in methods and complete multi-language support (ES/EN/ZH).

## Roadmap

### P2 - Next Priority
1. Season tournaments with bracket view (top 8 players)
2. Advanced statistics and prize system

### P3 - Future
1. Full containerization when needed
2. Real-time notifications

---
*Last Updated: January 2026*
*Completed: P0 improvements (3 enhancements) + P1 (i18n + check-in system)*
