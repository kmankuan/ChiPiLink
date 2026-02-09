# ChiPi Link - PRD

## Widget Maintenance Mode (Feb 9, 2026)
- Toggle in admin Display tab: `maintenance.active` boolean
- Custom message: `maintenance.message` editable text
- Widget stays visible (floating button), inside shows "Under Maintenance" screen
- Instant on/off — no deployment needed

## Archive System (Feb 9)
- Archive: products → hidden layer (not deleted)
- Restore: back to main view
- Permanent Delete: only from archive (hard delete)
- Catalog filter: All / PCA / Public / Archived

## Unified Inventory (Feb 9)
- Merged Private PCA + old Inventory → single "Inventory" tab
- Products + Movements views, Stock Adjust Dialog
- Multi-select, bulk actions, sort, filter, inline edit

## Widget System
- Server-side token relay for cross-origin iframe OAuth
- In-widget ordering: select textbooks → submit
- Floating button: 7 positions, 6 icons, 4 styles, live preview
- State persistence via sessionStorage

## Monday.com
- Orders + Textbooks Board sync (config-driven)

## Known Issues
- P2: sync-all endpoint broken
- P3: i18n, board selector UX

## Test Reports (all passed)
- iter 65: Widget display (16/16)
- iter 66: Placement + OAuth (38/38)
- iter 67: Live preview + persistence (14/14)
- iter 68: PCA features (13/13)
- iter 69: Unified inventory (12/12)
- iter 70: Archive system (12/12)
