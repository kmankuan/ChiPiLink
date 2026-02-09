# ChiPi Link - PRD

## Unified Inventory (Feb 9, 2026)
Merged "Private PCA" + "Inventory" into single "Inventory" tab:
- Catalog filter: All / PCA Textbooks / Public Store
- Products view: sort, multi-select, bulk actions, inline edit, fullscreen, CSV import
- Movements view: stock adjustment history audit trail
- Stock Adjust Dialog: add/remove modes with reasons + notes
- No regression on Widget or Monday.com integration

## Widget Flow
- Server-side token relay for cross-origin iframe OAuth
- In-widget ordering: select textbooks → submit order (no external navigation)
- State persistence via sessionStorage
- Floating button: 7 positions, 6 icons, 4 styles, live preview

## Monday.com
- Orders Board sync (items + subitems + Updates)
- Textbooks Board sync (find by code or create + student subitems)

## Known Issues
- P2: sync-all endpoint broken method ref
- P3: i18n, board selector UX

## Test Reports
- iter 65: Widget display (16/16)
- iter 66: Placement + OAuth (38/38)
- iter 67: Live preview + persistence (14/14)
- iter 68: PCA multi-select/sort/filter (13/13)
- iter 69: Unified Inventory (12/12)
