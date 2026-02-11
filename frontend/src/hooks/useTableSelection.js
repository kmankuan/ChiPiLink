/**
 * useTableSelection — Reusable hook for multi-select tables with bulk actions
 * Usage:
 *   const { selected, isSelected, toggle, toggleAll, clear, count } = useTableSelection();
 */
import { useState, useCallback, useMemo } from 'react';

export function useTableSelection(items = [], idKey = 'id') {
  const [selected, setSelected] = useState(new Set());

  const ids = useMemo(() => items.map(i => i[idKey]), [items, idKey]);

  const isSelected = useCallback((id) => selected.has(id), [selected]);

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = ids.length > 0 && selected.size === ids.length;
  const someSelected = selected.size > 0 && selected.size < ids.length;

  return {
    selected,
    isSelected,
    toggle,
    toggleAll,
    clear,
    count: selected.size,
    allSelected,
    someSelected,
  };
}
