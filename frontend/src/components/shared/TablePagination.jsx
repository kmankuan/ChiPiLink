/**
 * TablePagination — Consistent pagination bar for admin data tables
 * Shows page info, prev/next, page size selector
 */
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  canPrev,
  canNext,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  if (totalItems <= pageSizeOptions[0]) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 text-xs text-muted-foreground" data-testid="table-pagination">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-7 w-16 text-xs" data-testid="page-size-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          data-testid="pagination-prev"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          data-testid="pagination-next"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
