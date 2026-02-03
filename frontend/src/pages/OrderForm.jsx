import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
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
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Building2,
  Loader2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

export default function OrderForm() {
  const { t } = useTranslation();
  const { api, user } = useAuth();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedStudent = searchParams.get('estudiante');

  const [estudiantes, setEstudiantes] = useState([]);
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [selectedEstudiante, setSelectedEstudiante] = useState(preselectedStudent || '');
  const [selectedGrado, setSelectedGrado] = useState('');
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('transferencia_bancaria');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEstudiante && estudiantes.length > 0) {
      const estudiante = estudiantes.find(e => e.estudiante_id === selectedEstudiante);
      if (estudiante) {
        setSelectedGrado(estudiante.grade);
      }
    }
  }, [selectedEstudiante, estudiantes]);

  const fetchData = async () => {
    try {
      const [estudiantesRes, librosRes] = await Promise.all([
        api.get('/estudiantes'),
        api.get('/libros')
      ]);
      
      setEstudiantes(estudiantesRes.data);
      setLibros(librosRes.data);
      
      // If preselected student, set it
      if (preselectedStudent) {
        const estudiante = estudiantesRes.data.find(e => e.estudiante_id === preselectedStudent);
        if (estudiante) {
          setSelectedEstudiante(estudiante.estudiante_id);
          setSelectedGrado(estudiante.grade);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredLibros = libros.filter(libro => 
    selectedGrado ? libro.grade === selectedGrado : true
  );

  const addToCart = (libro) => {
    const existing = cart.find(item => item.libro_id === libro.libro_id);
    if (existing) {
      if (existing.cantidad < libro.inventory_quantity) {
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
        max_stock: libro.inventory_quantity
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
    
    if (!selectedEstudiante) {
      toast.error('Seleccione un estudiante');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('Agregue al menos un libro');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const orderData = {
        estudiante_id: selectedEstudiante,
        items: cart.map(item => ({
          libro_id: item.libro_id,
          nombre_libro: item.nombre_libro,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        metodo_pago: metodoPago,
        notas: notas || null
      };
      
      const response = await api.post('/pedidos', orderData);
      setOrderSuccess(response.data);
      toast.success(t('order.orderSuccess'));
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al crear pedido';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success Screen
  if (orderSuccess) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-12 max-w-2xl">
        <div className="text-center bg-card rounded-2xl border border-border p-8 md:p-12">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-fit mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="font-serif text-3xl font-bold mb-4">
            {t('order.orderSuccess')}
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {t('order.orderNumber')}: <span className="font-mono font-bold">{orderSuccess.pedido_id}</span>
          </p>
          
          {metodoPago === 'transferencia_bancaria' && (
            <div className="bg-secondary rounded-xl p-6 text-left mb-6">
              <h3 className="font-bold mb-4">{t('payment.bankInfo')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Banco:</span> Banco General</p>
                <p><span className="text-muted-foreground">Tipo:</span> Cuenta Corriente</p>
                <p><span className="text-muted-foreground">Número:</span> XXXX-XXXX-XXXX</p>
                <p><span className="text-muted-foreground">Titular:</span> {siteConfig?.nombre_sitio || 'Mi Tienda'} S.A.</p>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                {t('payment.instructionsText')}
              </p>
            </div>
          )}
          
          <div className="bg-muted rounded-xl p-4 mb-6">
            <p className="text-lg font-bold">
              Total: ${orderSuccess.total?.toFixed(2)}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/pedidos')} className="rounded-full">
              Ver Mis Pedidos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/recibo/${orderSuccess.pedido_id}`)}
              className="rounded-full"
            >
              Ver Recibo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-6xl" data-testid="order-form-page">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">
        {t('order.title')}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Student Selection */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-serif text-xl font-bold mb-4">
                1. {t('order.selectStudent')}
              </h2>
              
              {estudiantes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No tiene estudiantes registrados
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Agregar Estudiante
                  </Button>
                </div>
              ) : (
                <Select value={selectedEstudiante} onValueChange={setSelectedEstudiante}>
                  <SelectTrigger className="h-12" data-testid="student-select">
                    <SelectValue placeholder="Seleccione un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes.map((est) => (
                      <SelectItem key={est.estudiante_id} value={est.estudiante_id}>
                        {est.nombre} - {t(`grades.${est.grade}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Book Selection */}
            {selectedGrado && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-serif text-xl font-bold mb-4">
                  2. {t('order.booksForGrade')} {t(`grades.${selectedGrado}`)}
                </h2>
                
                <div className="space-y-3">
                  {filteredLibros.map((libro) => {
                    const inCart = cart.find(item => item.libro_id === libro.libro_id);
                    const isOutOfStock = libro.inventory_quantity <= 0;
                    
                    return (
                      <div 
                        key={libro.libro_id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          inCart ? 'border-primary bg-primary/5' : 'border-border'
                        } ${isOutOfStock ? 'opacity-50' : ''}`}
                        data-testid={`book-item-${libro.libro_id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{libro.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {t(`subjects.${libro.subject}`)} • ${libro.precio.toFixed(2)}
                          </p>
                          {isOutOfStock && (
                            <p className="text-xs text-destructive">Agotado</p>
                          )}
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
                            disabled={isOutOfStock}
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
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-serif text-xl font-bold mb-4">
                3. {t('order.paymentMethod')}
              </h2>
              
              <RadioGroup value={metodoPago} onValueChange={setMetodoPago} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="transferencia_bancaria" id="bank" data-testid="payment-bank" />
                  <Label htmlFor="bank" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t('order.bankTransfer')}</p>
                      <p className="text-sm text-muted-foreground">
                        Transferencia a Banco General
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="yappy" id="yappy" data-testid="payment-yappy" />
                  <Label htmlFor="yappy" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t('order.yappy')}</p>
                      <p className="text-sm text-muted-foreground">
                        Pago instantáneo con Yappy
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-xl border border-border p-6">
              <Label htmlFor="notas" className="text-lg font-bold mb-4 block">
                {t('order.notes')} (opcional)
              </Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales, información adicional..."
                className="min-h-[100px]"
                data-testid="order-notes"
              />
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Resumen
              </h2>
              
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Carrito vacío
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.map((item) => (
                      <div 
                        key={item.libro_id}
                        className="flex items-start justify-between gap-2 py-2"
                        data-testid={`cart-item-${item.libro_id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.nombre_libro}
                          </p>
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
                disabled={submitting || cart.length === 0 || !selectedEstudiante}
                data-testid="submit-order-button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t('order.placeOrder')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
