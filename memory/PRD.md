# ChiPi Link - PRD

## Archive System (Feb 9, 2026)
- Archive: moves products to hidden layer (archived=true)
- Restore: brings back from archive (archived=false)
- Permanent Delete: only from archive view (hard delete)
- Catalog filter: All / PCA Textbooks / Public Store / Archived
- Bulk actions adapt: Archive in main view, Restore + Delete Forever in archive view
- Backend: 3 new endpoints on /api/store/private-catalog/admin/products/{id}/

## Unified Inventory
- Merged Private PCA + old Inventory into single "Inventory" tab
- Products view: sort, multi-select, bulk actions, inline edit, fullscreen, CSV import
- Movements view: stock history audit trail
- Stock Adjust Dialog: add/remove with reasons + notes

## Widget
- Server-side token relay for cross-origin iframe OAuth
- In-widget ordering: select textbooks → submit (no external navigation)
- Floating button: 7 positions, 6 icons, 4 styles, live preview
- State persistence via sessionStorage

## Monday.com
- Orders + Textbooks Board sync (config-driven, no hardcoded values)

## Known Issues
- P3: React key warning in CatalogTable
- P2: sync-all endpoint broken
- P3: i18n, board selector UX

## Test Reports
- iter 65-69: Widget, placement, persistence, PCA, unified inventory (all passed)
- iter 70: Archive system (12/12 passed, backend 9/9)
