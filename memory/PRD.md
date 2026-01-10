# ChiPi Link - Product Requirements Document

## Original Problem Statement
Sistema multi-módulo "Super App" con enfoque principal en el módulo **PinpanClub** para gestión de clubes de ping pong, incluyendo el sistema de ranking **Super Pin** y el nuevo sistema de partidos espontáneos **Rapid Pin**.

## Completed Features Summary

| Priority | Feature | Tests | Status |
|----------|---------|-------|--------|
| P0 | Super Pin Core + 3 Improvements | 12/12 | ✅ 100% |
| P1 | i18n (ES/EN/ZH) + Check-in System | 15/15 | ✅ 100% |
| P2 | Tournaments + Brackets | 19/19 | ✅ 100% |
| P3 | Badge/Achievement System | 20/20 | ✅ 100% |
| P4 | Player Profile Dashboard | 18/18 | ✅ 100% |
| P5 | Multi-Player Comparison Tool | 20/20 | ✅ 100% |
| P6 | Rapid Pin System | 21/21 | ✅ 100% |
| P7 | Match Predictor + Close Season + Notifications | 17/17 | ✅ 100% |
| **P8** | **P1 Features: Social + Challenges + Real-time** | **24/24** | ✅ **100%** |

**Total: 166/166 tests passed** 🎉

## Latest Features (P8) ✅ NEW (Enero 2026)

### 1. Real-time Notifications System 🔔
Sistema de notificaciones en tiempo real con WebSocket y fallback REST API:
- **WebSocket endpoint:** `/api/pinpanclub/ws/notifications/{user_id}`
- **Centro de notificaciones configurable:** campana en header + panel lateral
- **Tipos de notificaciones:** 
  - match_pending, match_confirmed
  - new_follower, new_comment, new_reaction
  - badge_earned, prize_won
  - challenge_available, challenge_completed
  - season_ending, season_closed

**Endpoints:**
- `GET /api/pinpanclub/social/notifications/{user_id}`
- `GET /api/pinpanclub/social/notifications/{user_id}/unread-count`
- `POST /api/pinpanclub/social/notifications/{notification_id}/read`
- `POST /api/pinpanclub/social/notifications/{user_id}/read-all`

### 2. Weekly Challenges System 🎯
Sistema de retos semanales con progreso y puntos:
- **Retos automáticos:** Se generan semanalmente con diferentes dificultades
- **Dificultades:** Fácil (🟢), Medio (🟡), Difícil (🟠), Extremo (🔴)
- **Leaderboard:** Ranking de jugadores por puntos de retos
- **UI dedicada:** Página `/pinpanclub/challenges` con tabs

**Retos de ejemplo:**
- Jugador Activo: Juega 5 partidos esta semana (50 pts)
- Colaborador: Arbitra 3 partidos esta semana (75 pts)
- Constancia: Juega al menos un partido 4 días diferentes (100 pts)
- Racha Ganadora: Gana 3 partidos seguidos (100 pts)
- Remontada Épica: Gana un partido después de perder el primer set (150 pts)

**Endpoints:**
- `GET /api/pinpanclub/challenges/weekly`
- `GET /api/pinpanclub/challenges/definitions`
- `POST /api/pinpanclub/challenges/start/{challenge_id}`
- `GET /api/pinpanclub/challenges/player/{jugador_id}`
- `GET /api/pinpanclub/challenges/leaderboard`

### 3. Social Features 👥
Sistema de funciones sociales para la comunidad:

**Seguir jugadores:**
- `POST /api/pinpanclub/social/follow`
- `DELETE /api/pinpanclub/social/follow`
- `GET /api/pinpanclub/social/followers/{jugador_id}`
- `GET /api/pinpanclub/social/following/{jugador_id}`
- `GET /api/pinpanclub/social/follow-stats/{jugador_id}`
- `GET /api/pinpanclub/social/is-following`

**Comentarios:**
- `POST /api/pinpanclub/social/comments`
- `GET /api/pinpanclub/social/comments/{target_type}/{target_id}`
- `PUT /api/pinpanclub/social/comments/{comment_id}`
- `DELETE /api/pinpanclub/social/comments/{comment_id}`

