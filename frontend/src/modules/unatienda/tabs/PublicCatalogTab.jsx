import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Package, Plus, Edit2, Trash2, Search, Save, Upload, Loader2, 
  AlertTriangle, Box, Tags, Clock, Store, RefreshCw, ShoppingBag, Archive
} from 'lucide-react';
import { useTableSelection } from '@/hooks/useTableSelection';
import { usePagination } from '@/hooks/usePagination';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TablePagination } from '@/components/shared/TablePagination';

const API = process.env.REACT_APP_BACKEND_URL;

const emptyProductRow = {
  nombre: '',
  categoria: '',
  grado: '',
  materia: '',
  precio: '',
  inventory_quantity: '',
  descripcion: '',
  isbn: '',
  editorial: '',
  requires_preparation: false,
  image_url: ''
};

export default function CatalogoPublicoTab({ token, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categories, setCategorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({...emptyProductRow});
  const [saving, setSaving] = useState(false);

  // Category management
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', icono: '📦', orden: 99 });
  const [savingCategory, setSavingCategory] = useState(false);
  
  const [subTab, setSubTab] = useState('productos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, gradosRes, materiasRes] = await Promise.all([
        fetch(`${API}/api/store/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/products/grades`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/products/subjects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      // Handle each response separately to avoid "body stream already read" error
      let productsData = [];
      let categoriesData = [];
      let gradosData = { grades: [] };
      let materiasData = { subjects: [] };
      
      if (productsRes.ok) {
        productsData = await productsRes.json();
      } else {
        console.error('Products API error:', productsRes.status);
      }
      
      if (categoriesRes.ok) {
        categoriesData = await categoriesRes.json();
      }
      
      if (gradosRes.ok) {
        gradosData = await gradosRes.json();
      }
      
      if (materiasRes.ok) {
        materiasData = await materiasRes.json();
      }
      
      // Filter out private catalog products
      const publicProducts = (Array.isArray(productsData) ? productsData : []).filter(p => !p.is_private_catalog);
      setProductos(publicProducts);
      setCategorias(Array.isArray(categoriesData) ? categoriesData : []);
      setGrados(gradosData.grades || []);
      setMaterias(materiasData.subjects || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = productos.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || product.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const productPagination = usePagination(filteredProducts, 25);
  const pageProducts = productPagination.paginated;
  const productSelection = useTableSelection(pageProducts, 'book_id');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const handleBulkDelete = async () => {
    const ids = productSelection.selectedIds();
    for (const id of ids) {
      await handleDeleteProduct(id);
    }
    productSelection.clear();
    setConfirmBulkDelete(false);
  };

  const openEditDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setEditForm({
        ...emptyProductRow,
        ...product,
        requires_preparation: product.requires_preparation || false
      });
    } else {
      setEditingProduct(null);
      setEditForm({...emptyProductRow});
    }
    setEditDialog(true);
  };

  const openCategoryDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ nombre: category.name, icono: category.icono, orden: category.orden });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nombre: '', icono: '📦', orden: categories.length + 1 });
    }
    setCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nombre.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingCategory(true);
    try {
      const url = editingCategory 
        ? `${API}/api/store/categories/${editingCategory.category_id}`
        : `${API}/api/store/categories`;
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryForm)
      });
      
      if (response.ok) {
        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setCategoryDialog(false);
        fetchData();
      } else {
        toast.error('Error saving category');
      }
    } catch (error) {
      toast.error('Error saving category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoriaId) => {
    if (!confirm('Delete this category?')) return;
    try {
      const response = await fetch(`${API}/api/store/categories/${categoriaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Category deleted');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Error deleting');
      }
    } catch (error) {
      toast.error('Error deleting');
    }
  };

  const handleSaveProduct = async () => {
    if (!editForm.nombre || !editForm.price) {
      toast.error('Name and price are required');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        precio: parseFloat(editForm.price),
        inventory_quantity: parseInt(editForm.inventory_quantity) || 0,
        is_private_catalog: false
      };
      
      const url = editingProduct 
        ? `${API}/api/store/products/${editingProduct.book_id}`
        : `${API}/api/store/products`;
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created');
        setEditDialog(false);
        fetchData();
        onRefresh?.();
      } else {
        toast.error('Error saving product');
      }
    } catch (error) {
      toast.error('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Delete this product?')) return;
    try {
      const response = await fetch(`${API}/api/store/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Product deleted');
        fetchData();
        onRefresh?.();
      }
    } catch (error) {
      toast.error('Error deleting');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
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
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Public Catalog</CardTitle>
                <CardDescription>
                  Products visible to all users in Unatienda
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="productos" className="gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tags className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-2">
            <Box className="h-4 w-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="productos" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icono}</span> {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openEditDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No products in the public catalog</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={productSelection.allSelected} onCheckedChange={productSelection.toggleAll} />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageProducts.map((product) => {
                        const cat = categories.find(c => c.category_id === product.categoria);
                        return (
                          <TableRow key={product.book_id}>
                            <TableCell>
                              <Checkbox checked={productSelection.isSelected(product.book_id)}
                                onCheckedChange={() => productSelection.toggle(product.book_id)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{product.name}</p>
                                  {cat && <p className="text-xs text-muted-foreground sm:hidden">{cat.icono} {cat.name}</p>}
                                  {product.requires_preparation && (
                                    <Badge variant="outline" className="text-orange-600 text-xs mt-0.5">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Preparation
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {cat && (
                                <Badge variant="secondary">
                                  {cat.icono} {cat.name}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${product.price?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              <Badge variant={product.inventory_quantity < 10 ? 'destructive' : 'default'}>
                                {product.inventory_quantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(product)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.book_id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-3 border-t">
                  <TablePagination
                    page={productPagination.page} totalPages={productPagination.totalPages} totalItems={productPagination.totalItems}
                    pageSize={productPagination.pageSize} onPageChange={productPagination.setPage} onPageSizeChange={productPagination.setPageSize}
                    canPrev={productPagination.canPrev} canNext={productPagination.canNext}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <BulkActionBar count={productSelection.count} onClear={productSelection.clear}
            actions={[{ label: 'Delete', variant: 'destructive', onClick: () => setConfirmBulkDelete(true) }]}
          />
          <ConfirmDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}
            title="Delete Selected Products" description={`Permanently delete ${productSelection.count} product(s)?`}
            confirmLabel="Delete" variant="destructive" onConfirm={handleBulkDelete}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Product Categories</h3>
              <p className="text-sm text-muted-foreground">Manage public catalog categories</p>
            </div>
            <Button onClick={() => openCategoryDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Category
            </Button>
          </div>

          <div className="grid gap-3">
            {categories.map((cat) => (
              <Card key={cat.category_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{cat.icono}</div>
                      <div>
                        <h4 className="font-semibold">{cat.name}</h4>
                        <p className="text-sm text-muted-foreground">ID: {cat.category_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">Order: {cat.orden}</Badge>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openCategoryDialog(cat)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.category_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Low Stock Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productos.filter(p => p.inventory_quantity < 10).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No products with low stock</p>
              ) : (
                <div className="space-y-2">
                  {productos.filter(p => p.inventory_quantity < 10).map((item) => (
                    <div key={item.book_id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                      </div>
                      <Badge variant="destructive">Stock: {item.inventory_quantity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={editForm.categoria} onValueChange={(v) => setEditForm({...editForm, categoria: v})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icono}</span> {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({...editForm, precio: e.target.value})}
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={editForm.inventory_quantity}
                  onChange={(e) => setEditForm({...editForm, inventory_quantity: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
              />
            </div>

            <div>
              <Label>Image URL</Label>
              <Input
                value={editForm.image_url}
                onChange={(e) => setEditForm({...editForm, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Requires Preparation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable if product needs preparation time
                </p>
              </div>
              <Switch
                checked={editForm.requires_preparation}
                onCheckedChange={(v) => setEditForm({...editForm, requires_preparation: v})}
              />
            </div>

            <Button onClick={handleSaveProduct} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryForm.nombre}
                onChange={(e) => setCategoryForm({...categoryForm, nombre: e.target.value})}
                placeholder="Ex: Beverages"
              />
            </div>
            <div>
              <Label>Icon (emoji)</Label>
              <Input
                value={categoryForm.icono}
                onChange={(e) => setCategoryForm({...categoryForm, icono: e.target.value})}
                placeholder="Ex: 🥤"
                className="text-2xl"
              />
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={categoryForm.orden}
                onChange={(e) => setCategoryForm({...categoryForm, orden: parseInt(e.target.value) || 1})}
              />
            </div>
            <Button onClick={handleSaveCategory} disabled={savingCategory} className="w-full gap-2">
              {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
