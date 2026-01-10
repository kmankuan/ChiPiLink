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
| P8 | P1 Features: Social + Challenges + Real-time | 24/24 | ✅ 100% |
| **P9** | **P2 Features: Analytics + Achievements + Socials** | **22/22** | ✅ **100%** |

**Total: 188/188 tests passed** 🎉

## Latest Features (P9) ✅ NEW (Enero 2026)

### 1. Analytics Dashboard 📊
Dashboard completo de estadísticas y tendencias de la comunidad:
- **Ruta:** `/pinpanclub/analytics`
- **Endpoint:** `GET /api/pinpanclub/analytics/dashboard`
- **Métricas incluidas:**
  - Jugadores activos totales
  - Partidos esta semana (Super Pin + Rapid Pin)
  - Retos completados
  - Actividad semanal (gráfico de barras)
  - Distribución Super Pin vs Rapid Pin
  - Top jugadores más activos
  - Logros recientes
  - Ranking de retos (leaderboard)
  - Retos populares

**Endpoints:**
- `GET /api/pinpanclub/analytics/dashboard` - Dashboard completo
- `GET /api/pinpanclub/analytics/summary` - Resumen rápido

### 2. Sistema de Logros Automáticos 🏆
Sistema que otorga logros automáticamente al completar retos:
- **11 tipos de logros diferentes**
- **Rarezas:** Común, Raro, Épico, Legendario
- **Triggers automáticos** al completar retos

**Logros disponibles:**
| Nombre | Requisito | Rareza | Puntos |
|--------|-----------|--------|--------|
| Principiante | 1 reto completado | Común | 10 |
| Retador | 5 retos completados | Común | 25 |
| Maestro de Retos | 25 retos | Raro | 100 |
| Leyenda de Retos | 100 retos | Legendario | 500 |
| Semana Perfecta | Todos los retos de una semana | Épico | 200 |
| Constante | 3 semanas seguidas | Raro | 75 |
| Imparable | 10 semanas seguidas | Épico | 300 |
| Coleccionista | 500 puntos | Raro | 50 |
| Gran Coleccionista | 2000 puntos | Épico | 200 |
| Valiente | 5 retos difíciles | Raro | 100 |
| Intrépido | 3 retos extremos | Épico | 200 |

**Endpoints:**
- `GET /api/pinpanclub/achievements/` - Listar todos los logros
- `GET /api/pinpanclub/achievements/player/{jugador_id}` - Logros del jugador
- `POST /api/pinpanclub/achievements/check/{jugador_id}` - Verificar y otorgar
- `POST /api/pinpanclub/achievements/initialize` - Inicializar logros (admin)

### 3. Social Features Expandido 👥

#### Botón "Seguir" en Perfiles
- Integrado en `/pinpanclub/superpin/player/{jugadorId}`
- Muestra contador de seguidores/siguiendo
- Solo visible para usuarios autenticados
- No aparece en tu propio perfil

#### Sistema de Comentarios con Moderación
- Comentarios en perfiles de jugadores y partidos
- **Reglas de la comunidad** mostradas al escribir:
  - Respeto a todos los miembros
  - Sin lenguaje obsceno
  - Sin malos valores o pensamientos negativos
  - Sin comentarios que provoquen consecuencias negativas
- **Sistema de amonestaciones:**
  - Primera infracción: Amonestación
  - Con amonestaciones: Comentarios requieren moderación previa
- Opción de reportar comentarios

**Endpoints nuevos:**
- `GET /api/pinpanclub/social/user/{user_id}/warnings` - Obtener amonestaciones
- `POST /api/pinpanclub/social/comments/{comment_id}/report` - Reportar comentario

### 4. Achievement Showcase (Badges Visuales) 🎖️ NEW
Componente visual de badges en el header del perfil:
- **Muestra los 5 logros más importantes** (ordenados por rareza)
- **Etiqueta "NEW"** para logros obtenidos en las últimas 24 horas
- **Estilos por rareza:**
  - Común: Fondo gris, borde gris
  - Raro: Fondo azul, borde azul con sombra
  - Épico: Fondo púrpura, borde púrpura, icono de sparkles
  - Legendario: Fondo dorado, borde amarillo, animación de pulso
- **Tooltips interactivos** con descripción completa del logro
- **Animación de celebración** (confeti) al obtener logros recientes
- **Contador "+X"** para logros adicionales

