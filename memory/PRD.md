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
- ✅ Database collections with module-specific prefixes
- ✅ Service Layer + Repository Pattern
- ✅ Frontend folder renamed from `pingpong` to `pinpanclub` for consistency

### Super Pin Feature (P0 - COMPLETED ✅)
1. ✅ League management (create, activate, list)
2. ✅ Multiple check-in methods selection (QR, Manual, Geolocation)
3. ✅ "Back to PinpanClub" navigation button
4. ✅ Player source selection (PinpanClub, App Users, Monday.com)
5. ✅ Ranking system with ELO or Simple Points
6. ✅ Match tracking and scoring
7. ✅ Admin Dashboard at /pinpanclub/superpin/admin
8. ✅ Public Ranking View at /pinpanclub/superpin/ranking

### Multi-language Support (P1 - COMPLETED ✅)
- ✅ i18next integrated for ALL Super Pin components
- ✅ Languages: Spanish (ES), English (EN), Chinese (ZH)
- ✅ All components translated: Admin, Ranking, LeagueDetail, Match, CheckIn, Tournament

### Check-in System (P1 - COMPLETED ✅)
- ✅ Manual check-in
- ✅ QR Code check-in (QR generation + validation)
- ✅ Geolocation check-in (coordinates validation)
- ✅ Present Players list with check-out
- ✅ Backend endpoints: checkin, checkout, available-players

### Tournament System (P2 - COMPLETED ✅)
- ✅ Create season tournaments from top-ranked players
- ✅ Bracket generation (single elimination)
- ✅ Match result tracking with winner progression
- ✅ Bracket visualization at /pinpanclub/superpin/tournament/:torneoId
- ✅ Third place match support
- ✅ Final results display (Champion, Runner-up, Third Place)
- ✅ "Create Tournament" button in league detail page

## Key API Endpoints

### Super Pin
- `GET/POST /api/pinpanclub/superpin/leagues` - Leagues CRUD
- `GET /api/pinpanclub/superpin/leagues/{id}/ranking` - Ranking
- `POST /api/pinpanclub/superpin/matches` - Create match
- `POST /api/pinpanclub/superpin/leagues/{id}/checkin` - Check-in
- `POST /api/pinpanclub/superpin/leagues/{id}/checkout` - Check-out

### Tournaments
- `POST /api/pinpanclub/superpin/tournaments` - Create tournament
- `GET /api/pinpanclub/superpin/tournaments/{id}/brackets` - Get brackets
- `POST /api/pinpanclub/superpin/tournaments/{id}/generate-brackets` - Generate brackets
- `POST /api/pinpanclub/superpin/tournaments/{id}/matches/{match_id}/result` - Update result

## Database Collections
- `auth_users`, `pinpanclub_players`, `pinpanclub_superpin_leagues`
- `pinpanclub_superpin_matches`, `pinpanclub_superpin_rankings`
- `pinpanclub_superpin_checkins`, `pinpanclub_superpin_tournaments`

## Tech Stack
- **Backend:** FastAPI, Pydantic, MongoDB (motor)
- **Frontend:** React, TailwindCSS, i18next, Shadcn/UI
- **Integrations:** Monday.com API, qrcode.react

## Test Credentials
- Email: admin@libreria.com
- Password: admin

## Current Status
✅ **P0 + P1 + P2 Complete** - Super Pin fully functional with check-in system and tournament brackets.

## Test Results Summary
- **iteration_3.json:** P0 improvements (12/12 passed)
- **iteration_4.json:** P1 check-in + i18n (15/15 passed)
- **iteration_5.json:** P2 tournaments (19/19 passed)

## Roadmap

### P3 - Future Enhancements
1. Advanced statistics and prize system
2. Real-time notifications
3. Full containerization when needed

---
*Last Updated: January 2026*
*Completed: P0 (3 enhancements) + P1 (i18n + check-in) + P2 (tournaments)*
