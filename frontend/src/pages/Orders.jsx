import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Eye, Printer, Loader2, ArrowLeft, BookOpen, ShoppingBag } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Orders() {
  const { t } = useTranslation();
  const { api, token } = useAuth();
  
  const [pedidos, setPedidos] = useState([]);
  const [textbookOrders, setTextbookOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTextbooks, setLoadingTextbooks] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('textbooks');

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
      cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    
    return (
      <Badge className={styles[estado] || styles.pendiente}>
        {t(`status.${estado}`)}
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
      draft: 'Borrador',
      submitted: 'Enviado',
      processing: 'Procesando',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return (
      <Badge className={styles[status] || styles.draft}>
        {labels[status] || status}
      </Badge>
    );
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
          <TabsTrigger value="textbooks" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Pedidos de Textos
            {textbookOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{textbookOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Otros Pedidos
            {pedidos.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pedidos.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Textbook Orders Tab */}
        <TabsContent value="textbooks">
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
                  <Button>Ordenar Textos</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {textbookOrders.map((order) => (
                <Card key={order.order_id} data-testid={`textbook-order-${order.order_id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          {getTextbookStatusBadge(order.status)}
                        </div>
                        <p className="font-bold text-lg">{order.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Grado {order.grade} • Año {order.year}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {order.order_id}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${order.total_amount?.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items?.filter(i => i.quantity_ordered > 0).length || 0} libros
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    {order.items && order.items.filter(i => i.quantity_ordered > 0).length > 0 && (
                      <div className="bg-muted rounded-lg p-4">
                        <div className="space-y-2">
                          {order.items.filter(i => i.quantity_ordered > 0).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.book_name}</span>
                              <span className="text-muted-foreground">
                                {item.quantity_ordered} x ${item.price?.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {order.items.filter(i => i.quantity_ordered > 0).length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{order.items.filter(i => i.quantity_ordered > 0).length - 3} más...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {order.last_submitted_at && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Último envío: {new Date(order.last_submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Store Orders Tab */}
        <TabsContent value="store">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
