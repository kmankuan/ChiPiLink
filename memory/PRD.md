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

## What's Been Implemented

### Phase 8a - PinPan Arena: Unified Tournament System (Feb 21, 2026)
- **4 Tournament Formats**: Single Elimination, Round Robin, Group + Knockout, RapidPin Mode
- **Backend**: 18 API endpoints under `/api/pinpanclub/arena/`
- **Frontend**: ArenaHub, ArenaCreate, ArenaDetail pages
- **Integration**: Seeding from League (SuperPin) rankings or RapidPin seasons
- **Collections**: `pinpanclub_arena_tournaments`, `pinpanclub_arena_matches`

### Phase 8b - Naming Unification & Feature Merge (Feb 21, 2026)
- **Renamed SuperPin → PinPan League** across all user-facing labels:
  - Dashboard buttons, banner, landing pages
  - i18n files (en.json, es.json) 
  - Module status config
  - All page titles
- **Merged SuperPin Tournament into Arena**: League detail "Create Playoff" now creates an Arena tournament seeded from league rankings (replaces old SuperPin tournament modal)
- **Renamed PingPongSpectator → PinPan Live**: Migrated from 2-second polling to WebSocket with polling fallback. Shows connection status (Real-time/Polling).
- **Added /pinpanclub/live/:matchId route** as the new Live spectator URL (old /pinpanclub/spectator/:matchId still works)
- **Redirected Tournaments nav** to /pinpanclub/arena instead of old /pinpanclub/tournaments
- **Fixed i18n**: Added missing translation keys for ranking empty states
- **Testing**: 100% backend, 95%+ frontend (all issues resolved)

### Earlier Phases (Complete)
See previous PRD versions for Phase 1-7d history (textbooks, Monday.com sync, CRM, impersonation, etc.)

## Key API Endpoints (PinPan Arena)
- `GET /api/pinpanclub/arena/tournaments` — List tournaments
- `POST /api/pinpanclub/arena/tournaments` — Create tournament (admin/mod)
- `GET /api/pinpanclub/arena/tournaments/{id}` — Get tournament details
- `PUT /api/pinpanclub/arena/tournaments/{id}` — Update tournament
- `DELETE /api/pinpanclub/arena/tournaments/{id}` — Delete tournament
- `POST .../open-registration` | `close-registration` | `register` | `withdraw`
- `POST .../apply-seeding` | `generate-brackets` | `generate-knockout`
- `POST .../matches/{match_id}/result` — Submit result (auto-advances bracket)
- `POST .../rapidpin-match` — Submit RapidPin spontaneous match
- `POST .../complete` — Finalize tournament

## Future/Backlog Tasks
- **(P2)** Add Arena Tournament mode to PinPan TV (4th display mode)
- **(P2)** WebSocket broadcast for Arena match results (real-time bracket updates for spectators)
- **(P2)** Tournament push notifications via OneSignal
- **(P3)** Tournament statistics & analytics dashboard
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory

## Key Files
- `/app/frontend/src/modules/pinpanclub/pages/arena/` — Arena frontend pages
- `/app/frontend/src/modules/pinpanclub/pages/PingPongSpectator.jsx` — PinPan Live (WebSocket spectator)
- `/app/frontend/src/modules/pinpanclub/pages/PingPongDashboard.jsx` — Main dashboard (renamed labels)
- `/app/backend/modules/pinpanclub/routes/arena.py` — Arena API routes
- `/app/backend/modules/pinpanclub/services/arena_service.py` — Arena business logic
- `/app/backend/modules/pinpanclub/models/arena.py` — Arena data models
