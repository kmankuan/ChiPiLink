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
  Box
} from 'lucide-react';

const emptyProductRow = {
  nombre: '',
  grado: '',
  materia: '',
  precio: '',
  cantidad_inventario: '',
  descripcion: '',
  isbn: '',
  editorial: ''
};

export default function StoreModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState({ libros: [], alertas_bajo_stock: [] });
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({...emptyProductRow});
  const [saving, setSaving] = useState(false);
  
  // Bulk add
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([{...emptyProductRow}]);
  const [savingBulk, setSavingBulk] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, gradosRes, materiasRes] = await Promise.all([
        api.get('/admin/inventario'),
        api.get('/grados'),
        api.get('/materias')
      ]);
      setInventario(invRes.data);
      setGrados(gradosRes.data.grados);
      setMaterias(materiasRes.data.materias);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = inventario.libros?.filter(libro =>
    libro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    libro.grado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    libro.materia?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const openEditDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setEditForm(product);
    } else {
      setEditingProduct(null);
      setEditForm({...emptyProductRow});
    }
    setEditDialog(true);
  };

  const handleSaveProduct = async () => {
    try {
      setSaving(true);
      if (editingProduct) {
        await api.put(`/admin/libros/${editingProduct.libro_id}`, editForm);
        toast.success('Producto actualizado');
      } else {
        await api.post('/admin/libros', editForm);
        toast.success('Producto creado');
      }
      setEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (libroId) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/admin/libros/${libroId}`);
      toast.success('Producto eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const updateInventory = async (libroId, cantidad) => {
    try {
      await api.put(`/admin/inventario/${libroId}`, null, { params: { cantidad } });
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
    const validProducts = bulkProducts.filter(p => p.nombre && p.grado && p.precio);
    if (validProducts.length === 0) {
      toast.error('Agrega al menos un producto válido');
      return;
    }
    
    setSavingBulk(true);
    try {
      for (const product of validProducts) {
        await api.post('/admin/libros', {
          ...product,
          precio: parseFloat(product.precio),
          cantidad_inventario: parseInt(product.cantidad_inventario) || 0
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
          <TabsTrigger value="inventory" className="gap-2">
            <Box className="h-4 w-4" />
            Inventario
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
            {filteredProducts.map((libro) => (
              <Card key={libro.libro_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{libro.nombre}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{libro.grado}</Badge>
                        <Badge variant="secondary">{libro.materia}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${libro.precio?.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {libro.cantidad_inventario}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(libro)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(libro.libro_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
                    <div key={item.libro_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-sm text-muted-foreground">{item.grado}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">Stock: {item.cantidad_inventario}</Badge>
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="+"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newQty = parseInt(e.target.value);
                              if (newQty > 0) updateInventory(item.libro_id, newQty);
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
                {inventario.libros?.map((item) => (
                  <div key={item.libro_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">{item.grado} - {item.materia}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={item.cantidad_inventario < 10 ? 'destructive' : 'default'}>
                        Stock: {item.cantidad_inventario}
                      </Badge>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={item.cantidad_inventario}
                        onBlur={(e) => {
                          const newQty = parseInt(e.target.value);
                          if (newQty !== item.cantidad_inventario) {
                            updateInventory(item.libro_id, newQty);
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
        <DialogContent className="max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grado *</Label>
                <Select value={editForm.grado} onValueChange={(v) => setEditForm({...editForm, grado: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {grados.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Materia *</Label>
                <Select value={editForm.materia} onValueChange={(v) => setEditForm({...editForm, materia: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <Button onClick={handleSaveProduct} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
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
                  value={product.nombre}
                  onChange={(e) => updateBulkRow(index, 'nombre', e.target.value)}
                />
                <Select value={product.grado} onValueChange={(v) => updateBulkRow(index, 'grado', v)}>
                  <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
                  <SelectContent>
                    {grados.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={product.materia} onValueChange={(v) => updateBulkRow(index, 'materia', v)}>
                  <SelectTrigger><SelectValue placeholder="Materia" /></SelectTrigger>
                  <SelectContent>
                    {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Precio"
                  value={product.precio}
                  onChange={(e) => updateBulkRow(index, 'precio', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={product.cantidad_inventario}
                  onChange={(e) => updateBulkRow(index, 'cantidad_inventario', e.target.value)}
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
