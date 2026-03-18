# Component Registry

Central reference for all reusable components, hooks, contexts, and utilities.
**Before building anything new, check here first.**

---

## Hooks (`/app/frontend/src/hooks/`)

| Hook | Import | Purpose |
|------|--------|---------|
| `useGuardedAction` | `@/hooks/useGuardedAction` | Prevents duplicate async execution (ref-based, not state) |
| `usePagination` | `@/hooks/usePagination` | Client-side pagination logic for any list |
| `useTableSelection` | `@/hooks/useTableSelection` | Multi-select for table rows (select, toggle, toggleAll, clear) |
| `usePermissions` | `@/hooks/usePermissions` | Role/permission check for the current user |
| `useNotifications` | `@/hooks/useNotifications` | Polls textbook order notification unread counts |
| `useCrmNotifications` | `@/hooks/useCrmNotifications` | Polls CRM chat unread counts per student |
| `useWebSocket` | `@/hooks/useWebSocket` | WebSocket connection with auto-reconnect |
| `useAutoTranslate` | `@/hooks/useAutoTranslate` | Auto-translate text between languages |
| `useLandingImages` | `@/hooks/useLandingImages` | Fetches landing page images from backend |
| `useLayoutIcons` | `@/hooks/useLayoutIcons` | Fetches layout ticker icons |

### Hook Usage Examples

**useGuardedAction** — Use on ANY submit button to prevent double-clicks:
```jsx
const [execute, isRunning] = useGuardedAction();
const handleSubmit = () => execute(async () => {
  await api.post('/submit', data);
  toast.success('Done!');
});
<Button onClick={handleSubmit} disabled={isRunning}>Submit</Button>
```
Used in: `SchoolTextbooksView`, `TextbookOrderView`

**usePagination** — Wrap any array for paginated display:
```jsx
const { page, pageSize, totalPages, paginated, setPage, setPageSize, canPrev, canNext } = usePagination(items, 25);
// paginated = current page's slice of items
```
Used in: `RegisteredUsersTab`, `AllStudentsTab`, `TextbookOrdersAdminTab`

**useTableSelection** — Multi-select rows in tables:
```jsx
const sel = useTableSelection(items, 'order_id');
// sel.selected (Set), sel.isSelected(id), sel.toggle(id), sel.toggleAll(), sel.clear(), sel.count
```
Used in: `TextbookOrdersAdminTab`

---

## Shared Components (`/app/frontend/src/components/shared/`)

| Component | Import | Purpose |
|-----------|--------|---------|
| `BoardHeader` | `@/components/shared/BoardHeader` | Monday.com-style table header with tabs, search, filters, stats, actions |
| `AdminTableToolbar` | `@/components/shared/AdminTableToolbar` | Simpler search/filter bar for admin tables |
| `BulkActionBar` | `@/components/shared/BulkActionBar` | Floating bar for bulk actions (archive, delete, custom) |
| `ConfirmDialog` | `@/components/shared/ConfirmDialog` | Confirmation modal with variant support (destructive, warning) |
| `TablePagination` | `@/components/shared/TablePagination` | Page navigation bar (prev/next, page size selector) |

### Shared Component Props

**BoardHeader** — Full-featured table header:
```jsx
<BoardHeader
  title="Orders" icon={Package}
  tabs={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }]}
  activeTab={tab} onTabChange={setTab}
  search={search} onSearchChange={setSearch} searchPlaceholder="Search..."
  filters={[{ value: grade, onChange: setGrade, options: [...], placeholder: 'Grade' }]}
  stats={[{ label: 'Total', value: 100 }, { label: 'Pending', value: 5, color: 'amber' }]}
  actions={<Button>Export</Button>}
  loading={loading} onRefresh={fetchData}
/>
```
Used in: `TextbookOrdersAdminTab`, `AllStudentsTab`, `RegisteredUsersTab`

**BulkActionBar** — Floating bulk action bar:
```jsx
<BulkActionBar
  count={selection.count} onClear={selection.clear}
  onArchive={() => setConfirmArchive(true)}
  onDelete={() => setConfirmDelete(true)}
  loading={bulkLoading}
/>
```
Used in: `TextbookOrdersAdminTab`

