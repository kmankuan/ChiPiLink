import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Store,
  MapPin,
  FileText,
  Calendar,
  CheckSquare,
  Upload,
  List,
  Type,
} from 'lucide-react';
import YappyButton from '@/components/payment/YappyButton';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

const FIELD_ICONS = {
  text: Type,
  email: Mail,
  phone: Phone,
  textarea: FileText,
  select: List,
  date: Calendar,
  checkbox: CheckSquare,
  file: Upload,
  number: Type,
};

function DynamicFormField({ field, value, onChange, lang }) {
  const label = field[`label_${lang}`] || field.label;
  const placeholder = field[`placeholder_${lang}`] || field.placeholder || '';
  const Icon = FIELD_ICONS[field.field_type] || Type;

  switch (field.field_type) {
    case 'textarea':
      return (
        <div className="space-y-2">
          <Label>{label} {field.required && '*'}</Label>
          <Textarea
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onChange(field.field_id, e.target.value)}
            rows={3}
            data-testid={`checkout-field-${field.field_id}`}
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-2">
          <Label>{label} {field.required && '*'}</Label>
          <Select value={value || ''} onValueChange={(v) => onChange(field.field_id, v)}>
            <SelectTrigger data-testid={`checkout-field-${field.field_id}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt[`label_${lang}`] || opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!value}
            onCheckedChange={(v) => onChange(field.field_id, v)}
            data-testid={`checkout-field-${field.field_id}`}
          />
          <Label>{label} {field.required && '*'}</Label>
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Label>{label} {field.required && '*'}</Label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => onChange(field.field_id, e.target.value)}
              className="pl-10"
              data-testid={`checkout-field-${field.field_id}`}
            />
          </div>
        </div>
      );
  }
}

export default function UnatiendaCheckout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});

  const lang = (i18n.language || 'es').substring(0, 2);

  // Load dynamic form fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/store/checkout-form-config/fields`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const fields = res.data?.fields || [];
        setFormFields(fields.sort((a, b) => a.order - b.order));
      } catch {
        // Fallback: use hardcoded fields if API fails
        setFormFields([
          { field_id: 'nombre', field_type: 'text', label: 'Full Name', label_es: 'Nombre Completo', placeholder_es: 'Tu nombre', required: true, order: 0 },
          { field_id: 'email', field_type: 'email', label: 'Email', label_es: 'Correo Electrónico', placeholder_es: 'tu@email.com', required: true, order: 1 },
          { field_id: 'telefono', field_type: 'phone', label: 'Phone', label_es: 'Teléfono', placeholder_es: '+507 6000-0000', required: false, order: 2 },
        ]);
      }
    };
    fetchFields();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderId) {
      navigate('/unatienda');
    }
  }, [items, orderId, navigate]);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = () => {
    for (const field of formFields) {
      if (field.required) {
        const val = formData[field.field_id];
        if (!val || (typeof val === 'string' && !val.trim())) {
          const label = field[`label_${lang}`] || field.label;
          toast.error(`${label} es requerido`);
          return false;
        }
        if (field.field_type === 'email' && !String(val).includes('@')) {
          toast.error('Por favor ingresa un email válido');
          return false;
        }
      }
    }
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;
    
    setCreatingOrder(true);
    try {
      const orderData = {
        items: items.map(item => ({
          book_id: item.book_id,
          nombre: item.name,
          cantidad: item.quantity,
          precio_unitario: item.price
        })),
        cliente_nombre: formData.nombre || formData[formFields.find(f => f.field_type === 'text')?.field_id] || '',
        cliente_email: formData.email || formData[formFields.find(f => f.field_type === 'email')?.field_id] || '',
        cliente_telefono: formData.telefono || formData[formFields.find(f => f.field_type === 'phone')?.field_id] || '',
        form_data: formData,
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
              <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
              <p className="text-muted-foreground">{t("checkout.completeYourPurchase")}</p>
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
                  <span>{t("common.total")}</span>
                  <span className="text-primary">${subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info — Dynamic Fields */}
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
                  {formFields.map((field) => (
                    <DynamicFormField
                      key={field.field_id}
                      field={field}
                      value={formData[field.field_id]}
                      onChange={handleFieldChange}
                      lang={lang}
                    />
                  ))}
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
                        <span>{t("checkout.subtotal")}</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>{t("checkout.totalToPay")}</span>
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
                        <span>{t("checkout.totalToPay")}</span>
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
