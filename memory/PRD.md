# ChiPi Link - PRD

## Original Problem Statement
Multi-module school supply/textbook management platform ("ChiPi Link") with:
- **Unatienda**: Public-facing store for school supplies
- **Sysbook**: Private school textbook inventory management  
- **PinpanClub**: Ping pong club management
- **Wallet**: User wallet with Monday.com integration
- **Community**: Telegram-based community feed
- **Admin Panel**: Full admin dashboard with modules

## Architecture
- **Frontend**: React (CRA) with Shadcn UI, deployed on Emergent platform
- **Backend**: FastAPI with MongoDB (Motor), modular architecture
- **Database**: MongoDB (local in preview, Atlas in production)
- **Deployment**: Emergent Kubernetes platform

## Code Structure
```
/app
├── backend/
│   ├── core/          # Config, database, auth, base classes
│   ├── modules/       # Feature modules (auth, store, sysbook, wallet, etc.)
│   ├── main.py        # App entry point, startup, routing
│   └── server.py      # Bridge for uvicorn
└── frontend/
    └── src/
        ├── config/
        │   ├── api.js        # API endpoints config
        │   └── apiUrl.js     # Runtime API URL resolver (NEW)
        ├── contexts/         # Auth, Theme, Cart, SiteConfig
        ├── modules/          # Feature modules
        ├── pages/            # Route pages
        └── components/       # Shared UI components
```

## Key Credentials
- Admin: teck@koh.one / Acdb##0897
- Auth endpoint: POST /api/auth-v2/login
- Health: GET /api/health
- Admin diagnostic: GET /api/health/admin-check

## What's Been Implemented

### Session: Feb 24, 2026
- **CRITICAL FIX: Production Login** — Root cause: `REACT_APP_BACKEND_URL` was baked at build-time with stale URL (`backend-cleanup-10.emergent.host`). Created `apiUrl.js` runtime resolver that detects the hostname and uses `window.location.origin` for `.emergent.host` and `.preview.emergentagent.com` domains. Updated 165+ files to use the runtime resolver instead of `process.env.REACT_APP_BACKEND_URL`.
- **FIX: .gitignore blocking .env files** — Removed `*.env` patterns that prevented environment files from being included in Docker builds.
- **FIX: Backend startup robustness** — Added 2s delay before deferred init, 1s delay before pollers, retry logic (3x) for admin seeding, and self-check diagnostic.
- **NEW: Admin diagnostic endpoint** — `GET /api/health/admin-check` to verify admin user exists with valid hash in production.

### Previous Sessions (Completed)
- Sysbook Module Separation (full backend separation from store)
- Unified Data Manager feature in admin panel
- Default layout changed to "Mosaic Community"
- Wallet self-recharge security fix (requires admin approval)
- Wallet double-deposit UI fix
- Health check timeout fix (removed bcrypt from health endpoint)
- "Clear All" stock orders route fix
- Add School API parameter fix
- Malformed .env file fix

## Pending/Backlog
- (P3) Build an on-demand landing page redesign tool
- (P4) Extend Monday.com synchronization to general product inventory

## 3rd Party Integrations
- OneSignal (Push), Monday.com API v2, Google Photos, Gmail, Telegram Bot
- OpenAI & Anthropic LLMs, OpenAI TTS (Emergent Key), ElevenLabs TTS
- WebSockets (socket.io-client & python-socketio), LaoPan OAuth
