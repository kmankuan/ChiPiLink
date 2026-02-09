import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Search, Loader2, RefreshCw, Trash2, AlertCircle, Package,
  Maximize2, Minimize2, ArrowUpDown, ArrowUp, ArrowDown, Edit, X
} from 'lucide-react';
import InventoryImport from '../components/InventoryImport';

const DEFAULT_COLUMN_WIDTHS = {
  select: 42,
  name: 250,
  code: 100,
  grade: 80,
  subject: 120,
  publisher: 120,
  price: 100,
  stock: 100,
  status: 90,
  actions: 70
};

const API = process.env.REACT_APP_BACKEND_URL;

/* ── Resizable Header ── */
function ResizableHeader({ children, columnKey, width, onResize, isSticky = false, className = '', sortKey, sortConfig, onSort }) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    const handleMouseMove = (ev) => {
      const diff = ev.clientX - startXRef.current;
      onResize(columnKey, Math.max(50, startWidthRef.current + diff));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const isSorted = sortConfig?.key === sortKey;
  const SortIcon = !isSorted ? ArrowUpDown : sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={`relative select-none ${isSticky ? 'sticky left-0 z-30' : ''} bg-muted px-3 py-2 text-left text-sm font-medium border-b ${isSticky ? 'border-r' : ''} ${className}`}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      <div
        className={`flex items-center justify-between pr-2 ${sortKey ? 'cursor-pointer hover:text-primary' : ''}`}
        onClick={sortKey ? () => onSort(sortKey) : undefined}
        data-testid={sortKey ? `sort-${sortKey}` : undefined}
      >
        <span className="flex items-center gap-1">{children}</span>
        {sortKey && <SortIcon className={`h-3.5 w-3.5 shrink-0 ${isSorted ? 'text-primary' : 'text-muted-foreground/50'}`} />}
      </div>
      <div
        className="absolute right-0 top-0 h-full w-3 cursor-col-resize group flex items-center justify-center hover:bg-primary/20 active:bg-primary/30"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      >
        <div className="w-0.5 h-4 bg-border group-hover:bg-primary" />
      </div>
    </th>
  );
}

