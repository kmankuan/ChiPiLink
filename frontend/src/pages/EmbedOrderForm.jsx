import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Building2,
  Loader2,
  CheckCircle2,
  Book,
  User,
  Mail,
  Phone,
  GraduationCap,
  School,
  Globe
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Embeddable Order Form - Works independently without authentication
export default function EmbedOrderForm() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang');
  const themeParam = searchParams.get('theme');

  const [formConfig, setFormConfig] = useState(null);
  const [libros, setLibros] = useState([]);
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    telefono_cliente: '',
    nombre_estudiante: '',
    grado_estudiante: '',
    escuela_estudiante: ''
  });
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('transferencia_bancaria');
  const [notas, setNotas] = useState('');

  // Handle language from URL param
  useEffect(() => {
    if (lang && ['es', 'zh'].includes(lang)) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  // Handle theme from URL param
  useEffect(() => {
    if (themeParam === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeParam === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [themeParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, gradosRes] = await Promise.all([
        axios.get(`${API_URL}/api/public/config-formulario`),
        axios.get(`${API_URL}/api/grados`)
      ]);
      
      setFormConfig(configRes.data);
      setGrados(gradosRes.data.grados);
      
      // Set default payment method from config
      if (configRes.data.metodos_pago?.length > 0) {
        setMetodoPago(configRes.data.metodos_pago[0]);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch books when grade changes
  useEffect(() => {
    if (formData.grado_estudiante) {
      fetchLibros(formData.grado_estudiante);
    }
  }, [formData.grado_estudiante]);

  const fetchLibros = async (grado) => {
    try {
      const response = await axios.get(`${API_URL}/api/public/libros`, {
        params: { grado }
      });
      setLibros(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Error al cargar libros');
    }
  };

  const addToCart = (libro) => {
    const existing = cart.find(item => item.libro_id === libro.libro_id);
    if (existing) {
      if (existing.cantidad < libro.cantidad_inventario) {
        setCart(cart.map(item => 
          item.libro_id === libro.libro_id 
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        ));
      } else {
        toast.error('Stock insuficiente');
      }
    } else {
      setCart([...cart, {
        libro_id: libro.libro_id,
        nombre_libro: libro.nombre,
        cantidad: 1,
        precio_unitario: libro.precio,
        max_stock: libro.cantidad_inventario
      }]);
    }
  };

  const updateQuantity = (libroId, delta) => {
    setCart(cart.map(item => {
      if (item.libro_id === libroId) {
        const newQty = item.cantidad + delta;
        if (newQty <= 0) return null;
        if (newQty > item.max_stock) {
          toast.error('Stock insuficiente');
          return item;
        }
        return { ...item, cantidad: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (libroId) => {
    setCart(cart.filter(item => item.libro_id !== libroId));
  };

  const total = cart.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error('Agregue al menos un libro');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const orderData = {
        nombre_cliente: formData.nombre_cliente,
        email_cliente: formData.email_cliente,
        telefono_cliente: formData.telefono_cliente || null,
        nombre_estudiante: formData.nombre_estudiante,
        grado_estudiante: formData.grado_estudiante,
        escuela_estudiante: formData.escuela_estudiante || null,
        items: cart.map(item => ({
          libro_id: item.libro_id,
          nombre_libro: item.nombre_libro,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        metodo_pago: metodoPago,
        notas: notas || null
      };
      
      const response = await axios.post(`${API_URL}/api/public/pedido`, orderData);
      setOrderSuccess(response.data);
      toast.success(formConfig?.mensaje_exito || '¡Pedido enviado exitosamente!');
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al enviar pedido';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language?.substring(0, 2) === 'zh' ? 'es' : 'zh';
    i18n.changeLanguage(newLang);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success Screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-md mx-auto text-center bg-card rounded-2xl border border-border p-8">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-fit mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="font-serif text-2xl font-bold mb-4">
            {formConfig?.mensaje_exito || '¡Gracias por su pedido!'}
          </h1>
          
          <p className="text-muted-foreground mb-4">
            {t('order.orderNumber')}: <span className="font-mono font-bold">{orderSuccess.pedido_id}</span>
          </p>
          
          <div className="bg-muted rounded-xl p-4 mb-6">
            <p className="text-lg font-bold">
              Total: ${orderSuccess.total?.toFixed(2)}
            </p>
          </div>

          {metodoPago === 'transferencia_bancaria' && (
            <div className="bg-secondary rounded-xl p-6 text-left mb-6">
              <h3 className="font-bold mb-4">{t('payment.bankInfo')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Banco:</span> Banco General</p>
                <p><span className="text-muted-foreground">Tipo:</span> Cuenta Corriente</p>
                <p><span className="text-muted-foreground">Número:</span> XXXX-XXXX-XXXX</p>
                <p><span className="text-muted-foreground">Titular:</span> Librería Escolar S.A.</p>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                {t('payment.instructionsText')}
              </p>
            </div>
          )}
          
          <Button onClick={() => window.location.reload()} className="rounded-full">
            Hacer Otro Pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" data-testid="embed-order-form">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {formConfig?.logo_url ? (
              <img src={formConfig.logo_url} alt="Logo" className="h-10 w-auto" />
            ) : (
              <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                <Book className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="font-serif text-xl md:text-2xl font-bold">
                {formConfig?.titulo || 'Formulario de Pedido'}
              </h1>
              {formConfig?.descripcion && (
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {formConfig.descripcion}
                </p>
              )}
            </div>
          </div>
          
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {i18n.language?.substring(0, 2) === 'zh' ? '中文' : 'ES'}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Información de Contacto
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('auth.name')} *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.nombre_cliente}
                        onChange={(e) => setFormData({...formData, nombre_cliente: e.target.value})}
                        className="pl-10"
                        placeholder="Nombre completo"
                        required
                        data-testid="client-name-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('auth.email')} *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={formData.email_cliente}
                        onChange={(e) => setFormData({...formData, email_cliente: e.target.value})}
                        className="pl-10"
                        placeholder="correo@ejemplo.com"
                        required
                        data-testid="client-email-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('auth.phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.telefono_cliente}
                        onChange={(e) => setFormData({...formData, telefono_cliente: e.target.value})}
                        className="pl-10"
                        placeholder="+507 6000-0000"
                        data-testid="client-phone-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Información del Estudiante
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('student.name')} *</Label>
                    <Input
                      value={formData.nombre_estudiante}
                      onChange={(e) => setFormData({...formData, nombre_estudiante: e.target.value})}
                      placeholder="Nombre del estudiante"
                      required
                      data-testid="student-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('student.grade')} *</Label>
                    <Select 
                      value={formData.grado_estudiante} 
                      onValueChange={(v) => {
                        setFormData({...formData, grado_estudiante: v});
                        setCart([]); // Clear cart when grade changes
                      }}
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
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('student.school')}</Label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.escuela_estudiante}
                        onChange={(e) => setFormData({...formData, escuela_estudiante: e.target.value})}
                        className="pl-10"
                        placeholder="Nombre de la escuela"
                        data-testid="student-school-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Selection */}
              {formData.grado_estudiante && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-bold mb-4 flex items-center gap-2">
                    <Book className="h-5 w-5 text-primary" />
                    {t('order.booksForGrade')} {t(`grades.${formData.grado_estudiante}`)}
                  </h2>
                  
                  {libros.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay libros disponibles para este grado
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {libros.map((libro) => {
                        const inCart = cart.find(item => item.libro_id === libro.libro_id);
                        
                        return (
                          <div 
                            key={libro.libro_id}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                              inCart ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                            data-testid={`book-item-${libro.libro_id}`}
                          >
                            <div className="flex-1">
                              <p className="font-medium">{libro.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {t(`subjects.${libro.materia}`)}
                                {formConfig?.mostrar_precios !== false && (
                                  <> • <span className="font-medium text-primary">${libro.precio.toFixed(2)}</span></>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Disponibles: {libro.cantidad_inventario}
                              </p>
                            </div>
                            
                            {inCart ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(libro.libro_id, -1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {inCart.cantidad}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(libro.libro_id, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
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
                </div>
              )}

              {/* Payment Method */}
              {(formConfig?.metodos_pago?.length > 0) && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-bold mb-4">{t('order.paymentMethod')}</h2>
                  
                  <RadioGroup value={metodoPago} onValueChange={setMetodoPago} className="space-y-3">
                    {formConfig.metodos_pago.includes('transferencia_bancaria') && (
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <RadioGroupItem value="transferencia_bancaria" id="embed-bank" />
                        <Label htmlFor="embed-bank" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t('order.bankTransfer')}</p>
                            <p className="text-sm text-muted-foreground">Banco General</p>
                          </div>
                        </Label>
                      </div>
                    )}
                    
                    {formConfig.metodos_pago.includes('yappy') && (
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <RadioGroupItem value="yappy" id="embed-yappy" />
                        <Label htmlFor="embed-yappy" className="flex items-center gap-3 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t('order.yappy')}</p>
                            <p className="text-sm text-muted-foreground">Pago instantáneo</p>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {/* Notes */}
              <div className="bg-card rounded-xl border border-border p-6">
                <Label className="font-bold mb-4 block">{t('order.notes')}</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Instrucciones especiales, comentarios..."
                  className="min-h-[80px]"
                  data-testid="order-notes"
                />
              </div>
            </div>

            {/* Right - Cart Summary */}
            <div>
              <div className="bg-card rounded-xl border border-border p-6 sticky top-4">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Resumen del Pedido
                </h2>
                
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Seleccione los libros que desea ordenar
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map((item) => (
                        <div key={item.libro_id} className="flex items-start justify-between gap-2 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.nombre_libro}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
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
                      <p className="font-bold text-lg">{t('order.total')}</p>
                      <p className="font-bold text-2xl text-primary" data-testid="cart-total">
                        ${total.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
                
                <Button
                  type="submit"
                  className="w-full h-12 rounded-full text-base font-medium"
                  disabled={submitting || cart.length === 0 || !formData.nombre_cliente || !formData.email_cliente || !formData.nombre_estudiante || !formData.grado_estudiante}
                  data-testid="submit-order-button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t('order.placeOrder')}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Al enviar acepta nuestros términos y condiciones
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
