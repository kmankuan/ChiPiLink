# ChiPi Link - Product Requirements Document

## Original Problem Statement
Sistema multi-módulo "Super App" con enfoque principal en el módulo **PinpanClub** para gestión de clubes de ping pong, incluyendo el sistema de ranking **Super Pin**.

## Target Users
- Administradores de clubes de ping pong
- Jugadores registrados
- Espectadores y visitantes

## Core Requirements

### Architecture (COMPLETED)
- ✅ Modular Monolith architecture (microservices-ready)
- ✅ Backend organized into modules: auth, store, pinpanclub, community
- ✅ Database collections with module-specific prefixes (auth_users, pinpanclub_players, etc.)
- ✅ Service Layer + Repository Pattern
- ✅ In-memory Event Bus for inter-module communication

### Super Pin Feature (P0 - COMPLETED)
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

### Multi-language Support (P1 - PARTIAL)
- ✅ i18next integrated for SuperPinAdmin and SuperPinRanking
- ⏳ SuperPinLeagueDetail and SuperPinMatch need translations

### Check-in Functionality (P1 - PENDING)
- ⏳ QR Code check-in implementation
- ⏳ Manual check-in implementation  
- ⏳ Geolocation check-in implementation

### Season Tournaments (P2 - PENDING)
- ⏳ Bracket view for top 8 players
- ⏳ Tournament creation and management

## Key API Endpoints
- `GET /api/pinpanclub/superpin/leagues` - List leagues
- `POST /api/pinpanclub/superpin/leagues` - Create league (admin)
- `GET /api/pinpanclub/superpin/leagues/{id}` - League detail
- `GET /api/pinpanclub/superpin/leagues/{id}/ranking` - Ranking table
- `POST /api/pinpanclub/superpin/matches` - Create match
- `GET /api/auth-v2/users` - List registered users (admin)
- `GET /api/pinpanclub/monday/players` - Get players from Monday.com (admin)

## Database Collections
- `auth_users` - Registered users
- `pinpanclub_players` - Registered players
- `pinpanclub_superpin_leagues` - Super Pin leagues
- `pinpanclub_superpin_matches` - Super Pin matches
- `pinpanclub_superpin_rankings` - Player rankings per league

## Tech Stack
- **Backend:** FastAPI, Pydantic, MongoDB (motor)
- **Frontend:** React, TailwindCSS, i18next, Shadcn/UI
- **Integrations:** Monday.com API

## Test Credentials
- Email: admin@libreria.com
- Password: admin

## Current Status
✅ MVP Complete - Super Pin feature fully functional with all 3 priority improvements implemented and tested.

## Roadmap

### P1 - Next Priority
1. Complete multi-language for SuperPinLeagueDetail.jsx and SuperPinMatch.jsx
2. Implement check-in functionality (QR, Manual, Geo)

### P2 - Future
1. Season tournaments with bracket view
2. Advanced statistics and prize system
3. Full containerization when needed

---
*Last Updated: January 2026*
