import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Book,
  ArrowRight,
  ShoppingBag,
  Lock,
  AlertCircle,
  GraduationCap
} from 'lucide-react';

export default function CartDrawer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    subtotal,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    hasPrivateItems,
    hasMixedCart
  } = useCart();

  const handleCheckout = () => {
    closeCart();
    navigate('/unatienda/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito de Compras
            {itemCount > 0 && (
              <Badge variant="secondary">{itemCount}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0 
              ? 'Tu carrito está vacío'
              : `${itemCount} producto${itemCount > 1 ? 's' : ''} en tu carrito`
            }
          </SheetDescription>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">No hay productos en tu carrito</p>
              <Button variant="outline" onClick={() => { closeCart(); navigate('/unatienda'); }}>
                Explorar Tienda
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mixed Cart Warning */}
              {hasMixedCart && (
                <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Tu carrito tiene productos públicos y del catálogo privado. 
                      Se procesarán en pedidos separados.
                    </p>
                  </div>
                </Card>
              )}
              
              {items.map((item) => (
                <div 
                  key={item.libro_id} 
                  className={`flex gap-4 p-3 rounded-lg ${
                    item.es_catalogo_privado 
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' 
                      : 'bg-muted/50'
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {item.imagen_url ? (
                      <img 
                        src={item.imagen_url} 
                        alt={item.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Book className="h-6 w-6 text-muted-foreground/50" />
                    )}
                    {item.es_catalogo_privado && (
                      <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
                        <Lock className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.nombre}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        ${item.precio.toFixed(2)}
                      </p>
                      {item.es_catalogo_privado && item.grado && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          <GraduationCap className="h-2.5 w-2.5 mr-1" />
                          {item.grado}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.libro_id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.libro_id, item.quantity + 1)}
                        disabled={!item.es_catalogo_privado && item.quantity >= item.cantidad_inventario}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Price & Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.libro_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <p className="font-semibold text-sm">
                      ${(item.precio * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {/* Private Items Notice */}
            {hasPrivateItems && (
              <div className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Lock className="h-4 w-4 text-purple-600 mt-0.5" />
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Los libros del catálogo privado se procesan como pre-orden
                </p>
              </div>
            )}
            
            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleCheckout} className="w-full gap-2">
                Proceder al Pago
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={clearCart}
                className="w-full"
              >
                Vaciar Carrito
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
