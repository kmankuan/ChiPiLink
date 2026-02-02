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
import { toast } from 'sonner';
import {
  Package, Plus, Edit2, Trash2, Search, Save, Upload, Loader2, 
  AlertTriangle, Box, Tags, Clock, Store, RefreshCw, ShoppingBag
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const emptyProductRow = {
  nombre: '',
  categoria: '',
  grado: '',
  materia: '',
  precio: '',
  cantidad_inventario: '',
  descripcion: '',
  isbn: '',
  editorial: '',
  requiere_preparacion: false,
  imagen_url: ''
};

export default function CatalogoPublicoTab({ token, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
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
      const [productsRes, categoriasRes, gradosRes, materiasRes] = await Promise.all([
        fetch(`${API}/api/store/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/products/grades`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/products/subjects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const productsData = await productsRes.json();
      const categoriasData = await categoriasRes.json();
      const gradosData = await gradosRes.json();
      const materiasData = await materiasRes.json();
      
      // Filter out private catalog products
      const publicProducts = (Array.isArray(productsData) ? productsData : []).filter(p => !p.es_catalogo_privado);
      setProductos(publicProducts);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setGrados(gradosData.grades || gradosData.grados || []);
      setMaterias(materiasData.subjects || materiasData.materias || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = productos.filter(libro => {
    const matchesSearch = libro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.grado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.materia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || libro.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const openEditDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setEditForm({
        ...emptyProductRow,
        ...product,
        requiere_preparacion: product.requiere_preparacion || false
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
      setCategoryForm({ nombre: category.nombre, icono: category.icono, orden: category.orden });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nombre: '', icono: '📦', orden: categorias.length + 1 });
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
        ? `${API}/api/store/categories/${editingCategory.categoria_id}`
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
    if (!editForm.nombre || !editForm.precio) {
      toast.error('Name and price are required');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        precio: parseFloat(editForm.precio),
        cantidad_inventario: parseInt(editForm.cantidad_inventario) || 0,
        es_catalogo_privado: false
      };
      
      const url = editingProduct 
        ? `${API}/api/store/products/${editingProduct.libro_id}`
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

  const handleDeleteProduct = async (libroId) => {
    if (!confirm('Delete this product?')) return;
    try {
      const response = await fetch(`${API}/api/store/products/${libroId}`, {
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
          <TabsTrigger value="categorias" className="gap-2">
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
                  {categorias.map(cat => (
                    <SelectItem key={cat.categoria_id} value={cat.categoria_id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icono}</span> {cat.nombre}
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
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((libro) => {
                        const cat = categorias.find(c => c.categoria_id === libro.categoria);
                        return (
                          <TableRow key={libro.libro_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {libro.imagen_url ? (
                                  <img src={libro.imagen_url} alt="" className="w-10 h-10 object-cover rounded" />
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{libro.nombre}</p>
                                  {libro.requiere_preparacion && (
                                    <Badge variant="outline" className="text-orange-600 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Preparation
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {cat && (
                                <Badge variant="secondary">
                                  {cat.icono} {cat.nombre}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${libro.precio?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={libro.cantidad_inventario < 10 ? 'destructive' : 'default'}>
                                {libro.cantidad_inventario}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(libro)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(libro.libro_id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categorias" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Categorías de Productos</h3>
              <p className="text-sm text-muted-foreground">Administra las categorías del catálogo público</p>
            </div>
            <Button onClick={() => openCategoryDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Categoría
            </Button>
          </div>

          <div className="grid gap-3">
            {categorias.map((cat) => (
              <Card key={cat.categoria_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{cat.icono}</div>
                      <div>
                        <h4 className="font-semibold">{cat.nombre}</h4>
                        <p className="text-sm text-muted-foreground">ID: {cat.categoria_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">Orden: {cat.orden}</Badge>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openCategoryDialog(cat)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.categoria_id)}>
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
                Productos con Bajo Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productos.filter(p => p.cantidad_inventario < 10).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay productos con bajo stock</p>
              ) : (
                <div className="space-y-2">
                  {productos.filter(p => p.cantidad_inventario < 10).map((item) => (
                    <div key={item.libro_id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{item.nombre}</p>
                      </div>
                      <Badge variant="destructive">Stock: {item.cantidad_inventario}</Badge>
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
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
              />
            </div>

            <div>
              <Label>Categoría *</Label>
              <Select value={editForm.categoria} onValueChange={(v) => setEditForm({...editForm, categoria: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.categoria_id} value={cat.categoria_id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icono}</span> {cat.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.precio}
                  onChange={(e) => setEditForm({...editForm, precio: e.target.value})}
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={editForm.cantidad_inventario}
                  onChange={(e) => setEditForm({...editForm, cantidad_inventario: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={editForm.descripcion}
                onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
              />
            </div>

            <div>
              <Label>URL de Imagen</Label>
              <Input
                value={editForm.imagen_url}
                onChange={(e) => setEditForm({...editForm, imagen_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Requiere Preparación
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa si necesita tiempo de preparación
                </p>
              </div>
              <Switch
                checked={editForm.requiere_preparacion}
                onCheckedChange={(v) => setEditForm({...editForm, requiere_preparacion: v})}
              />
            </div>

            <Button onClick={handleSaveProduct} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={categoryForm.nombre}
                onChange={(e) => setCategoryForm({...categoryForm, nombre: e.target.value})}
                placeholder="Ej: Bebidas"
              />
            </div>
            <div>
              <Label>Icono (emoji)</Label>
              <Input
                value={categoryForm.icono}
                onChange={(e) => setCategoryForm({...categoryForm, icono: e.target.value})}
                placeholder="Ej: 🥤"
                className="text-2xl"
              />
            </div>
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={categoryForm.orden}
                onChange={(e) => setCategoryForm({...categoryForm, orden: parseInt(e.target.value) || 1})}
              />
            </div>
            <Button onClick={handleSaveCategory} disabled={savingCategory} className="w-full gap-2">
              {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Categoría
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
