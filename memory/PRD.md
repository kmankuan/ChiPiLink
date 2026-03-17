# ChiPi Sport Engine - Standalone Service

## Overview
Standalone Sport Engine service extracted from the main ChiPi Link app.
Table tennis scoring, live matches, TV broadcast, tournaments, and rankings.

## Architecture
- **Backend**: FastAPI on port 8001 (Python)
- **Frontend**: React on port 3000 (Tailwind + shadcn/ui)
- **Database**: MongoDB (chipilink_prod) - same as main app
- **Real-time**: WebSocket for live scoring

## Backend API Endpoints
All endpoints under `/api/sport/`:

### Players
- `GET /players` - List all players
- `GET /players/{id}` - Get player detail
- `POST /players` - Create player (admin)
- `PUT /players/{id}` - Update player (admin)
- `DELETE /players/{id}` - Soft delete (admin)

### Rankings
- `GET /rankings` - Player rankings by ELO

### Leagues
- `GET /leagues` - List leagues
- `GET /leagues/{id}` - League detail
- `POST /leagues` - Create league (admin)
- `PUT /leagues/{id}` - Update league (admin)

### Matches
- `GET /matches` - List matches (filter: league_id, player_id, status)
- `GET /matches/{id}` - Match detail
- `POST /matches` - Record match with ELO calculation
- `PUT /matches/{id}/validate` - Validate match (admin)

### Tournaments
- `GET /tournaments` - List tournaments
- `GET /tournaments/{id}` - Tournament detail
- `POST /tournaments` - Create tournament (admin)
- `POST /tournaments/{id}/register` - Register player
- `POST /tournaments/{id}/start` - Generate brackets
- `POST /tournaments/{id}/match/{mid}/result` - Submit result

### Live Sessions
- `GET /live` - Active live sessions
- `GET /live/{id}` - Session detail
- `POST /live` - Start live session
- `POST /live/{id}/score` - Score point
- `POST /live/{id}/undo` - Undo last point
- `PUT /live/{id}/referee` - Change referee
- `POST /live/{id}/end` - End session
- `WS /ws/live/{id}` - WebSocket for real-time

### Settings
- `GET /settings` - Full settings (admin)
- `PUT /settings` - Update settings (admin)
- `GET /settings/tv` - TV display settings (public)

### Auth
- `POST /auth-v2/login` - Email/password login

## Frontend Pages
- `/sport` - Dashboard with stats, top players, recent matches
- `/sport/rankings` - Player leaderboard
- `/sport/players` - Players grid with search (shows base64 photos)
- `/sport/player/:id` - Player profile + match history + **photo upload** (admin)
- `/sport/leagues` - Leagues list
- `/sport/matches` - Matches list
- `/sport/match/new` - Record match form
- `/sport/tournaments` - Tournaments list
- `/sport/tournament/:id` - Tournament bracket view (**single + double elimination**)
- `/sport/live` - Active live sessions
- `/sport/live/new` - Start live session
- `/sport/live/:id` - Spectator view
- `/sport/live/:id/referee` - Referee scoring panel
- `/sport/tv` - Full-screen TV broadcast display
- `/sport/admin` - **Admin Settings (6 tabs: TV, Emotions, Match, Live, Display, Referee)**
- `/login` - Admin login

## i18n
All UI supports English, Spanish, and Chinese.

## Test Accounts
- Admin: teck@koh.one / Acdb##0897

## Collections
- sport_players, sport_matches, sport_leagues
- sport_tournaments, sport_live_sessions, sport_settings
- users (for auth)
