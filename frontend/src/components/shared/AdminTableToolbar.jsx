/**
 * AdminTableToolbar — Consistent search/filter bar for all admin data tables
 * Features: search input, archive toggle, item count, refresh button
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Archive, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AdminTableToolbar({
  search,
  onSearchChange,
  placeholder,
  totalCount = 0,
  filteredCount,
  showArchived,
  onToggleArchived,
  onRefresh,
  loading = false,
  children,
}) {
  const { t } = useTranslation();
  const searchPlaceholder = placeholder || t('common.search') + '...';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4" data-testid="admin-table-toolbar">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          data-testid="table-search-input"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8 h-9 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {onToggleArchived && (
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleArchived}
            className="gap-1.5 text-xs h-9"
            data-testid="toggle-archived-btn"
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('common.archived')}</span>
          </Button>
        )}

        {children}

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
            data-testid="table-refresh-btn"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        )}

        <Badge variant="outline" className="text-xs h-6 tabular-nums" data-testid="table-count-badge">
          {filteredCount !== undefined && filteredCount !== totalCount
            ? `${filteredCount} / ${totalCount}`
            : totalCount}
        </Badge>
      </div>
    </div>
  );
}
