/**
 * ArchiveTab — Reusable archived items viewer with Restore and Permanent Delete
 * Used inside Students, Orders, Alerts, Movements, Print Jobs modules.
 *
 * Props:
 *   entityType: 'students' | 'orders' | 'alerts' | 'movements' | 'print_jobs' | 'products'
 *   token: auth token
 *   columns: [{ key, label, render? }] — columns to display
 *   idField: string — the id field name (e.g. 'student_id', 'order_id')
 *   onCountChange?: (count) => void
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Archive, Undo2, Trash2, Loader2, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function ArchiveTab({ entityType, token, columns, idField, onCountChange, searchFields = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { action: 'restore' | 'delete', ids: [] }
  const [search, setSearch] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/archive/${entityType}`, { headers });
      const data = await res.json();
      setItems(data.items || []);
      onCountChange?.(data.count || 0);
    } catch { toast.error('Error loading archived items'); }
    finally { setLoading(false); }
  }, [entityType, token]);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const handleAction = async (action, ids) => {
    setProcessing(true);
    try {
      const endpoint = action === 'restore' ? 'restore' : 'permanent-delete';
      const res = await fetch(`${API}/api/archive/${entityType}/${endpoint}`, {
        method: 'POST', headers, body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const count = action === 'restore' ? data.restored_count : data.deleted_count;
      toast.success(`${count} item${count !== 1 ? 's' : ''} ${action === 'restore' ? 'restored' : 'permanently deleted'}`);
      setSelectedIds(new Set());
      setConfirmDialog(null);
      fetchArchived();
    } catch { toast.error(`Error ${action === 'restore' ? 'restoring' : 'deleting'} items`); }
    finally { setProcessing(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    const ids = filtered.map(i => i[idField]);
    setSelectedIds(ids.every(id => selectedIds.has(id)) ? new Set() : new Set(ids));
  };

  const filtered = search
    ? items.filter(item => searchFields.some(f => String(item[f] || '').toLowerCase().includes(search.toLowerCase())))
    : items;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3" data-testid={`archive-tab-${entityType}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{filtered.length} archived item{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {searchFields.length > 0 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="h-8 text-xs pl-7 w-40" data-testid={`archive-search-${entityType}`} />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchArchived} className="h-8 text-xs gap-1" data-testid={`archive-refresh-${entityType}`}>
            <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border" data-testid={`archive-bulk-actions-${entityType}`}>
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ action: 'restore', ids: [...selectedIds] })}
            className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50" data-testid={`archive-bulk-restore-${entityType}`}>
            <Undo2 className="h-3 w-3" /> Restore
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ action: 'delete', ids: [...selectedIds] })}
            className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50" data-testid={`archive-bulk-delete-${entityType}`}>
            <Trash2 className="h-3 w-3" /> Delete Permanently
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-7 text-xs">Clear</Button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Archive className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No archived items</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-8 px-2">
                  <Checkbox checked={filtered.length > 0 && filtered.every(i => selectedIds.has(i[idField]))}
                    onCheckedChange={toggleAll} data-testid={`archive-select-all-${entityType}`} />
                </TableHead>
                {columns.map(col => (
                  <TableHead key={col.key} className="px-2 text-[11px] font-semibold uppercase tracking-wider">{col.label}</TableHead>
                ))}
                <TableHead className="px-2 text-[11px] font-semibold uppercase tracking-wider">Archived</TableHead>
                <TableHead className="px-2 w-28 text-right text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const id = item[idField];
                return (
                  <TableRow key={id} className={`h-10 ${selectedIds.has(id) ? 'bg-primary/5' : ''}`} data-testid={`archive-row-${id}`}>
                    <TableCell className="px-2 py-1">
                      <Checkbox checked={selectedIds.has(id)} onCheckedChange={() => toggleSelect(id)} />
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key} className="px-2 py-1 text-xs">
                        {col.render ? col.render(item) : (item[col.key] ?? '-')}
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-1 text-[10px] text-muted-foreground">
                      {item.archived_at ? new Date(item.archived_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDialog({ action: 'restore', ids: [id] })}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700" data-testid={`archive-restore-${id}`}>
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDialog({ action: 'delete', ids: [id] })}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700" data-testid={`archive-delete-${id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog?.action === 'delete' && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {confirmDialog?.action === 'restore' ? 'Restore Items' : 'Permanently Delete'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === 'restore'
                ? `Restore ${confirmDialog?.ids?.length} item${confirmDialog?.ids?.length !== 1 ? 's' : ''} back to active?`
                : `This will permanently delete ${confirmDialog?.ids?.length} item${confirmDialog?.ids?.length !== 1 ? 's' : ''}. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={processing}>Cancel</Button>
            <Button onClick={() => handleAction(confirmDialog.action, confirmDialog.ids)} disabled={processing}
              variant={confirmDialog?.action === 'delete' ? 'destructive' : 'default'} className="gap-1">
              {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmDialog?.action === 'restore' ? 'Restore' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
