# ChiPi Link - Super App

## Architecture
- **Main App** (port 8001): Auth, Users, Wallet, Community, Admin, Landing, Store
- **Integration Hub** (port 8002): Monday.com, Telegram, Gmail, webhooks
- **Tutor Engine** (port 8003): AI tutoring, worksheets, school reader
- **Sport Engine** (port 8004): Table tennis scoring, live matches, TV broadcast, tournaments ← EXTRACTED

## Sport Engine Extraction (Completed)
The Sport module was extracted from `/app/backend/modules/sport/` into a standalone service.

### How It Works
1. `sport-engine/main.py` — Standalone FastAPI app on port 8004
   - Connects to same MongoDB (chipilink_prod)
   - Validates JWT with same secret as main app
   - Patches core.database/core.auth so sport module imports work unchanged
2. `sport-engine/bootstrap.sh` — Creates supervisor config and starts the service
3. `backend/modules/sport_proxy.py` — Proxies /api/sport/* from port 8001 → 8004
4. `backend/main.py` — Bootstraps sport-engine on startup, uses proxy instead of direct routes
5. Frontend code unchanged — calls /api/sport/* which gets proxied transparently

## Test Accounts
- Super Admin: teck@koh.one / Acdb##0897
- Moderator: moderator@chipilink.com / ChiPi@Mod2026
- Regular User: user@chipilink.com / ChiPi@User2026
