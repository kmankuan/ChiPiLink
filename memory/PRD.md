# ChiPi Link - PRD

## Widget Flow (Feb 9, 2026)
Complete in-widget experience — user never leaves:
1. **Login**: New tab OAuth → server-side token relay → auto-auth
2. **Link Student**: Form inside widget (persisted to sessionStorage)
3. **Textbook Selection**: Tap to select books, sticky submit button with total
4. **Order Submit**: POST /api/store/textbook-orders/submit → shows status
5. **Wallet**: Balance + recent transactions

## Implemented
- Widget: Display config, streamlined flow, floating button (7 pos, 6 icons, 4 styles), live preview, state persistence, server-side OAuth relay, in-widget ordering
- PCA Catalog: Multi-select + bulk actions, sort, filter
- Monday.com: Orders + Textbooks board sync
- Landing: 5 layouts

## Known Issues
- P2: sync-all endpoint broken
- P3: i18n, board selector UX
