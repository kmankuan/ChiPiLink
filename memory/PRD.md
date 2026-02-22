# ChiPi Link - PRD

## Original Problem Statement
Build and enhance a community/school management platform (ChiPi Link) with features including:
- Textbook ordering and inventory management synced with Monday.com
- Student registration and enrollment management
- Admin panel for managing products, orders, students, and configurations
- Community features (feed, clubs, events)
- Payment/wallet system
- Multi-language support (ES/EN/ZH) via i18n

## Coding Standards
- **Language**: All codebase (variables, field names, DB schemas, comments) MUST be in English
- **i18n**: User-facing strings translated via i18n files (ES/EN/ZH)
- **Architecture**: Microservices-ready modular monolith
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB

## PinPanClub Module Structure

| Section | Route | Description |
|---------|-------|-------------|
| **PinPan Club** | `/pinpanclub` | Home hub for all table tennis activity |
| **PinPan League** | `/pinpanclub/superpin/*` | Ranked leagues (ELO, seasons, check-ins) |
| **RapidPin** | `/pinpanclub/rapidpin/*` | Quick Play (spontaneous matches) |
| **PinPan Arena** | `/pinpanclub/arena/*` | Tournaments (organized competitive events) |
| **PinPan Live** | `/pinpanclub/live/:matchId` | Watch (follow match in real-time via WebSocket) |
| **PinPan TV** | `/tv` | Big screen display (live scores, brackets, rankings) |
| **Public Tournament** | `/arena/:tournamentId` | Shareable public tournament view (no auth) |
| **Hall of Fame** | `/pinpanclub/hall-of-fame` | All-time global player leaderboard |
| **Referee Settings** | `/pinpanclub/referee-settings` | Admin referee config per game mode |

## What's Been Implemented

### Phase 8a - PinPan Arena (Feb 21, 2026)
- 4 Tournament Formats, 18 API endpoints, ArenaHub/Create/Detail pages
- Seeding from League rankings or RapidPin seasons

### Phase 8b - Naming Unification (Feb 21, 2026)
- SuperPin -> PinPan League, Spectator -> PinPan Live
- Merged SuperPin Tournament into Arena

### Phase 8c - Real-time Features (Feb 21, 2026)
- Public shareable tournament page, WebSocket broadcast, Arena TV mode, push notifications

### Phase 9 - Unified Referee System & Hall of Fame (Feb 21, 2026)
- **Referee System**: Global per-game-type config (Arena/League/RapidPin/Casual), profiles with badges/stats/ratings
- **Hall of Fame**: Aggregates stats across all game modes, filterable leaderboard
- 10 API endpoints under `/api/pinpanclub/referee/`

### Phase 10 - Spanish-to-English Codebase Refactoring (Feb 21, 2026)
- **Scope**: 50+ backend files, 25+ frontend files, MongoDB migration script
- **DB Migration**: All existing documents renamed (jugador_id->player_id, arbitro_id->referee_id, estado->status, fecha_inicio->start_date, puntos_totales->total_points, nombre->name, descripcion->description, etc.)
- **Backend Models**: Fully rewritten: rapidpin.py, seasons.py, prizes.py, achievements.py, social.py
- **Backend Services**: Bulk renamed across rapidpin_service, match_service, settings_service, etc.
- **Backend Routes**: All route parameters renamed (ligaId->leagueId, partidoId->matchId, torneoId->tournamentId, jugadorId->playerId)
- **Frontend**: All 25+ JSX/JS files updated for new field names
- **App.js Routes**: Updated all route params to English
- **Testing**: 100% pass rate (15 backend + all frontend tests)

### Phase 11 - Tournament Statistics & Analytics Dashboard (Feb 21, 2026)
- **Backend**: Rewrote `/api/pinpanclub/analytics/dashboard` to aggregate from Arena, League, RapidPin, Referee, and Hall of Fame
- **Data Points**: total_players, matches per week, arena stats (total/active/completed), referee stats, weekly activity (7 days), 4-week trend, game mode distribution, top active players, recent tournaments, HoF top 5, new players
- **Frontend**: Dark theme dashboard with 4 tabs (Overview, Arena, Game Modes, Players), stacked bar charts, KPI cards, mode distribution bars
- **Testing**: 100% frontend, 94% backend (1 transient network timeout)

### Bugfix - Wallet Transactions Delete & Archive (Feb 21, 2026)
- **Fixed**: Archive wrote to wrong collection (`wallet_transactions` instead of `chipi_transactions`), causing archived items to remain visible
- **Added**: `bulk-delete`, `bulk-unarchive`, `single-delete` API endpoints for admin
- **Frontend**: Delete button with destructive confirmation dialog, Restore button for archived items, Archive toggle filter
- **Testing**: 100% (12/12 backend, all frontend)

