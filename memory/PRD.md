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
| P6 | **Rapid Pin System** | 21/21 | ✅ 100% |

**Total: 125/125 tests passed** 🎉

## Feature Details

### Rapid Pin System (P6) ✅ NEW (Enero 2026)
Sistema de partidos espontáneos sin organización previa. "¿Echamos un Rapid Pin?"

**Concepto Core:**
- 2 jugadores + 1 árbitro = Partido válido
- Sin organización previa requerida
- Ranking acumulativo por temporada

**Sistema de Puntuación:**
| Resultado | Puntos |
|-----------|--------|
| Victoria | +3 |
| Derrota | +1 |
| Árbitro | +2 |

**Validación de Partidos:**
- Cualquiera de los 3 puede registrar
- Estado inicial: "Pendiente"
- Requiere 1 confirmación adicional → "Validado"
- Solo partidos validados cuentan

**Temporadas:**
- Múltiples temporadas paralelas permitidas
- Fecha de cierre configurable
- Premios para jugadores Y árbitros

**Frontend Pages:**
- `/pinpanclub/rapidpin` - Dashboard de temporadas
- `/pinpanclub/rapidpin/season/:seasonId` - Detalle con ranking y partidos

**API Endpoints:**
- `GET/POST /api/pinpanclub/rapidpin/seasons` - Gestión de temporadas
- `GET /api/pinpanclub/rapidpin/seasons/{id}` - Detalle de temporada
- `POST /api/pinpanclub/rapidpin/matches` - Registrar partido
- `POST /api/pinpanclub/rapidpin/matches/{id}/confirm` - Confirmar partido
- `GET /api/pinpanclub/rapidpin/seasons/{id}/ranking` - Ranking de jugadores
- `GET /api/pinpanclub/rapidpin/seasons/{id}/ranking/referees` - Ranking de árbitros
- `GET /api/pinpanclub/rapidpin/scoring` - Config de puntuación

### Multi-Player Comparison (P5) ✅
- **Unlimited player selection** - Add as many players as desired
- **Searchable player dropdown** - Filter players by name/nickname
- **Comparison table with 10+ statistics:**
  - Total Matches, Wins, Losses, Win Rate
  - Sets Won, Set Win Rate, Best Streak
  - ELO Rating, Total Badges, Legendary Badges
- **Best-in-category highlighting** - Green background + 👑 crown
- **Recent Form row** - W/L indicators (green/red)
- **Badges preview row** - Shows player badges
- **Individual removal** - X button per player
- **Clear All button** - Reset entire comparison
- **Access from Ranking** - "Compare Players" button

## Frontend Routes

### Super Pin
- `/pinpanclub/superpin/admin` - Admin Dashboard
- `/pinpanclub/superpin/ranking` - Public Ranking
- `/pinpanclub/superpin/league/:ligaId` - League Detail
- `/pinpanclub/superpin/match/:partidoId` - Match View
- `/pinpanclub/superpin/tournament/:torneoId` - Tournament Brackets
- `/pinpanclub/superpin/player/:jugadorId` - Player Profile
- `/pinpanclub/superpin/compare` - Multi-Player Comparison

### Rapid Pin ⭐ NEW
- `/pinpanclub/rapidpin` - Dashboard de temporadas
- `/pinpanclub/rapidpin/season/:seasonId` - Vista de temporada

## API Endpoints

### Core
- `GET/POST /api/pinpanclub/superpin/leagues`
- `GET /api/pinpanclub/superpin/leagues/{id}/ranking`
- `POST /api/pinpanclub/superpin/matches`
- `POST /api/pinpanclub/superpin/leagues/{id}/checkin`
- `POST /api/pinpanclub/superpin/leagues/{id}/checkout`

### Tournaments
- `POST /api/pinpanclub/superpin/tournaments`
- `POST /api/pinpanclub/superpin/tournaments/{id}/generate-brackets`
- `GET /api/pinpanclub/superpin/tournaments/{id}/brackets`
- `POST /api/pinpanclub/superpin/tournaments/{id}/award-badges`

### Badges
- `GET /api/pinpanclub/superpin/badges/definitions`
- `GET /api/pinpanclub/superpin/badges/recent`
- `GET /api/pinpanclub/superpin/badges/leaderboard`
- `GET /api/pinpanclub/superpin/players/{id}/badges`

### Player Statistics
- `GET /api/pinpanclub/superpin/players/{id}/statistics`
- `GET /api/pinpanclub/superpin/head-to-head`

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

## Test Credentials
- Email: admin@libreria.com
- Password: admin
- Auth endpoint: `/api/auth-v2/login` (field: `contrasena`)

## Tareas Pendientes (Consolidadas)

### P1 - Próximas
1. **Head-to-Head Match Predictor:** Predecir ganador entre dos jugadores basándose en ELO e historial
2. **Cierre de temporada Rapid Pin:** Implementar UI para cerrar temporada y asignar premios automáticamente
3. **Notificaciones de partidos pendientes:** Alertar a usuarios con partidos sin confirmar

### P2 - Futuras
1. **Sistema de premios avanzado configurable:** Expandir premios más allá de badges
2. **Real-time notifications (WebSocket):** Notificaciones en tiempo real
3. **Social features:** Seguir jugadores, comentarios
4. **Weekly challenges system:** Retos semanales

### P3 - Backlog
1. **Containerización completa:** Desplegar módulos como microservicios separados
2. **Analytics dashboard:** Estadísticas avanzadas de la comunidad

---
*Last Updated: January 2026*
*All Priorities Complete: P0 + P1 + P2 + P3 + P4 + P5 + P6*
*125/125 tests passed across all features*
