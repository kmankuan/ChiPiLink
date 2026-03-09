/**
 * usePagination — Reusable hook for client-side pagination
 * Usage:
 *   const { page, pageSize, totalPages, paginated, setPage, setPageSize, canPrev, canNext } = usePagination(items);
 */
import { useState, useMemo, useCallback } from 'react';

export function usePagination(items = [], defaultPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change significantly
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginated,
    setPage,
    setPageSize,
    canPrev: safePage > 1,
    canNext: safePage < totalPages,
  };
}