**ConfirmDialog** — Destructive action confirmation:
```jsx
<ConfirmDialog
  open={showConfirm} onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete 3 item(s)?"
  description="This cannot be undone."
  variant="destructive"  // or "warning"
  confirmLabel="Delete Forever"
  loading={deleting}
/>
```
Used in: `TextbookOrdersAdminTab`, `RegisteredUsersTab`

**TablePagination** — Pair with usePagination hook:
```jsx
<TablePagination
  page={page} totalPages={totalPages} totalItems={items.length}
  pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
  canPrev={canPrev} canNext={canNext}
/>
```
Used in: `RegisteredUsersTab`, `AllStudentsTab`, `TextbookOrdersAdminTab`

---

## Custom UI Components (`/app/frontend/src/components/ui/`)

Beyond standard Shadcn/UI, these are custom:

| Component | Import | Purpose |
|-----------|--------|---------|
| `ExpandableText` | `@/components/ui/expandable-text` | Text clamped to 2 lines, expands on click |
| `ProgressIcons` | `@/components/ui/ProgressIcons` | Chinese-themed animated progress indicators (5 levels, 4 themes) |
| `ModuleStatusBadge` | `@/components/ui/ModuleStatusBadge` | Shows module lifecycle status (production, live_beta, coming_soon) |

### Custom UI Usage

**ExpandableText**:
```jsx
<ExpandableText className="text-sm text-muted-foreground">
  {longDescription}
</ExpandableText>
```

**ProgressIcons** — For student progress display:
```jsx
import { ProgressIcon, PROGRESS_THEMES } from '@/components/ui/ProgressIcons';
<ProgressIcon level="advancing" theme="journey" size={24} />
// Levels: starting, developing, advancing, mastering, complete
// Themes: journey, architecture, celestial, calligraphy
```

**ModuleStatusBadge** — Mark modules as beta/coming soon:
```jsx
<ModuleStatusBadge status="live_beta" />
// Statuses: production (hidden), live_beta, coming_soon, maintenance
```

---

## Contexts (`/app/frontend/src/contexts/`)

| Context | Import | Purpose |
|---------|--------|---------|
| `AuthContext` | `@/contexts/AuthContext` | Auth state, token, user, `api` (axios instance with auth headers) |
| `CartContext` | `@/contexts/CartContext` | Public store shopping cart state |
| `RealtimeContext` | `@/contexts/RealtimeContext` | SSE-based real-time events (`useRealtimeEvent`) |
| `SiteConfigContext` | `@/contexts/SiteConfigContext` | Global site configuration (name, colors, etc.) |
| `ThemeContext` | `@/contexts/ThemeContext` | Dark/light theme management |
| `LayoutContext` | `@/contexts/LayoutContext` | Public layout CSS class management |
| `InlineTranslationContext` | `@/contexts/InlineTranslationContext` | Inline translation overlay for admin |
| `OneSignalContext` | `@/contexts/OneSignalContext` | Push notification integration |

### Key Context Usage

**AuthContext** — The `api` instance auto-attaches auth headers:
```jsx
const { token, user, isAuthenticated, api } = useAuth();
const res = await api.get('/api/some-endpoint'); // token attached automatically
```

**RealtimeContext** — Listen for server events:
```jsx
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
useRealtimeEvent('order_submitted', useCallback((data) => {
  fetchData(); // refresh when order comes in
}, []));
```

---

## Domain-Specific Reusable Components

| Component | Path | Purpose |
|-----------|------|---------|
| `OrderSummaryModal` | `modules/unatienda/components/OrderSummaryModal` | Textbook order confirmation modal (books, form, wallet, totals) |
| `FormConfigModule` | `modules/admin/FormConfigModule` | Admin form builder for dynamic form fields |

---

## Standard Pattern: Admin Table

When building a new admin table/list view, combine these:

```jsx
import { BoardHeader } from '@/components/shared/BoardHeader';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { useTableSelection } from '@/hooks/useTableSelection';
```

## Standard Pattern: Async Submit Button

```jsx
import { useGuardedAction } from '@/hooks/useGuardedAction';
const [execute, isRunning] = useGuardedAction();
<Button onClick={() => execute(async () => { ... })} disabled={isRunning}>
  {isRunning ? <Loader2 className="animate-spin" /> : 'Submit'}
</Button>
```