**Archivo:** `/app/frontend/src/modules/pinpanclub/components/AchievementShowcase.jsx`

### 5. Sistema de Niveles/Ranks 🏅 NEW
Sistema de ranking basado en puntos acumulados de retos:
- **7 niveles progresivos:**

| Rango | Puntos | Icono | Descripción |
|-------|--------|-------|-------------|
| Bronce | 0-99 | 🥉 | Iniciando tu camino |
| Plata | 100-299 | 🥈 | Jugador comprometido |
| Oro | 300-599 | 🥇 | Jugador destacado |
| Platino | 600-999 | 💎 | Élite del club |
| Diamante | 1000-1999 | 💠 | Leyenda viviente |
| Maestro | 2000-4999 | 👑 | Dominador absoluto |
| Gran Maestro | 5000+ | 🏆 | El mejor de todos |

**Características:**
- **Badge compacto** en esquina del avatar (con tooltip)
- **Tarjeta de progreso** con barra visual hacia siguiente nivel
- **Tooltips interactivos** con info del rango
- **Animaciones para rangos altos** (pulse, sparkles para Diamante+)
- **Badge "MAX"** al alcanzar Gran Maestro
- **Efectos shimmer** en barra de progreso

**Endpoints:**
- `GET /api/pinpanclub/challenges/player/{jugador_id}/rank` - Info completa del rango

**Archivos:**
- `/app/frontend/src/modules/pinpanclub/components/PlayerRankBadge.jsx`
- `/app/backend/modules/pinpanclub/routes/challenges.py` (nuevo endpoint)

### 6. Recompensas Automáticas por Subida de Rango 🎁 NEW
Sistema de recompensas que se otorgan automáticamente al subir de rango:

| Rango | Recompensa | Badges/Perks |
|-------|------------|--------------|
| Plata | +50 pts | - |
| Oro | +100 pts | - |
| Platino | +200 pts | ⚡ Badge "Élite del Club" (rare) |
| Diamante | +500 pts | Título "Leyenda" |
| Maestro | +1000 pts | 👑 Badge "Maestro Supremo" (epic) + VIP Access |
| Gran Maestro | +2500 pts | 🏆 Badge Legendario + Hall of Fame + Todos los perks |

**Características:**
- **Detección automática** de promoción al completar retos
- **Multi-idioma** (es, en, zh) para nombres y descripciones
- **Modal de celebración** con confeti al subir de rango
- **Historial de promociones** por jugador
- **Prevención de duplicados** - no otorga recompensa si ya fue recibida
- **Notificaciones** automáticas al subir de rango
- **Activity Feed** - se publica en el feed social

**Endpoints:**
- `GET /api/pinpanclub/rank-rewards/info?lang=es` - Info de todos los rangos con recompensas
- `GET /api/pinpanclub/rank-rewards/current/{jugador_id}?lang=es` - Rango actual con progreso
- `GET /api/pinpanclub/rank-rewards/player/{jugador_id}/history` - Historial de promociones
- `POST /api/pinpanclub/rank-rewards/check-promotion/{jugador_id}?old_points=X&new_points=Y` - Verificar y otorgar promoción

**Archivos:**
- `/app/backend/modules/pinpanclub/services/rank_rewards_service.py`
- `/app/backend/modules/pinpanclub/routes/rank_rewards.py`
- `/app/frontend/src/modules/pinpanclub/components/RankRewardsDisplay.jsx`

**Test Results:** 15/15 tests passed (100%)

### 7. Sistema de Temporadas de Ranking 🏆 NEW
Sistema de temporadas competitivas con resets periódicos y recompensas exclusivas:

**Características Principales:**
- **Auto-creación de temporadas mensuales** con fechas y nombres localizados
- **Contador regresivo** en tiempo real (días, horas, minutos)
- **Leaderboard de temporada** ordenado por puntos con iconos de posición
- **5 niveles de recompensas** al final de cada temporada
- **Temas visuales** por temporada (primavera, verano, otoño, invierno, campeonato)
- **Requisitos de calificación:** mín. 5 retos + 50 puntos

**Recompensas por Posición:**
| Tier | Posición | Puntos Bonus | Badge | Perks |
|------|----------|--------------|-------|-------|
| Champion | #1 | +1000 | 🏆 Legendario | frame, emotes, priority |
| Top 3 | #2-3 | +500 | 🥇 Épico | frame |
| Top 10 | #4-10 | +250 | ⭐ Raro | - |
| Top 25 | #11-25 | +100 | 🌟 Común | - |
| Participant | #26+ | +25 | - | - |

