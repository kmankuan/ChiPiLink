import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ShoppingCart,
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  CreditCard,
  Book,
  Minus,
  Plus,
  Trash2,
  Store
} from 'lucide-react';
import YappyButton from '@/components/payment/YappyButton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UnatiendaCheckout() {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderId) {
      navigate('/unatienda');
    }
  }, [items, orderId, navigate]);

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!customerInfo.nombre.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return false;
    }
    if (!customerInfo.email.trim() || !customerInfo.email.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return false;
    }
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;
    
    setCreatingOrder(true);
    try {
      // Create order in backend
      const orderData = {
        items: items.map(item => ({
          book_id: item.book_id,
          nombre: item.name,
          cantidad: item.quantity,
          precio_unitario: item.price
        })),
        cliente_nombre: customerInfo.nombre,
        cliente_email: customerInfo.email,
        cliente_telefono: customerInfo.telefono,
        subtotal: subtotal,
        total: subtotal,
        tipo: 'unatienda'
      };

      const response = await axios.post(
        `${API_URL}/api/platform-store/orders`,
        orderData
      );
      
      setOrderId(response.data.pedido_id);
      toast.success('Orden creada. Procede con el pago.');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Error al crear la orden');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = (data) => {
    clearCart();
    toast.success('¡Pago iniciado! Confirma en tu app de Yappy');
    navigate(`/checkout/${orderId}`);
  };

  const handlePaymentError = (error) => {
    toast.error('Error al procesar el pago');
  };

  if (items.length === 0 && !orderId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/unatienda')} 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la tienda
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Checkout</h1>
              <p className="text-muted-foreground">Completa tu compra</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Cart & Customer Info */}
          <div className="space-y-6">
            {/* Cart Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Tu Carrito
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.book_id} 
                    className="flex gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Book className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} c/u
                      </p>
                      
                      {/* Quantity */}
                      {!orderId && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(item.book_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            {!orderId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información de Contacto
                  </CardTitle>
                  <CardDescription>
                    Para enviarte la confirmación de tu pedido
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nombre"
                        placeholder="Tu nombre"
                        value={customerInfo.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telefono"
                        placeholder="+507 6000-0000"
                        value={customerInfo.telefono}
                        onChange={(e) => handleInputChange('telefono', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Payment */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!orderId ? (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total a pagar</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={createOrder} 
                      disabled={creatingOrder || items.length === 0}
                      className="w-full h-12 text-base"
                    >
                      {creatingOrder ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando orden...</>
                      ) : (
                        'Continuar al Pago'
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Al continuar, se creará tu orden y podrás pagar con Yappy
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        ✓ Orden #{orderId} creada
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Completa el pago para confirmar tu pedido
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>Total a pagar</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <YappyButton
                      orderId={orderId}
                      subtotal={subtotal}
                      taxes={0}
                      discount={0}
                      total={subtotal}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
