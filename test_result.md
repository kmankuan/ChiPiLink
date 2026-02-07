# Test Results - User Notifications (P2)

## Test Context
- **Date**: 2026-02-07
- **Feature**: Unread message notification system
- **Tester**: Main Agent + Testing Agent

## Implementation Summary

### Backend
1. Added `read_by` array to messages in `order_messages` collection
2. `GET /api/store/textbook-orders/notifications/unread` — total + per-order unread counts
3. `POST /api/store/textbook-orders/{order_id}/updates/mark-read` — mark all as read for user
4. Auto-marks sender's own messages as read on send

### Frontend
1. `useNotifications` hook — polls every 30s, provides totalUnread + perOrder + markOrderRead
2. Header bell icon with red badge showing total unread count
3. Per-order unread badge on "Messages" button
4. Auto-mark-read when chat opens; refresh unread when chat closes

### Key Files
- `backend/modules/store/services/textbook_order_service.py` — mark_order_messages_read, get_unread_counts
- `backend/modules/store/routes/textbook_orders.py` — new routes
- `frontend/src/hooks/useNotifications.js` — notification hook
- `frontend/src/components/layout/Header.jsx` — bell icon + badge
- `frontend/src/pages/Orders.jsx` — per-order badges + mark-read on open

### Test Credentials
- Client: test@client.com / password
- Admin: admin@libreria.com / admin
- Auth: POST /api/auth-v2/login
- Orders: /pedidos

## Incorporate User Feedback
- Real-time feel via 30s polling
- Optimistic UI updates on mark-read
- Non-blocking — errors silently fail
