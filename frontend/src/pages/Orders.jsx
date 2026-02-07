import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Eye, Printer, Loader2, ArrowLeft, BookOpen, ShoppingBag, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import OrderChat from '@/components/chat/OrderChat';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Orders() {
  const { t, i18n } = useTranslation();
  const { api, token } = useAuth();
  
  const [pedidos, setPedidos] = useState([]);
  const [textbookOrders, setTextbookOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTextbooks, setLoadingTextbooks] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('textbooks');
  const [expandedOrders, setExpandedOrders] = useState({});
  const [chatOrder, setChatOrder] = useState(null);

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  useEffect(() => {
    fetchPedidos();
    fetchTextbookOrders();
  }, []);

  const fetchPedidos = async () => {
    try {
      const response = await api.get('/pedidos/mis-pedidos');
      const data = response.data;
      setPedidos(Array.isArray(data) ? data : (data.pedidos || []));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTextbookOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/store/textbook-orders/my-orders`, {
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
    filterStatus === 'all' || pedido.estado === filterStatus
  );

  const getStatusBadge = (estado) => {
    const styles = {
      pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      preparando: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      enviado: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      entregado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      borrador: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      pre_orden: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    };
    
    const labels = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      preparando: 'Preparando',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      borrador: 'Borrador',
      pre_orden: 'Pre-orden'
    };
    
    return (
      <Badge className={styles[estado] || styles.pendiente}>
        {labels[estado] || estado}
      </Badge>
    );
  };

  const getTextbookStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      processing: 'bg-amber-100 text-amber-700',
      ready: 'bg-green-100 text-green-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      draft: t('orders.statusDraft', 'Draft'),
      submitted: t('orders.statusSubmitted', 'Submitted'),
      processing: t('orders.statusProcessing', 'Processing'),
      ready: t('orders.statusReady', 'Ready'),
      delivered: t('orders.statusDelivered', 'Delivered'),
      cancelled: t('orders.statusCancelled', 'Cancelled'),
    };
    return (
      <Badge className={styles[status] || styles.draft}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Per-book item delivery status
  const getItemStatusBadge = (status) => {
    const styles = {
      available: 'bg-gray-100 text-gray-600 text-[10px]',
      ordered: 'bg-blue-100 text-blue-700 text-[10px]',
      processing: 'bg-amber-100 text-amber-700 text-[10px]',
      ready_for_pickup: 'bg-green-100 text-green-700 text-[10px]',
      delivered: 'bg-emerald-100 text-emerald-700 text-[10px]',
      issue: 'bg-red-100 text-red-700 text-[10px]',
      out_of_stock: 'bg-gray-200 text-gray-500 text-[10px]',
    };
    const labels = {
      available: t('orders.itemAvailable', 'Available'),
      ordered: t('orders.itemOrdered', 'Ordered'),
      processing: t('orders.itemProcessing', 'Processing'),
      ready_for_pickup: t('orders.itemReady', 'Ready'),
      delivered: t('orders.itemDelivered', 'Delivered'),
      issue: t('orders.itemIssue', 'Issue'),
      out_of_stock: t('orders.itemOutOfStock', 'Out of Stock'),
    };
    return (
      <Badge className={styles[status] || styles.ordered}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Compute delivery progress for an order
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

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl" data-testid="orders-page">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/mi-cuenta">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">
            Mis Pedidos
          </h1>
          <p className="text-muted-foreground">
            Historial de todos sus pedidos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="textbooks" className="gap-2" data-testid="tab-textbooks">
            <BookOpen className="h-4 w-4" />
            Pedidos de Textos
            {textbookOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{textbookOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2" data-testid="tab-store">
            <ShoppingBag className="h-4 w-4" />
            Otros Pedidos
            {pedidos.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pedidos.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Textbook Orders Tab */}
        <TabsContent value="textbooks" data-testid="textbooks-content">
          {loadingTextbooks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : textbookOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No tienes pedidos de textos aún</p>
                <Link to="/mi-cuenta?tab=textbooks">
                  <Button data-testid="order-textbooks-btn">Ordenar Textos</Button>
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
                          {t('orders.grade', 'Grade')} {order.grade} • {t('orders.year', 'Year')} {order.year}
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

                    {/* Items Preview - Expandable with per-book status */}
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
                                      <span className="text-muted-foreground text-xs">
                                        ${item.price?.toFixed(2)}
                                      </span>
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
                                      <>
                                        <ChevronUp className="h-4 w-4" />
                                        {t('orders.showLess', 'Show less')}
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        +{filteredItems.length - 3} {t('orders.more', 'more')}
                                      </>
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
                    
                    {/* Chat button */}
                    <div className="flex justify-end mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatOrder(order)}
                        className="gap-1.5 text-xs"
                        data-testid={`chat-btn-${order.order_id}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Mensajes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Store Orders Tab (Legacy) */}
        <TabsContent value="store" data-testid="store-content">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Filter */}
              {pedidos.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48" data-testid="filter-status">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="pre_orden">Pre-orden</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="preparando">Preparando</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
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
                        ? "No tienes pedidos de tienda aún" 
                        : "No hay pedidos con el filtro seleccionado"}
                    </p>
                    <Link to="/unatienda">
                      <Button data-testid="go-to-store-btn">Ir a Unatienda</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPedidos.map((pedido) => (
                    <Card key={pedido.pedido_id} data-testid={`store-order-${pedido.pedido_id}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(pedido.estado)}
                              <span className="text-xs text-muted-foreground font-mono">
                                #{pedido.pedido_id?.slice(-8)}
                              </span>
                            </div>
                            <p className="font-medium">
                              {pedido.estudiante_nombre || 'Pedido General'}
                            </p>
                            {pedido.ano_escolar && (
                              <p className="text-sm text-muted-foreground">
                                Año escolar: {pedido.ano_escolar}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {pedido.created_at && new Date(pedido.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <p className="text-xl font-bold text-primary">
                              ${pedido.total?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {pedido.items?.length || 0} artículos
                            </p>
                          </div>
                        </div>

                        {/* Items preview */}
                        {pedido.items && pedido.items.length > 0 && (
                          <div className="bg-muted rounded-lg p-4 mt-4">
                            <div className="space-y-2">
                              {pedido.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span>{item.name || item.libro_nombre}</span>
                                  <span className="text-muted-foreground">
                                    {item.cantidad} x ${item.price?.toFixed(2) || '0.00'}
                                  </span>
                                </div>
                              ))}
                              {pedido.items.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{pedido.items.length - 3} más...
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 justify-end">
                          <Link to={`/pedido/${pedido.pedido_id}`}>
                            <Button variant="outline" size="sm" className="rounded-full" data-testid={`view-order-${pedido.pedido_id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </Link>
                          <Link to={`/recibo/${pedido.pedido_id}?print=true`}>
                            <Button variant="ghost" size="sm" className="rounded-full">
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimir
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

      {/* Order Chat */}
      <OrderChat
        orderId={chatOrder?.order_id}
        studentName={chatOrder?.student_name}
        isOpen={!!chatOrder}
        onClose={() => setChatOrder(null)}
        lang={i18n?.language || 'es'}
      />
    </div>
  );
}
