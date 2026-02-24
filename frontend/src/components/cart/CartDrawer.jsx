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
  GraduationCap,
  ClipboardList
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
            {t('cart.shoppingCart', 'Shopping Cart')}
            {itemCount > 0 && (
              <Badge variant="secondary">{itemCount}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? t('cart.emptyTitle', 'Your cart is empty')
              : `${itemCount} ${t('cart.itemsInCart', 'item(s) in your cart')}`
            }
          </SheetDescription>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">{t('cart.noProducts', 'No products in your cart')}</p>
              <Button variant="outline" onClick={() => { closeCart(); navigate('/unatienda'); }}>
                {t('cart.exploreStoreShort', 'Explore Unatienda')}
              </Button>
              <Button
                variant="ghost"
                className="mt-2 gap-2 text-muted-foreground"
                onClick={() => { closeCart(); navigate('/orders'); }}
                data-testid="cart-my-orders-btn"
              >
                <ClipboardList className="h-4 w-4" />
                {t('cart.viewOrdersAndCart', 'View my orders & cart')}
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
                      {t('cart.mixedCartWarning', 'Your cart has public and private catalog products. They will be processed as separate orders.')}
                    </p>
                  </div>
                </Card>
              )}

              {items.map((item) => (
                <div
                  key={item.book_id}
                  className={`flex gap-4 p-3 rounded-lg ${
                    item.is_sysbook
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                      : 'bg-muted/50'
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Book className="h-6 w-6 text-muted-foreground/50" />
                    )}
                    {item.is_sysbook && (
                      <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
                        <Lock className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        ${(item.price || 0).toFixed(2)}
                      </p>
                      {item.is_sysbook && item.grade && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          <GraduationCap className="h-2.5 w-2.5 mr-1" />
                          {item.grade}
                        </Badge>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
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
                        onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                        disabled={!item.is_sysbook && item.quantity >= item.inventory_quantity}
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
                      onClick={() => removeItem(item.book_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <p className="font-semibold text-sm">
                      ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
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
                  {t('cart.privatePreOrder', 'Private catalog books are processed as pre-orders')}
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cart.subtotal', 'Subtotal')}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t('cart.total', 'Total')}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleCheckout} className="w-full gap-2">
                {t('cart.checkout', 'Proceed to Payment')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="flex-1"
                >
                  {t('cart.clearCart', 'Clear Cart')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { closeCart(); navigate('/pedidos'); }}
                  className="flex-1 gap-1.5"
                  data-testid="cart-my-orders-footer-btn"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {t('cart.myOrders', 'My Orders')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
