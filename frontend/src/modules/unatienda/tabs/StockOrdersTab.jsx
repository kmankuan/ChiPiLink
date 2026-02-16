/**
 * StockOrdersTab — Stock Movements management
 * With catalog type separation: Public Store vs School Textbooks
 * 3 workflows: Shipment (restock), Return (linked to orders), Adjustment (corrections)
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
  AlertTriangle, Store, BookOpen, Layers
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATALOG_TABS = [
  { key: 'all', label: 'All', icon: Layers, color: 'bg-slate-600' },
  { key: 'pca', label: 'School Textbooks', icon: BookOpen, color: 'bg-purple-600' },
  { key: 'public', label: 'Public Store', icon: Store, color: 'bg-emerald-600' },
];

const CATALOG_BADGE = {
  pca: { label: 'Textbooks', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200' },
  public: { label: 'Public', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200' },
};

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

const NEXT_STATUS = {
  shipment:   { draft: 'confirmed', confirmed: 'received' },
  return:     { registered: 'inspected', inspected: ['approved', 'rejected'] },
  adjustment: { requested: 'applied' },
};

const RETURN_REASONS = [
  'Wrong item received', 'Damaged in transit', 'Defective product',
  'Changed mind', 'Duplicate order', 'Other',
];

const ADJUSTMENT_REASONS = [
  'Inventory correction', 'Damaged / Write-off', 'Internal use',
  'Theft / Loss', 'Expired', 'Other',
];

/* ============ Step Indicator ============ */
function StepIndicator({ statuses, current }) {
  const idx = statuses.indexOf(current);
  return (
    <div className="flex items-center gap-1" data-testid="step-indicator">
      {statuses.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const isRejected = s === 'rejected' && current === 'rejected';
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={`h-6 px-2 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all
              ${isRejected ? 'bg-red-500 text-white' : done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {done ? <CheckCircle className="h-3 w-3" /> : isRejected ? <XCircle className="h-3 w-3" /> : null}
              {s}
            </div>
            {i < statuses.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Catalog Type Selector ============ */
function CatalogTypeSelector({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Inventory Type *</Label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('public')}
          data-testid="catalog-select-public"
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
            value === 'public'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-muted hover:border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          <Store className="h-4 w-4" />
          Public Store
        </button>
        <button
          type="button"
          onClick={() => onChange('pca')}
          data-testid="catalog-select-pca"
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
            value === 'pca'
              ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
              : 'border-muted hover:border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          School Textbooks
        </button>
      </div>
    </div>
  );
}

/* ============ Product Picker ============ */
function ProductPicker({ items, setItems, token, catalogType }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const params = { search: q, limit: 10 };
      if (catalogType) params.catalog_type = catalogType;
      const { data } = await axios.get(`${API_URL}/api/store/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setResults(data.products || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [token, catalogType]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const addProduct = (p) => {
    if (items.find(i => i.book_id === p.book_id)) { toast.info('Already added'); return; }
    setItems([...items, { book_id: p.book_id, product_name: p.name, expected_qty: 1, received_qty: null, condition: null }]);
    setSearch('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Add Products</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={catalogType === 'pca' ? 'Search school textbooks...' : catalogType === 'public' ? 'Search public products...' : 'Search products...'}
          className="pl-8 h-9 text-xs" data-testid="product-search-input" />
        {searching && <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
          {results.map(p => (
            <button key={p.book_id} onClick={() => addProduct(p)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex justify-between items-center" data-testid={`product-result-${p.book_id}`}>
              <span className="truncate">{p.name}</span>
              <span className="text-muted-foreground shrink-0 ml-2">Stock: {p.inventory_quantity ?? 0}</span>
            </button>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={item.book_id} className="flex items-center gap-2 p-2 rounded border text-xs" data-testid={`order-item-${idx}`}>
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate font-medium">{item.product_name}</span>
              <div className="flex items-center gap-1">
                <Label className="text-[10px] text-muted-foreground">Qty:</Label>
                <Input type="number" min={-9999} value={item.expected_qty} onChange={e => {
                  const next = [...items]; next[idx] = { ...next[idx], expected_qty: parseInt(e.target.value) || 0 }; setItems(next);
                }} className="w-16 h-7 text-xs text-center" />
              </div>
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Create Shipment Dialog ============ */
function CreateShipmentDialog({ open, onClose, onCreated, token, defaultCatalog }) {
  const [catalogType, setCatalogType] = useState(defaultCatalog || 'public');
  const [supplier, setSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setCatalogType(defaultCatalog || 'public'); }, [open, defaultCatalog]);

  const handleCreate = async () => {
    if (!supplier) { toast.error('Supplier is required'); return; }
    if (!items.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/store/stock-orders/shipment`, {
        supplier, expected_date: expectedDate || null, items, notes: notes || null, catalog_type: catalogType,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Shipment created');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" /> New Shipment</DialogTitle>
          <DialogDescription>Register an incoming shipment. Stock updates when you mark it as received.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <CatalogTypeSelector value={catalogType} onChange={(v) => { setCatalogType(v); setItems([]); }} />
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Supplier *</Label><Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" className="h-9 text-xs" data-testid="shipment-supplier" /></div>
            <div><Label className="text-xs">Expected Date</Label><Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="h-9 text-xs" data-testid="shipment-date" /></div>
          </div>
          <ProductPicker items={items} setItems={setItems} token={token} catalogType={catalogType} />
          <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." rows={2} className="text-xs" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} size="sm" data-testid="create-shipment-btn">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Create Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Create Return Dialog ============ */
function CreateReturnDialog({ open, onClose, onCreated, token }) {
  const [orderSearch, setOrderSearch] = useState('');
  const [orderResults, setOrderResults] = useState([]);
  const [linkedOrder, setLinkedOrder] = useState(null);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchOrders = useCallback(async (q) => {
    if (!q || q.length < 2) { setOrderResults([]); return; }
    setSearching(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/store/stock-orders/search-orders`, {
        headers: { Authorization: `Bearer ${token}` }, params: { q },
      });
      setOrderResults(data.orders || []);
    } catch { setOrderResults([]); }
    finally { setSearching(false); }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => searchOrders(orderSearch), 300);
    return () => clearTimeout(t);
  }, [orderSearch, searchOrders]);

  const selectOrder = (order) => {
    setLinkedOrder(order);
    setOrderSearch('');
    setOrderResults([]);
    const orderItems = (order.items || []).filter(i => i.status === 'delivered' || i.quantity_ordered > 0).map(i => ({
      book_id: i.book_id, product_name: i.book_name || i.book_code, expected_qty: i.quantity_ordered || 1, received_qty: null, condition: 'good',
    }));
    setItems(orderItems);
  };

  const handleCreate = async () => {
    if (!linkedOrder) { toast.error('Link to an existing order'); return; }
    if (!items.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/store/stock-orders/return`, {
        linked_order_id: linkedOrder.order_id, customer_name: linkedOrder.student_name || '',
        return_reason: reason, items, notes: notes || null, catalog_type: 'pca',
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Return registered');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-600" /> New Return</DialogTitle>
          <DialogDescription>Register a customer return linked to an existing textbook order. Returns are automatically categorized as School Textbooks.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
            <BookOpen className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">School Textbooks Inventory</span>
          </div>
          <div>
            <Label className="text-xs">Link to Order *</Label>
            {linkedOrder ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-xs mt-1">
                <span className="font-mono font-bold">{linkedOrder.order_id}</span>
                <span className="text-muted-foreground">{linkedOrder.student_name}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">{linkedOrder.status}</Badge>
                <button onClick={() => { setLinkedOrder(null); setItems([]); }} className="text-destructive"><XCircle className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search by order ID or student name..." className="pl-8 h-9 text-xs" data-testid="return-order-search" />
                {searching && <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin" />}
              </div>
            )}
            {orderResults.length > 0 && !linkedOrder && (
              <div className="border rounded-lg max-h-40 overflow-y-auto divide-y mt-1">
                {orderResults.map(o => (
                  <button key={o.order_id} onClick={() => selectOrder(o)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex justify-between" data-testid={`order-result-${o.order_id}`}>
                    <span className="font-mono">{o.order_id}</span>
                    <span>{o.student_name}</span>
                    <Badge variant="outline" className="text-[9px]">{o.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Return Reason</Label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full h-9 px-3 text-xs border rounded-md bg-background mt-1" data-testid="return-reason">
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {items.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Return Items</Label>
              {items.map((item, idx) => (
                <div key={item.book_id} className="flex items-center gap-2 p-2 rounded border text-xs">
                  <span className="flex-1 truncate">{item.product_name}</span>
                  <div className="flex items-center gap-1">
                    <Label className="text-[10px]">Qty:</Label>
                    <Input type="number" min={1} value={item.expected_qty} onChange={e => {
                      const next = [...items]; next[idx] = { ...next[idx], expected_qty: parseInt(e.target.value) || 1 }; setItems(next);
                    }} className="w-14 h-7 text-xs text-center" />
                  </div>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-destructive"><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} size="sm" data-testid="create-return-btn">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Register Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Create Adjustment Dialog ============ */
function CreateAdjustmentDialog({ open, onClose, onCreated, token, defaultCatalog }) {
  const [catalogType, setCatalogType] = useState(defaultCatalog || 'public');
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setCatalogType(defaultCatalog || 'public'); }, [open, defaultCatalog]);

  const handleCreate = async () => {
    if (!items.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/store/stock-orders/adjustment`, {
        adjustment_reason: reason, items, notes: notes || null, catalog_type: catalogType,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Adjustment created');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-purple-600" /> Stock Adjustment</DialogTitle>
          <DialogDescription>Correct stock levels. Use negative quantities to remove stock.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <CatalogTypeSelector value={catalogType} onChange={(v) => { setCatalogType(v); setItems([]); }} />
          <div>
            <Label className="text-xs">Reason</Label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full h-9 px-3 text-xs border rounded-md bg-background mt-1" data-testid="adjustment-reason">
              {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <ProductPicker items={items} setItems={setItems} token={token} catalogType={catalogType} />
          <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} size="sm" data-testid="create-adjustment-btn">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Create Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Transition Dialog ============ */
function TransitionDialog({ order, open, onClose, onDone, token }) {
  const [notes, setNotes] = useState('');
  const [itemsUpdate, setItemsUpdate] = useState([]);
  const [saving, setSaving] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);

  useEffect(() => {
    if (!order) return;
    const next = NEXT_STATUS[order.type]?.[order.status];
    setTargetStatus(Array.isArray(next) ? next[0] : next);
    if ((order.type === 'shipment' && order.status === 'confirmed') ||
        (order.type === 'return' && order.status === 'registered')) {
      setItemsUpdate(order.items.map(i => ({
        book_id: i.book_id, received_qty: i.expected_qty,
        condition: order.type === 'return' ? 'good' : undefined,
      })));
    } else {
      setItemsUpdate([]);
    }
  }, [order]);

  if (!order) return null;
  const next = NEXT_STATUS[order.type]?.[order.status];
  if (!next) return null;
  const options = Array.isArray(next) ? next : [next];
  const needsItemUpdate = (order.type === 'shipment' && order.status === 'confirmed') ||
                           (order.type === 'return' && order.status === 'registered');

  const handleTransition = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/store/stock-orders/${order.order_id}/transition/${targetStatus}`, {
        items_update: needsItemUpdate ? itemsUpdate : null, notes: notes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Status updated to ${targetStatus}`);
      onDone();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || 'Transition failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advance: {order.order_id}</DialogTitle>
          <DialogDescription>
            {order.type === 'shipment' && order.status === 'confirmed' && 'Confirm received quantities. Stock will be updated.'}
            {order.type === 'return' && order.status === 'registered' && 'Inspect returned items and set their condition.'}
            {order.type === 'return' && order.status === 'inspected' && 'Approve or reject this return. Approved items in good condition will be restocked.'}
            {order.type === 'adjustment' && 'Apply this stock adjustment. Inventory will be updated.'}
            {order.type === 'shipment' && order.status === 'draft' && 'Confirm this shipment is expected.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StepIndicator statuses={TYPE_META[order.type].statuses} current={order.status} />

          {options.length > 1 && (
            <div className="flex gap-2">
              {options.map(s => (
                <Button key={s} size="sm" variant={targetStatus === s ? (s === 'rejected' ? 'destructive' : 'default') : 'outline'}
                  onClick={() => setTargetStatus(s)} className="flex-1 text-xs" data-testid={`transition-opt-${s}`}>
                  {s === 'approved' ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                  {s}
                </Button>
              ))}
            </div>
          )}

          {needsItemUpdate && (
            <div className="space-y-2">
              <Label className="text-xs font-bold">Items</Label>
              {order.items.map((item, idx) => (
                <div key={item.book_id} className="p-2 rounded border text-xs space-y-1.5">
                  <p className="font-medium">{item.product_name} <span className="text-muted-foreground">(expected: {item.expected_qty})</span></p>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px]">Received:</Label>
                      <Input type="number" min={0} value={itemsUpdate[idx]?.received_qty ?? item.expected_qty}
                        onChange={e => {
                          const next = [...itemsUpdate];
                          next[idx] = { ...next[idx], received_qty: parseInt(e.target.value) || 0 };
                          setItemsUpdate(next);
                        }} className="w-16 h-7 text-xs text-center" />
                    </div>
                    {order.type === 'return' && (
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px]">Condition:</Label>
                        <select value={itemsUpdate[idx]?.condition || 'good'} onChange={e => {
                          const next = [...itemsUpdate];
                          next[idx] = { ...next[idx], condition: e.target.value };
                          setItemsUpdate(next);
                        }} className="h-7 text-[10px] border rounded px-1 bg-background">
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="defective">Defective</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" placeholder="Optional notes for this step..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleTransition} disabled={saving} size="sm"
            variant={targetStatus === 'rejected' ? 'destructive' : 'default'} data-testid="confirm-transition-btn">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {targetStatus === 'rejected' ? 'Reject' : `Move to ${targetStatus}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Order Detail Dialog ============ */
function OrderDetailDialog({ order, open, onClose }) {
  if (!order) return null;
  const meta = TYPE_META[order.type];
  const catBadge = CATALOG_BADGE[order.catalog_type];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <meta.icon className="h-5 w-5" /> {order.order_id}
            {catBadge && <Badge variant="outline" className={`text-[9px] ml-1 ${catBadge.className}`}>{catBadge.label}</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <StepIndicator statuses={meta.statuses} current={order.status} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Type:</span> <strong>{meta.label}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-[9px] ${STATUS_COLORS[order.status]}`}>{order.status}</Badge></div>
            <div><span className="text-muted-foreground">Inventory:</span> <Badge variant="outline" className={`text-[9px] ${catBadge?.className || ''}`}>{catBadge?.label || 'Unknown'}</Badge></div>
            {order.supplier && <div><span className="text-muted-foreground">Supplier:</span> {order.supplier}</div>}
            {order.linked_order_id && <div><span className="text-muted-foreground">Order:</span> <code>{order.linked_order_id}</code></div>}
            {order.customer_name && <div><span className="text-muted-foreground">Customer:</span> {order.customer_name}</div>}
            {order.return_reason && <div><span className="text-muted-foreground">Reason:</span> {order.return_reason}</div>}
            {order.adjustment_reason && <div><span className="text-muted-foreground">Reason:</span> {order.adjustment_reason}</div>}
            <div><span className="text-muted-foreground">Created:</span> {new Date(order.created_at).toLocaleString()}</div>
            <div><span className="text-muted-foreground">By:</span> {order.created_by_name}</div>
          </div>

          <div>
            <Label className="text-xs font-bold">Items ({order.items.length})</Label>
            <div className="space-y-1 mt-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-xs">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{item.product_name}</span>
                  <span className="text-muted-foreground">Expected: {item.expected_qty}</span>
                  {item.received_qty != null && <span className="font-bold">Received: {item.received_qty}</span>}
                  {item.condition && <Badge variant="outline" className="text-[9px]">{item.condition}</Badge>}
                </div>
              ))}
            </div>
          </div>

          {order.notes && <div className="text-xs"><Label className="text-xs font-bold">Notes</Label><p className="text-muted-foreground mt-1 whitespace-pre-wrap">{order.notes}</p></div>}

          <div>
            <Label className="text-xs font-bold">History</Label>
            <div className="space-y-1 mt-1">
              {(order.status_history || []).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/30">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Badge className={`text-[9px] ${STATUS_COLORS[h.status]}`}>{h.status}</Badge>
                  <span className="text-muted-foreground">{h.by}</span>
                  <span className="text-muted-foreground ml-auto">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============ MAIN TAB ============ */
export default function StockOrdersTab({ token }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [catalogCounts, setCatalogCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [catalogFilter, setCatalogFilter] = useState('all'); // all | public | pca
  const [filter, setFilter] = useState('all'); // all | shipment | return | adjustment
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  // Dialogs
  const [showShipment, setShowShipment] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [transitionOrder, setTransitionOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (filter !== 'all') params.order_type = filter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (catalogFilter !== 'all') params.catalog_type = catalogFilter;
      const { data } = await axios.get(`${API_URL}/api/store/stock-orders`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setOrders(data.orders);
      setTotal(data.total);
      setCounts(data.counts);
      setCatalogCounts(data.catalog_counts || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, filter, statusFilter, search, catalogFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const pendingCount = orders.filter(o =>
    !['received', 'approved', 'rejected', 'applied'].includes(o.status)
  ).length;

  const defaultCatalog = catalogFilter !== 'all' ? catalogFilter : 'public';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" data-testid="stock-orders-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Stock Movements</h2>
          <p className="text-xs text-muted-foreground">Manage shipments, returns, and stock adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowShipment(true)} className="gap-1 text-xs" data-testid="new-shipment-btn">
            <Truck className="h-3.5 w-3.5" /> Shipment
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowReturn(true)} className="gap-1 text-xs" data-testid="new-return-btn">
            <RotateCcw className="h-3.5 w-3.5" /> Return
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAdjustment(true)} className="gap-1 text-xs" data-testid="new-adjustment-btn">
            <Wrench className="h-3.5 w-3.5" /> Adjustment
          </Button>
        </div>
      </div>

      {/* Catalog Type Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 w-fit" data-testid="catalog-filter-tabs">
        {CATALOG_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = catalogFilter === tab.key;
          const count = tab.key === 'all'
            ? (catalogCounts.pca || 0) + (catalogCounts.public || 0) + (catalogCounts.unknown || 0)
            : (catalogCounts[tab.key] || 0);
          return (
            <button
              key={tab.key}
              onClick={() => { setCatalogFilter(tab.key); setFilter('all'); setStatusFilter(''); }}
              data-testid={`catalog-filter-${tab.key}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pending Actions Banner */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{pendingCount} order{pendingCount > 1 ? 's' : ''} pending action</p>
          </CardContent>
        </Card>
      )}

      {/* Type + Search Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1">
          {['all', 'shipment', 'return', 'adjustment'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => { setFilter(f); setStatusFilter(''); }}
              className="text-xs h-7 gap-1" data-testid={`filter-${f}`}>
              {f === 'all' ? 'All' : TYPE_META[f]?.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-8 h-7 text-xs" />
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground" data-testid="empty-orders">
          {catalogFilter !== 'all'
            ? `No ${catalogFilter === 'pca' ? 'School Textbooks' : 'Public Store'} stock movements yet.`
            : 'No stock movements yet. Create a shipment, return, or adjustment to get started.'}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const meta = TYPE_META[order.type];
            const Icon = meta.icon;
            const next = NEXT_STATUS[order.type]?.[order.status];
            const isFinal = !next;
            const catBadge = CATALOG_BADGE[order.catalog_type];

            return (
              <div key={order.order_id} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/30 transition cursor-pointer"
                onClick={() => setDetailOrder(order)} data-testid={`order-row-${order.order_id}`}>
                <div className={`p-2 rounded-lg ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold">{order.order_id}</span>
                    <Badge className={`text-[9px] ${STATUS_COLORS[order.status]}`}>{order.status}</Badge>
                    {catBadge && (
                      <Badge variant="outline" className={`text-[9px] ${catBadge.className}`} data-testid={`catalog-badge-${order.order_id}`}>
                        {catBadge.label}
                      </Badge>
                    )}
                    {order.supplier && <span className="text-[10px] text-muted-foreground truncate">{order.supplier}</span>}
                    {order.customer_name && <span className="text-[10px] text-muted-foreground truncate">{order.customer_name}</span>}
                    {order.linked_order_id && <span className="text-[10px] text-muted-foreground">linked: {order.linked_order_id}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} &middot; {new Date(order.created_at).toLocaleDateString()} &middot; by {order.created_by_name}
                  </p>
                </div>
                {!isFinal && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 shrink-0"
                    onClick={e => { e.stopPropagation(); setTransitionOrder(order); }} data-testid={`advance-${order.order_id}`}>
                    <ChevronRight className="h-3 w-3" /> Advance
                  </Button>
                )}
                {isFinal && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateShipmentDialog open={showShipment} onClose={() => setShowShipment(false)} onCreated={fetchOrders} token={token} defaultCatalog={defaultCatalog} />
      <CreateReturnDialog open={showReturn} onClose={() => setShowReturn(false)} onCreated={fetchOrders} token={token} />
      <CreateAdjustmentDialog open={showAdjustment} onClose={() => setShowAdjustment(false)} onCreated={fetchOrders} token={token} defaultCatalog={defaultCatalog} />
      <TransitionDialog order={transitionOrder} open={!!transitionOrder} onClose={() => setTransitionOrder(null)} onDone={fetchOrders} token={token} />
      <OrderDetailDialog order={detailOrder} open={!!detailOrder} onClose={() => setDetailOrder(null)} />
    </div>
  );
}
