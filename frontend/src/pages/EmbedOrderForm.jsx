import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Icons
import { 
  User, 
  Phone, 
  Mail, 
  GraduationCap, 
  School, 
  Book, 
  ShoppingCart, 
  Building2, 
  CreditCard,
  Loader2,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  BookOpen,
  Users
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmbedOrderForm() {
  const { t, i18n } = useTranslation();
  
  // Form state - Section Acudiente (Guardian)
  const [acudiente, setAcudiente] = useState({
    nombre_completo: '',
    telefono: '',
    email: ''
  });
  
  // Form state - Section Estudiante (Student)
  const [estudiante, setEstudiante] = useState({
    nombre: '',
    apellido: '',
    grado: '',
    email: '',
    telefono: ''
  });
  
  // Form config and data
  const [formConfig, setFormConfig] = useState(null);
  const [grados, setGrados] = useState([]);
  const [libros, setLibros] = useState([]);
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('transferencia_bancaria');
  const [notas, setNotas] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, gradosRes] = await Promise.all([
          axios.get(`${API_URL}/api/public/config-formulario`),
          axios.get(`${API_URL}/api/grados`)
        ]);
        
        setFormConfig(configRes.data);
        setGrados(gradosRes.data.grados);
        setLoading(false);
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Error cargando formulario');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch books when grade changes
  const fetchLibrosPorGrado = useCallback(async (grado) => {
    if (!grado) {
      setLibros([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/public/libros`, {
        params: { grado }
      });
      setLibros(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Error cargando libros');
    }
  }, []);
  
  // Handle grade change
  const handleGradoChange = (grado) => {
    setEstudiante(prev => ({ ...prev, grado }));
    setCart([]); // Clear cart when grade changes
    fetchLibrosPorGrado(grado);
  };
  
  // Cart functions
  const addToCart = (libro) => {
    const existing = cart.find(item => item.libro_id === libro.libro_id);
    if (existing) {
      updateQuantity(libro.libro_id, 1);
    } else {
      setCart([...cart, {
        libro_id: libro.libro_id,
        nombre_libro: libro.nombre,
        cantidad: 1,
        precio_unitario: libro.precio
      }]);
    }
  };
  
  const updateQuantity = (libroId, delta) => {
    setCart(cart.map(item => {
      if (item.libro_id === libroId) {
        const libro = libros.find(l => l.libro_id === libroId);
        const maxQty = libro?.cantidad_inventario || 99;
        const newQty = Math.max(1, Math.min(maxQty, item.cantidad + delta));
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };
  
  const removeFromCart = (libroId) => {
    setCart(cart.filter(item => item.libro_id !== libroId));
  };
  
  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  
  // Form validation
  const isFormValid = () => {
    return (
      acudiente.nombre_completo.trim() !== '' &&
      acudiente.telefono.trim() !== '' &&
      acudiente.email.trim() !== '' &&
      estudiante.nombre.trim() !== '' &&
      estudiante.apellido.trim() !== '' &&
      estudiante.grado !== '' &&
      cart.length > 0
    );
  };
  
  // Submit order
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const orderData = {
        // Acudiente
        nombre_acudiente: acudiente.nombre_completo,
        telefono_acudiente: acudiente.telefono,
        email_acudiente: acudiente.email,
        // Estudiante
        nombre_estudiante: estudiante.nombre,
        apellido_estudiante: estudiante.apellido,
        grado_estudiante: estudiante.grado,
        email_estudiante: estudiante.email || null,
        telefono_estudiante: estudiante.telefono || null,
        // Order
        items: cart,
        metodo_pago: metodoPago,
        notas: notas || null
      };
      
      const response = await axios.post(`${API_URL}/api/public/pedido`, orderData);
      
      setOrderResult(response.data);
      setSubmitted(true);
      toast.success('¡Pedido enviado exitosamente!');
    } catch (error) {
      console.error('Error submitting order:', error);
      const errorMsg = error.response?.data?.detail || 'Error al enviar el pedido';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }
  
  // Success state
  if (submitted && orderResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
              ¡Pedido Recibido!
            </h1>
            <p className="text-muted-foreground mb-6">
              {formConfig?.mensaje_exito || 'Gracias por su pedido. Nos comunicaremos con usted pronto.'}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm mb-2">
                <span className="font-medium">Número de Pedido:</span>{' '}
                <span className="font-mono">{orderResult.pedido_id}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium">Total:</span>{' '}
                <span className="text-green-600 font-bold">${orderResult.total.toFixed(2)}</span>
              </p>
            </div>
            
            <Button 
              onClick={() => {
                setSubmitted(false);
                setOrderResult(null);
                setCart([]);
                setAcudiente({ nombre_completo: '', telefono: '', email: '' });
                setEstudiante({ nombre: '', apellido: '', grado: '', email: '', telefono: '' });
                setNotas('');
                setLibros([]);
              }}
              className="w-full"
            >
              Realizar Otro Pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formConfig?.titulo || 'Formulario de Pedido de Libros'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {formConfig?.descripcion || 'Complete el formulario para ordenar los libros de texto'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Acudiente (Guardian) */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Datos del Acudiente
                  </CardTitle>
                  <CardDescription>
                    Información del padre, madre o tutor responsable
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="acudiente-nombre" className="flex items-center gap-1">
                      Nombre Completo <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="acudiente-nombre"
                        value={acudiente.nombre_completo}
                        onChange={(e) => setAcudiente({ ...acudiente, nombre_completo: e.target.value })}
                        className="pl-10"
                        placeholder="Nombre y apellido del acudiente"
                        required
                        data-testid="guardian-name-input"
                      />
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acudiente-telefono" className="flex items-center gap-1">
                        Número de Celular <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="acudiente-telefono"
                          type="tel"
                          value={acudiente.telefono}
                          onChange={(e) => setAcudiente({ ...acudiente, telefono: e.target.value })}
                          className="pl-10"
                          placeholder="+507 6XXX-XXXX"
                          required
                          data-testid="guardian-phone-input"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="acudiente-email" className="flex items-center gap-1">
                        Dirección de Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="acudiente-email"
                          type="email"
                          value={acudiente.email}
                          onChange={(e) => setAcudiente({ ...acudiente, email: e.target.value })}
                          className="pl-10"
                          placeholder="correo@ejemplo.com"
                          required
                          data-testid="guardian-email-input"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Section 2: Estudiante (Student) */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Datos del Estudiante
                  </CardTitle>
                  <CardDescription>
                    Información del estudiante que usará los libros
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estudiante-nombre" className="flex items-center gap-1">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="estudiante-nombre"
                        value={estudiante.nombre}
                        onChange={(e) => setEstudiante({ ...estudiante, nombre: e.target.value })}
                        placeholder="Nombre del estudiante"
                        required
                        data-testid="student-first-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="estudiante-apellido" className="flex items-center gap-1">
                        Apellido <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="estudiante-apellido"
                        value={estudiante.apellido}
                        onChange={(e) => setEstudiante({ ...estudiante, apellido: e.target.value })}
                        placeholder="Apellido del estudiante"
                        required
                        data-testid="student-last-name-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Grado a Estudiar <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={estudiante.grado}
                      onValueChange={handleGradoChange}
                      required
                    >
                      <SelectTrigger data-testid="student-grade-select">
                        <SelectValue placeholder="Seleccionar grado" />
                      </SelectTrigger>
                      <SelectContent>
                        {grados.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estudiante-email">
                        Email del Estudiante <span className="text-muted-foreground text-xs">(Opcional)</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="estudiante-email"
                          type="email"
                          value={estudiante.email}
                          onChange={(e) => setEstudiante({ ...estudiante, email: e.target.value })}
                          className="pl-10"
                          placeholder="correo@ejemplo.com"
                          data-testid="student-email-input"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="estudiante-telefono">
                        Celular del Estudiante <span className="text-muted-foreground text-xs">(Opcional)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="estudiante-telefono"
                          type="tel"
                          value={estudiante.telefono}
                          onChange={(e) => setEstudiante({ ...estudiante, telefono: e.target.value })}
                          className="pl-10"
                          placeholder="+507 6XXX-XXXX"
                          data-testid="student-phone-input"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Section 3: Book Selection */}
              {estudiante.grado && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Book className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Selección de Libros
                    </CardTitle>
                    <CardDescription>
                      Libros disponibles para {grados.find(g => g.id === estudiante.grado)?.nombre || estudiante.grado}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {libros.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Book className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay libros disponibles para este grado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {libros.map((libro) => {
                          const inCart = cart.find(item => item.libro_id === libro.libro_id);
                          
                          return (
                            <div 
                              key={libro.libro_id}
                              className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                inCart 
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                  : 'border-border hover:border-green-300 hover:bg-muted/50'
                              }`}
                              data-testid={`book-item-${libro.libro_id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{libro.nombre}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                    {libro.materia}
                                  </span>
                                  {formConfig?.mostrar_precios !== false && (
                                    <span className="text-sm font-semibold text-green-600">
                                      ${libro.precio.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {libro.cantidad_inventario} disponibles
                                </p>
                              </div>
                              
                              {inCart ? (
                                <div className="flex items-center gap-2 ml-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      if (inCart.cantidad === 1) {
                                        removeFromCart(libro.libro_id);
                                      } else {
                                        updateQuantity(libro.libro_id, -1);
                                      }
                                    }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-bold">
                                    {inCart.cantidad}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(libro.libro_id, 1)}
                                    disabled={inCart.cantidad >= libro.cantidad_inventario}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-4 shrink-0"
                                  onClick={() => addToCart(libro)}
                                  data-testid={`add-book-${libro.libro_id}`}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Agregar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Payment & Notes Section */}
              {cart.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Método de Pago y Notas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={metodoPago} onValueChange={setMetodoPago} className="space-y-3">
                      {(formConfig?.metodos_pago || ['transferencia_bancaria', 'yappy']).includes('transferencia_bancaria') && (
                        <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="transferencia_bancaria" id="embed-bank" />
                          <Label htmlFor="embed-bank" className="flex items-center gap-3 cursor-pointer flex-1">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Transferencia Bancaria</p>
                              <p className="text-sm text-muted-foreground">Banco General / Banistmo</p>
                            </div>
                          </Label>
                        </div>
                      )}
                      
                      {(formConfig?.metodos_pago || ['transferencia_bancaria', 'yappy']).includes('yappy') && (
                        <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="yappy" id="embed-yappy" />
                          <Label htmlFor="embed-yappy" className="flex items-center gap-3 cursor-pointer flex-1">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Yappy</p>
                              <p className="text-sm text-muted-foreground">Pago instantáneo móvil</p>
                            </div>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                    
                    <div className="space-y-2">
                      <Label htmlFor="order-notes">Notas adicionales</Label>
                      <Textarea
                        id="order-notes"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Instrucciones especiales, comentarios o consultas..."
                        className="min-h-[80px]"
                        data-testid="order-notes"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Right Column - Cart Summary (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="h-5 w-5" />
                      Resumen del Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Seleccione el grado del estudiante para ver los libros disponibles</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.libro_id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.nombre_libro}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.cantidad} × ${item.precio_unitario.toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <p className="font-medium text-sm">
                                  ${(item.cantidad * item.precio_unitario).toFixed(2)}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => removeFromCart(item.libro_id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <div className="flex items-center justify-between mb-6">
                          <p className="font-bold text-lg">Total</p>
                          <p className="font-bold text-2xl text-green-600" data-testid="cart-total">
                            ${total.toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                    
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                      disabled={submitting || !isFormValid()}
                      data-testid="submit-order-button"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Enviando Pedido...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Enviar Pedido
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Al enviar, acepta nuestros términos y condiciones
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
