# ChiPi Link - PRD

## Original Problem Statement
Build and enhance a community/school management platform (ChiPi Link) with features including:
- Textbook ordering and inventory management synced with Monday.com
- Student registration and enrollment management
- Admin panel for managing products, orders, students, and configurations
- Community features (feed, clubs, events)
- Payment/wallet system
- Multi-language support (ES/EN/ZH)

## Core Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Monday.com API v2, Google Photos, Gmail, Telegram Bot, OpenAI, Anthropic, Lottie, OneSignal

## PinPanClub Module Structure (Unified)

| Section | Route | Description |
|---------|-------|-------------|
| **PinPan Club** | `/pinpanclub` | Home hub for all table tennis activity |
| **PinPan League** | `/pinpanclub/superpin/*` | Ranked leagues — ELO, seasons, check-ins *(renamed from SuperPin)* |
| **RapidPin** | `/pinpanclub/rapidpin/*` | Quick Play — spontaneous matches with friends |
| **PinPan Arena** | `/pinpanclub/arena/*` | Tournaments — organized competitive events |
| **PinPan Live** | `/pinpanclub/live/:matchId` | Watch — follow a match in real-time via WebSocket |
| **PinPan TV** | `/tv` | Big screen display — live scores, brackets, rankings |
| **Public Tournament** | `/arena/:tournamentId` | Shareable public tournament view (no auth) |
| **Hall of Fame** | `/pinpanclub/hall-of-fame` | All-time global player leaderboard |
| **Referee Settings** | `/pinpanclub/referee-settings` | Admin referee config per game mode |

## What's Been Implemented

### Phase 8a - PinPan Arena: Unified Tournament System (Feb 21, 2026)
- **4 Tournament Formats**: Single Elimination, Round Robin, Group + Knockout, RapidPin Mode
- **Backend**: 18 API endpoints under `/api/pinpanclub/arena/`
- **Frontend**: ArenaHub, ArenaCreate, ArenaDetail pages
- **Integration**: Seeding from League (SuperPin) rankings or RapidPin seasons

### Phase 8b - Naming Unification & Feature Merge (Feb 21, 2026)
- **Renamed SuperPin -> PinPan League** across all user-facing labels
- **Merged SuperPin Tournament into Arena**: League "Create Playoff" creates Arena tournaments
- **Migrated PingPongSpectator -> PinPan Live**: Polling -> WebSocket with fallback

### Phase 8c - Enhancement & Real-time Features (Feb 21, 2026)
- Public Shareable Tournament Page, WebSocket Broadcast for Arena
- Arena Tournament Mode in PinPan TV, Push Notifications (OneSignal)
- Share from ArenaDetail

### Phase 9 - Unified Referee System & Hall of Fame (Feb 21, 2026)
- **Unified Referee System:**
  - Global `referee_settings` with per-game-type config (Arena, League, RapidPin, Casual)
  - Admin can toggle referee requirement, set points awarded, enable/disable self-ref per game type
  - Referee profiles with match counts, points, streaks, avg ratings, and badges
  - Badge system: First Whistle, Regular Ref, Veteran Ref, Iron Whistle, Five Star, Week Warrior, All-Rounder
  - Post-match referee rating (1-5 stars) by players
  - 10 new API endpoints under `/api/pinpanclub/referee/`
- **All-Time "Hall of Fame" Leaderboard:**
  - Aggregates player stats across Arena, League, RapidPin, and Referee contributions
  - Combined total points, match wins, tournament titles
  - Filterable by mode: All, Arena, League, RapidPin, Referees
  - Admin "Rebuild" button to refresh aggregation from all data sources
- **Frontend:**
  - HallOfFame.jsx page with amber/gold hero header, 5 filter tabs
  - RefereeSettings.jsx admin page with toggle switches per game type
  - Navigation: "Hall of Fame" button in PinPanClub dashboard header
  - Navigation: "Referee Settings" in admin Settings dropdown

## Key API Endpoints

### PinPan Arena
- `GET/POST /api/pinpanclub/arena/tournaments` — List/Create
- `GET/PUT/DELETE /api/pinpanclub/arena/tournaments/{id}` — CRUD
- `POST .../open-registration | close-registration | register | withdraw`
- `POST .../apply-seeding | generate-brackets | generate-knockout`
- `POST .../matches/{match_id}/result` — Submit result
- `POST .../complete` — Finalize tournament
- `WS /api/pinpanclub/ws/arena/{tournament_id}` — Live updates

### Referee & Hall of Fame
- `GET /api/pinpanclub/referee/settings` — Get global referee config
- `PUT /api/pinpanclub/referee/settings/{game_type}` — Update config (admin)
- `GET /api/pinpanclub/referee/profiles` — Referee leaderboard
- `GET /api/pinpanclub/referee/profiles/{player_id}` — Referee profile
- `POST /api/pinpanclub/referee/record-activity` — Record referee match
- `POST /api/pinpanclub/referee/rate` — Rate a referee
- `GET /api/pinpanclub/referee/hall-of-fame` — Global leaderboard (mode filter)
- `GET /api/pinpanclub/referee/hall-of-fame/{player_id}` — Player stats
- `POST /api/pinpanclub/referee/hall-of-fame/refresh` — Rebuild (admin)

## Future/Backlog Tasks
- **(P3)** Tournament statistics & analytics dashboard
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- **(P5)** Open Graph meta tags for social sharing previews

## Key Files
- `/app/backend/modules/pinpanclub/routes/referee.py` — Referee & Hall of Fame API routes
- `/app/backend/modules/pinpanclub/services/settings_service.py` — Referee & Leaderboard service
- `/app/backend/modules/pinpanclub/models/settings.py` — Referee & Leaderboard models
- `/app/frontend/src/modules/pinpanclub/pages/HallOfFame.jsx` — Hall of Fame page
- `/app/frontend/src/modules/pinpanclub/pages/RefereeSettings.jsx` — Referee Settings admin page
- `/app/frontend/src/modules/pinpanclub/pages/arena/` — Arena frontend pages
- `/app/backend/modules/pinpanclub/routes/arena.py` — Arena API routes
- `/app/backend/modules/pinpanclub/services/arena_service.py` — Arena engine
