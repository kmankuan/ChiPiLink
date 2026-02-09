# ChiPi Link - Product Requirements Document

## Core Architecture
- Backend: FastAPI, MongoDB, Pydantic
- Frontend: React, TailwindCSS, shadcn/ui
- Auth: JWT + LaoPan SSO (OAuth 2.0)
- Integrations: Monday.com

## Widget OAuth Flow (Feb 9, 2026)
1. Widget iframe shows "Log in with LaoPan" button
2. Opens **new tab** to LaoPan OAuth (avoids X-Frame-Options block)
3. User authenticates on LaoPan in the new tab
4. Callback saves token → shows "Login Successful! Close this tab"
5. Widget detects token via `storage` event + 1.5s polling → auto-authenticates
- Files: EmbedWidget.jsx, LaoPanCallback.jsx, WidgetAuthComplete.jsx, App.js

## Implemented Features
- Widget: Display config, streamlined flow, floating button (7 pos, 6 icons, 4 styles), live preview, state persistence
- PCA Catalog: Multi-select + bulk actions, sort, filter (search/grade/subject/status)
- Monday.com: Orders + Textbooks board sync (config-driven)
- Landing: 5 structural layouts

## Known Issues
- P2: `sync-all` endpoint broken method ref
- P3: i18n fixes, board selector UX

## Test Reports
- iter 65-68: All passed
