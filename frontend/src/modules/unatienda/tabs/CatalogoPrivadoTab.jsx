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
  BookOpen, Plus, Search, Loader2, RefreshCw, Settings, Trash2, CheckCircle2, AlertCircle, Upload
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function CatalogoPrivadoTab({ token, onRefresh }) {
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({ grados: [], materias: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('');
  const [selectedMateria, setSelectedMateria] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    isbn: '',
    editorial: '',
    grado: '',
    materia: '',
    precio: '',
    precio_oferta: '',
    descripcion: '',
    imagen_url: '',
    activo: true,
    destacado: false
  });

  const fetchProductos = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/store/catalogo-privado/admin/productos?limit=200`;
      if (selectedGrado) url += `&grado=${encodeURIComponent(selectedGrado)}`;
      if (selectedMateria) url += `&materia=${encodeURIComponent(selectedMateria)}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setProductos(data.productos || []);
      
      const allProductos = data.productos || [];
      const grados = [...new Set(allProductos.map(p => p.grado).filter(Boolean))].sort();
      const materias = [...new Set(allProductos.map(p => p.materia).filter(Boolean))].sort();
      setFiltros({ grados, materias });
      
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [token, selectedGrado, selectedMateria]);

  const filteredProductos = productos.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.editorial?.toLowerCase().includes(term) ||
      p.materia?.toLowerCase().includes(term)
    );
  });

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nombre: product.nombre || '',
        codigo: product.codigo || '',
        isbn: product.isbn || '',
        editorial: product.editorial || '',
        grado: product.grado || '',
        materia: product.materia || '',
        precio: product.precio?.toString() || '',
        precio_oferta: product.precio_oferta?.toString() || '',
        descripcion: product.descripcion || '',
        imagen_url: product.imagen_url || '',
        activo: product.activo !== false,
        destacado: product.destacado || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nombre: '', codigo: '', isbn: '', editorial: '', grado: '', materia: '',
        precio: '', precio_oferta: '', descripcion: '', imagen_url: '',
        activo: true, destacado: false
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.grado || !formData.precio) {
      toast.error('Nombre, grado y precio son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        precio: parseFloat(formData.precio),
        precio_oferta: formData.precio_oferta ? parseFloat(formData.precio_oferta) : null
      };

      let url = `${API}/api/store/catalogo-privado/admin/productos`;
      let method = 'POST';
      
      if (editingProduct) {
        url = `${API}/api/store/catalogo-privado/admin/productos/${editingProduct.libro_id}`;
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
        toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
        setShowForm(false);
        fetchProductos();
        onRefresh?.();
      } else {
        toast.error(data.detail || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (libro_id) => {
    if (!confirm('¿Estás seguro de desactivar este producto?')) return;
    
    try {
      const response = await fetch(`${API}/api/store/catalogo-privado/admin/productos/${libro_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Producto desactivado');
        fetchProductos();
        onRefresh?.();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const GRADOS_OPCIONES = [
    'Pre-Kinder', 'Kinder', '1ro', '2do', '3ro', '4to', '5to', '6to',
    '7mo', '8vo', '9no', '10mo', '11vo', '12vo'
  ];

  const MATERIAS_OPCIONES = [
    'Matemáticas', 'Español', 'Inglés', 'Ciencias Naturales', 'Ciencias Sociales',
    'Religión', 'Arte', 'Música', 'Educación Física', 'Tecnología', 'Otros'
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
                <CardTitle>Catálogo Privado - PCA</CardTitle>
                <CardDescription>
                  Libros de texto para estudiantes de Panama Christian Academy vinculados
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchProductos} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={() => handleOpenForm()} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Libro
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
                  placeholder="Buscar por nombre, código, editorial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={selectedGrado}
              onChange={(e) => setSelectedGrado(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Todos los grados</option>
              {filtros.grados.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Todas las materias</option>
              {filtros.materias.map(m => (
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
            <div className="text-2xl font-bold">{productos.length}</div>
            <p className="text-xs text-muted-foreground">Total libros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{productos.filter(p => p.activo !== false).length}</div>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filtros.grados.length}</div>
            <p className="text-xs text-muted-foreground">Grados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filtros.materias.length}</div>
            <p className="text-xs text-muted-foreground">Materias</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-700 dark:text-purple-300">
              <p className="font-medium">Catálogo Privado PCA</p>
              <p>Solo los clientes con estudiantes vinculados de PCA pueden ver y comprar estos libros desde la tienda Unatienda.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {filteredProductos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay libros en el catálogo privado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Usa la pestaña "Demo" para generar datos de prueba o agrega libros manualmente
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
                    <TableHead>Libro</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Editorial</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((p) => (
                    <TableRow key={p.libro_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{p.nombre}</p>
                            {p.isbn && <p className="text-xs text-muted-foreground">ISBN: {p.isbn}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.grado}</Badge>
                      </TableCell>
                      <TableCell>{p.materia}</TableCell>
                      <TableCell>{p.editorial}</TableCell>
                      <TableCell className="text-right">
                        {p.precio_oferta ? (
                          <div>
                            <span className="text-green-600 font-medium">${p.precio_oferta.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">${p.precio?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">${p.precio?.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.activo !== false ? "default" : "secondary"}>
                          {p.activo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenForm(p)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(p.libro_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              {editingProduct ? 'Editar Libro' : 'Nuevo Libro'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del libro' : 'Agrega un nuevo libro al catálogo privado PCA'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Matemáticas 5to Grado - Pearson"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: MAT-5-2026"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">ISBN</label>
                <Input
                  value={formData.isbn}
                  onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  placeholder="Ej: 978-607-32-4583-2"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Grado *</label>
                <select
                  value={formData.grado}
                  onChange={(e) => setFormData({...formData, grado: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar grado</option>
                  {GRADOS_OPCIONES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Materia</label>
                <select
                  value={formData.materia}
                  onChange={(e) => setFormData({...formData, materia: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar materia</option>
                  {MATERIAS_OPCIONES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Editorial</label>
                <Input
                  value={formData.editorial}
                  onChange={(e) => setFormData({...formData, editorial: e.target.value})}
                  placeholder="Ej: Pearson, SM, Norma..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Precio *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Precio Oferta</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio_oferta}
                  onChange={(e) => setFormData({...formData, precio_oferta: e.target.value})}
                  placeholder="Dejar vacío si no hay oferta"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">URL de Imagen</label>
                <Input
                  value={formData.imagen_url}
                  onChange={(e) => setFormData({...formData, imagen_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción breve del libro"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.destacado}
                    onChange={(e) => setFormData({...formData, destacado: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Destacado</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Guardar Cambios' : 'Crear Libro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