**Multi-idioma:** Nombres, descripciones y notificaciones en ES, EN, ZH

**Endpoints:**
- `GET /api/pinpanclub/seasons/current?lang=es` - Temporada activa con localización
- `GET /api/pinpanclub/seasons/current/leaderboard` - Clasificación de temporada
- `GET /api/pinpanclub/seasons/player/{jugador_id}/current` - Stats del jugador
- `GET /api/pinpanclub/seasons/player/{jugador_id}/rewards` - Recompensas ganadas
- `GET /api/pinpanclub/seasons/all` - Todas las temporadas
- `GET /api/pinpanclub/seasons/past` - Temporadas pasadas
- `POST /api/pinpanclub/seasons/{season_id}/close` - Cerrar y otorgar recompensas (admin)
- `POST /api/pinpanclub/seasons/ensure-active` - Asegurar temporada activa (cron)

**Frontend:** `/pinpanclub/seasons` y `/pinpanclub/seasons/:seasonId`

**Archivos:**
- `/app/backend/modules/pinpanclub/models/seasons.py`
- `/app/backend/modules/pinpanclub/services/seasons_service.py`
- `/app/backend/modules/pinpanclub/routes/seasons.py`
- `/app/frontend/src/modules/pinpanclub/components/RankingSeasons.jsx`
- `/app/frontend/src/modules/pinpanclub/pages/SeasonsPage.jsx`

**Test Results:** 30/30 tests passed (100%)

## Frontend Routes

### Super Pin
- `/pinpanclub/superpin/admin` - Admin Dashboard
- `/pinpanclub/superpin/ranking` - Public Ranking
- `/pinpanclub/superpin/league/:ligaId` - League Detail
- `/pinpanclub/superpin/match/:partidoId` - Match View
- `/pinpanclub/superpin/tournament/:torneoId` - Tournament Brackets
- `/pinpanclub/superpin/player/:jugadorId` - Player Profile (con Social tab)
- `/pinpanclub/superpin/compare` - Multi-Player Comparison

### Rapid Pin
- `/pinpanclub/rapidpin` - Dashboard de temporadas
- `/pinpanclub/rapidpin/season/:seasonId` - Vista de temporada

### Analytics & Challenges ⭐ NEW
- `/pinpanclub/analytics` - Analytics Dashboard
- `/pinpanclub/challenges` - Página de retos semanales

## Database Collections

### Core Collections
- `pinpanclub_superpin_leagues`
- `pinpanclub_superpin_matches`
- `pinpanclub_superpin_rankings`
- `pinpanclub_superpin_checkins`
- `pinpanclub_superpin_tournaments`
- `pinpanclub_superpin_badges`
- `pingpong_players`

### Rapid Pin Collections
- `pinpanclub_rapidpin_seasons`
- `pinpanclub_rapidpin_matches`
- `pinpanclub_rapidpin_rankings`

### Social Collections
- `pinpanclub_follows`
- `pinpanclub_comments`
- `pinpanclub_reactions`
- `pinpanclub_activity_feed`
- `pinpanclub_notifications`
- `pinpanclub_user_moderation` ⭐ NEW
- `pinpanclub_comment_reports` ⭐ NEW

### Challenges Collections
- `pinpanclub_challenges_definitions`
- `pinpanclub_challenges_progress`
- `pinpanclub_challenges_weekly`
- `pinpanclub_challenges_leaderboard`

### Achievements Collections ⭐ NEW
- `pinpanclub_achievements`
- `pinpanclub_player_achievements`

### Prizes Collections
- `pinpanclub_prizes_catalog`
- `pinpanclub_prizes_definitions`
- `pinpanclub_prizes_awarded`

## Test Credentials
- Email: admin@libreria.com
- Password: admin
- Auth endpoint: `/api/auth-v2/login` (field: `contrasena`)
- Test Player: `jugador_544167d88272` (Carlos González / "El Rayo")

## 🆕 PHASE 1: User Management System & ChipiWallet (Enero 2026)

### Sistema de Usuarios Avanzado ✅
Sistema configurable de perfiles de usuario con tipos y relaciones:

