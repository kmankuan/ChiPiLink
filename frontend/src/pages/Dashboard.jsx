import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  Package,
  GraduationCap,
  Loader2,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  CreditCard,
  Building2,
  History,
  Eye,
  RefreshCw,
  Search
} from 'lucide-react';

// Status badge component - Updated for auto-verification system
const StatusBadge = ({ status, similitud }) => {
  const config = {
    encontrado: { 
      label: 'Encontrado', 
      icon: CheckCircle, 
      className: 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/30' 
    },
    no_encontrado: { 
      label: 'No Encontrado', 
      icon: XCircle, 
      className: 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/30' 
    },
    // Legacy support
    pendiente: { 
      label: 'Pendiente', 
      icon: AlertCircle, 
      className: 'border-amber-500 text-amber-600 bg-amber-50' 
    },
    confirmada: { 
      label: 'Encontrado', 
      icon: CheckCircle, 
      className: 'border-green-500 text-green-600 bg-green-50' 
    },
    rechazada: { 
      label: 'No Encontrado', 
      icon: XCircle, 
      className: 'border-red-500 text-red-600 bg-red-50' 
    }
  };
  
  const { label, icon: Icon, className } = config[status] || config.no_encontrado;
  
  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
      {similitud && status === 'encontrado' && (
        <span className="ml-1 text-xs opacity-75">({similitud}%)</span>
      )}
    </Badge>
  );
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, api } = useAuth();
  
  const [estudiantes, setEstudiantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Student dialog
  const [studentDialog, setStudentDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    grado: '',
    escuela: '',
    es_nuevo: true,
    notas: ''
  });
  const [savingStudent, setSavingStudent] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState(null);
  
  // Purchase dialog
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('transferencia_bancaria');
  const [orderNotes, setOrderNotes] = useState('');
  
  // View history dialog
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [estudiantesRes, pedidosRes, gradosRes] = await Promise.all([
        api.get('/estudiantes'),
        api.get('/pedidos'),
        api.get('/grados')
      ]);
      
      setEstudiantes(estudiantesRes.data);
      setPedidos(pedidosRes.data);
      setGrados(gradosRes.data.grados);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Re-verify student enrollment
  const handleVerifyStudent = async (studentId) => {
    setVerifyingStudent(studentId);
    try {
      const response = await api.post(`/estudiantes/${studentId}/verificar-matricula`);
      if (response.data.estado === 'encontrado') {
        toast.success(`¡Estudiante encontrado! Similitud: ${response.data.similitud}%`);
      } else {
        toast.error('Estudiante no encontrado en la lista de matrículas');
      }
      fetchData();
    } catch (error) {
      toast.error('Error al verificar matrícula');
    } finally {
      setVerifyingStudent(null);
    }
  };

  // Open add student dialog
  const openAddDialog = () => {
    setEditingStudent(null);
    setFormData({
      nombre: '',
      apellido: '',
      grado: '',
      escuela: '',
      es_nuevo: true,
      notas: ''
    });
    setStudentDialog(true);
  };

  // Open edit student dialog
  const openEditDialog = (student) => {
    setEditingStudent(student);
    setFormData({
      nombre: student.nombre || '',
      apellido: student.apellido || '',
      grado: student.grado || '',
      escuela: student.escuela || '',
      es_nuevo: student.es_nuevo ?? true,
      notas: student.notas || ''
    });
    setStudentDialog(true);
  };

  // Submit student form
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setSavingStudent(true);
    
    try {
      const data = { ...formData };
      
      if (editingStudent) {
        await api.put(`/estudiantes/${editingStudent.estudiante_id}`, data);
        toast.success('Estudiante actualizado');
      } else {
        const response = await api.post('/estudiantes', data);
        if (response.data.estado_matricula === 'encontrado') {
          toast.success(`¡Estudiante encontrado en matrículas! (${response.data.similitud_matricula}% similitud)`);
        } else {
          toast.warning('Estudiante agregado, pero NO se encontró en la lista de matrículas');
        }
      }
      
      setStudentDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar estudiante');
    } finally {
      setSavingStudent(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId) => {
    if (!confirm('¿Está seguro de eliminar este estudiante?')) return;
    
    try {
      await api.delete(`/estudiantes/${studentId}`);
      toast.success('Estudiante eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar estudiante');
    }
  };

  // Open purchase dialog
  const openPurchaseDialog = async (student) => {
    if (student.estado_matricula !== 'confirmada') {
      toast.error('La matrícula debe estar confirmada para comprar libros');
      return;
    }
    
    setSelectedStudent(student);
    setSelectedBooks([]);
    setPaymentMethod('transferencia_bancaria');
    setOrderNotes('');
    setLoadingBooks(true);
    setPurchaseDialog(true);
    
    try {
      const response = await api.get(`/estudiantes/${student.estudiante_id}/libros-disponibles`);
      setAvailableBooks(response.data.libros);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Error al cargar libros disponibles');
    } finally {
      setLoadingBooks(false);
    }
  };

  // Toggle book selection
  const toggleBookSelection = (book) => {
    if (book.ya_comprado || !book.disponible) return;
    
    setSelectedBooks(prev => {
      const exists = prev.find(b => b.libro_id === book.libro_id);
      if (exists) {
        return prev.filter(b => b.libro_id !== book.libro_id);
      }
      return [...prev, book];
    });
  };

  // Calculate total
  const calculateTotal = () => {
    return selectedBooks.reduce((sum, book) => sum + book.precio, 0);
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (selectedBooks.length === 0) {
      toast.error('Seleccione al menos un libro');
      return;
    }
    
    setSubmittingOrder(true);
    
    try {
      const orderData = {
        estudiante_id: selectedStudent.estudiante_id,
        items: selectedBooks.map(book => ({
          libro_id: book.libro_id,
          nombre_libro: book.nombre,
          cantidad: 1,
          precio_unitario: book.precio
        })),
        metodo_pago: paymentMethod,
        notas: orderNotes || null
      };
      
      await api.post('/pedidos', orderData);
      toast.success('¡Pedido realizado exitosamente!');
      setPurchaseDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.detail || 'Error al realizar el pedido');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // View purchase history for student
  const viewHistory = (student) => {
    setHistoryStudent(student);
    setHistoryDialog(true);
  };

  // Get orders for a specific student
  const getStudentOrders = (studentId) => {
    return pedidos.filter(p => p.estudiante_id === studentId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 md:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Bienvenido, {user?.nombre || 'Usuario'}
          </h1>
          <p className="text-muted-foreground">
            Gestione los estudiantes y realice pedidos de libros
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{estudiantes.length}</p>
                  <p className="text-sm text-muted-foreground">Estudiantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {estudiantes.filter(e => e.estado_matricula === 'encontrado' || e.estado_matricula === 'confirmada').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Encontrados en Matrículas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pedidos.length}</p>
                  <p className="text-sm text-muted-foreground">Pedidos Realizados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="estudiantes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="estudiantes" className="gap-2">
              <Users className="h-4 w-4" />
              Mis Estudiantes
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2">
              <Package className="h-4 w-4" />
              Mis Pedidos
            </TabsTrigger>
          </TabsList>

          {/* Estudiantes Tab */}
          <TabsContent value="estudiantes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estudiantes Registrados</CardTitle>
                  <CardDescription>
                    Agregue estudiantes y el sistema verificará automáticamente si están en la lista de matrículas
                  </CardDescription>
                </div>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Estudiante
                </Button>
              </CardHeader>
              <CardContent>
                {estudiantes.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">No hay estudiantes registrados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Agregue un estudiante para comenzar a ordenar libros
                    </p>
                    <Button onClick={openAddDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Estudiante
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {estudiantes.map((student) => (
                      <div
                        key={student.estudiante_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${
                            student.estado_matricula === 'encontrado' || student.estado_matricula === 'confirmada'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            <GraduationCap className={`h-6 w-6 ${
                              student.estado_matricula === 'encontrado' || student.estado_matricula === 'confirmada'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                {student.nombre} {student.apellido}
                              </h3>
                              <StatusBadge status={student.estado_matricula} similitud={student.similitud_matricula} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {grados.find(g => g.id === student.grado)?.nombre || student.grado}
                              {student.escuela && ` • ${student.escuela}`}
                            </p>
                            {student.nombre_matricula && student.estado_matricula === 'encontrado' && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Coincide con: {student.nombre_matricula}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {student.es_nuevo ? '🆕 Estudiante Nuevo' : '📚 Estudiante del Año Anterior'}
                              {student.libros_comprados?.length > 0 && (
                                <span className="ml-2">• {student.libros_comprados.length} libros comprados</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          {(student.estado_matricula === 'encontrado' || student.estado_matricula === 'confirmada') ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewHistory(student)}
                              >
                                <History className="h-4 w-4 mr-1" />
                                Historial
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openPurchaseDialog(student)}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Comprar Libros
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyStudent(student.estudiante_id)}
                              disabled={verifyingStudent === student.estudiante_id}
                              className="border-amber-500 text-amber-600 hover:bg-amber-50"
                            >
                              {verifyingStudent === student.estudiante_id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Re-verificar
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(student)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStudent(student.estudiante_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pedidos Tab */}
          <TabsContent value="pedidos">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Pedidos</CardTitle>
                <CardDescription>
                  Todos los pedidos de libros realizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pedidos.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">No hay pedidos</h3>
                    <p className="text-sm text-muted-foreground">
                      Los pedidos aparecerán aquí después de realizar una compra
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pedidos.map((pedido) => (
                      <div
                        key={pedido.pedido_id}
                        className="p-4 rounded-xl border border-border"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div>
                            <p className="font-mono text-sm text-muted-foreground">
                              {pedido.pedido_id}
                            </p>
                            <p className="font-medium">{pedido.estudiante_nombre}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={pedido.estado === 'entregado' ? 'default' : 'outline'}>
                              {pedido.estado}
                            </Badge>
                            <p className="font-bold text-lg text-primary">
                              ${pedido.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {pedido.items.length} libro(s) • {pedido.metodo_pago === 'transferencia_bancaria' ? 'Transferencia' : 'Yappy'}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {pedido.items.map((item, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {item.nombre_libro}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Student Dialog */}
      <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? 'Editar Estudiante' : 'Agregar Nuevo Estudiante'}
            </DialogTitle>
            <DialogDescription>
              {editingStudent 
                ? 'Actualice la información del estudiante'
                : 'Complete los datos del estudiante y suba el documento de matrícula'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Grado a Estudiar *</Label>
              <Select
                value={formData.grado}
                onValueChange={(v) => setFormData(prev => ({ ...prev, grado: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grado" />
                </SelectTrigger>
                <SelectContent>
                  {grados.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="escuela">Escuela</Label>
              <Input
                id="escuela"
                value={formData.escuela}
                onChange={(e) => setFormData(prev => ({ ...prev, escuela: e.target.value }))}
                placeholder="Nombre de la escuela"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Estudiante</Label>
              <RadioGroup
                value={formData.es_nuevo ? 'nuevo' : 'anterior'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, es_nuevo: v === 'nuevo' }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nuevo" id="nuevo" />
                  <Label htmlFor="nuevo" className="cursor-pointer">Estudiante Nuevo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anterior" id="anterior" />
                  <Label htmlFor="anterior" className="cursor-pointer">Del Año Anterior</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Info box about auto-verification */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Search className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Verificación Automática</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Al guardar, el sistema buscará automáticamente si el estudiante está en la lista oficial de matrículas.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Información adicional..."
                rows={2}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStudentDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingStudent || !formData.nombre || !formData.apellido || !formData.grado}
                className="flex-1"
              >
                {savingStudent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editingStudent ? 'Actualizar' : 'Agregar Estudiante'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Books Dialog */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Comprar Libros para {selectedStudent?.nombre} {selectedStudent?.apellido}
            </DialogTitle>
            <DialogDescription>
              {grados.find(g => g.id === selectedStudent?.grado)?.nombre} • Seleccione los libros que desea comprar
            </DialogDescription>
          </DialogHeader>
          
          {loadingBooks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Book List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {availableBooks.map((book) => (
                  <div
                    key={book.libro_id}
                    onClick={() => toggleBookSelection(book)}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                      book.ya_comprado
                        ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed'
                        : selectedBooks.find(b => b.libro_id === book.libro_id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={book.ya_comprado || selectedBooks.some(b => b.libro_id === book.libro_id)}
                      disabled={book.ya_comprado || !book.disponible}
                      className={book.ya_comprado ? 'opacity-50' : ''}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{book.nombre}</p>
                        {book.ya_comprado && (
                          <Badge variant="secondary" className="text-xs">Ya Comprado</Badge>
                        )}
                        {!book.disponible && !book.ya_comprado && (
                          <Badge variant="destructive" className="text-xs">Sin Stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{book.materia}</p>
                    </div>
                    <p className={`font-bold ${book.ya_comprado ? 'text-muted-foreground' : 'text-primary'}`}>
                      ${book.precio.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              {selectedBooks.length > 0 && (
                <>
                  <Separator />
                  
                  {/* Payment Method */}
                  <div className="space-y-3">
                    <Label>Método de Pago</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="transferencia_bancaria" id="bank" />
                        <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Transferencia Bancaria
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="yappy" id="yappy" />
                        <Label htmlFor="yappy" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Yappy
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Instrucciones especiales..."
                      rows={2}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Libros seleccionados:</span>
                      <span className="font-medium">{selectedBooks.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-primary text-2xl">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPurchaseDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitOrder}
                  disabled={submittingOrder || selectedBooks.length === 0}
                  className="flex-1"
                >
                  {submittingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Confirmar Pedido
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Historial de {historyStudent?.nombre} {historyStudent?.apellido}
            </DialogTitle>
            <DialogDescription>
              Libros comprados y pedidos realizados
            </DialogDescription>
          </DialogHeader>
          
          {historyStudent && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Libros Comprados ({historyStudent.libros_comprados?.length || 0})
                </h4>
                {historyStudent.libros_comprados?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {historyStudent.libros_comprados.map((libroId, idx) => (
                      <Badge key={idx} variant="secondary">{libroId}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aún no ha comprado libros</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pedidos
                </h4>
                {getStudentOrders(historyStudent.estudiante_id).length > 0 ? (
                  <div className="space-y-2">
                    {getStudentOrders(historyStudent.estudiante_id).map((pedido) => (
                      <div key={pedido.pedido_id} className="p-3 rounded-lg border border-border text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs">{pedido.pedido_id}</span>
                          <Badge variant="outline" className="text-xs">{pedido.estado}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>{pedido.items.length} libro(s)</span>
                          <span className="font-bold">${pedido.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay pedidos</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
