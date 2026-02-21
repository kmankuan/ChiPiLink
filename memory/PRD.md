# ChiPi Link - PRD

## Original Problem Statement
Build and enhance a community/school management platform (ChiPi Link) with features including:
- Textbook ordering and inventory management synced with Monday.com
- Student registration and enrollment management
- Admin panel for managing products, orders, students, and configurations
- Community features (feed, clubs, events)
- Payment/wallet system
- Multi-language support (ES/EN/ZH) via i18n

## Coding Standards
- **Language**: All codebase (variables, field names, DB schemas, comments) MUST be in English
- **i18n**: User-facing strings translated via i18n files (ES/EN/ZH)
- **Architecture**: Microservices-ready modular monolith
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB

## PinPanClub Module Structure

| Section | Route | Description |
|---------|-------|-------------|
| **PinPan Club** | `/pinpanclub` | Home hub for all table tennis activity |
| **PinPan League** | `/pinpanclub/superpin/*` | Ranked leagues (ELO, seasons, check-ins) |
| **RapidPin** | `/pinpanclub/rapidpin/*` | Quick Play (spontaneous matches) |
| **PinPan Arena** | `/pinpanclub/arena/*` | Tournaments (organized competitive events) |
| **PinPan Live** | `/pinpanclub/live/:matchId` | Watch (follow match in real-time via WebSocket) |
| **PinPan TV** | `/tv` | Big screen display (live scores, brackets, rankings) |
| **Public Tournament** | `/arena/:tournamentId` | Shareable public tournament view (no auth) |
| **Hall of Fame** | `/pinpanclub/hall-of-fame` | All-time global player leaderboard |
| **Referee Settings** | `/pinpanclub/referee-settings` | Admin referee config per game mode |

## What's Been Implemented

### Phase 8a - PinPan Arena (Feb 21, 2026)
- 4 Tournament Formats, 18 API endpoints, ArenaHub/Create/Detail pages
- Seeding from League rankings or RapidPin seasons

### Phase 8b - Naming Unification (Feb 21, 2026)
- SuperPin -> PinPan League, Spectator -> PinPan Live
- Merged SuperPin Tournament into Arena

### Phase 8c - Real-time Features (Feb 21, 2026)
- Public shareable tournament page, WebSocket broadcast, Arena TV mode, push notifications

### Phase 9 - Unified Referee System & Hall of Fame (Feb 21, 2026)
- **Referee System**: Global per-game-type config (Arena/League/RapidPin/Casual), profiles with badges/stats/ratings
- **Hall of Fame**: Aggregates stats across all game modes, filterable leaderboard
- 10 API endpoints under `/api/pinpanclub/referee/`

### Phase 10 - Spanish-to-English Codebase Refactoring (Feb 21, 2026)
- **Scope**: 50+ backend files, 25+ frontend files, MongoDB migration script
- **DB Migration**: All existing documents renamed (jugador_id->player_id, arbitro_id->referee_id, estado->status, fecha_inicio->start_date, puntos_totales->total_points, nombre->name, descripcion->description, etc.)
- **Backend Models**: Fully rewritten: rapidpin.py, seasons.py, prizes.py, achievements.py, social.py
- **Backend Services**: Bulk renamed across rapidpin_service, match_service, settings_service, etc.
- **Backend Routes**: All route parameters renamed (ligaId->leagueId, partidoId->matchId, torneoId->tournamentId, jugadorId->playerId)
- **Frontend**: All 25+ JSX/JS files updated for new field names
- **App.js Routes**: Updated all route params to English
- **Testing**: 100% pass rate (15 backend + all frontend tests)

### Phase 11 - Tournament Statistics & Analytics Dashboard (Feb 21, 2026)
- **Backend**: Rewrote `/api/pinpanclub/analytics/dashboard` to aggregate from Arena, League, RapidPin, Referee, and Hall of Fame
- **Data Points**: total_players, matches per week, arena stats (total/active/completed), referee stats, weekly activity (7 days), 4-week trend, game mode distribution, top active players, recent tournaments, HoF top 5, new players
- **Frontend**: Dark theme dashboard with 4 tabs (Overview, Arena, Game Modes, Players), stacked bar charts, KPI cards, mode distribution bars
- **Testing**: 100% frontend, 94% backend (1 transient network timeout)

### Bugfix - Wallet Transactions Delete & Archive (Feb 21, 2026)
- **Fixed**: Archive wrote to wrong collection (`wallet_transactions` instead of `chipi_transactions`), causing archived items to remain visible
- **Added**: `bulk-delete`, `bulk-unarchive`, `single-delete` API endpoints for admin
- **Frontend**: Delete button with destructive confirmation dialog, Restore button for archived items, Archive toggle filter
- **Testing**: 100% (12/12 backend, all frontend)

## Key API Endpoints

### RapidPin (English field names)
- `GET /api/pinpanclub/rapidpin/seasons` — List seasons (start_date, end_date, status, name)
- `GET /api/pinpanclub/rapidpin/queue` — Match queue (player1_id, player2_id, referee_id)
- Match fields: player_a_id, player_b_id, referee_id, score_winner, score_loser, points_winner, points_loser, points_referee, match_date, registered_by_id, confirmed_by_id

### Referee & Hall of Fame
- `GET /api/pinpanclub/referee/settings` — Global referee config
- `PUT /api/pinpanclub/referee/settings/{game_type}` — Update config (admin)
- `GET /api/pinpanclub/referee/hall-of-fame` — Global leaderboard (mode filter)
- `POST /api/pinpanclub/referee/hall-of-fame/refresh` — Rebuild (admin)

## Future/Backlog Tasks
- **(P3)** Tournament statistics & analytics dashboard
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- **(P5)** Open Graph meta tags for social sharing previews

## Key Files
- `/app/backend/scripts/migrate_spanish_to_english_fields.py` — DB migration script
- `/app/backend/modules/pinpanclub/models/` — All models (English field names)
- `/app/backend/modules/pinpanclub/services/` — All services (English variables)
- `/app/backend/modules/pinpanclub/routes/` — All routes (English params)
- `/app/frontend/src/modules/pinpanclub/` — All frontend components (English field refs)
