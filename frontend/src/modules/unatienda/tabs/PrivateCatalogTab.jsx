import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Search, Loader2, RefreshCw, Trash2, AlertCircle, Package, Maximize2, Minimize2, X
} from 'lucide-react';
import InventoryImport from '../components/InventoryImport';

const API = process.env.REACT_APP_BACKEND_URL;

// Inline editable cell component
function EditableCell({ value, onSave, type = 'text', className = '' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    
    setSaving(true);
    try {
      await onSave(type === 'number' ? parseFloat(editValue) || 0 : editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      setEditValue(value); // Reset on error
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="h-8 w-full min-w-[60px]"
          disabled={saving}
        />
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors min-h-[32px] flex items-center ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground italic">-</span>}
    </div>
  );
}

export default function PrivateCatalogTab({ token, onRefresh }) {
  const navigate = useNavigate();
  const { t: translate } = useTranslation();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ grades: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isbn: '',
    publisher: '',
    grade: '',
    subject: '',
    price: '',
    sale_price: '',
    inventory_quantity: '',
    description: '',
    image_url: '',
    active: true,
    featured: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/store/private-catalog/admin/products?limit=200`;
      if (selectedGrade) url += `&grade=${encodeURIComponent(selectedGrade)}`;
      if (selectedSubject) url += `&subject=${encodeURIComponent(selectedSubject)}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data.products || []);
      
      const allProducts = data.products || [];
      const grades = [...new Set(allProducts.map(p => p.grade).filter(Boolean))].sort();
      const subjects = [...new Set(allProducts.map(p => p.subject).filter(Boolean))].sort();
      setFilters({ grades, subjects });
      
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token, selectedGrade, selectedSubject]);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name || '')?.toLowerCase().includes(term) ||
      (p.code || '')?.toLowerCase().includes(term) ||
      (p.publisher || '')?.toLowerCase().includes(term) ||
      (p.subject || '')?.toLowerCase().includes(term)
    );
  });

  // Inline update function
  const updateProductField = useCallback(async (bookId, field, value) => {
    try {
      const response = await fetch(`${API}/api/store/private-catalog/admin/products/${bookId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });

      const data = await response.json();
      
      if (data.success || response.ok) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p.book_id === bookId ? { ...p, [field]: value } : p
        ));
        toast.success('Updated');
        onRefresh?.();
      } else {
        toast.error(data.detail || 'Error updating');
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error updating');
      throw error;
    }
  }, [token, onRefresh]);

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        code: product.code || '',
        isbn: product.isbn || '',
        publisher: product.publisher || '',
        grade: product.grade || '',
        subject: product.subject || '',
        price: product.price?.toString() || '',
        sale_price: product.sale_price?.toString() || '',
        inventory_quantity: product.inventory_quantity?.toString() || '0',
        description: product.description || '',
        image_url: product.image_url || '',
        active: product.active !== false,
        featured: product.featured || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', code: '', isbn: '', publisher: '', grade: '', subject: '',
        price: '', sale_price: '', inventory_quantity: '0', description: '', image_url: '',
        active: true, featured: false
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.grade || !formData.price) {
      toast.error('Name, grade and price are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        isbn: formData.isbn,
        publisher: formData.publisher,
        grade: formData.grade,
        subject: formData.subject,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        inventory_quantity: formData.inventory_quantity ? parseInt(formData.inventory_quantity) : 0,
        description: formData.description,
        image_url: formData.image_url,
        active: formData.active,
        featured: formData.featured
      };

      let url = `${API}/api/store/private-catalog/admin/products`;
      let method = 'POST';
      
      if (editingProduct) {
        url = `${API}/api/store/private-catalog/admin/products/${editingProduct.book_id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success || response.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created');
        setShowForm(false);
        fetchProducts();
        onRefresh?.();
      } else {
        toast.error(data.detail || 'Error saving');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (book_id) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    
    try {
      const response = await fetch(`${API}/api/store/private-catalog/admin/products/${book_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Product deactivated');
        fetchProducts();
        onRefresh?.();
      }
    } catch (error) {
      toast.error('Error deleting');
    }
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

  // Calculate stats
  const totalStock = products.reduce((sum, p) => sum + ((p.inventory_quantity || 0) - (p.reserved_quantity || 0)), 0);
  const lowStockCount = products.filter(p => {
    const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
    return stock > 0 && stock < 5;
  }).length;
  const outOfStockCount = products.filter(p => {
    const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
    return stock <= 0;
  }).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
                <CardDescription>
                  Textbooks for linked Panama Christian Academy students • Click any cell to edit
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {translate('common.refresh', 'Refresh')}
              </Button>
              <InventoryImport 
                token={token} 
                onImportComplete={() => {
                  fetchProducts();
                  onRefresh?.();
                }}
              />
              <Button onClick={() => handleOpenForm()} className="gap-2">
                <Plus className="h-4 w-4" />
                {translate('store.addBook', 'Add Book')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, publisher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All grades</option>
              {filters.grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All subjects</option>
              {filters.subjects.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Total books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{products.filter(p => p.active !== false).length}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totalStock}</div>
            <p className="text-xs text-muted-foreground">Total Stock</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card className={outOfStockCount > 0 ? 'border-red-300' : ''}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filters.grades.length}</div>
            <p className="text-xs text-muted-foreground">Grades</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p><strong>Tip:</strong> Click directly on any cell (Name, Code, Price, Stock, etc.) to edit it inline. Changes save automatically.</p>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No books in the private catalog</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the "Demo" tab to generate test data or add books manually
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Fullscreen Table Dialog */}
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col [&>button]:hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">Private Catalog - PCA</h2>
                  <p className="text-sm text-muted-foreground">
                    {filteredProducts.length} books • Click any cell to edit
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(false)} className="gap-2">
                  <Minimize2 className="h-4 w-4" />
                  Exit Fullscreen
                </Button>
              </div>
              <div className="flex-1 overflow-auto relative">
                <table className="w-full border-collapse min-w-[1200px]">
                  <thead className="sticky top-0 z-20 bg-muted">
                    <tr>
                      <th className="sticky left-0 z-30 bg-muted px-3 py-2 text-left text-sm font-medium border-b border-r w-[280px]">Book Name</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[100px]">Code</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[80px]">Grade</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[130px]">Subject</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[130px]">Publisher</th>
                      <th className="px-3 py-2 text-right text-sm font-medium border-b w-[100px]">Price</th>
                      <th className="px-3 py-2 text-center text-sm font-medium border-b w-[90px]">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-4 w-4" />
                          Stock
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[90px]">Status</th>
                      <th className="px-3 py-2 text-right text-sm font-medium border-b w-[70px]">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
                      const isLowStock = stock > 0 && stock < 5;
                      const isOutOfStock = stock <= 0;
                      
                      return (
                        <tr key={p.book_id} className="group border-b hover:bg-muted/30">
                          <td className="sticky left-0 z-10 bg-background border-r p-1">
                            <EditableCell
                              value={p.name}
                              onSave={(val) => updateProductField(p.book_id, 'name', val)}
                              className="font-medium"
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.code}
                              onSave={(val) => updateProductField(p.book_id, 'code', val)}
                              className="font-mono text-sm"
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.grade}
                              onSave={(val) => updateProductField(p.book_id, 'grade', val)}
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.subject}
                              onSave={(val) => updateProductField(p.book_id, 'subject', val)}
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.publisher}
                              onSave={(val) => updateProductField(p.book_id, 'publisher', val)}
                            />
                          </td>
                          <td className="p-1 text-right">
                            <EditableCell
                              value={p.price?.toFixed(2) || '0.00'}
                              onSave={(val) => updateProductField(p.book_id, 'price', parseFloat(val) || 0)}
                              type="number"
                              className="justify-end font-medium"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <div 
                              className={`
                                cursor-pointer rounded px-2 py-1 text-center font-semibold
                                ${isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                  isLowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                                hover:ring-2 hover:ring-primary/50 transition-all
                              `}
                              onClick={() => {
                                const newQty = prompt('Enter new stock quantity:', p.inventory_quantity || 0);
                                if (newQty !== null && !isNaN(parseInt(newQty))) {
                                  updateProductField(p.book_id, 'inventory_quantity', parseInt(newQty));
                                }
                              }}
                              title="Click to edit stock"
                            >
                              {p.inventory_quantity || 0}
                            </div>
                          </td>
                          <td className="p-1">
                            <Badge 
                              variant={p.active !== false ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => updateProductField(p.book_id, 'active', p.active === false)}
                              title="Click to toggle"
                            >
                              {p.active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-1 text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDelete(p.book_id)}
                              className="opacity-50 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Normal Table View */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} books
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsFullscreen(true)}
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] overflow-auto relative">
                <table className="w-full border-collapse min-w-[1100px]">
                  <thead className="sticky top-0 z-20 bg-muted">
                    <tr>
                      <th className="sticky left-0 z-30 bg-muted px-3 py-2 text-left text-sm font-medium border-b border-r w-[250px]">Book Name</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[100px]">Code</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[80px]">Grade</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[120px]">Subject</th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[120px]">Publisher</th>
                      <th className="px-3 py-2 text-right text-sm font-medium border-b w-[90px]">Price</th>
                      <th className="px-3 py-2 text-center text-sm font-medium border-b w-[80px]">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-4 w-4" />
                          Stock
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium border-b w-[80px]">Status</th>
                      <th className="px-3 py-2 text-right text-sm font-medium border-b w-[60px]">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
                      const isLowStock = stock > 0 && stock < 5;
                      const isOutOfStock = stock <= 0;
                      
                      return (
                        <tr key={p.book_id} className="group border-b hover:bg-muted/30">
                          <td className="sticky left-0 z-10 bg-background border-r p-1">
                            <EditableCell
                              value={p.name}
                              onSave={(val) => updateProductField(p.book_id, 'name', val)}
                              className="font-medium"
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.code}
                              onSave={(val) => updateProductField(p.book_id, 'code', val)}
                              className="font-mono text-sm"
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.grade}
                              onSave={(val) => updateProductField(p.book_id, 'grade', val)}
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.subject}
                              onSave={(val) => updateProductField(p.book_id, 'subject', val)}
                            />
                          </td>
                          <td className="p-1">
                            <EditableCell
                              value={p.publisher}
                              onSave={(val) => updateProductField(p.book_id, 'publisher', val)}
                            />
                          </td>
                          <td className="p-1 text-right">
                            <EditableCell
                              value={p.price?.toFixed(2) || '0.00'}
                              onSave={(val) => updateProductField(p.book_id, 'price', parseFloat(val) || 0)}
                              type="number"
                              className="justify-end font-medium"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <div 
                              className={`
                                cursor-pointer rounded px-2 py-1 text-center font-semibold
                                ${isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                  isLowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                                hover:ring-2 hover:ring-primary/50 transition-all
                              `}
                              onClick={() => {
                                const newQty = prompt('Enter new stock quantity:', p.inventory_quantity || 0);
                                if (newQty !== null && !isNaN(parseInt(newQty))) {
                                  updateProductField(p.book_id, 'inventory_quantity', parseInt(newQty));
                                }
                              }}
                              title="Click to edit stock"
                            >
                              {p.inventory_quantity || 0}
                            </div>
                          </td>
                          <td className="p-1">
                            <Badge 
                              variant={p.active !== false ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => updateProductField(p.book_id, 'active', p.active === false)}
                              title="Click to toggle"
                            >
                              {p.active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-1 text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDelete(p.book_id)}
                              className="opacity-50 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
                                  ${isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                    isLowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                                  hover:ring-2 hover:ring-primary/50 transition-all
                                `}
                                onClick={() => {
                                  const newQty = prompt('Enter new stock quantity:', p.inventory_quantity || 0);
                                  if (newQty !== null && !isNaN(parseInt(newQty))) {
                                    updateProductField(p.book_id, 'inventory_quantity', parseInt(newQty));
                                  }
                                }}
                                title="Click to edit stock"
                              >
                                {p.inventory_quantity || 0}
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <Badge 
                                variant={p.active !== false ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => updateProductField(p.book_id, 'active', p.active === false)}
                                title="Click to toggle"
                              >
                                {p.active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-1 text-right">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDelete(p.book_id)}
                                className="opacity-50 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Dialog - For creating new products */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Book' : 'New Book'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modify the book data' : 'Add a new book to the private PCA catalog'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Mathematics 5th Grade - Pearson"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Ex: MAT-5-2026"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">ISBN</label>
                <Input
                  value={formData.isbn}
                  onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  placeholder="Ex: 978-607-32-4583-2"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Grade *</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select grade</option>
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select subject</option>
                  {SUBJECT_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Publisher</label>
                <Input
                  value={formData.publisher}
                  onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                  placeholder="Ex: Pearson, SM, Norma..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Sale Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                  placeholder="Leave empty if no sale"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.inventory_quantity}
                  onChange={(e) => setFormData({...formData, inventory_quantity: e.target.value})}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the book"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Featured</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
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
