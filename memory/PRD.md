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

## What's Been Implemented

### Phase 1-7d (Complete)
See CHANGELOG.md for full history of all phases up to 7d.

### Phase 8a - PinPan Arena: Unified Tournament System (Complete - Feb 21, 2026)
- **New Module**: PinPan Arena — a unified tournament management system built within PinPanClub
- **4 Tournament Formats**:
  - Single Elimination: Classic bracket with seeded pairings, byes, third-place match
  - Round Robin: Everyone plays everyone, standings table with points
  - Group + Knockout: Group stage with round-robin, then elimination bracket for qualifiers
  - RapidPin Mode: Spontaneous matches within a time window, points-based ranking
- **Backend** (new files):
  - `/app/backend/modules/pinpanclub/models/arena.py` — Tournament, ArenaMatch, TournamentParticipant models
  - `/app/backend/modules/pinpanclub/repositories/arena_repository.py` — ArenaTournamentRepository, ArenaMatchRepository
  - `/app/backend/modules/pinpanclub/services/arena_service.py` — Full tournament engine (create, register, seed, generate brackets, submit results, auto-advance, completion detection)
  - `/app/backend/modules/pinpanclub/routes/arena.py` — 18 API endpoints under `/api/pinpanclub/arena/`
  - MongoDB collections: `pinpanclub_arena_tournaments`, `pinpanclub_arena_matches`
- **Frontend** (new files):
  - `/app/frontend/src/modules/pinpanclub/pages/arena/ArenaHub.jsx` — Tournament listing with search & filter
  - `/app/frontend/src/modules/pinpanclub/pages/arena/ArenaCreate.jsx` — Create tournament form (format, settings, seeding, schedule)
  - `/app/frontend/src/modules/pinpanclub/pages/arena/ArenaDetail.jsx` — Tournament detail with bracket visualization, participant list, admin controls, result submission
  - Routes: `/pinpanclub/arena`, `/pinpanclub/arena/create`, `/pinpanclub/arena/:tournamentId`
- **Integration with Existing Modules**:
  - Seeding from SuperPin league rankings or RapidPin season rankings
  - Uses existing PinPanClub player system
  - Arena button added to PingPongDashboard header (alongside SuperPin & RapidPin)
  - Role-based access: Admin & Moderator can create/manage tournaments; users can register/view
- **Testing**: 85% backend (18/21, 3 skipped due to no test players), 100% frontend

## Key API Endpoints (PinPan Arena)
- `GET /api/pinpanclub/arena/tournaments` — List tournaments
- `GET /api/pinpanclub/arena/tournaments/{id}` — Get tournament details
- `POST /api/pinpanclub/arena/tournaments` — Create tournament (admin/mod)
- `PUT /api/pinpanclub/arena/tournaments/{id}` — Update tournament
- `DELETE /api/pinpanclub/arena/tournaments/{id}` — Delete tournament (admin)
- `POST /api/pinpanclub/arena/tournaments/{id}/open-registration` — Open registration
- `POST /api/pinpanclub/arena/tournaments/{id}/close-registration` — Close registration
- `POST /api/pinpanclub/arena/tournaments/{id}/register` — Self-register
- `POST /api/pinpanclub/arena/tournaments/{id}/register/{player_id}` — Register player (admin)
- `POST /api/pinpanclub/arena/tournaments/{id}/withdraw` — Withdraw
- `POST /api/pinpanclub/arena/tournaments/{id}/apply-seeding` — Apply seeding
- `POST /api/pinpanclub/arena/tournaments/{id}/generate-brackets` — Start tournament
- `POST /api/pinpanclub/arena/tournaments/{id}/generate-knockout` — Group→Knockout transition
- `GET /api/pinpanclub/arena/tournaments/{id}/matches` — List matches
- `POST /api/pinpanclub/arena/tournaments/{id}/matches/{match_id}/result` — Submit result
- `POST /api/pinpanclub/arena/tournaments/{id}/rapidpin-match` — Submit RapidPin match
- `POST /api/pinpanclub/arena/tournaments/{id}/complete` — Complete tournament

## Upcoming Tasks
None — tournament system complete.

## Future/Backlog Tasks
- **(P2)** WebSocket real-time updates for Arena brackets/scores
- **(P2)** Tournament push notifications via OneSignal  
- **(P3)** Tournament statistics & analytics dashboard
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory

## Monday.com Board Configuration
- **Orders Board ID**: 18397140868
- **Textbooks Board ID**: 18397140920
- **CRM Board ID**: 5931665026

## Key Files
- `/app/frontend/src/modules/pinpanclub/pages/arena/` — Arena frontend pages
- `/app/backend/modules/pinpanclub/routes/arena.py` — Arena API routes
- `/app/backend/modules/pinpanclub/services/arena_service.py` — Arena business logic
- `/app/backend/modules/pinpanclub/models/arena.py` — Arena data models
- `/app/backend/modules/pinpanclub/repositories/arena_repository.py` — Arena data access
