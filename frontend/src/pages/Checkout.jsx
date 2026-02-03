import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import axios from 'axios';
import { STORE_ENDPOINTS, buildUrl } from '@/config/api';
import {
  ShoppingCart,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Phone
} from 'lucide-react';
import YappyButton from '@/components/payment/YappyButton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Checkout() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (pedidoId) {
      fetchOrder();
    }
  }, [pedidoId]);

  useEffect(() => {
    // Poll for payment status updates
    if (polling && order) {
      const interval = setInterval(fetchOrder, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [polling, order]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(buildUrl(STORE_ENDPOINTS.orderPublicById(pedidoId)));
      setOrder(response.data);
      
      // Check payment status
      if (response.data.estado_pago) {
        setPaymentStatus(response.data.estado_pago);
        if (response.data.estado_pago === 'pagado') {
          setPolling(false);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Pedido no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (data) => {
    setPolling(true);
    toast.success('Pago iniciado. Esperando confirmación...');
  };

  const handlePaymentError = (error) => {
    toast.error('Error al procesar el pago');
  };

  const getPaymentStatusBadge = () => {
    const statuses = {
      pagado: { icon: CheckCircle, label: 'Pagado', variant: 'default', color: 'text-green-600' },
      pendiente: { icon: Clock, label: 'Pendiente', variant: 'secondary', color: 'text-yellow-600' },
      pago_rechazado: { icon: XCircle, label: 'Rechazado', variant: 'destructive', color: 'text-red-600' },
      pago_cancelado: { icon: XCircle, label: 'Cancelado', variant: 'destructive', color: 'text-red-600' },
      pago_expirado: { icon: Clock, label: 'Expirado', variant: 'secondary', color: 'text-gray-600' }
    };
    
    const status = statuses[paymentStatus] || statuses.pendiente;
    const Icon = status.icon;
    
    return (
      <Badge variant={status.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status.color}`} />
        {status.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-semibold">Pedido no encontrado</h1>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Button>
      </div>
    );
  }

  const isPaid = paymentStatus === 'pagado';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">Completa tu pago de forma segura</p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Resumen del Pedido
              </CardTitle>
              {getPaymentStatusBadge()}
            </div>
            <CardDescription>Pedido #{order.pedido_id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name || item.book_id}</p>
                    <p className="text-sm text-muted-foreground">Cantidad: {item.cantidad}</p>
                  </div>
                  <p className="font-medium">${(item.price_unitario * item.cantidad).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${order.subtotal?.toFixed(2) || order.total?.toFixed(2)}</span>
              </div>
              {order.impuestos > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Impuestos</span>
                  <span>${order.impuestos?.toFixed(2)}</span>
                </div>
              )}
              {order.descuento > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-${order.descuento?.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {!isPaid ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YappyButton
                orderId={order.pedido_id}
                subtotal={order.subtotal || order.total}
                taxes={order.impuestos || 0}
                discount={order.descuento || 0}
                total={order.total}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
              
              {polling && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Esperando confirmación</p>
                    <p className="text-sm text-blue-700">Confirma el pago en tu app de Yappy</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                ¡Pago Completado!
              </h2>
              <p className="text-green-700 mb-4">
                Tu pago ha sido procesado exitosamente.
              </p>
              <p className="text-sm text-green-600">
                Recibirás un correo con los detalles de tu pedido.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        {order.cliente_email && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Email: {order.cliente_email}</p>
              {order.cliente_telefono && <p>Tel: {order.cliente_telefono}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
