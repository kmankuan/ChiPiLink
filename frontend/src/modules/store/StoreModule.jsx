import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Save,
  Upload,
  Download,
  Loader2,
  AlertTriangle,
  Box,
  Tags,
  Clock,
  GripVertical
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  requires_preparation: false
};

export default function StoreModule() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState({ books: [], alertas_bajo_stock: [] });
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
  
  // Bulk add
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([{...emptyProductRow}]);
  const [savingBulk, setSavingBulk] = useState(false);

  // Category management
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', icono: '📦', orden: 99 });
  const [savingCategory, setSavingCategory] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, categoriesRes, gradosRes, materiasRes] = await Promise.all([
        api.get('/admin/inventario'),
        api.get('/categories'),
        api.get('/grados'),
        api.get('/materias')
      ]);
      setInventario(invRes.data);
      setCategorias(categoriesRes.data || []);
      setGrados(gradosRes.data.grades);
      setMaterias(materiasRes.data.subjects);
    } catch (error) {
      toast.error(t("storeManager.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = inventario.books?.filter(book => {
    const matchesSearch = book.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || book.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  }) || [];

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

  // Category management functions
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
      toast.error('El nombre es requerido');
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.category_id}`, categoryForm);
        toast.success(t("storeManager.categoryUpdated"));
      } else {
        await api.post('/admin/categories', categoryForm);
        toast.success(t("storeManager.categoryCreated"));
      }
      setCategoryDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar categoría');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoriaId) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/admin/categories/${categoriaId}`);
      toast.success(t("storeManager.categoryDeleted"));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleSaveProduct = async () => {
    try {
      setSaving(true);
      if (editingProduct) {
        await api.put(`/admin/books/${editingProduct.book_id}`, editForm);
        toast.success(t("storeManager.productUpdated"));
      } else {
        await api.post('/admin/books', editForm);
        toast.success(t("storeManager.productCreated"));
      }
      setEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (bookId) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/admin/books/${bookId}`);
      toast.success(t("storeManager.productDeleted"));
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const updateInventory = async (bookId, cantidad) => {
    try {
      await api.put(`/admin/inventario/${bookId}`, null, { params: { cantidad } });
      toast.success('Inventario actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar inventario');
    }
  };

  const addBulkRow = () => setBulkProducts([...bulkProducts, {...emptyProductRow}]);
  
  const updateBulkRow = (index, field, value) => {
    const updated = [...bulkProducts];
    updated[index] = { ...updated[index], [field]: value };
    setBulkProducts(updated);
  };

  const saveBulkProducts = async () => {
    const validProducts = bulkProducts.filter(p => p.name && p.grade && p.price);
    if (validProducts.length === 0) {
      toast.error('Agrega al menos un producto válido');
      return;
    }
    
    setSavingBulk(true);
    try {
      for (const product of validProducts) {
        await api.post('/admin/books', {
          ...product,
          precio: parseFloat(product.price),
          inventory_quantity: parseInt(product.inventory_quantity) || 0
        });
      }
      toast.success(`${validProducts.length} productos creados`);
      setBulkDialog(false);
      setBulkProducts([{...emptyProductRow}]);
      fetchData();
    } catch (error) {
      toast.error('Error al crear productos');
    } finally {
      setSavingBulk(false);
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
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tags className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Box className="h-4 w-4" />
            Inventario
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder=t("storeManager.searchProducts")
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
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
            <div className="flex gap-2">
              <Button onClick={() => openEditDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
              <Button variant="outline" onClick={() => setBulkDialog(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Agregar Varios
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredProducts.map((book) => {
              const cat = categories.find(c => c.category_id === book.categoria);
              return (
                <Card key={book.book_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{book.name}</h3>
                          {book.requires_preparation && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <Clock className="h-3 w-3 mr-1" />
                              Preparación
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {cat && (
                            <Badge variant="default" className="text-xs">
                              {cat.icono} {cat.name}
                            </Badge>
                          )}
                          {book.categoria === 'books' && book.grade && (
                            <Badge variant="outline">{book.grade}</Badge>
                          )}
                          {book.categoria === 'books' && book.subject && (
                            <Badge variant="secondary">{book.subject}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${book.price?.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {book.inventory_quantity}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(book)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(book.book_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Categorías de Productos</h3>
              <p className="text-sm text-muted-foreground">Administra las categorías disponibles en tu tienda</p>
            </div>
            <Button onClick={() => openCategoryDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Categoría
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
                      <Badge variant="outline">Orden: {cat.orden}</Badge>
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
        <TabsContent value="inventory" className="space-y-4">
          {inventario.alertas_bajo_stock?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Bajo Stock ({inventario.alertas_bajo_stock.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventario.alertas_bajo_stock.map((item) => (
                    <div key={item.book_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.grade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">Stock: {item.inventory_quantity}</Badge>
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="+"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newQty = parseInt(e.target.value);
                              if (newQty > 0) updateInventory(item.book_id, newQty);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Todos los Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inventario.books?.map((item) => (
                  <div key={item.book_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.grade} - {item.subject}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={item.inventory_quantity < 10 ? 'destructive' : 'default'}>
                        Stock: {item.inventory_quantity}
                      </Badge>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={item.inventory_quantity}
                        onBlur={(e) => {
                          const newQty = parseInt(e.target.value);
                          if (newQty !== item.inventory_quantity) {
                            updateInventory(item.book_id, newQty);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Category Selection */}
            <div>
              <Label>Categoría *</Label>
              <Select value={editForm.categoria} onValueChange={(v) => setEditForm({...editForm, categoria: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
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

            {/* Grade/Subject - Only for Books */}
            {editForm.categoria === 'books' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Grado</Label>
                  <Select value={editForm.grade} onValueChange={(v) => setEditForm({...editForm, grado: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {grados.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Materia</Label>
                  <Select value={editForm.subject} onValueChange={(v) => setEditForm({...editForm, materia: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio *</Label>
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
              <Label>Descripción</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
              />
            </div>

            {/* Requires Preparation Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Requiere Preparación
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa si este producto necesita tiempo de preparación (ej: hotdog, cappuccino)
                </p>
              </div>
              <Switch
                checked={editForm.requires_preparation}
                onCheckedChange={(v) => setEditForm({...editForm, requires_preparation: v})}
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
              <p className="text-xs text-muted-foreground mt-1">
                Puedes copiar emojis desde emojipedia.org
              </p>
            </div>
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={categoryForm.orden}
                onChange={(e) => setCategoryForm({...categoryForm, orden: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Define el orden de aparición (menor número = aparece primero)
              </p>
            </div>
            <Button onClick={handleSaveCategory} disabled={savingCategory} className="w-full gap-2">
              {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Categoría
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Varios Productos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkProducts.map((product, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Nombre"
                  value={product.name}
                  onChange={(e) => updateBulkRow(index, 'nombre', e.target.value)}
                />
                <Select value={product.grade} onValueChange={(v) => updateBulkRow(index, 'grade', v)}>
                  <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
                  <SelectContent>
                    {grados.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={product.subject} onValueChange={(v) => updateBulkRow(index, 'subject', v)}>
                  <SelectTrigger><SelectValue placeholder="Materia" /></SelectTrigger>
                  <SelectContent>
                    {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Precio"
                  value={product.price}
                  onChange={(e) => updateBulkRow(index, 'price', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={product.inventory_quantity}
                  onChange={(e) => updateBulkRow(index, 'inventory_quantity', e.target.value)}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={addBulkRow} className="gap-2">
                <Plus className="h-4 w-4" /> Agregar Fila
              </Button>
              <Button onClick={saveBulkProducts} disabled={savingBulk} className="gap-2 ml-auto">
                {savingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Todos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