**Tipos de Usuario (6 por defecto):**
| ID | Nombre (ES) | Nombre (EN) | Categoría |
|----|-------------|-------------|-----------|
| utype_customer | Cliente | Customer | customer |
| utype_member_adult | Miembro Adulto | Adult Member | member |
| utype_member_child | Miembro Niño | Child Member | member |
| utype_guardian | Acudiente | Guardian | family |
| utype_staff | Personal | Staff | staff |
| utype_special | Invitado Especial | Special Guest | special |

**Campos de Perfil (8 configurables):**
- Nombre para mostrar, Biografía, Teléfono, Dirección
- Contacto de emergencia, Nombre del acudiente
- Nivel de habilidad, Preferencias de notificación

**Relaciones:**
- Padre-Hijo, Acudiente-Dependiente, Tutor-Pupilo
- Permisos configurables: ver wallet, pagar por, gestionar

**Frontend:** `/mi-cuenta` → Tab "Perfil"

### ChipiWallet (Billetera Digital) ✅
Sistema de billetera con doble moneda:

| Moneda | Descripción | Tasa |
|--------|-------------|------|
| USD | Dólares americanos | 1:1 |
| ChipiPoints | Puntos virtuales | 0.008 USD |

**Funcionalidades:**
- Depósitos (efectivo, tarjeta, Yappy)
- Transferencias entre usuarios
- Conversión ChipiPoints → USD
- Historial de transacciones
- Estadísticas de uso

**Frontend:** `/mi-cuenta` → Tab "ChipiWallet"

### Sistema de Membresías ✅
Planes de membresía y sistema de visitas inteligente:

**Planes por Defecto (5):**
| Plan | Precio | Visitas | Duración | Bonus |
|------|--------|---------|----------|-------|
| Pase 12 Visitas | $300 | 12 | 90 días | 500 pts |
| Pase 6 Visitas | $165 | 6 | 60 días | 200 pts |
| Ilimitado Mensual | $150 | ∞ | 30 días | 300 pts |
| Prueba Gratis | $0 | 2 | 14 días | 50 pts |
| Cortesía | $0 | ∞ | 365 días | 0 pts |

**Check-in/Check-out Inteligente:**
- Detecta visitas rápidas (< 15 min) → no consume pase
- Visitas regulares (> 30 min) → consume 1 pase
- Auto-checkout después de 8 horas

**Frontend:** `/mi-cuenta` → Tab "Membresía"

### Endpoints API