### Bugfix - Textbook Catalog Archive & Delete (Feb 21, 2026)
- **Fixed**: Archive/delete queried by `product_id` but products use `book_id` (was `libro_id` before English migration), causing "0 archived, N failed"
- **DB Migration**: Renamed Spanish fields in `store_products` (libro_id→book_id, cantidad_inventario→inventory_quantity, imagen_url→image_url, etc.)
- **Added**: `bulk-unarchive` endpoint; fixed `bulk-archive` and `bulk-delete` to query by `book_id`
- **Frontend**: Updated bulk action bar with Archive/Restore/Delete buttons
- **Testing**: 100% (12/12 backend, all frontend)

## Key API Endpoints

### RapidPin (English field names)
- `GET /api/pinpanclub/rapidpin/seasons` — List seasons (start_date, end_date, status, name)
- `GET /api/pinpanclub/rapidpin/queue` — Match queue (player1_id, player2_id, referee_id)
- Match fields: player_a_id, player_b_id, referee_id, score_winner, score_loser, points_winner, points_loser, points_referee, match_date, registered_by_id, confirmed_by_id

### Referee & Hall of Fame
- `GET /api/pinpanclub/referee/settings` — Global referee config
- `PUT /api/pinpanclub/referee/settings/{game_type}` — Update config (admin)
- `GET /api/pinpanclub/referee/hall-of-fame` — Global leaderboard (mode filter)
- `POST /api/pinpanclub/referee/hall-of-fame/refresh` — Rebuild (admin)

### Sysbook Dashboard & Unatienda Cleanup (Feb 22, 2026)
- **Sysbook Dashboard**: Admin landing page combining KPIs (products, stock, value, alerts, movements, pending orders), active alerts panel, grade health bars, recent activity, quick action buttons
- **Unatienda Cleanup**: Removed CatalogTypeSelector from StockOrdersTab (now public-only), removed all textbook/PCA references, simplified catalog filter
- **Testing**: 100% pass rate (iteration_185)

### Codebase Cleanup — "Catalog" → "Inventory" Rename (Feb 22, 2026)
- **File Rename**: `PrivateCatalogTab.jsx` → `UnifiedInventoryTab.jsx` (intermediate step, later deleted)
- **Internal Variables**: `catalogType`→`viewType`, `CatalogTable`→`InventoryTable`, etc.
- **Unatienda.jsx**: `privateCatalogAccess`→`textbookAccess`
- **Comments & Strings**: All user-facing "PCA catalog" references updated

