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

## What's Been Implemented

### Phase 8a - PinPan Arena: Unified Tournament System (Feb 21, 2026)
- **4 Tournament Formats**: Single Elimination, Round Robin, Group + Knockout, RapidPin Mode
- **Backend**: 18 API endpoints under `/api/pinpanclub/arena/`
- **Frontend**: ArenaHub, ArenaCreate, ArenaDetail pages
- **Integration**: Seeding from League (SuperPin) rankings or RapidPin seasons

### Phase 8b - Naming Unification & Feature Merge (Feb 21, 2026)
- **Renamed SuperPin → PinPan League** across all user-facing labels
- **Merged SuperPin Tournament into Arena**: League "Create Playoff" creates Arena tournaments
- **Migrated PingPongSpectator → PinPan Live**: Polling → WebSocket with fallback

### Phase 8c - Enhancement & Real-time Features (Feb 21, 2026)
- **Public Shareable Tournament Page** (`/arena/:tournamentId`):
  - No-auth-required view with purple gradient hero header
  - WhatsApp share button, Copy Link button, native Share API support
  - Auto-refresh via polling + WebSocket connection for live updates
  - Shows tournament bracket, participants, standings, champion banner
- **WebSocket Broadcast for Arena**:
  - New endpoint: `/api/pinpanclub/ws/arena/{tournament_id}`
  - Tournament-specific connection tracking in ConnectionManager
  - `broadcast_arena_update()` called after every match result submission
  - Removes MongoDB `_id` before JSON serialization
- **Arena Tournament Mode in PinPan TV**:
  - 4th display mode ("Tournament") added alongside Partido/Multi/Dashboard
  - Dark-themed bracket visualization, live match highlight, standings
  - Auto-fetches active tournament or accepts `?tournament=ID` param
  - Receives arena_update WebSocket messages for real-time refresh
- **Tournament Push Notifications** (OneSignal):
  - Registration opened: notifies participants
  - Brackets generated / tournament started: notifies all participants
  - Tournament completed: notifies with champion name
  - Fire-and-forget pattern (won't fail if OneSignal unconfigured)
- **Share from ArenaDetail**: Share/Copy buttons in tournament detail header

## Key API Endpoints (PinPan Arena)
- `GET /api/pinpanclub/arena/tournaments` — List tournaments
- `POST /api/pinpanclub/arena/tournaments` — Create tournament (admin/mod)
- `GET /api/pinpanclub/arena/tournaments/{id}` — Get tournament details (public)
- `PUT /api/pinpanclub/arena/tournaments/{id}` — Update tournament
- `DELETE /api/pinpanclub/arena/tournaments/{id}` — Delete tournament (admin)
- `POST .../open-registration` | `close-registration` | `register` | `withdraw`
- `POST .../apply-seeding` | `generate-brackets` | `generate-knockout`
- `POST .../matches/{match_id}/result` — Submit result (auto-advances + broadcasts)
- `POST .../rapidpin-match` — Submit RapidPin spontaneous match
- `POST .../complete` — Finalize tournament
- `WS /api/pinpanclub/ws/arena/{tournament_id}` — WebSocket for live updates

## Future/Backlog Tasks
- **(P3)** Tournament statistics & analytics dashboard
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- **(P5)** Open Graph meta tags for social sharing previews

## Key Files
- `/app/frontend/src/modules/pinpanclub/pages/arena/` — Arena frontend pages (Hub, Create, Detail, Public)
- `/app/frontend/src/modules/pinpanclub/pages/PingPongTV.jsx` — TV with Tournament mode
- `/app/frontend/src/modules/pinpanclub/pages/PingPongSpectator.jsx` — PinPan Live (WebSocket)
- `/app/backend/modules/pinpanclub/routes/arena.py` — Arena API routes
- `/app/backend/modules/pinpanclub/services/arena_service.py` — Arena engine + broadcast + notifications
- `/app/backend/modules/pinpanclub/routes/websocket.py` — WebSocket (arena endpoint + broadcast)
- `/app/backend/modules/pinpanclub/models/arena.py` — Arena data models
