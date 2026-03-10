/**
 * Presale Reconciliation Tab
 * Compares Monday.com board against imported orders to detect:
 * - New subitems added after import
 * - Missing imports (marked Done but never imported)
 * - Fully synced orders
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, CheckCircle, AlertTriangle, XCircle,
  Package, Plus, Merge, Download, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function ReconciliationTab() {
  const token = localStorage.getItem('auth_token');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [merging, setMerging] = useState(null);
  const [importing, setImporting] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState(null);

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
      toast.success(`Scan complete: ${result.has_new_items?.length || 0} orders with new items, ${result.missing_import?.length || 0} missing imports`);
    } catch (err) {
      toast.error(`Reconciliation failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }, [token]);

  const handleMerge = async (entry) => {
    setMerging(entry.order_id);
    try {
      const res = await fetch(`${API}/api/sysbook/presale-import/merge/${entry.order_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monday_item_id: entry.monday_item_id,
          new_items: entry.new_items,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Merge failed');
      }
      const result = await res.json();
      toast.success(`Merged ${result.added} new items into order ${entry.order_id}`);
      setMergeConfirm(null);
      // Re-run reconciliation to refresh
      runReconcile();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMerging(null);
    }
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(null);
    }
  };

  const handleMergeAll = async () => {
    if (!results?.has_new_items?.length) return;
    const items = results.has_new_items;
    let merged = 0;
    for (const entry of items) {
      try {
        setMerging(entry.order_id);
        const res = await fetch(`${API}/api/sysbook/presale-import/merge/${entry.order_id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monday_item_id: entry.monday_item_id,
            new_items: entry.new_items,
          }),
        });
        if (res.ok) merged++;
      } catch {}
    }
    setMerging(null);
    toast.success(`Merged new items into ${merged} orders`);
    runReconcile();
  };

  const summary = results ? {
    synced: results.synced?.length || 0,
    hasNew: results.has_new_items?.length || 0,
    missing: results.missing_import?.length || 0,
    notImported: results.not_imported?.length || 0,
  } : null;

  return (
    <div className="space-y-4" data-testid="reconciliation-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Presale Reconciliation</h3>
          <p className="text-sm text-muted-foreground">
            Compare Monday.com board against imported orders — detect new items, missing imports, and discrepancies
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
              <div className="text-xs text-orange-600">Has New Items</div>
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

      {/* Orders with New Items */}
      {results?.has_new_items?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Orders with New Items ({results.has_new_items.length})
                </CardTitle>
                <CardDescription>These orders have new textbooks added on Monday.com since the last import</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={handleMergeAll} disabled={!!merging}
                data-testid="merge-all-btn"
              >
                <Merge className="h-3.5 w-3.5 mr-1" /> Merge All New Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-center">Existing</TableHead>
                    <TableHead className="text-center">New</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.has_new_items.map((entry) => (
                    <>
                      <TableRow key={entry.monday_item_id} className="hover:bg-orange-50/50">
                        <TableCell className="font-medium">{entry.student_name}</TableCell>
                        <TableCell>{entry.grade}</TableCell>
                        <TableCell className="text-center">{entry.order_items_count}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                            +{entry.new_items_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.order_status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setExpandedItem(expandedItem === entry.monday_item_id ? null : entry.monday_item_id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {expandedItem === entry.monday_item_id ? 'Hide' : 'View'}
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
                              onClick={() => setMergeConfirm(entry)}
                              disabled={merging === entry.order_id}
                              data-testid={`merge-btn-${entry.order_id}`}
                            >
                              {merging === entry.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                              Merge
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedItem === entry.monday_item_id && (
                        <TableRow key={`${entry.monday_item_id}-detail`}>
                          <TableCell colSpan={6} className="bg-orange-50/30 p-3">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-orange-700 mb-2">New items to be merged:</p>
                              {entry.new_items?.map((ni, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-orange-100">
                                  <div>
                                    <span className="font-mono text-orange-600 mr-2">{ni.book_code || '—'}</span>
                                    <span className="font-medium">{ni.book_name || ni.name}</span>
                                  </div>
                                  <span className="text-muted-foreground">${ni.price?.toFixed(2) || '0.00'}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Missing Imports */}
      {results?.missing_import?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Missing Imports ({results.missing_import.length})
            </CardTitle>
            <CardDescription>These Monday items are marked "Done" but were never imported into the app</CardDescription>
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
              {results.synced.length} orders are fully synchronized — all Monday subitems match the imported order items.
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
              Click "Scan Monday Board" to compare all Monday items against imported orders
            </p>
          </CardContent>
        </Card>
      )}

      {/* Merge Confirmation Dialog */}
      {mergeConfirm && (
        <Dialog open={true} onOpenChange={() => setMergeConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge New Items into Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{mergeConfirm.student_name}</strong> ({mergeConfirm.grade}) — Order: {mergeConfirm.order_id}
              </p>
              <p className="text-sm text-muted-foreground">
                {mergeConfirm.new_items_count} new textbook(s) will be added:
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {mergeConfirm.new_items?.map((ni, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5 px-3 rounded bg-orange-50 border border-orange-100">
                    <span>{ni.book_code ? `[${ni.book_code}] ` : ''}{ni.book_name || ni.name}</span>
                    <span className="font-medium">${ni.price?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeConfirm(null)}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700"
                onClick={() => handleMerge(mergeConfirm)}
                disabled={!!merging}
              >
                {merging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Merge {mergeConfirm.new_items_count} Items
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