/* ── Editable Cell ── */
function EditableCell({ value, onSave, type = 'text', className = '' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) { setIsEditing(false); return; }
    setSaving(true);
    try {
      await onSave(type === 'number' ? parseFloat(editValue) || 0 : editValue);
      setIsEditing(false);
    } catch { setEditValue(value); } finally { setSaving(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') { setEditValue(value); setIsEditing(false); }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown} onBlur={handleSave} autoFocus className="h-8 w-full min-w-[60px]" disabled={saving} />
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    );
  }
  return (
    <div onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors min-h-[32px] flex items-center ${className}`}
      title="Click to edit">
      {value || <span className="text-muted-foreground italic">-</span>}
    </div>
  );
}

/* ── Shared Table Component ── */
function CatalogTable({ products, columnWidths, onResize, sortConfig, onSort, selectedIds, onToggleSelect, onToggleAll, updateProductField, onDelete }) {
  const totalWidth = Object.values(columnWidths).reduce((s, w) => s + w, 0);
  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.book_id));
  const someSelected = products.some(p => selectedIds.has(p.book_id)) && !allSelected;

  return (
    <table className="border-collapse" style={{ minWidth: `${totalWidth}px`, width: 'max-content', tableLayout: 'fixed' }}>
      <thead className="sticky top-0 z-20 bg-muted">
        <tr>
          {/* Select All */}
          <th className="bg-muted px-2 py-2 text-center border-b" style={{ width: `${columnWidths.select}px`, minWidth: `${columnWidths.select}px` }}>
            <Checkbox
              checked={allSelected}
              ref={(el) => { if (el) el.dataset.indeterminate = someSelected; }}
              className={someSelected ? 'opacity-70' : ''}
              onCheckedChange={onToggleAll}
              data-testid="select-all-checkbox"
            />
          </th>
          <ResizableHeader columnKey="name" width={columnWidths.name} onResize={onResize} isSticky sortKey="name" sortConfig={sortConfig} onSort={onSort}>
            Book Name
          </ResizableHeader>
          <ResizableHeader columnKey="code" width={columnWidths.code} onResize={onResize} sortKey="code" sortConfig={sortConfig} onSort={onSort}>
            Code
          </ResizableHeader>
          <ResizableHeader columnKey="grade" width={columnWidths.grade} onResize={onResize} sortKey="grade" sortConfig={sortConfig} onSort={onSort}>
            Grade
          </ResizableHeader>
          <ResizableHeader columnKey="subject" width={columnWidths.subject} onResize={onResize} sortKey="subject" sortConfig={sortConfig} onSort={onSort}>
            Subject
          </ResizableHeader>
          <ResizableHeader columnKey="publisher" width={columnWidths.publisher} onResize={onResize} sortKey="publisher" sortConfig={sortConfig} onSort={onSort}>
            Publisher
          </ResizableHeader>
          <ResizableHeader columnKey="price" width={columnWidths.price} onResize={onResize} sortKey="price" sortConfig={sortConfig} onSort={onSort} className="text-right">
            Price
          </ResizableHeader>
          <ResizableHeader columnKey="stock" width={columnWidths.stock} onResize={onResize} sortKey="stock" sortConfig={sortConfig} onSort={onSort} className="text-center">
            <div className="flex items-center justify-center gap-1"><Package className="h-4 w-4" /> Stock</div>
          </ResizableHeader>
          <ResizableHeader columnKey="status" width={columnWidths.status} onResize={onResize} sortKey="status" sortConfig={sortConfig} onSort={onSort}>
            Status
          </ResizableHeader>
          <ResizableHeader columnKey="actions" width={columnWidths.actions} onResize={onResize} className="text-right">
            Del
          </ResizableHeader>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => {
          const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
          const isLow = stock > 0 && stock < 5;
          const isOut = stock <= 0;
          const isSelected = selectedIds.has(p.book_id);

          return (
            <tr key={p.book_id} className={`group border-b hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`} data-testid={`book-row-${p.book_id}`}>
              <td className="px-2 py-1 text-center" style={{ width: `${columnWidths.select}px` }}>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(p.book_id)} data-testid={`select-${p.book_id}`} />
              </td>
              <td className="sticky left-0 z-10 bg-background border-r p-1" style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }}>
                <EditableCell value={p.name} onSave={(v) => updateProductField(p.book_id, 'name', v)} className="font-medium" />
              </td>
              <td className="p-1" style={{ width: `${columnWidths.code}px` }}>
                <EditableCell value={p.code} onSave={(v) => updateProductField(p.book_id, 'code', v)} className="font-mono text-sm" />
              </td>
              <td className="p-1" style={{ width: `${columnWidths.grade}px` }}>
                <EditableCell value={p.grade} onSave={(v) => updateProductField(p.book_id, 'grade', v)} />
              </td>
              <td className="p-1" style={{ width: `${columnWidths.subject}px` }}>
                <EditableCell value={p.subject} onSave={(v) => updateProductField(p.book_id, 'subject', v)} />
              </td>
              <td className="p-1" style={{ width: `${columnWidths.publisher}px` }}>
                <EditableCell value={p.publisher} onSave={(v) => updateProductField(p.book_id, 'publisher', v)} />
              </td>
              <td className="p-1 text-right" style={{ width: `${columnWidths.price}px` }}>
                <EditableCell value={p.price?.toFixed(2) || '0.00'} onSave={(v) => updateProductField(p.book_id, 'price', parseFloat(v) || 0)} type="number" className="justify-end font-medium" />
              </td>
              <td className="p-1 text-center" style={{ width: `${columnWidths.stock}px` }}>
                <div className={`cursor-pointer rounded px-2 py-1 text-center font-semibold
                  ${isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : isLow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-green-100 text-green-700 dark:bg-green-900/30'}
                  hover:ring-2 hover:ring-primary/50 transition-all`}
                  onClick={() => { const q = prompt('Enter new stock quantity:', p.inventory_quantity || 0); if (q !== null && !isNaN(parseInt(q))) updateProductField(p.book_id, 'inventory_quantity', parseInt(q)); }}
                  title="Click to edit stock">
                  {p.inventory_quantity || 0}
                </div>
              </td>
              <td className="p-1" style={{ width: `${columnWidths.status}px` }}>
                <Badge variant={p.active !== false ? "default" : "secondary"} className="cursor-pointer"
                  onClick={() => updateProductField(p.book_id, 'active', p.active === false)} title="Click to toggle">
                  {p.active !== false ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="p-1 text-right" style={{ width: `${columnWidths.actions}px` }}>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p.book_id)} className="opacity-50 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── Bulk Actions Bar ── */
function BulkActionBar({ count, onBulkDelete, onBulkStatusChange, onClearSelection }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg" data-testid="bulk-action-bar">
      <Badge variant="default" className="text-xs">{count} selected</Badge>
      <div className="flex-1" />
      <Button size="sm" variant="outline" onClick={() => onBulkStatusChange(true)} className="gap-1.5 text-xs h-8" data-testid="bulk-activate">
        <Edit className="h-3.5 w-3.5" /> Set Active
      </Button>
      <Button size="sm" variant="outline" onClick={() => onBulkStatusChange(false)} className="gap-1.5 text-xs h-8" data-testid="bulk-deactivate">
        <Edit className="h-3.5 w-3.5" /> Set Inactive
      </Button>
      <Button size="sm" variant="destructive" onClick={onBulkDelete} className="gap-1.5 text-xs h-8" data-testid="bulk-delete">
        <Trash2 className="h-3.5 w-3.5" /> Delete Selected
      </Button>
      <Button size="sm" variant="ghost" onClick={onClearSelection} className="h-8 px-2" data-testid="bulk-clear">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ── Main Component ── */
export default function PrivateCatalogTab({ token, onRefresh }) {
  const navigate = useNavigate();
  const { t: translate } = useTranslation();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ grades: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Sort
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleColumnResize = useCallback((key, w) => {
    setColumnWidths(prev => ({ ...prev, [key]: w }));
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const [formData, setFormData] = useState({
    name: '', code: '', isbn: '', publisher: '', grade: '', subject: '',
    price: '', sale_price: '', inventory_quantity: '0', description: '', image_url: '',
    active: true, featured: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/store/private-catalog/admin/products?limit=200`;
      if (selectedGrade) url += `&grade=${encodeURIComponent(selectedGrade)}`;
      if (selectedSubject) url += `&subject=${encodeURIComponent(selectedSubject)}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      setProducts(data.products || []);
      const all = data.products || [];
      setFilters({
        grades: [...new Set(all.map(p => p.grade).filter(Boolean))].sort(),
        subjects: [...new Set(all.map(p => p.subject).filter(Boolean))].sort(),
      });
    } catch { toast.error('Error loading catalog'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [token, selectedGrade, selectedSubject]);

  // Filter + Sort
  const sortedProducts = useMemo(() => {
    let result = products.filter(p => {
      // Text search
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!(
          (p.name || '').toLowerCase().includes(t) ||
          (p.code || '').toLowerCase().includes(t) ||
          (p.publisher || '').toLowerCase().includes(t) ||
          (p.subject || '').toLowerCase().includes(t)
        )) return false;
      }
      // Status filter
      if (statusFilter === 'active' && p.active === false) return false;
      if (statusFilter === 'inactive' && p.active !== false) return false;
      return true;
    });

    // Sort
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'price') {
          aVal = a.price || 0; bVal = b.price || 0;
        } else if (sortConfig.key === 'stock') {
          aVal = (a.inventory_quantity || 0) - (a.reserved_quantity || 0);
          bVal = (b.inventory_quantity || 0) - (b.reserved_quantity || 0);
        } else if (sortConfig.key === 'status') {
          aVal = a.active !== false ? 1 : 0; bVal = b.active !== false ? 1 : 0;
        } else {
          aVal = (a[sortConfig.key] || '').toString().toLowerCase();
          bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [products, searchTerm, statusFilter, sortConfig]);

  // Inline update
  const updateProductField = useCallback(async (bookId, field, value) => {
    try {
      const response = await fetch(`${API}/api/store/private-catalog/admin/products/${bookId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setProducts(prev => prev.map(p => p.book_id === bookId ? { ...p, [field]: value } : p));
        toast.success('Updated');
        onRefresh?.();
      } else { toast.error(data.detail || 'Error updating'); throw new Error(); }
    } catch (e) { toast.error('Error updating'); throw e; }
  }, [token, onRefresh]);

  const handleDelete = async (book_id) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    try {
      const response = await fetch(`${API}/api/store/private-catalog/admin/products/${book_id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) { toast.success('Product deactivated'); fetchProducts(); onRefresh?.(); }
    } catch { toast.error('Error deleting'); }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to deactivate ${selectedIds.size} products?`)) return;
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        const r = await fetch(`${API}/api/store/private-catalog/admin/products/${id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        if (r.ok) ok++; else fail++;
      } catch { fail++; }
    }
    toast.success(`${ok} deactivated${fail ? `, ${fail} failed` : ''}`);
    setSelectedIds(new Set());
    fetchProducts();
    onRefresh?.();
  };

  const handleBulkStatusChange = async (active) => {
    if (selectedIds.size === 0) return;
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        const r = await fetch(`${API}/api/store/private-catalog/admin/products/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ active })
        });
        if (r.ok) ok++; else fail++;
      } catch { fail++; }
    }
    toast.success(`${ok} items set to ${active ? 'Active' : 'Inactive'}${fail ? `, ${fail} failed` : ''}`);
    setSelectedIds(new Set());
    fetchProducts();
    onRefresh?.();
  };

  const toggleAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(new Set(sortedProducts.map(p => p.book_id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [sortedProducts]);

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '', code: product.code || '', isbn: product.isbn || '',
        publisher: product.publisher || '', grade: product.grade || '', subject: product.subject || '',
        price: product.price?.toString() || '', sale_price: product.sale_price?.toString() || '',
        inventory_quantity: product.inventory_quantity?.toString() || '0',
        description: product.description || '', image_url: product.image_url || '',
        active: product.active !== false, featured: product.featured || false
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', code: '', isbn: '', publisher: '', grade: '', subject: '',
        price: '', sale_price: '', inventory_quantity: '0', description: '', image_url: '',
        active: true, featured: false });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.grade || !formData.price) {
      toast.error('Name, grade and price are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name, code: formData.code, isbn: formData.isbn, publisher: formData.publisher,
        grade: formData.grade, subject: formData.subject, price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        inventory_quantity: formData.inventory_quantity ? parseInt(formData.inventory_quantity) : 0,
        description: formData.description, image_url: formData.image_url,
        active: formData.active, featured: formData.featured
      };
      let url = `${API}/api/store/private-catalog/admin/products`;
      let method = 'POST';
      if (editingProduct) { url += `/${editingProduct.book_id}`; method = 'PUT'; }
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success || response.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created');
        setShowForm(false); fetchProducts(); onRefresh?.();
      } else { toast.error(data.detail || 'Error saving'); }
    } catch { toast.error('Error saving product'); } finally { setSaving(false); }
  };

  const GRADE_OPTIONS = [
    'Pre-Kinder', 'Kinder', 'K3', 'K4', 'K5', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6',
    'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
    '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'
  ];
  const SUBJECT_OPTIONS = [
    'Mathematics', 'Spanish', 'English', 'Natural Sciences', 'Social Sciences',
    'Religion', 'Art', 'Music', 'Physical Education', 'Technology', 'Others'
  ];

  // Stats
  const totalStock = products.reduce((s, p) => s + ((p.inventory_quantity || 0) - (p.reserved_quantity || 0)), 0);
  const lowStockCount = products.filter(p => { const s = (p.inventory_quantity || 0) - (p.reserved_quantity || 0); return s > 0 && s < 5; }).length;
  const outOfStockCount = products.filter(p => (p.inventory_quantity || 0) - (p.reserved_quantity || 0) <= 0).length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Private Catalog - PCA</CardTitle>
                <CardDescription>Textbooks for linked Panama Christian Academy students</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {translate('common.refresh', 'Refresh')}
              </Button>
              <InventoryImport token={token} onImportComplete={() => { fetchProducts(); onRefresh?.(); }} />
              <Button onClick={() => handleOpenForm()} className="gap-2"><Plus className="h-4 w-4" /> {translate('store.addBook', 'Add Book')}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, code, publisher..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" data-testid="pca-search" />
              </div>
            </div>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm" data-testid="pca-filter-grade">
              <option value="">All grades</option>
              {filters.grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm" data-testid="pca-filter-subject">
              <option value="">All subjects</option>
              {filters.subjects.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm" data-testid="pca-filter-status">
              <option value="all">All status</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            {(searchTerm || selectedGrade || selectedSubject || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="pca-clear-filters"
                onClick={() => { setSearchTerm(''); setSelectedGrade(''); setSelectedSubject(''); setStatusFilter('all'); }}>
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{products.length}</div><p className="text-xs text-muted-foreground">Total books</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{products.filter(p => p.active !== false).length}</div><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{totalStock}</div><p className="text-xs text-muted-foreground">Total Stock</p></CardContent></Card>
        <Card className={lowStockCount > 0 ? 'border-amber-300' : ''}><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{lowStockCount}</div><p className="text-xs text-muted-foreground">Low Stock</p></CardContent></Card>
        <Card className={outOfStockCount > 0 ? 'border-red-300' : ''}><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{outOfStockCount}</div><p className="text-xs text-muted-foreground">Out of Stock</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{filters.grades.length}</div><p className="text-xs text-muted-foreground">Grades</p></CardContent></Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p><strong>Tip:</strong> Click directly on any cell to edit inline. Use checkboxes to select multiple items for bulk actions. Click column headers to sort.</p>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Products Table */}
      {sortedProducts.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No books match the current filters</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Fullscreen Dialog */}
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col [&>button]:hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">Private Catalog - PCA</h2>
                  <p className="text-sm text-muted-foreground">{sortedProducts.length} books • Click headers to sort • Select rows for bulk actions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(false)} className="gap-2">
                  <Minimize2 className="h-4 w-4" /> Exit Fullscreen
                </Button>
              </div>
              {selectedIds.size > 0 && (
                <div className="px-4 pt-2">
                  <BulkActionBar count={selectedIds.size} onBulkDelete={handleBulkDelete}
                    onBulkStatusChange={handleBulkStatusChange} onClearSelection={() => setSelectedIds(new Set())} />
                </div>
              )}
              <div className="scrollable-table-container flex-1" data-testid="pca-table-fullscreen-container">
                <CatalogTable products={sortedProducts} columnWidths={columnWidths} onResize={handleColumnResize}
                  sortConfig={sortConfig} onSort={handleSort} selectedIds={selectedIds}
                  onToggleSelect={toggleSelect} onToggleAll={toggleAll}
                  updateProductField={updateProductField} onDelete={handleDelete} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Normal Table */}
          <Card className="overflow-hidden max-w-full">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {sortedProducts.length} books{sortConfig.key ? ` • Sorted by ${sortConfig.key} ${sortConfig.direction}` : ''} • Drag column edges to resize
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)} className="gap-2">
                  <Maximize2 className="h-4 w-4" /> Fullscreen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="scrollable-table-container h-[500px]" style={{ maxWidth: '100%', width: '100%' }} data-testid="pca-table-scroll-container">
                <CatalogTable products={sortedProducts} columnWidths={columnWidths} onResize={handleColumnResize}
                  sortConfig={sortConfig} onSort={handleSort} selectedIds={selectedIds}
                  onToggleSelect={toggleSelect} onToggleAll={toggleAll}
                  updateProductField={updateProductField} onDelete={handleDelete} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Book' : 'New Book'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Modify the book data' : 'Add a new book to the private PCA catalog'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Mathematics 5th Grade - Pearson" />
              </div>
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Ex: MAT-5-2026" />
              </div>
              <div>
                <label className="text-sm font-medium">ISBN</label>
                <Input value={formData.isbn} onChange={(e) => setFormData({...formData, isbn: e.target.value})} placeholder="Ex: 978-607-32-4583-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Grade *</label>
                <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="">Select grade</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="">Select subject</option>
                  {SUBJECT_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Publisher</label>
                <Input value={formData.publisher} onChange={(e) => setFormData({...formData, publisher: e.target.value})} placeholder="Ex: Pearson, SM, Norma..." />
              </div>
              <div>
                <label className="text-sm font-medium">Price *</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium">Sale Price</label>
                <Input type="number" step="0.01" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: e.target.value})} placeholder="Leave empty if no sale" />
              </div>
              <div>
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input type="number" step="1" min="0" value={formData.inventory_quantity} onChange={(e) => setFormData({...formData, inventory_quantity: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Brief description of the book" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 rounded" />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({...formData, featured: e.target.checked})} className="w-4 h-4 rounded" />
                  <span className="text-sm">Featured</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Save Changes' : 'Create Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
