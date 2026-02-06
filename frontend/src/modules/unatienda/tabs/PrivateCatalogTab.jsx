import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Search, Loader2, RefreshCw, Settings, Trash2, CheckCircle2, AlertCircle, Upload, Download
} from 'lucide-react';
import InventoryImport from '../components/InventoryImport';

const API = process.env.REACT_APP_BACKEND_URL;

export default function CatalogoPrivadoTab({ token, onRefresh }) {
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
        description: product.description || '',
        image_url: product.image_url || '',
        active: product.active !== false,
        featured: product.featured || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', code: '', isbn: '', publisher: '', grade: '', subject: '',
        price: '', sale_price: '', description: '', image_url: '',
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
      
      if (data.success) {
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
    'Pre-Kinder', 'Kinder', '1st', '2nd', '3rd', '4th', '5th', '6th',
    '7th', '8th', '9th', '10th', '11th', '12th'
  ];

  const SUBJECT_OPTIONS = [
    'Mathematics', 'Spanish', 'English', 'Natural Sciences', 'Social Sciences',
    'Religion', 'Art', 'Music', 'Physical Education', 'Technology', 'Others'
  ];

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Private Catalog - PCA</CardTitle>
                <CardDescription>
                  Textbooks for linked Panama Christian Academy students
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
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
      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="text-2xl font-bold">{filters.grades.length}</div>
            <p className="text-xs text-muted-foreground">Grades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filters.subjects.length}</div>
            <p className="text-xs text-muted-foreground">Subjects</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-700 dark:text-purple-300">
              <p className="font-medium">Private Catalog PCA</p>
              <p>Only customers with linked PCA students can view and purchase these books from the Unatienda store.</p>
            </div>
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
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => {
                    const stock = (p.inventory_quantity || 0) - (p.reserved_quantity || 0);
                    const isLowStock = stock > 0 && stock < 5;
                    const isOutOfStock = stock <= 0;
                    
                    return (
                    <TableRow key={p.book_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{p.name}</p>
                            {p.isbn && <p className="text-xs text-muted-foreground">ISBN: {p.isbn}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.grade}</Badge>
                      </TableCell>
                      <TableCell>{p.subject}</TableCell>
                      <TableCell>{p.publisher}</TableCell>
                      <TableCell className="text-right">
                        {p.sale_price ? (
                          <div>
                            <span className="text-green-600 font-medium">${p.sale_price.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">${p.price?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">${p.price?.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={isOutOfStock ? "destructive" : isLowStock ? "warning" : "outline"}
                          className={isLowStock ? "bg-amber-100 text-amber-800 border-amber-300" : ""}
                        >
                          {stock}
                        </Badge>
                        {isLowStock && (
                          <p className="text-xs text-amber-600 mt-1">Low</p>
                        )}
                        {isOutOfStock && (
                          <p className="text-xs text-red-600 mt-1">Out</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active !== false ? "default" : "secondary"}>
                          {p.active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenForm(p)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(p.book_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
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
