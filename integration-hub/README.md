# ChiPi Link — Integration Hub

Operations engine for the ChiPi Link community platform. Handles all background integrations, sync jobs, and provides an admin dashboard for managing connections.

## Quick Start
```
cd /app/integration-hub
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002
```

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB)
- **Frontend**: React + Shadcn/UI (English only)
- **Database**: Same MongoDB Atlas as main app
- **Job Queue**: MongoDB collection `hub_jobs`
- **Deployment**: Emergent (separate project)

## Integrations
1. Monday.com (3+ boards: orders, textbooks, wallet)
2. Telegram (channel polling, community feed)
3. Gmail (wallet receipt detection)
4. OneSignal (push notifications)
5. LaoPan.online (user auth sync) — future
6. FuseBase (project management) — future

## Job Queue
- MongoDB-based (`worker_jobs` collection)
- Polls every 5 seconds
- Max 2 concurrent Monday.com API calls
- Priority levels: HIGH, NORMAL, LOW
- Auto-retry with exponential backoff

## Admin Dashboard
- Integration status & health
- Job queue monitor (active, failed, history)
- Debug console (API tester, connection test, webhook logs)
- Live log stream
- Settings (API keys, sync frequency, rate limits)