**Users:**
- `GET /api/users/types` - Tipos de usuario
- `GET /api/users/fields` - Campos de perfil
- `GET /api/users/profile/me` - Mi perfil
- `POST /api/users/profile` - Crear perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/relationships` - Mis relaciones

**Wallet:**
- `GET /api/wallet/me` - Mi billetera
- `GET /api/wallet/summary` - Resumen con stats
- `POST /api/wallet/deposit` - Depositar
- `POST /api/wallet/transfer` - Transferir
- `POST /api/wallet/points/convert` - Convertir puntos
- `GET /api/wallet/transactions` - Historial

**Memberships:**
- `GET /api/memberships/plans` - Planes disponibles
- `GET /api/memberships/me/active` - Membresía activa
- `POST /api/memberships/purchase` - Comprar membresía
- `POST /api/memberships/visits/checkin` - Registrar entrada
- `POST /api/memberships/visits/checkout` - Registrar salida
- `GET /api/memberships/visits/stats` - Estadísticas de visitas

**Test Results:** 27/27 tests passed (100%)

### Collections MongoDB (Nuevas)
- `chipi_wallets` - Billeteras de usuarios
- `chipi_transactions` - Transacciones
- `chipi_points_history` - Historial de puntos
- `chipi_wallet_config` - Configuración
- `chipi_user_types` - Tipos de usuario
- `chipi_profile_fields` - Campos de perfil
- `chipi_user_profiles` - Perfiles de usuario
- `chipi_user_relationships` - Relaciones
- `chipi_membership_plans` - Planes de membresía
- `chipi_user_memberships` - Membresías de usuarios
- `chipi_user_visits` - Registro de visitas
- `chipi_visit_config` - Configuración de visitas

### Archivos Nuevos
**Backend:**
- `/app/backend/modules/users/models/user_models.py`
- `/app/backend/modules/users/models/wallet_models.py`
- `/app/backend/modules/users/services/user_profile_service.py`
- `/app/backend/modules/users/services/wallet_service.py`
- `/app/backend/modules/users/services/membership_service.py`
- `/app/backend/modules/users/routes/users.py`
- `/app/backend/modules/users/routes/wallet.py`
- `/app/backend/modules/users/routes/memberships.py`

**Frontend:**
- `/app/frontend/src/modules/users/pages/UsersDashboard.jsx`
- `/app/frontend/src/modules/users/components/ChipiWallet.jsx`
- `/app/frontend/src/modules/users/components/UserProfile.jsx`
- `/app/frontend/src/modules/users/components/MembershipCard.jsx`

---

## Tareas Pendientes (Consolidadas)

### Completadas ✅
1. ~~Sistema de premios avanzado configurable~~ ✅
2. ~~Real-time notifications (WebSocket)~~ ✅
3. ~~Social features: Seguir jugadores, comentarios~~ ✅
4. ~~Weekly challenges system~~ ✅
5. ~~Analytics Dashboard~~ ✅
6. ~~Sistema de logros automáticos~~ ✅
7. ~~Social expandido: Botón seguir, moderación~~ ✅
8. **Sistema de Usuarios Avanzado (Phase 1)** ✅ NEW
9. **ChipiWallet (Phase 1)** ✅ NEW
10. **Sistema de Membresías (Phase 1)** ✅ NEW

### P0 - Fase 2: Sistema de Usuarios Avanzado
1. **Límites de gasto configurables** para cuentas de niños
2. **Monitoreo parental** en tiempo real
3. **Conversión USD → ChipiPoints** (inversa)
4. **ChipiPoints como método de pago** en la tienda

### P1 - Fase 3: Integración Completa
1. **Integración wallet con tienda** - Pagar con ChipiWallet
2. **Rewards automáticos** - ChipiPoints por participación
3. **Sistema de referidos** - Bonus por invitar amigos

### P2 - Backlog
### P2 - Backlog
1. **Containerización completa:** Desplegar módulos como microservicios separados
2. **Mobile app:** Versión nativa para iOS/Android
3. **Sistema de torneos automáticos:** Brackets generados automáticamente
4. **Integración con redes sociales:** Compartir logros y resultados
5. **Sistema de equipos/clanes:** Recompensas colectivas
6. **Push notifications:** Notificaciones móviles

## Known Issues
- **WebSocket en Preview:** Las conexiones WebSocket pueden fallar en el ambiente de preview debido a la configuración del ingress. El sistema tiene fallback a REST API que funciona correctamente.

## Architecture

```
/app/
├── backend/
│   └── modules/
│       ├── pinpanclub/
│       │   ├── routes/
│       │   │   ├── analytics.py      # Dashboard stats
│       │   │   ├── achievements.py   # Auto achievements
│       │   │   ├── social.py         # Follow, comments, moderation
│       │   │   ├── challenges.py
│       │   │   ├── prizes.py
│       │   │   └── websocket.py
│       │   ├── services/
│       │   │   ├── achievements_service.py
│       │   │   ├── challenges_service.py
│       │   │   └── social_service.py
│       │   └── models/
│       │       ├── achievements.py
│       │       ├── challenges.py
│       │       └── social.py
│       └── users/                    # 🆕 NEW MODULE
│           ├── routes/
│           │   ├── users.py          # User profiles
│           │   ├── wallet.py         # ChipiWallet
│           │   └── memberships.py    # Membership plans
│           ├── services/
│           │   ├── user_profile_service.py
│           │   ├── wallet_service.py
│           │   └── membership_service.py
│           └── models/
│               ├── user_models.py
│               └── wallet_models.py
└── frontend/
    └── src/
        └── modules/
            ├── pinpanclub/
            │   ├── components/
            │   │   ├── MatchComments.jsx
            │   │   ├── SocialFeatures.jsx
            │   │   ├── NotificationCenter.jsx
            │   │   └── WeeklyChallenges.jsx
            │   └── pages/
            │       ├── AnalyticsDashboard.jsx
            │       ├── WeeklyChallengesPage.jsx
            │       └── superpin/
            │           └── PlayerProfile.jsx
            └── users/                # 🆕 NEW MODULE
                ├── pages/
                │   └── UsersDashboard.jsx
                └── components/
                    ├── ChipiWallet.jsx
                    ├── UserProfile.jsx
                    └── MembershipCard.jsx
```

---
*Last Updated: January 2026*
*All Priorities Complete: P0-P9 + Phase 1 Users*
*215/215 tests passed across all features* (188 + 27 new)
