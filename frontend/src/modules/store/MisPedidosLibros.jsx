import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ShoppingCart,
  Users,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Package,
  Clock,
  Check,
  X,
  ChevronRight,
  GraduationCap,
  FileText,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Componente de estado del pedido
const EstadoBadge = ({ estado }) => {
  const configs = {
    borrador: { label: 'Borrador', className: 'bg-gray-500', icon: FileText },
    pre_orden: { label: 'Pre-Orden', className: 'bg-blue-500', icon: Clock },
    confirmado: { label: 'Confirmado', className: 'bg-green-500', icon: CheckCircle2 },
    en_proceso: { label: 'En Proceso', className: 'bg-yellow-500', icon: Package },
    listo_retiro: { label: 'Listo para Retiro', className: 'bg-purple-500', icon: Package },
    entregado: { label: 'Entregado', className: 'bg-green-700', icon: Check },
    cancelado: { label: 'Cancelado', className: 'bg-red-500', icon: X }
  };
  
  const config = configs[estado] || configs.borrador;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.className} text-white`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Componente de Vista Previa del Pedido
function VistaPreviewPedido({ estudiante, preview, onCrearPedido, loading }) {
  if (!preview) return null;
  
  const progreso = preview.resumen 
    ? (preview.resumen.libros_pedidos / preview.resumen.total_libros) * 100 
    : 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {preview.estudiante?.nombre}
            </CardTitle>
            <CardDescription>
              {preview.estudiante?.grado} - Sección {preview.estudiante?.seccion || '-'}
              <span className="mx-2">•</span>
              Año Escolar: {preview.ano_escolar}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${preview.total_pendiente?.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Pendiente por pedir</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso de libros</span>
            <span>{preview.resumen?.libros_pedidos || 0} de {preview.resumen?.total_libros || 0}</span>
          </div>
          <Progress value={progreso} className="h-2" />
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">{preview.resumen?.total_libros || 0}</div>
            <div className="text-xs text-muted-foreground">Total Requeridos</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{preview.resumen?.libros_pedidos || 0}</div>
            <div className="text-xs text-muted-foreground">Ya Pedidos</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{preview.resumen?.libros_faltantes || 0}</div>
            <div className="text-xs text-muted-foreground">Faltan</div>
          </div>
        </div>
        
        {/* Lista de libros */}
        {preview.libros_requeridos?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Libros del Grado</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {preview.libros_requeridos.map((libro) => (
                  <div 
                    key={libro.libro_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      libro.ya_pedido 
                        ? 'bg-green-50 dark:bg-green-950 border-green-200' 
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className={`h-5 w-5 ${libro.ya_pedido ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-medium">{libro.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {libro.editorial} • {libro.materia}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">${libro.precio?.toFixed(2)}</div>
                      </div>
                      {libro.ya_pedido ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Pedido
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {preview.puede_ordenar ? (
          <Button 
            className="w-full" 
            size="lg" 
            onClick={onCrearPedido}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Crear Pedido de Libros Faltantes
          </Button>
        ) : (
          <div className="w-full text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">
              {preview.mensaje || '¡Ya tienes todos los libros pedidos!'}
            </p>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Componente del Carrito / Editor de Pedido
function EditorPedido({ pedido, onUpdate, onConfirmar, token }) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [notas, setNotas] = useState('');
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  
  const handleQuitarItem = async (itemId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/pedidos/${pedido.pedido_id}/item/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al quitar item');
      toast.success('Item removido');
      onUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAgregarTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/pedidos/${pedido.pedido_id}/agregar-todos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al agregar items');
      toast.success(`${data.agregados} libros agregados al pedido`);
      onUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmar = async () => {
    if (!aceptoTerminos) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/pedidos/${pedido.pedido_id}/confirmar`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ acepto_terminos: true, notas })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al confirmar');
      toast.success(data.mensaje || 'Pedido confirmado');
      setConfirmDialog(false);
      onConfirmar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (!pedido) return null;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedido #{pedido.pedido_id?.slice(-8)}
            </CardTitle>
            <CardDescription>
              {pedido.estudiante_nombre} - {pedido.estudiante_grado}
            </CardDescription>
          </div>
          <EstadoBadge estado={pedido.estado} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        {pedido.items?.length > 0 ? (
          <div className="space-y-2">
            {pedido.items.map((item) => (
              <div 
                key={item.item_id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">{item.libro_nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      Código: {item.libro_codigo}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">${item.subtotal?.toFixed(2)}</div>
                  </div>
                  {pedido.estado === 'borrador' && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleQuitarItem(item.item_id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>El pedido está vacío</p>
          </div>
        )}
        
        {/* Totales */}
        <Separator />
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({pedido.items?.length || 0} libros)</span>
            <span>${pedido.subtotal?.toFixed(2)}</span>
          </div>
          {pedido.descuento > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-${pedido.descuento?.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${pedido.total?.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      
      {pedido.estado === 'borrador' && (
        <CardFooter className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleAgregarTodos}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Todos los Faltantes
          </Button>
          <Button 
            className="flex-1"
            onClick={() => setConfirmDialog(true)}
            disabled={loading || !pedido.items?.length}
          >
            Confirmar Pre-Orden
          </Button>
        </CardFooter>
      )}
      
      {/* Dialog de confirmación */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pre-Orden</DialogTitle>
            <DialogDescription>
              Una vez confirmada, la pre-orden quedará registrada y no podrás modificarla.
              Cuando los libros estén disponibles, te contactaremos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Estudiante:</span>
                <span className="font-medium">{pedido.estudiante_nombre}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Libros:</span>
                <span className="font-medium">{pedido.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${pedido.total?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea 
                placeholder="¿Alguna nota especial para tu pedido?"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            
            <div className="flex items-start gap-2">
              <Checkbox 
                id="terminos" 
                checked={aceptoTerminos}
                onCheckedChange={setAceptoTerminos}
              />
              <label htmlFor="terminos" className="text-sm leading-tight">
                Acepto que esta es una pre-orden y el pago se realizará cuando los libros estén disponibles. 
                Entiendo que puedo cancelar antes de la confirmación final.
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={loading || !aceptoTerminos}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Pre-Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Componente de lista de pedidos
function ListaPedidos({ pedidos, onSelect }) {
  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No tienes pedidos aún</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => (
        <Card 
          key={pedido.pedido_id}
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect(pedido)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{pedido.estudiante_nombre}</div>
                <div className="text-sm text-muted-foreground">
                  {pedido.estudiante_grado} • {pedido.items?.length || 0} libros
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(pedido.fecha_creacion).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold">${pedido.total?.toFixed(2)}</div>
                  <EstadoBadge estado={pedido.estado} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente Principal
export default function MisPedidosLibros() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('nuevo');
  const [misEstudiantes, setMisEstudiantes] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pedidoActual, setPedidoActual] = useState(null);
  const [misPedidos, setMisPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cargar estudiantes vinculados
  useEffect(() => {
    loadMisEstudiantes();
    loadMisPedidos();
  }, [token]);
  
  const loadMisEstudiantes = async () => {
    try {
      const res = await fetch(`${API}/api/store/vinculacion/mis-estudiantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMisEstudiantes(data.estudiantes || []);
      
      // Si solo hay un estudiante, seleccionarlo automáticamente
      if (data.estudiantes?.length === 1) {
        setEstudianteSeleccionado(data.estudiantes[0]);
        loadPreview(data.estudiantes[0].estudiante.sync_id);
      }
    } catch (err) {
      console.error('Error loading estudiantes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMisPedidos = async () => {
    try {
      const res = await fetch(`${API}/api/store/pedidos/mis-pedidos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMisPedidos(data.pedidos || []);
    } catch (err) {
      console.error('Error loading pedidos:', err);
    }
  };
  
  const loadPreview = async (syncId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/pedidos/preview/${syncId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setPreview(data);
      } else {
        toast.error(data.error || 'Error cargando preview');
      }
    } catch (err) {
      toast.error('Error cargando información del estudiante');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectEstudiante = (est) => {
    setEstudianteSeleccionado(est);
    setPreview(null);
    setPedidoActual(null);
    loadPreview(est.estudiante.sync_id);
  };
  
  const handleCrearPedido = async () => {
    if (!estudianteSeleccionado) return;
    
    setLoading(true);
    try {
      // Crear pedido
      const res = await fetch(`${API}/api/store/pedidos/crear`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          estudiante_sync_id: estudianteSeleccionado.estudiante.sync_id,
          tipo: 'pre_orden'
        })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.detail || 'Error creando pedido');
      
      // Agregar todos los libros faltantes
      const res2 = await fetch(`${API}/api/store/pedidos/${data.pedido_id}/agregar-todos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data2 = await res2.json();
      
      // Cargar pedido actualizado
      const res3 = await fetch(`${API}/api/store/pedidos/${data.pedido_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pedido = await res3.json();
      
      setPedidoActual(pedido);
      toast.success(`Pedido creado con ${data2.agregados || 0} libros`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePedidoConfirmado = () => {
    setPedidoActual(null);
    loadPreview(estudianteSeleccionado.estudiante.sync_id);
    loadMisPedidos();
    setActiveTab('pedidos');
    toast.success('¡Pre-orden registrada exitosamente!');
  };
  
  const handleUpdatePedido = async () => {
    if (!pedidoActual) return;
    
    const res = await fetch(`${API}/api/store/pedidos/${pedidoActual.pedido_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pedido = await res.json();
    setPedidoActual(pedido);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          Mis Pedidos de Libros
        </h1>
        <p className="text-muted-foreground mt-1">
          Pre-ordena los libros escolares para tus estudiantes
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="nuevo" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Mis Pedidos ({misPedidos.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="nuevo" className="space-y-6">
          {loading && !preview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : misEstudiantes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No tienes estudiantes vinculados</h3>
                <p className="text-muted-foreground mb-4">
                  Para hacer pedidos de libros, primero debes vincular a tu estudiante.
                </p>
                <Button variant="outline">
                  Vincular Estudiante
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selector de estudiante si hay más de uno */}
              {misEstudiantes.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Selecciona un Estudiante</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {misEstudiantes.map((est) => (
                        <Button
                          key={est.estudiante.sync_id}
                          variant={estudianteSeleccionado?.estudiante.sync_id === est.estudiante.sync_id ? 'default' : 'outline'}
                          className="justify-start h-auto py-3"
                          onClick={() => handleSelectEstudiante(est)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{est.estudiante.nombre_completo}</div>
                            <div className="text-sm opacity-75">
                              {est.estudiante.grado} • #{est.estudiante.numero_estudiante}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Vista previa o editor de pedido */}
              {pedidoActual ? (
                <EditorPedido 
                  pedido={pedidoActual}
                  onUpdate={handleUpdatePedido}
                  onConfirmar={handlePedidoConfirmado}
                  token={token}
                />
              ) : preview && (
                <VistaPreviewPedido 
                  estudiante={estudianteSeleccionado}
                  preview={preview}
                  onCrearPedido={handleCrearPedido}
                  loading={loading}
                />
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="pedidos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pedidos</CardTitle>
              <CardDescription>
                Todos tus pedidos de libros escolares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListaPedidos 
                pedidos={misPedidos}
                onSelect={(pedido) => {
                  setPedidoActual(pedido);
                  setActiveTab('nuevo');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
