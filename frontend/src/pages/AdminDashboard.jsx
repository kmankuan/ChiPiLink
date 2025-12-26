import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  LayoutDashboard,
  Package,
  Book,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Printer,
  Loader2,
  Search,
  Save
} from 'lucide-react';

// Empty product row template
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

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { api, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState({ libros: [], alertas_bajo_stock: [] });
  const [pedidos, setPedidos] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  
  // Single product edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({...emptyProductRow});
  
  // Bulk add products dialog
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([{...emptyProductRow}]);
  const [savingBulk, setSavingBulk] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  // Get active tab from URL or default
  const activeTab = location.hash.replace('#', '') || 'overview';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [invRes, pedidosRes, gradosRes, materiasRes] = await Promise.all([
        api.get('/admin/inventario'),
        api.get('/admin/pedidos'),
        api.get('/grados'),
        api.get('/materias')
      ]);
      
      setInventario(invRes.data);
      setPedidos(pedidosRes.data);
      setGrados(gradosRes.data.grados);
      setMaterias(materiasRes.data.materias);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // ========== SINGLE PRODUCT EDIT ==========
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...editForm,
        precio: parseFloat(editForm.precio),
        cantidad_inventario: parseInt(editForm.cantidad_inventario)
      };
      
      await api.put(`/admin/libros/${editingProduct.libro_id}`, data);
      toast.success('Producto actualizado');
      
      setEditDialog(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar producto');
    }
  };

  const handleEditProduct = (libro) => {
    setEditingProduct(libro);
    setEditForm({
      nombre: libro.nombre,
      descripcion: libro.descripcion || '',
      grado: libro.grado,
      materia: libro.materia,
      precio: libro.precio.toString(),
      cantidad_inventario: libro.cantidad_inventario.toString(),
      isbn: libro.isbn || '',
      editorial: libro.editorial || ''
    });
    setEditDialog(true);
  };

  const handleDeleteProduct = async (libroId) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    try {
      await api.delete(`/admin/libros/${libroId}`);
      toast.success('Producto eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  // ========== BULK ADD PRODUCTS ==========
  const addBulkRow = () => {
    setBulkProducts([...bulkProducts, {...emptyProductRow}]);
  };

  const removeBulkRow = (index) => {
    if (bulkProducts.length === 1) return;
    setBulkProducts(bulkProducts.filter((_, i) => i !== index));
  };

  const updateBulkRow = (index, field, value) => {
    const updated = [...bulkProducts];
    updated[index] = { ...updated[index], [field]: value };
    setBulkProducts(updated);
  };

  const handleBulkSubmit = async () => {
    // Validate all rows
    const validProducts = bulkProducts.filter(p => 
      p.nombre && p.grado && p.materia && p.precio && p.cantidad_inventario
    );
    
    if (validProducts.length === 0) {
      toast.error('Complete al menos un producto con los campos requeridos');
      return;
    }
    
    setSavingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of validProducts) {
      try {
        const data = {
          ...product,
          precio: parseFloat(product.precio),
          cantidad_inventario: parseInt(product.cantidad_inventario),
          activo: true
        };
        
        await api.post('/admin/libros', data);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error creating product:', error);
      }
    }
    
    setSavingBulk(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} producto(s) creado(s) exitosamente`);
      setBulkDialog(false);
      setBulkProducts([{...emptyProductRow}]);
      fetchData();
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} producto(s) fallaron al crear`);
    }
  };

  const openBulkDialog = () => {
    setBulkProducts([{...emptyProductRow}]);
    setBulkDialog(true);
  };

  // ========== INVENTORY & ORDERS ==========
  const handleUpdateStock = async (libroId, cantidad) => {
    try {
      await api.put(`/admin/inventario/${libroId}`, null, {
        params: { cantidad }
      });
      toast.success('Stock actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar stock');
    }
  };

  const handleUpdateOrderStatus = async (pedidoId, estado) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}`, null, {
        params: { estado }
      });
      toast.success('Estado actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleConfirmPayment = async (pedidoId) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}/confirmar-pago`);
      toast.success('Pago confirmado');
      fetchData();
    } catch (error) {
      toast.error('Error al confirmar pago');
    }
  };

  const filteredProducts = inventario.libros.filter(libro =>
    libro.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = pedidos.filter(pedido =>
    orderFilter === 'all' || pedido.estado === orderFilter
  );

  const pendingOrders = pedidos.filter(p => p.estado === 'pendiente').length;
  const confirmedOrders = pedidos.filter(p => p.estado === 'confirmado').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          {t('admin.dashboard')}
        </h1>
        <p className="text-muted-foreground">
          Gestione productos, inventario y pedidos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => navigate(`#${v}`)}>
        <TabsList className="mb-8">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Book className="h-4 w-4" />
            {t('admin.products')}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('admin.orders')}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            {t('admin.inventory')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inventario.total_productos}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.totalProducts')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <ShoppingCart className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingOrders')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{confirmedOrders}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.confirmedOrders')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inventario.productos_bajo_stock}</p>
                  <p className="text-sm text-muted-foreground">Bajo Stock</p>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {inventario.alertas_bajo_stock.length > 0 && (
            <div className="bg-destructive/10 rounded-xl p-6 mb-8">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t('admin.lowStockAlerts')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventario.alertas_bajo_stock.map((libro) => (
                  <div 
                    key={libro.libro_id}
                    className="bg-card rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{libro.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {libro.cantidad_inventario}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditProduct(libro)}
                    >
                      Actualizar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Pedidos Recientes</h3>
              <Link to="#orders">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {pedidos.slice(0, 5).map((pedido) => (
                <div 
                  key={pedido.pedido_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div>
                    <p className="font-mono text-sm">{pedido.pedido_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.estudiante_nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${pedido.total?.toFixed(2)}</p>
                    <Badge variant="outline">{t(`status.${pedido.estado}`)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Bulk Add Products Button */}
            <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
              <DialogTrigger asChild>
                <Button onClick={openBulkDialog} className="rounded-full" data-testid="add-product-button">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.addProduct')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    Agregar Productos en Lote
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto mt-4">
                  {/* Table Header */}
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-[1fr_120px_120px_80px_80px_1fr_100px_100px_50px] gap-2 pb-2 border-b border-border sticky top-0 bg-background z-10">
                      <div className="text-xs font-medium text-muted-foreground">Nombre *</div>
                      <div className="text-xs font-medium text-muted-foreground">Grado *</div>
                      <div className="text-xs font-medium text-muted-foreground">Materia *</div>
                      <div className="text-xs font-medium text-muted-foreground">Precio *</div>
                      <div className="text-xs font-medium text-muted-foreground">Stock *</div>
                      <div className="text-xs font-medium text-muted-foreground">Descripción</div>
                      <div className="text-xs font-medium text-muted-foreground">ISBN</div>
                      <div className="text-xs font-medium text-muted-foreground">Editorial</div>
                      <div></div>
                    </div>
                    
                    {/* Product Rows */}
                    <div className="space-y-2 mt-2">
                      {bulkProducts.map((product, index) => (
                        <div 
                          key={index}
                          className="grid grid-cols-[1fr_120px_120px_80px_80px_1fr_100px_100px_50px] gap-2 items-center"
                          data-testid={`bulk-row-${index}`}
                        >
                          <Input
                            value={product.nombre}
                            onChange={(e) => updateBulkRow(index, 'nombre', e.target.value)}
                            placeholder="Nombre del libro"
                            className="h-9 text-sm"
                          />
                          
                          <Select 
                            value={product.grado} 
                            onValueChange={(v) => updateBulkRow(index, 'grado', v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Grado" />
                            </SelectTrigger>
                            <SelectContent>
                              {grados.map((g) => (
                                <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={product.materia} 
                            onValueChange={(v) => updateBulkRow(index, 'materia', v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Materia" />
                            </SelectTrigger>
                            <SelectContent>
                              {materias.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Input
                            type="number"
                            step="0.01"
                            value={product.precio}
                            onChange={(e) => updateBulkRow(index, 'precio', e.target.value)}
                            placeholder="$"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            type="number"
                            value={product.cantidad_inventario}
                            onChange={(e) => updateBulkRow(index, 'cantidad_inventario', e.target.value)}
                            placeholder="Qty"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.descripcion}
                            onChange={(e) => updateBulkRow(index, 'descripcion', e.target.value)}
                            placeholder="Descripción"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.isbn}
                            onChange={(e) => updateBulkRow(index, 'isbn', e.target.value)}
                            placeholder="ISBN"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.editorial}
                            onChange={(e) => updateBulkRow(index, 'editorial', e.target.value)}
                            placeholder="Editorial"
                            className="h-9 text-sm"
                          />
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removeBulkRow(index)}
                            disabled={bulkProducts.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBulkRow}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Fila
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setBulkDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleBulkSubmit}
                      disabled={savingBulk}
                      className="gap-2"
                      data-testid="save-bulk-products"
                    >
                      {savingBulk ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Todos ({bulkProducts.filter(p => p.nombre && p.grado && p.materia && p.precio && p.cantidad_inventario).length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Single Product Dialog */}
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {t('admin.editProduct')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Grado *</Label>
                    <Select 
                      value={editForm.grado} 
                      onValueChange={(v) => setEditForm({...editForm, grado: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {grados.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Materia *</Label>
                    <Select 
                      value={editForm.materia} 
                      onValueChange={(v) => setEditForm({...editForm, materia: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {materias.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Precio ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({...editForm, precio: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Stock *</Label>
                    <Input
                      type="number"
                      value={editForm.cantidad_inventario}
                      onChange={(e) => setEditForm({...editForm, cantidad_inventario: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>ISBN</Label>
                    <Input
                      value={editForm.isbn}
                      onChange={(e) => setEditForm({...editForm, isbn: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Editorial</Label>
                    <Input
                      value={editForm.editorial}
                      onChange={(e) => setEditForm({...editForm, editorial: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Products Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Producto</th>
                    <th className="text-left p-4 text-sm font-medium">Grado</th>
                    <th className="text-left p-4 text-sm font-medium">Materia</th>
                    <th className="text-right p-4 text-sm font-medium">Precio</th>
                    <th className="text-right p-4 text-sm font-medium">Stock</th>
                    <th className="text-right p-4 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((libro) => (
                    <tr key={libro.libro_id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{libro.nombre}</p>
                        <p className="text-sm text-muted-foreground">{libro.editorial}</p>
                      </td>
                      <td className="p-4">{t(`grades.${libro.grado}`)}</td>
                      <td className="p-4">{t(`subjects.${libro.materia}`)}</td>
                      <td className="p-4 text-right">${libro.precio.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <span className={libro.cantidad_inventario < 10 ? 'text-destructive font-bold' : ''}>
                          {libro.cantidad_inventario}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProduct(libro)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProduct(libro.libro_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="flex gap-4 mb-6">
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="preparando">Preparando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((pedido) => (
              <div 
                key={pedido.pedido_id}
                className="bg-card rounded-xl border border-border p-6"
                data-testid={`admin-order-${pedido.pedido_id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={pedido.estado === 'pendiente' ? 'secondary' : 'default'}>
                        {t(`status.${pedido.estado}`)}
                      </Badge>
                      {!pedido.pago_confirmado && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pago Pendiente
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono font-bold">{pedido.pedido_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.estudiante_nombre} • {new Date(pedido.fecha_creacion).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold">${pedido.total?.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {pedido.metodo_pago === 'transferencia_bancaria' ? 'Transferencia' : 'Yappy'}
                    </p>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-4">
                  {pedido.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{item.nombre_libro} x{item.cantidad}</span>
                      <span>${(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {!pedido.pago_confirmado && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmPayment(pedido.pedido_id)}
                      className="rounded-full"
                      data-testid={`confirm-payment-${pedido.pedido_id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('admin.confirmPayment')}
                    </Button>
                  )}
                  
                  <Select 
                    value={pedido.estado}
                    onValueChange={(v) => handleUpdateOrderStatus(pedido.pedido_id, v)}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="preparando">Preparando</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Link to={`/recibo/${pedido.pedido_id}?print=true`}>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Printer className="h-4 w-4 mr-2" />
                      {t('admin.printReceipt')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Producto</th>
                    <th className="text-center p-4 text-sm font-medium">Stock Actual</th>
                    <th className="text-center p-4 text-sm font-medium">Estado</th>
                    <th className="text-right p-4 text-sm font-medium">Actualizar Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.libros.map((libro) => (
                    <tr key={libro.libro_id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{libro.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`grades.${libro.grado}`)} • {t(`subjects.${libro.materia}`)}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-lg font-bold ${
                          libro.cantidad_inventario < 10 ? 'text-destructive' : ''
                        }`}>
                          {libro.cantidad_inventario}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {libro.cantidad_inventario <= 0 ? (
                          <Badge variant="destructive">Agotado</Badge>
                        ) : libro.cantidad_inventario < 10 ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Bajo Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Normal
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            defaultValue={libro.cantidad_inventario}
                            className="w-20 text-center"
                            id={`stock-${libro.libro_id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`stock-${libro.libro_id}`);
                              handleUpdateStock(libro.libro_id, parseInt(input.value));
                            }}
                          >
                            Guardar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
