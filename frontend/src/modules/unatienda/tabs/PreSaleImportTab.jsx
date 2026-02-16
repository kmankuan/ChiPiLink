/**
 * Pre-Sale Import Tab
 * Admin UI for importing pre-sale orders from Monday.com
 * and managing the linking workflow.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Download, Eye, Link2, Loader2, RefreshCw, Search, ShoppingCart,
  AlertTriangle, CheckCircle, Clock, Package, Users, ArrowUpDown,
  ArrowUp, ArrowDown, Unlink, ExternalLink, ArrowRight
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/shared/TablePagination';

const API = process.env.REACT_APP_BACKEND_URL;

const LINK_STATUS_COLORS = {
  unlinked: 'bg-orange-100 text-orange-700 border-orange-200',
  linked: 'bg-green-100 text-green-700 border-green-200',
};

export default function PreSaleImportTab({ token: propToken }) {
  const token = propToken || localStorage.getItem('auth_token');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [students, setStudents] = useState([]);
  const [linkDialog, setLinkDialog] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linking, setLinking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);
  const [unlinking, setUnlinking] = useState(null);

  useEffect(() => { fetchOrders(); fetchStudents(); fetchSuggestions(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/presale-import/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching pre-sale orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/all-students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || data || []);
      }
    } catch { /* silent */ }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API}/api/store/presale-import/suggestions?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch { /* silent */ }
  };

  const handleConfirmSuggestion = async (suggestionId) => {
    setConfirmingId(suggestionId);
    try {
      const res = await fetch(`${API}/api/store/presale-import/suggestions/${suggestionId}/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Link confirmed');
        fetchOrders();
        fetchSuggestions();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to confirm');
      }
    } catch { toast.error('Error confirming'); }
    finally { setConfirmingId(null); }
  };

  const handleRejectSuggestion = async (suggestionId) => {
    setConfirmingId(suggestionId);
    try {
      const res = await fetch(`${API}/api/store/presale-import/suggestions/${suggestionId}/reject`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Suggestion rejected');
        fetchSuggestions();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to reject');
      }
    } catch { toast.error('Error rejecting'); }
    finally { setConfirmingId(null); }
  };

  const handleUnlink = async (orderId) => {
    setUnlinking(orderId);
    try {
      const res = await fetch(`${API}/api/store/presale-import/unlink`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });
      if (res.ok) {
        toast.success('Order unlinked');
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to unlink');
      }
    } catch { toast.error('Error unlinking'); }
    finally { setUnlinking(null); }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch(`${API}/api/store/presale-import/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        setShowPreview(true);
        if (data.count === 0) {
          toast.info('No items ready for import. Set the sync trigger column on Monday.com to "Ready" or "Listo" first.');
        }
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Preview failed');
      }
    } catch (error) {
      toast.error('Error previewing import');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch(`${API}/api/store/presale-import/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.imported} orders (${data.skipped} skipped, ${data.errors} errors)`);
        setShowPreview(false);
        setPreviewData(null);
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Import failed');
      }
    } catch (error) {
      toast.error('Error executing import');
    } finally {
      setImporting(false);
    }
  };

  const handleManualLink = async (order, student) => {
    setLinking(true);
    try {
      const res = await fetch(`${API}/api/store/presale-import/link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.order_id,
          student_id: student.student_id || student.sync_id,
          user_id: student.user_id,
        })
      });
      if (res.ok) {
        toast.success(`Order linked to ${student.full_name}`);
        setLinkDialog(null);
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Link failed');
      }
    } catch {
      toast.error('Error linking order');
    } finally {
      setLinking(false);
    }
  };

  // Filtering
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.link_status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.student_name?.toLowerCase().includes(term) ||
        o.parent_name?.toLowerCase().includes(term) ||
        o.order_id?.toLowerCase().includes(term) ||
        o.grade?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [orders, statusFilter, searchTerm]);

  // Sorting
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    const { key, direction } = sortConfig;
    sorted.sort((a, b) => {
      let va = a[key] || '', vb = b[key] || '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return direction === 'asc' ? -1 : 1;
      if (va > vb) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortConfig]);

  const { page, pageSize, totalPages, paginated, setPage, setPageSize, canPrev, canNext } = usePagination(sortedOrders, 25);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const unlinkedCount = orders.filter(o => o.link_status === 'unlinked').length;
  const linkedCount = orders.filter(o => o.link_status === 'linked').length;

  const SortHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <button onClick={() => handleSort(sortKey)} className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors ${className}`}>
        {label}
        {isActive ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
      </button>
    );
  };

  // Filter students for manual linking
  const filteredStudents = useMemo(() => {
    if (!linkSearchTerm) return students.slice(0, 20);
    const term = linkSearchTerm.toLowerCase();
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(term) ||
      s.student_number?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [students, linkSearchTerm]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3" data-testid="presale-import-tab">
      {/* Stats & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap" data-testid="presale-stats">
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-xs font-medium">
            <Package className="h-3.5 w-3.5" /> <span className="text-base font-bold">{orders.length}</span> total
          </span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${unlinkedCount > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/40 text-orange-600' : 'border-border/50 bg-muted/50 text-muted-foreground'}`}>
            <Unlink className="h-3.5 w-3.5" /> <span className="text-base font-bold">{unlinkedCount}</span> unlinked
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-green-50 dark:bg-green-950/40 text-green-600 text-xs font-medium">
            <Link2 className="h-3.5 w-3.5" /> <span className="text-base font-bold">{linkedCount}</span> linked
          </span>
          {suggestions.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-xs font-medium animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" /> <span className="text-base font-bold">{suggestions.length}</span> to review
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing} className="gap-1 h-7 text-xs" data-testid="preview-import-btn">
            {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            Preview Import
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-1 h-7 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Pending Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-3 space-y-2" data-testid="link-suggestions">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-800 dark:text-orange-300">{suggestions.length} Link Suggestion{suggestions.length > 1 ? 's' : ''} — Review Required</span>
          </div>
          <div className="space-y-1.5">
            {suggestions.map(s => (
              <div key={s.suggestion_id} className="flex items-center gap-3 p-2 rounded-md bg-white dark:bg-card border border-orange-100 dark:border-orange-800/50" data-testid={`suggestion-${s.suggestion_id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">Order: <strong>{s.order_student_name}</strong></span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">Student: <strong>{s.student_name}</strong></span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Grade {s.grade}</Badge>
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${s.match_score >= 0.9 ? 'bg-green-100 text-green-700' : s.match_score >= 0.7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {Math.round(s.match_score * 100)}% match
                    </Badge>
                  </div>
                  {s.order_details && (
                    <span className="text-[10px] text-muted-foreground">{s.order_details.items?.length || 0} items — ${(s.order_details.total_amount || 0).toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" onClick={() => handleConfirmSuggestion(s.suggestion_id)}
                    disabled={confirmingId === s.suggestion_id}
                    className="h-6 text-[10px] gap-0.5 bg-green-600 hover:bg-green-700" data-testid={`confirm-${s.suggestion_id}`}>
                    {confirmingId === s.suggestion_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectSuggestion(s.suggestion_id)}
                    disabled={confirmingId === s.suggestion_id}
                    className="h-6 text-[10px] gap-0.5 border-red-300 text-red-600 hover:bg-red-50" data-testid={`reject-${s.suggestion_id}`}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      {orders.length === 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
              <ShoppingCart className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">How to import pre-sale orders from Monday.com:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>On the <strong>Textbook Orders</strong> Monday.com board, set the sync trigger column to <strong>"Ready"</strong> or <strong>"Listo"</strong> for each item you want to import</li>
                  <li>Click <strong>"Preview Import"</strong> to see what will be imported</li>
                  <li>Click <strong>"Import"</strong> to bring the orders into the app</li>
                  <li>Orders will have status <strong>"Awaiting Link"</strong> until the parent registers and links their student</li>
                  <li>When a student is linked, the system creates a <strong>link suggestion</strong> for admin to confirm or reject</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border overflow-hidden" data-testid="presale-status-filter">
          {[
            { value: 'all', label: 'All' },
            { value: 'unlinked', label: 'Unlinked' },
            { value: 'linked', label: 'Linked' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by student, parent, or order ID..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" data-testid="presale-search" />
        </div>
      </div>

      {/* Row count */}
      <div className="text-[11px] text-muted-foreground">
        Showing {paginated.length} of {sortedOrders.length} orders
      </div>

      {/* Table */}
      {sortedOrders.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{orders.length === 0 ? 'No pre-sale orders imported yet' : 'No orders match filters'}</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="px-2"><SortHeader label="Student" sortKey="student_name" /></TableHead>
                    <TableHead className="px-2 hidden sm:table-cell"><SortHeader label="Parent" sortKey="parent_name" /></TableHead>
                    <TableHead className="px-2 w-16"><SortHeader label="Grade" sortKey="grade" /></TableHead>
                    <TableHead className="px-2 w-14">Items</TableHead>
                    <TableHead className="px-2 w-20"><SortHeader label="Total" sortKey="total_amount" /></TableHead>
                    <TableHead className="px-2 w-24">Link Status</TableHead>
                    <TableHead className="px-2 w-28"><SortHeader label="Imported" sortKey="created_at" /></TableHead>
                    <TableHead className="px-2 w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((order) => (
                    <TableRow key={order.order_id} className="h-10" data-testid={`presale-row-${order.order_id}`}>
                      <TableCell className="px-2 py-1">
                        <span className="text-xs font-medium block">{order.student_name || '-'}</span>
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">{order.order_id}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1 hidden sm:table-cell">
                        <span className="text-[11px] text-muted-foreground">{order.parent_name || '-'}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <span className="text-xs font-medium">{order.grade || '-'}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <span className="text-xs">{order.items?.length || 0}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <span className="text-xs font-medium">${(order.total_amount || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 ${LINK_STATUS_COLORS[order.link_status] || LINK_STATUS_COLORS.unlinked}`}>
                          {order.link_status === 'linked' ? <Link2 className="h-2.5 w-2.5 mr-0.5" /> : <Unlink className="h-2.5 w-2.5 mr-0.5" />}
                          {order.link_status === 'linked' ? 'Linked' : 'Awaiting'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <span className="text-[10px] text-muted-foreground">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}
                            className="h-6 w-6 p-0" data-testid={`view-presale-${order.order_id}`}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {order.link_status === 'unlinked' && (
                            <Button variant="ghost" size="sm"
                              onClick={() => { setLinkDialog(order); setLinkSearchTerm(''); }}
                              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                              title="Manual link" data-testid={`link-presale-${order.order_id}`}>
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                          {order.link_status === 'linked' && (
                            <Button variant="ghost" size="sm"
                              onClick={() => handleUnlink(order.order_id)}
                              disabled={unlinking === order.order_id}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              title="Unlink order" data-testid={`unlink-presale-${order.order_id}`}>
                              {unlinking === order.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={sortedOrders.length}
            onPageChange={setPage} onPageSizeChange={setPageSize} canPrev={canPrev} canNext={canNext} />
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Import Preview
            </DialogTitle>
            <DialogDescription>
              {previewData?.count || 0} items ready to import from Monday.com
            </DialogDescription>
          </DialogHeader>
          {previewData?.count > 0 && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {previewData.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold block">{item.student_name}</span>
                      <span className="text-[10px] text-muted-foreground block">Parent: {item.parent_name} | Grade {item.grade}</span>
                      <span className="text-[10px] text-muted-foreground block">{item.items?.length || 0} books — ${(item.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {(item.items || []).slice(0, 3).map((book, bi) => (
                        <Badge key={bi} variant="outline" className={`text-[9px] ${book.matched ? '' : 'border-amber-300 text-amber-700'}`}>
                          {book.matched ? '✓' : '?'} {book.book_code || book.book_name?.slice(0, 20)}
                        </Badge>
                      ))}
                      {(item.items?.length || 0) > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{item.items.length - 3} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !previewData?.count} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import {previewData?.count || 0} Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pre-Sale Order Detail</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Order ID</p><p className="font-mono text-xs">{selectedOrder.order_id}</p></div>
                <div><p className="text-xs text-muted-foreground">Student</p><p className="font-medium">{selectedOrder.student_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Parent</p><p>{selectedOrder.parent_name || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Grade</p><p>{selectedOrder.grade || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">${(selectedOrder.total_amount || 0).toFixed(2)}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Link Status</p>
                  <Badge className={LINK_STATUS_COLORS[selectedOrder.link_status]}>
                    {selectedOrder.link_status === 'linked' ? 'Linked' : 'Awaiting Link'}
                  </Badge>
                </div>
                {selectedOrder.student_id && (
                  <div><p className="text-xs text-muted-foreground">Linked Student ID</p><p className="font-mono text-xs">{selectedOrder.student_id}</p></div>
                )}
                {selectedOrder.linked_at && (
                  <div><p className="text-xs text-muted-foreground">Linked At</p><p className="text-xs">{new Date(selectedOrder.linked_at).toLocaleString()}</p></div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Items ({selectedOrder.items?.length || 0})</p>
                <div className="space-y-1">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <div>
                        <span className="text-xs font-medium">{item.book_name || item.book_code || 'Unknown'}</span>
                        {item.book_code && <span className="text-[10px] text-muted-foreground ml-1">({item.book_code})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">x{item.quantity_ordered || 1}</span>
                        <span className="text-xs font-medium">${(item.price || 0).toFixed(2)}</span>
                        <Badge variant="outline" className={`text-[9px] ${item.matched ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'}`}>
                          {item.matched ? 'Matched' : 'Unmatched'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Link Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Link Order to Student
            </DialogTitle>
            <DialogDescription>
              Order for <strong>{linkDialog?.student_name}</strong> (Grade {linkDialog?.grade})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search students by name..." value={linkSearchTerm}
                onChange={(e) => setLinkSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" data-testid="link-student-search" />
            </div>
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-1">
                {filteredStudents.map(s => {
                  const id = s.student_id || s.sync_id;
                  const enrollment = (s.enrollments || []).sort((a, b) => (b.year || 0) - (a.year || 0))[0];
                  return (
                    <button key={id} onClick={() => handleManualLink(linkDialog, s)} disabled={linking}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      data-testid={`link-to-${id}`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium block">{s.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">Grade {enrollment?.grade || '?'} | {s.school_name || '-'}</span>
                      </div>
                      <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    </button>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No students found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