**Reacciones:**
- `POST /api/pinpanclub/social/reactions`
- `GET /api/pinpanclub/social/reactions/{target_type}/{target_id}`
- Tipos: 👏 clap, 🔥 fire, 🏆 trophy, ❤️ heart, 😮 wow

**Activity Feed:**
- `GET /api/pinpanclub/social/feed/{jugador_id}`
- `GET /api/pinpanclub/social/feed/{jugador_id}/following`

### 4. Advanced Prizes System 🏆
Sistema de premios avanzado y configurable:

**Endpoints:**
- `GET /api/pinpanclub/prizes/catalog`
- `GET /api/pinpanclub/prizes/definitions`
- `GET /api/pinpanclub/prizes/player/{jugador_id}`
- `POST /api/pinpanclub/prizes/award` (admin)
- `POST /api/pinpanclub/prizes/award/season/{season_id}` (admin)

## Frontend Routes

### Super Pin
- `/pinpanclub/superpin/admin` - Admin Dashboard
- `/pinpanclub/superpin/ranking` - Public Ranking
- `/pinpanclub/superpin/league/:ligaId` - League Detail
- `/pinpanclub/superpin/match/:partidoId` - Match View
- `/pinpanclub/superpin/tournament/:torneoId` - Tournament Brackets
- `/pinpanclub/superpin/player/:jugadorId` - Player Profile
- `/pinpanclub/superpin/compare` - Multi-Player Comparison

### Rapid Pin
- `/pinpanclub/rapidpin` - Dashboard de temporadas
- `/pinpanclub/rapidpin/season/:seasonId` - Vista de temporada

### Weekly Challenges ⭐ NEW
- `/pinpanclub/challenges` - Página de retos semanales

## Database Collections
- `pinpanclub_superpin_leagues`
- `pinpanclub_superpin_matches`
- `pinpanclub_superpin_rankings`
- `pinpanclub_superpin_checkins`
- `pinpanclub_superpin_tournaments`
- `pinpanclub_superpin_badges`

### Rapid Pin Collections
- `pinpanclub_rapidpin_seasons`
- `pinpanclub_rapidpin_matches`
- `pinpanclub_rapidpin_rankings`

### Social Collections ⭐ NEW
- `pinpanclub_follows`
- `pinpanclub_comments`
- `pinpanclub_reactions`
- `pinpanclub_activity_feed`
- `pinpanclub_notifications`

### Challenges Collections ⭐ NEW
- `pinpanclub_challenges_definitions`
- `pinpanclub_challenges_progress`
- `pinpanclub_challenges_weekly`
- `pinpanclub_challenges_leaderboard`

### Prizes Collections ⭐ NEW
- `pinpanclub_prizes_catalog`
- `pinpanclub_prizes_definitions`
- `pinpanclub_prizes_awarded`

## Test Credentials
- Email: admin@libreria.com
- Password: admin
- Auth endpoint: `/api/auth-v2/login` (field: `contrasena`)

## Tareas Pendientes (Consolidadas)

### P1 - Completadas ✅
1. ~~Sistema de premios avanzado configurable~~ ✅
2. ~~Real-time notifications (WebSocket)~~ ✅
3. ~~Social features: Seguir jugadores, comentarios~~ ✅
4. ~~Weekly challenges system~~ ✅

### P2 - Próximas
1. **Analytics Dashboard:** Estadísticas avanzadas de la comunidad, visualización de tendencias
2. **Integración Social en Perfiles:** Añadir botón "Seguir" a perfiles de jugadores
3. **Comentarios en Partidos:** Sección de comentarios en detalles de partidos

### P3 - Backlog
1. **Containerización completa:** Desplegar módulos como microservicios separados
2. **Mobile app:** Versión nativa para iOS/Android

## Known Issues
- **WebSocket en Preview:** Las conexiones WebSocket pueden fallar en el ambiente de preview debido a la configuración del ingress. El sistema tiene fallback a REST API que funciona correctamente.

---
*Last Updated: January 2026*
*All Priorities Complete: P0 + P1 + P2 + P3 + P4 + P5 + P6 + P7 + P8*
*166/166 tests passed across all features*
