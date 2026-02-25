/**
 * SysbookStockMovementsTab — Textbook-only stock movements
 * Shipments, Returns, Adjustments — scoped to Sysbook inventory.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Truck, RotateCcw, Wrench, Plus, ChevronRight, Clock,
  CheckCircle, XCircle, Package, Search, Loader2, ArrowRight,
  AlertTriangle, BookOpen, Zap, Archive, Trash2
} from 'lucide-react';
import axios from 'axios';
import { BoardHeader } from '@/components/shared/BoardHeader';
import ArchiveTab from '@/components/shared/ArchiveTab';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;
const SYSBOOK_API = `${API_URL}/api/sysbook`;

const TYPE_META = {
  shipment:   { label: 'Shipment',   icon: Truck,      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30', statuses: ['draft','confirmed','received'] },
  return:     { label: 'Return',     icon: RotateCcw,  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30', statuses: ['registered','inspected','approved','rejected'] },
  adjustment: { label: 'Adjustment', icon: Wrench,     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30', statuses: ['requested','applied'] },
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700', registered: 'bg-amber-100 text-amber-700',
  inspected: 'bg-cyan-100 text-cyan-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', requested: 'bg-amber-100 text-amber-700',
  applied: 'bg-green-100 text-green-700',
};

export default function SysbookStockMovementsTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingSummary, setPendingSummary] = useState({ total: 0, pending: {} });

  const [showCreate, setShowCreate] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [createItems, setCreateItems] = useState([{ book_id: '', product_name: '', expected_qty: 0 }]);
  const [saving, setSaving] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [products, setProducts] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveCount, setArchiveCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      const params = {};
      if (typeFilter !== 'all') params.order_type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await axios.get(`${SYSBOOK_API}/stock-orders`, { headers, params });
      setOrders(data.orders || []);
    } catch { toast.error('Error loading stock orders'); } finally { setLoading(false); }
  }, [typeFilter, statusFilter, search]);

  const fetchPending = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SYSBOOK_API}/stock-orders/summary/pending`, { headers });
      setPendingSummary(data);
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SYSBOOK_API}/inventory/products?limit=500`, { headers });
      setProducts(data.products || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchOrders(); fetchPending(); fetchProducts(); }, []);
  useEffect(() => { fetchOrders(); }, [typeFilter, statusFilter, search]);

  const handleCreate = async () => {
    const validItems = createItems.filter(i => i.book_id && i.expected_qty);
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      let payload = { items: validItems, notes: createForm.notes || '' };
      let url = '';
      if (showCreate === 'shipment') {
        payload.supplier = createForm.supplier || '';
        payload.expected_date = createForm.expected_date || null;
        url = `${SYSBOOK_API}/stock-orders/shipment`;
      } else if (showCreate === 'return') {
        payload.linked_order_id = createForm.linked_order_id || '';
        payload.customer_name = createForm.customer_name || '';
        payload.return_reason = createForm.return_reason || '';
        url = `${SYSBOOK_API}/stock-orders/return`;
      } else {
        payload.adjustment_reason = createForm.adjustment_reason || '';
        url = `${SYSBOOK_API}/stock-orders/adjustment`;
      }
      await axios.post(url, payload, { headers });
      toast.success(`${TYPE_META[showCreate].label} created`);
      setShowCreate(null);
      setCreateForm({});
      setCreateItems([{ book_id: '', product_name: '', expected_qty: 0 }]);
      fetchOrders();
      fetchPending();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error creating order'); } finally { setSaving(false); }
  };

  const handleTransition = async (orderId) => {
    try {
      const { data } = await axios.post(
        `${SYSBOOK_API}/stock-orders/${orderId}/transition`,
        { notes: transitionNotes || null },
        { headers }
      );
      toast.success(`Order advanced to ${data.order?.status}`);
      if (data.stock_results) toast.success(`Stock updated for ${data.stock_results.length} items`);
      setSelectedOrder(null);
      setTransitionNotes('');
      fetchOrders();
      fetchPending();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error transitioning'); }
  };

  const handleDelete = async (orderId) => {
    try {
      await fetch(`${API_URL}/api/archive/movements/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: [orderId] }),
      });
      toast.success('Order archived');
      setSelectedOrder(null);
      fetchOrders();
      fetchPending();
    } catch { toast.error('Error archiving order'); } finally { setDeleting(false); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Archive ALL stock orders?')) return;
    const ids = orders.map(o => o.order_id);
    try {
      await fetch(`${API_URL}/api/archive/movements/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      toast.success(`${ids.length} orders archived`);
      fetchOrders();
      fetchPending();
    } catch { toast.error('Error archiving'); }
  };

  const addItem = () => setCreateItems(prev => [...prev, { book_id: '', product_name: '', expected_qty: 0 }]);
  const removeItem = (idx) => setCreateItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => setCreateItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const selectProduct = (idx, bookId) => {
    const p = products.find(pr => pr.book_id === bookId);
    if (p) {
      updateItem(idx, 'book_id', p.book_id);
      updateItem(idx, 'product_name', p.name || '');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3" data-testid="sysbook-stock-movements">
      <BoardHeader
        title="Stock Movements"
        icon={Truck}
        subtitle="Textbook shipments, returns & adjustments"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders..."
        filters={[
          {
            value: typeFilter, onChange: setTypeFilter, placeholder: 'All Types', testId: 'sysbook-type-filter',
            options: [
              { value: 'shipment', label: 'Shipments' },
              { value: 'return', label: 'Returns' },
              { value: 'adjustment', label: 'Adjustments' },
            ],
          },
          {
            value: statusFilter, onChange: setStatusFilter, placeholder: 'All Status', testId: 'sysbook-status-filter',
            options: [
              { value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' },
              { value: 'received', label: 'Received' }, { value: 'registered', label: 'Registered' },
              { value: 'requested', label: 'Requested' }, { value: 'applied', label: 'Applied' },
            ],
          },
        ]}
        hasActiveFilters={!!(search || typeFilter !== 'all' || statusFilter !== 'all')}
        onClearFilters={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
        stats={[
          { label: 'total orders', value: orders.length, color: 'default' },
          ...(pendingSummary.total > 0 ? [{ label: 'pending', value: pendingSummary.total, color: 'amber', highlight: true }] : []),
        ]}
        loading={loading}
        onRefresh={() => { fetchOrders(); fetchPending(); }}
        actions={
          <div className="flex gap-1">
            {orders.length > 0 && (
              <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleClearAll} data-testid="clear-all-orders-btn">
                <Archive className="h-3 w-3" /> Archive All
              </Button>
            )}
            <Button variant={showArchived ? 'default' : 'ghost'} size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowArchived(!showArchived)} data-testid="toggle-archived-movements">
              <Archive className="h-3 w-3" /> Archived {archiveCount > 0 && `(${archiveCount})`}
            </Button>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <Button key={key} variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowCreate(key)} data-testid={`create-${key}-btn`}>
                <meta.icon className="h-3 w-3" /> {meta.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No stock orders found</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const meta = TYPE_META[order.type] || TYPE_META.shipment;
            const Icon = meta.icon;
            return (
              <Card key={order.order_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)} data-testid={`order-${order.order_id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${meta.color}`}><Icon className="h-4 w-4" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{order.order_id}</span>
                          <Badge variant="outline" className={STATUS_COLORS[order.status] || ''}>{order.status}</Badge>
                        </div>
                        <p className="text-sm font-medium mt-0.5">
                          {order.type === 'shipment' && `From: ${order.supplier || 'Unknown'}`}
                          {order.type === 'return' && `Order: ${order.linked_order_id || 'N/A'}`}
                          {order.type === 'adjustment' && `Reason: ${order.adjustment_reason || 'N/A'}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{order.items?.length || 0} items</p>
                      <p>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail / Transition Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOrder && (() => { const Icon = TYPE_META[selectedOrder.type]?.icon; return Icon ? <Icon className="h-5 w-5" /> : null; })()}
              Order {selectedOrder?.order_id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.type} — {selectedOrder?.status}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div className="space-y-1">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1">
                    <span>{item.product_name || item.book_id}</span>
                    <span className="font-mono">qty: {item.received_qty ?? item.expected_qty}</span>
                  </div>
                ))}
              </div>
              {selectedOrder.notes && <p className="text-sm text-muted-foreground">Notes: {selectedOrder.notes}</p>}

              {/* Transition controls */}
              {!['received', 'approved', 'rejected', 'applied'].includes(selectedOrder.status) && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">Transition Notes (optional)</Label>
                  <Textarea value={transitionNotes} onChange={e => setTransitionNotes(e.target.value)} rows={2} placeholder="Add notes..." />
                  <Button onClick={() => handleTransition(selectedOrder.order_id)} className="w-full gap-1" data-testid="advance-order-btn">
                    <ArrowRight className="h-4 w-4" /> Advance Status
                  </Button>
                </div>
              )}
              <div className="pt-2 border-t">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedOrder.order_id)} disabled={deleting} className="w-full gap-1" data-testid="delete-order-btn">
                  <XCircle className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete Order'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={!!showCreate} onOpenChange={() => setShowCreate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New {showCreate && TYPE_META[showCreate]?.label}</DialogTitle>
            <DialogDescription>Create a new stock order for textbook inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {showCreate === 'shipment' && (
              <div className="space-y-2">
                <Label className="text-xs">Supplier</Label>
                <Input value={createForm.supplier || ''} onChange={e => setCreateForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
              </div>
            )}
            {showCreate === 'return' && (
              <div className="space-y-2">
                <Label className="text-xs">Linked Order ID</Label>
                <Input value={createForm.linked_order_id || ''} onChange={e => setCreateForm(f => ({ ...f, linked_order_id: e.target.value }))} placeholder="Order ID" />
                <Label className="text-xs">Return Reason</Label>
                <Input value={createForm.return_reason || ''} onChange={e => setCreateForm(f => ({ ...f, return_reason: e.target.value }))} placeholder="Reason" />
              </div>
            )}
            {showCreate === 'adjustment' && (
              <div className="space-y-2">
                <Label className="text-xs">Adjustment Reason</Label>
                <Input value={createForm.adjustment_reason || ''} onChange={e => setCreateForm(f => ({ ...f, adjustment_reason: e.target.value }))} placeholder="Reason" />
              </div>
            )}

            <Label className="text-xs font-medium">Items</Label>
            {createItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <select className="w-full h-9 rounded-md border px-2 text-sm bg-background" value={item.book_id} onChange={e => selectProduct(idx, e.target.value)} data-testid={`item-select-${idx}`}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.book_id} value={p.book_id}>{p.name} ({p.grade || 'N/A'})</option>)}
                  </select>
                </div>
                <Input type="number" className="w-20" value={item.expected_qty} onChange={e => updateItem(idx, 'expected_qty', parseInt(e.target.value) || 0)} placeholder="Qty" />
                {createItems.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-9 px-2 text-red-500"><XCircle className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="w-full gap-1"><Plus className="h-3 w-3" /> Add Item</Button>

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={createForm.notes || ''} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(null)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} data-testid="save-stock-order-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
