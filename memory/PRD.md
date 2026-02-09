# ChiPi Link - PRD

## Widget OAuth Flow (Final — Feb 9, 2026)
Server-side token relay for cross-origin iframe auth:
1. Widget `POST /api/widget/auth-session` → gets session_id
2. Opens new tab → LaoPan OAuth
3. Callback stores token → `POST /api/widget/auth-session/{id}/token`
4. Widget polls `GET /api/widget/auth-session/{id}/poll` (2s interval)
5. Gets token → localStorage → reload → authenticated
- Session auto-expires in 5min, deleted after retrieval
- Files: widget/routes.py (3 endpoints), EmbedWidget.jsx (LoginPrompt), WidgetAuthComplete.jsx

## Implemented
- Widget: Display config, streamlined flow, floating button customization, live preview, state persistence, server-side OAuth relay
- PCA Catalog: Multi-select + bulk actions, sort, filter
- Monday.com: Orders + Textbooks board sync
- Landing: 5 layouts

## Known Issues
- P2: sync-all endpoint broken
- P3: i18n, board selector UX
