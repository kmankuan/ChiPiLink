# Test Results - Monday.com Textbooks Board Subitem Workflow

## Test Context
- **Date**: 2026-02-07
- **Feature**: Changed TXB inventory sync from count-increment to subitem-per-student workflow

## Implementation Summary

### Changes Made
1. **monday_txb_inventory_adapter.py** — Rewrote `update_inventory()` to:
   - Find textbook by book code on TB2026-Textbooks board
   - Create textbook item if not found
   - Create subitem with "Student Name - Order Reference" (not increment count)
   - Removed `ordered_count` column logic
   - Added `subitem_column_mapping` support (quantity, date)

2. **monday_sync_service.py** — Updated `update_inventory_board()` to accept `student_name` and `order_reference`

3. **textbook_order_service.py** — Updated `_send_to_monday()` to pass student_name and order_reference from order data

4. **monday_config_service.py** — Updated `get_inventory_config()` to include `subitem_column_mapping`

5. **TxbInventoryTab.jsx** — Updated admin config UI to show subitem column mapping section

### Board Configuration (already saved)
- **TB2026-Textbooks Board ID**: 18397140920
- **Group ID**: topics
- **Book Code Column**: text_mm02vh63
- **Subitem Qty Column**: numeric_mm02sj3t
- **Subitem Date Column**: date0

### Test Credentials
- Admin: admin@libreria.com / admin
- Auth: POST /api/auth-v2/login with {"email":"admin@libreria.com","password":"admin"}

### Key API Endpoints
- GET /api/store/monday/txb-inventory-config — Get inventory config
- PUT /api/store/monday/txb-inventory-config — Save inventory config
- POST /api/store/textbook-orders/submit — Submit order (triggers Monday sync)

## Incorporate User Feedback
- Subitems create per-student tracking on textbooks board
- Monday.com auto-counts subitems for demand tracking
- No status column on subitems (handled via Orders board)
