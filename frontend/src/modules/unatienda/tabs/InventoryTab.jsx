/**
 * InventoryTab — Retail e-commerce inventory management for Unatienda
 * Features: stock dashboard, product list with search/filter, stock adjustments,
 * movement history, low-stock alerts
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Package, AlertTriangle, TrendingUp, DollarSign, Search,
  Plus, Minus, History, Loader2, ArrowUpDown, Filter, BarChart3, Archive, Trash2
} from 'lucide-react';
import axios from 'axios';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableSelection } from '@/hooks/useTableSelection';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function StatsCard({ icon: Icon, label, value, color, sub }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdjustStockDialog({ product, open, onClose, onSaved, token }) {
  const [qty, setQty] = useState('');
  const [type, setType] = useState('add');
  const [reason, setReason] = useState('restock');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reasons = [
    { value: 'restock', label: 'Restock / New shipment' },
    { value: 'manual_adjustment', label: 'Manual correction' },
    { value: 'damaged', label: 'Damaged / Defective' },
    { value: 'returned', label: 'Customer return' },
    { value: 'sold_offline', label: 'Sold offline' },
    { value: 'other', label: 'Other' },
  ];

  const handleSave = async () => {
    const num = parseInt(qty);
    if (!num || num <= 0) { toast.error('Enter a valid quantity'); return; }

    setSaving(true);
    try {
      const change = type === 'add' ? num : -num;
      await axios.post(`${API_URL}/api/store/inventory/adjust`, {
        book_id: product.book_id,
        quantity_change: change,
        reason,
        notes: notes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(`Stock ${type === 'add' ? 'added' : 'removed'}: ${num} units`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>{product?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Current Stock</p>
            <p className="text-3xl font-bold">{product?.inventory_quantity ?? 0}</p>
          </div>

          <div className="flex gap-2">
            <Button variant={type === 'add' ? 'default' : 'outline'} className="flex-1" onClick={() => setType('add')}>
              <Plus className="h-4 w-4 mr-1" /> Add Stock
            </Button>
            <Button variant={type === 'remove' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setType('remove')}>
              <Minus className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Quantity</Label>
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Enter quantity" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details..." rows={2} />
          </div>

          {qty && parseInt(qty) > 0 && (
            <div className="text-center p-2 rounded bg-muted text-sm">
              New stock: <strong>{Math.max(0, (product?.inventory_quantity ?? 0) + (type === 'add' ? parseInt(qty) : -parseInt(qty)))}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementHistory({ movements }) {
  if (!movements?.length) return <p className="text-sm text-muted-foreground text-center py-4">No stock movements yet</p>;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {movements.map((m, i) => (
        <div key={m.movement_id || i} className="flex items-center gap-3 p-2 rounded border text-sm">
          <div className={`p-1 rounded ${m.type === 'addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {m.type === 'addition' ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs truncate">{m.product_name}</p>
            <p className="text-[10px] text-muted-foreground">{m.reason} • by {m.admin_name}</p>
          </div>
          <div className="text-right">
            <p className={`font-mono text-xs font-bold ${m.type === 'addition' ? 'text-green-600' : 'text-red-600'}`}>
              {m.type === 'addition' ? '+' : ''}{m.quantity_change}
            </p>
            <p className="text-[10px] text-muted-foreground">{m.old_quantity} → {m.new_quantity}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryTab({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const productSelection = useTableSelection(products, 'book_id');
  const [view, setView] = useState('overview'); // overview | history

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/store/inventory/dashboard`, { headers });
      setDashboard(data);
    } catch { /* ignore */ }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/store/inventory/products`, {
        headers,
        params: { search: search || undefined, stock_filter: stockFilter, sort_by: sortBy, sort_dir: sortDir, limit: 100 },
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch { /* ignore */ }
  }, [token, search, stockFilter, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchProducts()]).then(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProducts(); }, [search, stockFilter, sortBy, sortDir]);

  const onAdjusted = () => {
    fetchDashboard();
    fetchProducts();
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <StatsCard icon={Package} label="Total Products" value={dashboard?.total_products ?? 0} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30" />
        <StatsCard icon={BarChart3} label="Total Stock" value={dashboard?.total_stock ?? 0} color="bg-green-100 text-green-600 dark:bg-green-900/30" />
        <StatsCard icon={DollarSign} label="Stock Value" value={`$${(dashboard?.total_value ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30" />
        <StatsCard icon={AlertTriangle} label="Low Stock" value={dashboard?.low_stock ?? 0} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30" />
        <StatsCard icon={AlertTriangle} label="Out of Stock" value={dashboard?.out_of_stock ?? 0} color="bg-red-100 text-red-600 dark:bg-red-900/30" />
      </div>

      {/* View Toggle + Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1">
          <Button variant={view === 'overview' ? 'default' : 'outline'} size="sm" onClick={() => setView('overview')}>
            <Package className="h-3.5 w-3.5 mr-1" /> Products
          </Button>
          <Button variant={view === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setView('history')}>
            <History className="h-3.5 w-3.5 mr-1" /> History
          </Button>
        </div>
        {view === 'overview' && (
          <>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-8 pl-8 text-xs" />
            </div>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="h-8 px-2 text-xs border rounded-md bg-background">
              <option value="all">All Stock</option>
              <option value="in">In Stock (&gt;10)</option>
              <option value="low">Low Stock (1-10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </>
        )}
      </div>

      {/* Product List or History */}
      {view === 'overview' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-10">
                      <Checkbox checked={productSelection.allSelected} onCheckedChange={productSelection.toggleAll} />
                    </th>
                    <th className="text-left p-3 font-medium text-xs">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-primary">
                        Product <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-xs">Category</th>
                    <th className="text-right p-3 font-medium text-xs">
                      <button onClick={() => toggleSort('price')} className="flex items-center gap-1 ml-auto hover:text-primary">
                        Price <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium text-xs">
                      <button onClick={() => toggleSort('stock')} className="flex items-center gap-1 ml-auto hover:text-primary">
                        Stock <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-center p-3 font-medium text-xs">Status</th>
                    <th className="text-center p-3 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const qty = p.inventory_quantity ?? p.cantidad_inventario ?? 0;
                    const name = p.name || p.nombre || 'Unnamed';
                    const cat = p.category || p.categoria || '—';
                    const price = p.price ?? p.precio ?? 0;
                    const statusColor = qty <= 0 ? 'bg-red-100 text-red-700' : qty <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                    const statusLabel = qty <= 0 ? 'Out' : qty <= 10 ? 'Low' : 'OK';

                    return (
                      <tr key={p.book_id || p.book_id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Checkbox checked={productSelection.isSelected(p.book_id)}
                            onCheckedChange={() => productSelection.toggle(p.book_id)} />
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-xs truncate max-w-[200px]">{name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.code || p.isbn || p.book_id || p.book_id}</p>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{cat}</td>
                        <td className="p-3 text-right text-xs font-mono">${price.toFixed(2)}</td>
                        <td className="p-3 text-right text-xs font-mono font-bold">{qty}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>{statusLabel}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdjustProduct({ ...p, inventory_quantity: qty, name, book_id: p.book_id || p.book_id })}>
                            <ArrowUpDown className="h-3 w-3 mr-1" /> Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground text-sm py-8">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t text-xs text-muted-foreground">
              Showing {products.length} of {total} products
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stock Movement History</CardTitle>
            <CardDescription className="text-xs">Recent inventory changes</CardDescription>
          </CardHeader>
          <CardContent>
            <MovementHistory movements={dashboard?.recent_movements} />
          </CardContent>
        </Card>
      )}

      {/* Adjust Dialog */}
      {adjustProduct && (
        <AdjustStockDialog product={adjustProduct} open={!!adjustProduct}
          onClose={() => setAdjustProduct(null)} onSaved={onAdjusted} token={token} />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar count={productSelection.count} onClear={productSelection.clear}
        onArchive={() => setConfirmBulk('archive')}
        onDelete={() => setConfirmBulk('delete')}
        loading={bulkLoading} />

      <ConfirmDialog
        open={!!confirmBulk}
        onClose={() => setConfirmBulk(null)}
        onConfirm={async () => {
          setBulkLoading(true);
          try {
            const ids = Array.from(productSelection.selected);
            const endpoint = confirmBulk === 'archive' ? 'bulk-archive' : 'bulk-delete';
            await axios.post(`${API_URL}/api/store/inventory/products/${endpoint}`,
              { product_ids: ids }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`${ids.length} product(s) ${confirmBulk === 'archive' ? 'archived' : 'deleted'}`);
            productSelection.clear();
            setConfirmBulk(null);
            fetchData();
          } catch (e) { toast.error(e.response?.data?.detail || 'Operation failed'); }
          finally { setBulkLoading(false); }
        }}
        title={confirmBulk === 'archive'
          ? `Archive ${productSelection.count} product(s)?`
          : `Delete ${productSelection.count} product(s)?`}
        description={confirmBulk === 'archive'
          ? 'Products will be hidden from the store but data is preserved.'
          : 'This will permanently remove the selected products and their inventory data.'}
        variant={confirmBulk === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmBulk === 'archive' ? 'Archive' : 'Delete Permanently'}
        loading={bulkLoading}
      />
    </div>
  );
}
