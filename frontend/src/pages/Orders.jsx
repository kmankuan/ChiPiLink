import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye, Printer, Loader2, ArrowLeft, BookOpen, ShoppingBag,
  ChevronDown, ChevronUp, MessageCircle, Headphones,
  ShoppingCart, Plus, Minus, Trash2, Book, ArrowRight,
  Lock, AlertCircle, GraduationCap, ClipboardList
} from 'lucide-react';
import OrderChat from '@/components/chat/OrderChat';
import CrmChat from '@/components/chat/CrmChat';
import { useNotifications } from '@/hooks/useNotifications';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

/* ───── Cart Tab Content ───── */
function CartTabContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    items, itemCount, subtotal,
    removeItem, updateQuantity, clearCart,
    hasPrivateItems, hasMixedCart
  } = useCart();

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ShoppingCart className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-medium mb-1">{t('cart.emptyTitle', 'Your cart is empty')}</p>
          <p className="text-sm text-muted-foreground mb-6">{t('cart.emptyDesc', 'Add products from Unatienda or the textbook catalog')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/unatienda')} data-testid="cart-go-store-btn">
              <ShoppingBag className="h-4 w-4 mr-2" />
              {t('cart.exploreStore', 'Explore Unatienda')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/mi-cuenta?tab=textbooks')} data-testid="cart-go-textbooks-btn">
              <BookOpen className="h-4 w-4 mr-2" />
              {t('cart.orderTextbooks', 'Order Textbooks')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mixed Cart Warning */}
      {hasMixedCart && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('cart.mixedCartWarning', 'Your cart has public and private catalog products. They will be processed as separate orders.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cart Items */}
      {items.map((item) => (
        <Card
          key={item.book_id}
          className={item.is_sysbook ? 'border-purple-200 dark:border-purple-800' : ''}
          data-testid={`cart-item-${item.book_id}`}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">${(item.price || 0).toFixed(2)} {t('cart.unitPrice', 'ea')}</p>
                      {item.is_sysbook && item.grade && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          <GraduationCap className="h-2.5 w-2.5 mr-1" />
                          {item.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeItem(item.book_id)}
                    data-testid={`cart-remove-${item.book_id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quantity + Line Total */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
                      data-testid={`cart-minus-${item.book_id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                      disabled={!item.is_sysbook && item.quantity >= item.inventory_quantity}
                      data-testid={`cart-plus-${item.book_id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-semibold">
                    ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary & Actions */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {hasPrivateItems && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Lock className="h-4 w-4 text-purple-600 mt-0.5" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {t('cart.privatePreOrder', 'Private catalog books are processed as pre-orders')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('cart.subtotal', 'Subtotal')} ({itemCount} {itemCount === 1 ? t('cart.product', 'product') : t('cart.products', 'products')})
              </span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{t('cart.total', 'Total')}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/unatienda/checkout')}
              className="w-full gap-2"
              data-testid="cart-checkout-btn"
            >
              {t('cart.checkout', 'Proceed to Payment')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              data-testid="cart-clear-btn"
            >
              {t('cart.clearCart', 'Clear Cart')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───── Main Page ───── */
export default function Orders() {
  const { t, i18n } = useTranslation();
  const { api, token } = useAuth();
  const { itemCount } = useCart();
  const { perOrder, markOrderRead, refreshUnread } = useNotifications();
  const { perStudent: crmPerStudent, markStudentRead, refreshUnread: refreshCrmUnread } = useCrmNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const topTab = searchParams.get('tab') === 'cart' ? 'cart' : 'orders';

  const [pedidos, setPedidos] = useState([]);
  const [textbookOrders, setTextbookOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTextbooks, setLoadingTextbooks] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [ordersSubTab, setOrdersSubTab] = useState('textbooks');
  const [expandedOrders, setExpandedOrders] = useState({});
  const [chatOrder, setChatOrder] = useState(null);
  const [crmChatStudent, setCrmChatStudent] = useState(null);

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleTopTabChange = (value) => {
    setSearchParams(value === 'cart' ? { tab: 'cart' } : {}, { replace: true });
  };

  useEffect(() => {
    fetchPedidos();
    fetchTextbookOrders();
  }, []);

  const fetchPedidos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/platform-store/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPedidos(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching store orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTextbookOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sysbook/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTextbookOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching textbook orders:', error);
    } finally {
      setLoadingTextbooks(false);
    }
  };

  const filteredPedidos = pedidos.filter(pedido =>
    filterStatus === 'all' || pedido.status === filterStatus
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      preparing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      payment_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      payment_cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      payment_expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const labelMap = {
      pending: t('orders.statusPending', 'Pending'),
      confirmed: t('orders.statusConfirmed', 'Confirmed'),
      preparing: t('orders.statusPreparing', 'Preparing'),
      shipped: t('orders.statusShipped', 'Shipped'),
      delivered: t('orders.statusDelivered', 'Delivered'),
      cancelled: t('orders.statusCancelled', 'Cancelled'),
      paid: t('orders.statusPaid', 'Paid'),
      payment_rejected: t('orders.statusPaymentRejected', 'Payment Rejected'),
      payment_cancelled: t('orders.statusPaymentCancelled', 'Payment Cancelled'),
      payment_expired: t('orders.statusPaymentExpired', 'Payment Expired'),
    };
    return <Badge className={styles[status] || styles.pending}>{labelMap[status] || status}</Badge>;
  };

  const getTextbookStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
      processing: 'bg-amber-100 text-amber-700', ready: 'bg-green-100 text-green-700',
      delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
    };
    const labelMap = {
      draft: t('orders.statusDraft', 'Draft'), submitted: t('orders.statusSubmitted', 'Submitted'),
      processing: t('orders.statusProcessing', 'Processing'), ready: t('orders.statusReady', 'Ready'),
      delivered: t('orders.statusDelivered', 'Delivered'), cancelled: t('orders.statusCancelled', 'Cancelled'),
    };
    return <Badge className={styles[status] || styles.draft}>{labelMap[status] || status}</Badge>;
  };

  const getItemStatusBadge = (status) => {
    const styles = {
      available: 'bg-gray-100 text-gray-600 text-[10px]', ordered: 'bg-blue-100 text-blue-700 text-[10px]',
      processing: 'bg-amber-100 text-amber-700 text-[10px]', ready_for_pickup: 'bg-green-100 text-green-700 text-[10px]',
      delivered: 'bg-emerald-100 text-emerald-700 text-[10px]', issue: 'bg-red-100 text-red-700 text-[10px]',
      out_of_stock: 'bg-gray-200 text-gray-500 text-[10px]',
    };
    const labelMap = {
      available: t('orders.itemAvailable', 'Available'), ordered: t('orders.itemOrdered', 'Ordered'),
      processing: t('orders.itemProcessing', 'Processing'), ready_for_pickup: t('orders.itemReady', 'Ready'),
      delivered: t('orders.itemDelivered', 'Delivered'), issue: t('orders.itemIssue', 'Issue'),
      out_of_stock: t('orders.itemOutOfStock', 'Out of Stock'),
    };
    return <Badge className={styles[status] || styles.ordered}>{labelMap[status] || status}</Badge>;
  };

  const getDeliveryProgress = (items) => {
    const orderedItems = (items || []).filter(i => i.quantity_ordered > 0);
    if (orderedItems.length === 0) return null;
    const delivered = orderedItems.filter(i => i.status === 'delivered').length;
    return { delivered, total: orderedItems.length };
  };

  const isLoading = loading && loadingTextbooks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalOrders = textbookOrders.length + pedidos.length;

  return (
    <div className="container mx-auto px-4 md:px-8 pt-4 pb-8 max-w-5xl" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/mi-cuenta">
          <Button variant="ghost" size="icon" data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">
            {t('orders.pageTitle', 'Shopping & Orders')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('orders.pageSubtitle', 'Shopping cart and order history')}
          </p>
        </div>
      </div>

      {/* Top-Level Tabs: Cart / Orders */}
      <Tabs value={topTab} onValueChange={handleTopTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="cart" className="gap-2" data-testid="tab-cart">
            <ShoppingCart className="h-4 w-4" />
            {t('cart.title', 'My Cart')}
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-1">{itemCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
            <ClipboardList className="h-4 w-4" />
            {t('cart.myOrders', 'My Orders')}
            {totalOrders > 0 && (
              <Badge variant="secondary" className="ml-1">{totalOrders}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Cart Tab ─── */}
        <TabsContent value="cart" data-testid="cart-tab-content">
          <CartTabContent />
        </TabsContent>

        {/* ─── Orders Tab ─── */}
        <TabsContent value="orders" data-testid="orders-tab-content">
          <Tabs value={ordersSubTab} onValueChange={setOrdersSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="textbooks" className="gap-2" data-testid="subtab-textbooks">
                <BookOpen className="h-4 w-4" />
                {t('orders.textbookOrders', 'Textbook Orders')}
                {textbookOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{textbookOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="store" className="gap-2" data-testid="subtab-store">
                <ShoppingBag className="h-4 w-4" />
                {t('orders.storeOrders', 'Other Orders')}
                {pedidos.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pedidos.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Textbook Orders */}
            <TabsContent value="textbooks" data-testid="textbooks-content">
              {loadingTextbooks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : textbookOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">{t('orders.noTextbookOrders', "You don't have textbook orders yet")}</p>
                    <Link to="/mi-cuenta?tab=textbooks">
                      <Button data-testid="order-textbooks-btn">{t('cart.orderTextbooks', 'Order Textbooks')}</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {textbookOrders.map((order) => {
                    const progress = getDeliveryProgress(order.items);
                    return (
                      <Card key={order.order_id} data-testid={`textbook-order-${order.order_id}`}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                {getTextbookStatusBadge(order.status)}
                              </div>
                              <p className="font-bold text-lg">{order.student_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('orders.grade', 'Grade')} {order.grade} &bull; {t('orders.year', 'Year')} {order.year}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">
                                ${order.total_amount?.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.items?.filter(i => i.quantity_ordered > 0).length || 0} {t('orders.books', 'books')}
                              </p>
                            </div>
                          </div>

                          {/* Delivery progress bar */}
                          {progress && progress.total > 0 && order.status !== 'draft' && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>{t('orders.deliveryProgress', 'Delivery Progress')}</span>
                                <span>{progress.delivered}/{progress.total}</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${(progress.delivered / progress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Items Preview */}
                          {order.items && order.items.filter(i => i.quantity_ordered > 0).length > 0 && (
                            <div className="bg-muted rounded-lg p-3 sm:p-4">
                              <div className="space-y-2">
                                {(() => {
                                  const filteredItems = order.items.filter(i => i.quantity_ordered > 0);
                                  const isExpanded = expandedOrders[order.order_id];
                                  const itemsToShow = isExpanded ? filteredItems : filteredItems.slice(0, 3);
                                  const hasMoreItems = filteredItems.length > 3;
                                  return (
                                    <>
                                      {itemsToShow.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm gap-2">
                                          <span className="truncate flex-1">{item.book_name}</span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {getItemStatusBadge(item.status)}
                                            <span className="text-muted-foreground text-xs">${item.price?.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      ))}
                                      {hasMoreItems && (
                                        <button
                                          onClick={() => toggleOrderExpansion(order.order_id)}
                                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium mt-2 transition-colors cursor-pointer"
                                          data-testid={`toggle-expand-${order.order_id}`}
                                        >
                                          {isExpanded ? (
                                            <><ChevronUp className="h-4 w-4" />{t('orders.showLess', 'Show less')}</>
                                          ) : (
                                            <><ChevronDown className="h-4 w-4" />+{filteredItems.length - 3} {t('orders.more', 'more')}</>
                                          )}
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {order.last_submitted_at && (
                            <p className="text-xs text-muted-foreground mt-3">
                              {t('orders.lastSubmitted', 'Last submitted')}: {new Date(order.last_submitted_at).toLocaleDateString()}
                            </p>
                          )}

                          {/* Chat buttons */}
                          <div className="flex justify-end mt-3 gap-2">
                            <Button
                              variant="outline" size="sm"
                              onClick={() => { setCrmChatStudent({ id: order.student_id, name: order.student_name }); markStudentRead(order.student_id); }}
                              className="gap-1.5 text-xs relative"
                              data-testid={`crm-chat-btn-${order.order_id}`}
                            >
                              <Headphones className="h-3.5 w-3.5" />
                              {t('orders.support', 'Support')}
                              {(crmPerStudent[order.student_id]?.count || 0) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white px-1 animate-pulse">
                                  {crmPerStudent[order.student_id].count}
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => { setChatOrder(order); markOrderRead(order.order_id); }}
                              className="gap-1.5 text-xs relative"
                              data-testid={`chat-btn-${order.order_id}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {t('orders.messages', 'Messages')}
                              {(perOrder[order.order_id] || 0) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                                  {perOrder[order.order_id]}
                                </span>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Store Orders */}
            <TabsContent value="store" data-testid="store-content">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {pedidos.length > 0 && (
                    <div className="flex justify-end mb-4">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48" data-testid="filter-status">
                          <SelectValue placeholder={t('orders.filterByStatus', 'Filter by status')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('orders.allStates', 'All statuses')}</SelectItem>
                          <SelectItem value="borrador">{t('orders.statusDraft', 'Draft')}</SelectItem>
                          <SelectItem value="pre_orden">{t('orders.statusPreOrder', 'Pre-order')}</SelectItem>
                          <SelectItem value="pendiente">{t('orders.statusPending', 'Pending')}</SelectItem>
                          <SelectItem value="confirmado">{t('orders.statusConfirmed', 'Confirmed')}</SelectItem>
                          <SelectItem value="preparando">{t('orders.statusPreparing', 'Preparing')}</SelectItem>
                          <SelectItem value="enviado">{t('orders.statusShipped', 'Shipped')}</SelectItem>
                          <SelectItem value="entregado">{t('orders.statusDelivered', 'Delivered')}</SelectItem>
                          <SelectItem value="cancelado">{t('orders.statusCancelled', 'Cancelled')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filteredPedidos.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {pedidos.length === 0
                            ? t('orders.noStoreOrders', "You don't have store orders yet")
                            : t('orders.noFilterResults', 'No orders match the selected filter')}
                        </p>
                        <Link to="/unatienda">
                          <Button data-testid="go-to-store-btn">{t('orders.goToStore', 'Go to Unatienda')}</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredPedidos.map((pedido) => (
                        <Card key={pedido.pedido_id} data-testid={`store-order-${pedido.pedido_id}`}>
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {getStatusBadge(pedido.estado)}
                                  <span className="text-xs text-muted-foreground font-mono">#{pedido.pedido_id?.slice(-8)}</span>
                                </div>
                                <p className="font-medium">{pedido.estudiante_nombre || t('orders.orderGeneral', 'General Order')}</p>
                                {pedido.ano_escolar && (
                                  <p className="text-sm text-muted-foreground">{t('orders.schoolYear', 'School year')}: {pedido.ano_escolar}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {pedido.created_at && new Date(pedido.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <p className="text-xl font-bold text-primary">${pedido.total?.toFixed(2) || '0.00'}</p>
                                <p className="text-sm text-muted-foreground">{pedido.items?.length || 0} {t('orders.articles', 'items')}</p>
                              </div>
                            </div>

                            {pedido.items && pedido.items.length > 0 && (
                              <div className="bg-muted rounded-lg p-4 mt-4">
                                <div className="space-y-2">
                                  {pedido.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>{item.name || item.book_name}</span>
                                      <span className="text-muted-foreground">{item.cantidad} x ${item.price?.toFixed(2) || '0.00'}</span>
                                    </div>
                                  ))}
                                  {pedido.items.length > 3 && (
                                    <p className="text-xs text-muted-foreground">+{pedido.items.length - 3} {t('orders.moreItems', 'more...')}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 mt-4 justify-end">
                              <Link to={`/pedido/${pedido.pedido_id}`}>
                                <Button variant="outline" size="sm" className="rounded-full" data-testid={`view-order-${pedido.pedido_id}`}>
                                  <Eye className="h-4 w-4 mr-2" />{t('orders.viewDetailsBtn', 'View Details')}
                                </Button>
                              </Link>
                              <Link to={`/recibo/${pedido.pedido_id}?print=true`}>
                                <Button variant="ghost" size="sm" className="rounded-full">
                                  <Printer className="h-4 w-4 mr-2" />{t('orders.print', 'Print')}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Order Chat */}
      <OrderChat
        orderId={chatOrder?.order_id}
        studentName={chatOrder?.student_name}
        isOpen={!!chatOrder}
        onClose={() => { setChatOrder(null); refreshUnread(); }}
        lang={i18n?.language || 'en'}
      />

      {/* CRM Chat */}
      <CrmChat
        studentId={crmChatStudent?.id}
        studentName={crmChatStudent?.name}
        isOpen={!!crmChatStudent}
        onClose={() => { setCrmChatStudent(null); refreshCrmUnread(); }}
      />
    </div>
  );
}
