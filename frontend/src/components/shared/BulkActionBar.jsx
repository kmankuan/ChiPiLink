/**
 * BulkActionBar — Floating bar shown when items are selected in a table
 * Supports archive, delete, and custom actions
 */
import { Button } from '@/components/ui/button';
import { Archive, Trash2, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function BulkActionBar({
  count,
  onClear,
  onArchive,
  onDelete,
  archiveLabel = 'Archive',
  deleteLabel = 'Delete',
  loading = false,
  children,
}) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-50 mx-auto w-fit" data-testid="bulk-action-bar">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-background shadow-lg">
        <span className="text-sm font-medium mr-1" data-testid="bulk-count">
          {count} selected
        </span>

        {onArchive && (
          <Button variant="outline" size="sm" onClick={onArchive} disabled={loading}
            className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50" data-testid="bulk-archive-btn">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            {archiveLabel}
          </Button>
        )}

        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} disabled={loading}
            className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50" data-testid="bulk-delete-btn">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {deleteLabel}
          </Button>
        )}

        {children}

        <Button variant="ghost" size="sm" onClick={onClear} className="ml-1" data-testid="bulk-clear-btn">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
