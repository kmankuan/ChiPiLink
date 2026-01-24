import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Eye, Printer, Loader2, ArrowLeft } from 'lucide-react';

export default function Orders() {
  const { t } = useTranslation();
  const { api } = useAuth();
  
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const response = await api.get('/pedidos/mis-pedidos');
      setPedidos(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl" data-testid="orders-page">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">
            {t('dashboard.myOrders')}
          </h1>
          <p className="text-muted-foreground">
            Historial de todos sus pedidos
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">
          {filteredPedidos.length} pedidos
        </p>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">{t('status.pending')}</SelectItem>
            <SelectItem value="confirmado">{t('status.confirmed')}</SelectItem>
            <SelectItem value="preparando">{t('status.preparing')}</SelectItem>
            <SelectItem value="enviado">{t('status.shipped')}</SelectItem>
            <SelectItem value="entregado">{t('status.delivered')}</SelectItem>
            <SelectItem value="cancelado">{t('status.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filteredPedidos.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('dashboard.noOrders')}</p>
          <Link to="/orden">
            <Button className="rounded-full">
              Hacer un pedido
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPedidos.map((pedido) => (
            <div
              key={pedido.pedido_id}
              className="bg-card rounded-xl border border-border p-6"
              data-testid={`order-card-${pedido.pedido_id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(pedido.estado)}
                    {pedido.pago_confirmado && (
                      <Badge variant="outline" className="text-green-600">
                        Pago Confirmado
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono font-bold text-lg">{pedido.pedido_id}</p>
                  <p className="text-sm text-muted-foreground">
                    {pedido.estudiante_nombre} • {new Date(pedido.fecha_creacion).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${pedido.total?.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pedido.items?.length} {pedido.items?.length === 1 ? 'libro' : 'libros'}
                  </p>
                </div>
              </div>

              {/* Items Preview */}
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  {pedido.items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.nombre_libro}</span>
                      <span className="text-muted-foreground">
                        {item.cantidad} x ${item.precio_unitario?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {pedido.items?.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{pedido.items.length - 3} más...
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link to={`/recibo/${pedido.pedido_id}`}>
                  <Button variant="outline" size="sm" className="rounded-full">
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
