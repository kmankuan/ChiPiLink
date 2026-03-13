/**
 * Presale Reconciliation Tab
 * Compares Monday.com board against imported orders to detect:
 * - New subitems added after import
 * - Missing imports (marked Done but never imported)
 * - Fully synced orders
 * 
 * UX: Always shows analysis first → user reviews → confirms actions
 * Inline editing of related orders directly from results
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, CheckCircle, AlertTriangle, XCircle,
  Package, Plus, Download, Eye, EyeOff, Pencil, Save, X,
  Check, Printer, MessageSquareText, ChevronDown, ChevronRight
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awaiting_link', label: 'Awaiting Link' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Inline order editor — edit note, print count, status from reconciliation view
function InlineOrderEditor({ entry, onUpdate }) {
  const token = localStorage.getItem('auth_token');
  const [editingField, setEditingField] = useState(null);
  const [noteValue, setNoteValue] = useState(entry.admin_note || '');
  const [printValue, setPrintValue] = useState(entry.print_count || 0);
  const [saving, setSaving] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const saveField = async (field, value) => {
    setSaving(true);
    try {
      let url, body;
      if (field === 'note') {
        url = `${API}/api/sysbook/orders/admin/${entry.order_id}/note`;
        body = { note: value };
      } else if (field === 'print_count') {
        url = `${API}/api/sysbook/orders/admin/${entry.order_id}/print-count`;
        body = { print_count: parseInt(value, 10) };
      } else if (field === 'status') {
        url = `${API}/api/sysbook/orders/admin/${entry.order_id}/status`;
        body = { status: value };
      }
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`${field} updated`);
        onUpdate?.();
      } else {
        toast.error('Update failed');
      }
    } catch { toast.error('Error saving'); }
    finally { setSaving(false); setEditingField(null); }
  };

  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      {/* Order info row */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <span className="font-mono text-xs text-muted-foreground">{entry.order_id}</span>
        
        {/* Status */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant="outline" className="text-xs">{entry.order_status}</Badge>
        </div>

        {/* Print count — editable */}
        <div className="flex items-center gap-1">
          <Printer className="h-3 w-3 text-muted-foreground" />
          {editingField === 'print_count' ? (
            <div className="flex items-center gap-0.5">
              <Input type="number" min="0" value={printValue}
                onChange={(e) => setPrintValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveField('print_count', printValue); if (e.key === 'Escape') setEditingField(null); }}
                className="h-6 w-14 text-center text-xs" autoFocus
              />
              <button onClick={() => saveField('print_count', printValue)} disabled={saving} className="text-green-600"><Check className="h-3 w-3" /></button>
              <button onClick={() => setEditingField(null)} className="text-gray-400"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={() => { setPrintValue(entry.print_count || 0); setEditingField('print_count'); }}
              className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[11px] font-bold cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all ${
                (entry.print_count || 0) > 0 ? 'bg-green-100 text-green-700 hover:ring-green-300' : 'bg-gray-100 text-gray-400 hover:ring-gray-300'
              }`}
              title="Click to edit print count"
            >
              {entry.print_count || 0}
            </button>
          )}
        </div>

        {/* Note — editable */}
        <div className="flex items-center gap-1 flex-1 min-w-[150px]">
          <MessageSquareText className="h-3 w-3 text-muted-foreground shrink-0" />
          {editingField === 'note' ? (
            <div className="flex items-center gap-1 flex-1">
              <Input value={noteValue} onChange={(e) => setNoteValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveField('note', noteValue); if (e.key === 'Escape') setEditingField(null); }}
                className="h-6 text-xs flex-1" placeholder="Add note..." autoFocus
              />
              <button onClick={() => saveField('note', noteValue)} disabled={saving} className="text-green-600"><Check className="h-3 w-3" /></button>
              <button onClick={() => setEditingField(null)} className="text-gray-400"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={() => { setNoteValue(entry.admin_note || ''); setEditingField('note'); }}
              className={`text-xs text-left truncate max-w-[200px] cursor-pointer hover:underline ${entry.admin_note ? 'text-amber-700' : 'text-gray-400'}`}
              title={entry.admin_note || 'Click to add note'}
            >
              {entry.admin_note || '+ Add note'}
            </button>
          )}
        </div>

        {/* Toggle items */}
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowItems(!showItems)}>
          {showItems ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {showItems ? 'Hide' : 'View'} Items ({entry.order_items_count})
        </Button>
      </div>

      {/* Existing items */}
      {showItems && entry.order_items && (
        <div className="space-y-1 pl-2 border-l-2 border-gray-200">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Order Items</p>
          {entry.order_items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-gray-50">
              <div>
                <span className="font-mono text-gray-500 mr-1">{item.book_code || '—'}</span>
                <span>{item.book_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>×{item.quantity_ordered || 1}</span>
                <span>${(item.price || 0).toFixed(2)}</span>
                <Badge variant="outline" className="text-[9px] h-4">{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReconciliationTab() {
  const token = localStorage.getItem('auth_token');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [merging, setMerging] = useState(null);
  const [importing, setImporting] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [mergeConfirm, setMergeConfirm] = useState(null);
  const [mergeAllConfirm, setMergeAllConfirm] = useState(false);

  const pollJob = async (jobId) => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`${API}/api/sysbook/presale-import/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) continue;
      const job = await res.json();
      if (job.status === 'done') return job.result;
      if (job.status === 'error') throw new Error(job.error || 'Job failed');
    }
    throw new Error('Job timed out');
  };

  const runReconcile = useCallback(async () => {
    setScanning(true);
    setResults(null);
    try {
      const res = await fetch(`${API}/api/sysbook/presale-import/reconcile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to start reconciliation');
      const { job_id } = await res.json();
      const result = await pollJob(job_id);
      setResults(result);
      const hasNew = result.has_new_items?.length || 0;
      const missing = result.missing_import?.length || 0;
      if (hasNew === 0 && missing === 0) {
        toast.success('All orders are fully synced — no action needed');
      } else {
        toast.info(`Found ${hasNew} orders with new items, ${missing} missing imports — review below`);
      }
    } catch (err) {
      toast.error(`Reconciliation failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }, [token]);

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMerge = async (entry) => {
    setMerging(entry.order_id);
    try {
      const res = await fetch(`${API}/api/sysbook/presale-import/merge/${entry.order_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monday_item_id: entry.monday_item_id, new_items: entry.new_items }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Merge failed'); }
      const result = await res.json();
      toast.success(`Merged ${result.added} new items into order`);
      setMergeConfirm(null);
      runReconcile();
    } catch (err) { toast.error(err.message); }
    finally { setMerging(null); }
  };

  const handleMergeAll = async () => {
    if (!results?.has_new_items?.length) return;
    setMergeAllConfirm(false);
    let merged = 0;
    for (const entry of results.has_new_items) {
      try {
        setMerging(entry.order_id);
        const res = await fetch(`${API}/api/sysbook/presale-import/merge/${entry.order_id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ monday_item_id: entry.monday_item_id, new_items: entry.new_items }),
        });
        if (res.ok) merged++;
      } catch {}
    }
    setMerging(null);
    toast.success(`Merged new items into ${merged} orders`);
    runReconcile();
  };

  const handleImportMissing = async (entry) => {
    setImporting(entry.monday_item_id);
    try {
      const res = await fetch(`${API}/api/sysbook/presale-import/import-missing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monday_item_ids: [entry.monday_item_id] }),
      });
      if (!res.ok) throw new Error('Import failed');
      const { job_id } = await res.json();
      const result = await pollJob(job_id);
      toast.success(`Imported ${result.imported} order(s)`);
      runReconcile();
    } catch (err) { toast.error(err.message); }
    finally { setImporting(null); }
  };

  const summary = results ? {
    synced: results.synced?.length || 0,
    hasNew: results.has_new_items?.length || 0,
    missing: results.missing_import?.length || 0,
    notImported: results.not_imported?.length || 0,
    totalNewItems: (results.has_new_items || []).reduce((sum, e) => sum + (e.new_items_count || 0), 0),
  } : null;

  return (
    <div className="space-y-4" data-testid="reconciliation-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Presale Reconciliation</h3>
          <p className="text-sm text-muted-foreground">
            Scan Monday.com → Review analysis → Confirm actions
          </p>
        </div>
        <Button onClick={runReconcile} disabled={scanning} data-testid="reconcile-btn">
          {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {scanning ? 'Scanning...' : 'Scan Monday Board'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{summary.synced}</div>
              <div className="text-xs text-green-600">Fully Synced</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-3 text-center">
              <Plus className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-700">{summary.hasNew}</div>
              <div className="text-xs text-orange-600">Has New Items (+{summary.totalNewItems} textbooks)</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-3 text-center">
              <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{summary.missing}</div>
              <div className="text-xs text-red-600">Missing Import</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50/50">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 text-gray-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-600">{summary.notImported}</div>
              <div className="text-xs text-gray-500">Not Yet Imported</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ ORDERS WITH NEW ITEMS ═══ */}
      {results?.has_new_items?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Orders with New Items ({results.has_new_items.length})
                </CardTitle>
                <CardDescription>Review new textbooks below. Click "Merge" on each order after confirming, or "Merge All" after reviewing all.</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setMergeAllConfirm(true)} disabled={!!merging} data-testid="merge-all-btn"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Merge All ({summary.totalNewItems} items)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {results.has_new_items.map((entry) => {
                const isExpanded = expandedItems.has(entry.monday_item_id);
                return (
                  <div key={entry.monday_item_id} className="border rounded-lg mb-3 overflow-hidden">
                    {/* Summary row */}
                    <div className="flex items-center gap-3 p-3 bg-orange-50/30 cursor-pointer hover:bg-orange-50/60"
                      onClick={() => toggleExpand(entry.monday_item_id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-orange-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-orange-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{entry.student_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{entry.grade}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{entry.order_items_count} existing</span>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">+{entry.new_items_count} new</Badge>
                        <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
                          onClick={(e) => { e.stopPropagation(); setMergeConfirm(entry); }}
                          disabled={merging === entry.order_id} data-testid={`merge-btn-${entry.order_id}`}
                        >
                          {merging === entry.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                          Merge
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="p-3 space-y-3 border-t border-orange-100">
                        {/* Inline order editor */}
                        <InlineOrderEditor entry={entry} onUpdate={runReconcile} />

                        {/* New items to merge */}
                        <div className="space-y-1 pl-2 border-l-2 border-orange-300">
                          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">New Items (will be added on merge)</p>
                          {entry.new_items?.map((ni, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-orange-50 border border-orange-100">
                              <div>
                                <span className="font-mono text-orange-600 mr-1">{ni.book_code || '—'}</span>
                                <span className="font-medium">{ni.book_name || ni.name}</span>
                              </div>
                              <span className="font-medium">${(ni.price || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ MISSING IMPORTS ═══ */}
      {results?.missing_import?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Missing Imports ({results.missing_import.length})
            </CardTitle>
            <CardDescription>Monday items marked "Done" but never imported. Review and import individually.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-center">Subitems</TableHead>
                    <TableHead>Monday Column</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.missing_import.map((entry) => (
                    <TableRow key={entry.monday_item_id} className="hover:bg-red-50/50">
                      <TableCell className="font-medium">{entry.student_name}</TableCell>
                      <TableCell>{entry.grade}</TableCell>
                      <TableCell className="text-center">{entry.monday_subitems_count}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{entry.sync_column}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700"
                          onClick={() => handleImportMissing(entry)}
                          disabled={importing === entry.monday_item_id}
                          data-testid={`import-missing-btn-${entry.monday_item_id}`}
                        >
                          {importing === entry.monday_item_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                          Import Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Synced */}
      {results?.synced?.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Fully Synced ({results.synced.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {results.synced.length} orders match their Monday.com subitems perfectly — no action needed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No results yet */}
      {!results && !scanning && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">No scan results yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Scan Monday Board" to analyze all orders and detect discrepancies
            </p>
          </CardContent>
        </Card>
      )}

      {/* ═══ MERGE CONFIRMATION DIALOG ═══ */}
      {mergeConfirm && (
        <Dialog open={true} onOpenChange={() => setMergeConfirm(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Merge — {mergeConfirm.student_name}</DialogTitle>
              <DialogDescription>
                Add {mergeConfirm.new_items_count} new textbook(s) to order {mergeConfirm.order_id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mergeConfirm.new_items?.map((ni, idx) => (
                <div key={idx} className="flex justify-between text-sm py-2 px-3 rounded bg-orange-50 border border-orange-100">
                  <div>
                    {ni.book_code && <span className="font-mono text-orange-600 mr-1">[{ni.book_code}]</span>}
                    <span className="font-medium">{ni.book_name || ni.name}</span>
                  </div>
                  <span className="font-semibold">${(ni.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeConfirm(null)}>Cancel — Don't merge</Button>
              <Button className="bg-orange-600 hover:bg-orange-700"
                onClick={() => handleMerge(mergeConfirm)} disabled={!!merging}
              >
                {merging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Confirm Merge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ MERGE ALL CONFIRMATION ═══ */}
      {mergeAllConfirm && (
        <Dialog open={true} onOpenChange={() => setMergeAllConfirm(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Merge All</DialogTitle>
              <DialogDescription>
                This will merge {summary?.totalNewItems} new textbooks across {summary?.hasNew} orders. Each order will get only its new items added.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-orange-50 p-3 rounded text-sm space-y-1">
              {results?.has_new_items?.map((e) => (
                <div key={e.monday_item_id} className="flex justify-between">
                  <span>{e.student_name} ({e.grade})</span>
                  <Badge className="bg-orange-100 text-orange-700">+{e.new_items_count}</Badge>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeAllConfirm(false)}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleMergeAll}>
                <Check className="h-4 w-4 mr-2" />
                Yes, Merge All {summary?.totalNewItems} Items
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