### DB Field Rename: catalog_type → product_type (Feb 22, 2026)
- **Scope**: 122 backend + 7 frontend occurrences renamed
- **DB Migration**: `$rename` on `store_products` (0 docs, field wasn't set) and `stock_orders` (17 docs)
- **Frontend**: `CATALOG_BADGE` → `PRODUCT_TYPE_BADGE` in StockOrdersTab
- **Values unchanged**: `'sysbook'` and `'public'` — these are correct
- **Testing**: All API endpoints verified working with new field name

### DB Field Rename: is_private_catalog → is_sysbook (Feb 22, 2026)
- **Scope**: 91 backend + 15 frontend occurrences renamed
- **DB Migration**: `$rename` operator used to update existing records (25 textbook products)
- **Files updated**: All sysbook routes, store routes (private_catalog, textbook_orders, textbook_access, presale_import, inventory, stock_orders), Monday adapters, bulk import, frontend components
- **Note**: User plans to redeploy with fresh DB, so no migration script needed for production — new data will use `is_sysbook` from the start
- **Testing**: 100% pass rate (iteration_188)

### Integration Audit — Textbook Ordering Workflow (Feb 22, 2026)
- **Fixed `pca` → `sysbook`** in 4 files:
  - `store/routes/inventory.py`: `catalog_type == "pca"` → `"sysbook"` filter
  - `store/routes/stock_orders.py`: Default `catalog_type` values in CreateShipment, CreateReturn, CreateAdjustment
  - `store/integrations/monday_txb_inventory_adapter.py`: New products from Monday sync now created with `catalog_type: "sysbook"` (was `"pca"` — **critical fix**)
  - `frontend/src/pages/BulkImportBooksPage.jsx`: `catalogo_id: 'sysbook'` (was `'pca'`)
- **Verified all integration endpoints respond correctly:**
  - `/api/sysbook/inventory/*` — 25 products, dashboard stats OK
  - `/api/store/private-catalog/products` — Student ordering: 25 products visible
  - `/api/store/textbook-access/*` — Schools, config, enrollment endpoints
  - `/api/store/monday/*` — Board config (ID: 18397140868)
  - `/api/store/presale-import/*` — Import endpoints
  - `/api/store/stock-orders?catalog_type=sysbook` — 13 orders
  - `/api/store/textbook-orders/admin/diagnostic/textbooks` — Full diagnostics correct
- **Zero remaining `pca` references** in both backend and frontend

### Sysbook/Unatienda Component Split (Feb 22, 2026)
- **Created**: `frontend/src/modules/sysbook/SysbookInventoryTable.jsx` — Standalone ~600-line inventory table component dedicated to Sysbook. Uses only `/api/sysbook/inventory/` endpoints. No `sysbook` prop, no Unatienda fallback, no `_source` tagging.
- **Updated**: `SysbookInventoryTab.jsx` now imports from `SysbookInventoryTable` (no cross-module dependency)
- **Deleted**: `UnifiedInventoryTab.jsx` (shared component no longer needed), `TextbookCatalogModule.jsx` (dead code)
- **Unatienda unaffected**: `InventoryTab.jsx` at `modules/unatienda/tabs/` remains its own independent component
- **localStorage**: Sysbook column order key changed from `chipi_inv_col_order` to `sysbook_inv_col_order`
- **Testing**: 100% pass rate (iteration_187) — both backend and frontend

### Per-Product Custom Alert Thresholds (Feb 22, 2026)
- **Backend**: PUT `/api/sysbook/inventory/products/{book_id}` accepts `low_stock_threshold` (int or null to clear). Uses `$unset` to properly remove field when null. `check_stock_levels` and `create_stock_alert_if_needed` both check per-product threshold before falling back to global.
- **Frontend**: New `ThresholdCell` inline editable component in inventory table. Shows global threshold (muted) when no custom set, custom value with asterisk (*) and violet styling when set. Click to edit, Enter to save, empty to clear back to global.
- **Column**: Added "Alert" column (with AlertTriangle icon) to `COLUMN_DEFS.sysbook` between Stock and Pre-sale. `effectiveCatalogType` ensures sysbook columns show in "All" tab when in sysbook mode.
- **DB**: `store_products.low_stock_threshold` (optional Number) — per-product override for global threshold
- **Testing**: 100% pass rate (iteration_186)

### Stock Alerts System (Feb 21, 2026)
- **Backend**: New `/api/sysbook/alerts/*` endpoints — settings (configurable threshold), list/dismiss alerts, check-stock scan, auto-resolve on stock recovery
- **Frontend**: `SysbookAlertsTab` with settings panel (threshold, push/in-app toggles), alert list with severity badges, dismiss/dismiss-all, check stock trigger
- **Event Integration**: `create_stock_alert_if_needed` hook wired into Sysbook inventory adjust-stock routes
- **OneSignal Push**: Graceful integration — sends push when configured, silently skips when not
- **DB Collections**: `sysbook_alerts` (alerts), `sysbook_settings` (configuration)
- **Naming Cleanup**: All `pca`/`catalog` references renamed to `sysbook` internally (backend, frontend, DB documents)
- **Testing**: 100% pass rate (iteration_184)

### Sysbook Module — School Textbook Management System (Feb 21, 2026)
- **Separated from Unatienda** into a dedicated system called "Sysbook"
- **Backend**: New `/api/sysbook/` route prefix with inventory, stock-orders, and analytics endpoints, all scoped to `is_private_catalog: True`
- **Frontend**: New `modules/sysbook/` with `SysbookInventoryTab`, `SysbookStockMovementsTab`, `SysbookAnalyticsTab`
- **Sidebar**: Renamed "School Textbooks" → "SYSBOOK" with: Inventory, Stock Movements, Analytics, Students & Schools, Pre-Sale Import, Monday.com Sync, Form Settings
- **Naming**: "Catalog" renamed to "Inventory" globally within Sysbook
- **Analytics Enhancement**: Added inventory analytics dashboard with KPI cards, stock-by-grade chart, stock-by-subject chart, and movement trends chart
- **Testing**: 100% pass rate (backend and frontend, iteration_183)

### Bugfix - Textbook Catalog Incorrect Statistics (Feb 21, 2026)
- **Root Cause**: `PrivateCatalogTab.jsx` fetched both PCA and public products, then merged them. When duplicates were found (same book_id), instead of skipping them, the code renamed their IDs and added them again — inflating the count. Stats were also calculated from the full merged array instead of the filtered view per catalog tab.
- **Fix**: (1) Changed merge logic to skip duplicate book_ids. (2) Added `statsProducts` useMemo that filters by catalog type. (3) Updated BoardHeader stats to use `statsProducts`.
- **Testing**: 100% pass rate (backend and frontend)

## Architecture — Sysbook vs Unatienda

| Aspect | Unatienda (Store) | Sysbook (School Textbooks) |
|--------|-------------------|---------------------------|
| **Backend Prefix** | `/api/store/` | `/api/sysbook/` |
| **Product Scope** | ALL products (public + PCA) | PCA only (`is_private_catalog: True`) |
| **Sidebar Group** | Commerce > Unatienda | Sysbook |
| **Inventory View** | Unified (PCA + Public tabs) | Textbook-only (All + Archive tabs) |
| **Stock Movements** | Shared (all catalogs) | PCA-scoped |
| **Analytics** | — | Stock trends, grade/subject breakdowns |
| **Students** | — | Students & Schools |

## Future/Backlog Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- **(P5)** Open Graph meta tags for social sharing previews

## Key Files
- `/app/backend/scripts/migrate_spanish_to_english_fields.py` — DB migration script
- `/app/backend/modules/pinpanclub/models/` — All models (English field names)
- `/app/backend/modules/pinpanclub/services/` — All services (English variables)
- `/app/backend/modules/pinpanclub/routes/` — All routes (English params)
- `/app/frontend/src/modules/pinpanclub/` — All frontend components (English field refs)
