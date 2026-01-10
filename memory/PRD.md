# ChiPi Link - Product Requirements Document

## Original Problem Statement
Sistema multi-módulo "Super App" con enfoque principal en el módulo **PinpanClub** para gestión de clubes de ping pong, incluyendo el sistema de ranking **Super Pin**.

## Target Users
- Administradores de clubes de ping pong
- Jugadores registrados
- Espectadores y visitantes

## Completed Features

### Architecture (COMPLETED ✅)
- ✅ Modular Monolith architecture (microservices-ready)
- ✅ Backend organized into modules: auth, store, pinpanclub, community
- ✅ Frontend folder renamed from `pingpong` to `pinpanclub`
- ✅ Service Layer + Repository Pattern

### Super Pin Feature - P0 (COMPLETED ✅)
1. ✅ League management (create, activate, list)
2. ✅ Multiple check-in methods (QR, Manual, Geolocation)
3. ✅ Player source selection (PinpanClub, App Users, Monday.com)
4. ✅ Ranking system with ELO or Simple Points
5. ✅ Match tracking and scoring
6. ✅ Admin Dashboard at /pinpanclub/superpin/admin
7. ✅ Public Ranking View at /pinpanclub/superpin/ranking

### Multi-language Support - P1 (COMPLETED ✅)
- ✅ i18next for ALL Super Pin components
- ✅ Languages: Spanish (ES), English (EN), Chinese (ZH)

### Check-in System - P1 (COMPLETED ✅)
- ✅ Manual, QR Code, Geolocation check-in
- ✅ Present Players list with check-out
- ✅ Backend endpoints: checkin, checkout, available-players

### Tournament System - P2 (COMPLETED ✅)
- ✅ Create season tournaments from top-ranked players
- ✅ Single elimination bracket generation
- ✅ Bracket visualization at /pinpanclub/superpin/tournament/:torneoId
- ✅ Match result tracking with winner progression
- ✅ Final results display (Champion, Runner-up, Third Place)

### Badge/Achievement System - P3 (COMPLETED ✅)
- ✅ 11 badge types defined with icons and rarities
- ✅ Automatic badge awarding for tournament winners
- ✅ Badge awarding for match milestones (first win, streaks, matches played)
- ✅ Player badges displayed in ranking table (compact mode)
- ✅ Badge leaderboard and recent badges feed
- ✅ i18n support for badge names and descriptions

**Badge Types:**
| Badge | Icon | Rarity | Trigger |
|-------|------|--------|---------|
| Tournament Champion | 🏆 | Legendary | Win tournament |
| Tournament Runner-up | 🥈 | Epic | 2nd place |
| Tournament Third | 🥉 | Rare | 3rd place |
| Season MVP | ⭐ | Legendary | Best player |
| On Fire (5 wins) | 🔥 | Rare | 5 win streak |
| Unstoppable (10 wins) | 🔥 | Epic | 10 win streak |
| Veteran (50 matches) | 🎮 | Common | 50 matches |
| Legend (100 matches) | 🎮 | Epic | 100 matches |
| First Win | 🌟 | Common | First victory |
| Perfect Set | 💯 | Rare | Win 11-0 |
| Comeback King | 👑 | Epic | Win from 0-2 |

## API Endpoints

### Super Pin Core
- `GET/POST /api/pinpanclub/superpin/leagues`
- `GET /api/pinpanclub/superpin/leagues/{id}/ranking`
- `POST /api/pinpanclub/superpin/matches`
- `POST /api/pinpanclub/superpin/leagues/{id}/checkin`
- `POST /api/pinpanclub/superpin/leagues/{id}/checkout`

### Tournaments
- `POST /api/pinpanclub/superpin/tournaments`
- `POST /api/pinpanclub/superpin/tournaments/{id}/generate-brackets`
- `GET /api/pinpanclub/superpin/tournaments/{id}/brackets`
- `POST /api/pinpanclub/superpin/tournaments/{id}/matches/{match_id}/result`
- `POST /api/pinpanclub/superpin/tournaments/{id}/award-badges`

### Badges
- `GET /api/pinpanclub/superpin/badges/definitions`
- `GET /api/pinpanclub/superpin/badges/recent`
- `GET /api/pinpanclub/superpin/badges/leaderboard`
- `GET /api/pinpanclub/superpin/players/{id}/badges`

## Database Collections
- `auth_users`, `pinpanclub_players`
- `pinpanclub_superpin_leagues`, `pinpanclub_superpin_matches`
- `pinpanclub_superpin_rankings`, `pinpanclub_superpin_checkins`
- `pinpanclub_superpin_tournaments`, `pinpanclub_superpin_badges`

## Tech Stack
- **Backend:** FastAPI, Pydantic, MongoDB (motor)
- **Frontend:** React, TailwindCSS, i18next, Shadcn/UI
- **Integrations:** Monday.com API, qrcode.react

## Test Results Summary
| Iteration | Feature | Tests | Status |
|-----------|---------|-------|--------|
| 3 | P0 Improvements | 12/12 | ✅ 100% |
| 4 | P1 Check-in + i18n | 15/15 | ✅ 100% |
| 5 | P2 Tournaments | 19/19 | ✅ 100% |
| 6 | P3 Badges | 20/20 | ✅ 100% |

## Current Status
✅ **ALL PRIORITIES COMPLETE** (P0 + P1 + P2 + P3)

## Test Credentials
- Email: admin@libreria.com
- Password: admin

## Future Enhancements (Backlog)
1. Real-time notifications (WebSocket)
2. Player statistics dashboard
3. Social features (follow players, comments)
4. Full containerization

---
*Last Updated: January 2026*
*Completed: P0 (improvements) + P1 (i18n + check-in) + P2 (tournaments) + P3 (badges)*
