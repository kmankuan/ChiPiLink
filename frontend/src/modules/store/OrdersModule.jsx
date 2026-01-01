import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Search,
  Eye,
  Printer,
  CheckCircle,
  Loader2,
  Package
} from 'lucide-react';

export default function OrdersModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/pedidos');
      setPedidos(res.data);
    } catch (error) {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = pedidos.filter(p => {
    const matchesFilter = filter === 'all' || p.estado === filter;
    const matchesSearch = 
      p.pedido_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.estudiante_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const updateOrderStatus = async (pedidoId, newStatus) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}`, null, { params: { estado: newStatus } });
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const confirmPayment = async (pedidoId) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}/confirmar-pago`);
      toast.success('Pago confirmado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al confirmar pago');
    }
  };

  const getStatusBadge = (estado) => {
    const variants = {
      pendiente: { variant: 'secondary', label: 'Pendiente' },
      confirmado: { variant: 'default', label: 'Confirmado' },
      en_preparacion: { variant: 'outline', label: 'En Preparación' },
      entregado: { variant: 'outline', label: 'Entregado' },
      cancelado: { variant: 'destructive', label: 'Cancelado' }
    };
    const config = variants[estado] || variants.pendiente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setDetailsDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="confirmado">Confirmados</SelectItem>
            <SelectItem value="en_preparacion">En Preparación</SelectItem>
            <SelectItem value="entregado">Entregados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{pedidos.length}</p>
            <p className="text-sm text-muted-foreground">Total Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-yellow-600">
              {pedidos.filter(p => p.estado === 'pendiente').length}
            </p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">
              {pedidos.filter(p => p.pago_confirmado).length}
            </p>
            <p className="text-sm text-muted-foreground">Pagados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-primary">
              ${pedidos.reduce((sum, p) => sum + (p.total || 0), 0).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Total Ventas</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay pedidos</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.pedido_id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono font-semibold">{order.pedido_id}</p>
                      {getStatusBadge(order.estado)}
                      {order.pago_confirmado && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Pagado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{order.estudiante_nombre || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.fecha_creacion)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold">${order.total?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length || 0} productos
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDetails(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!order.pago_confirmado && order.estado === 'pendiente' && (
                      <Button size="sm" onClick={() => confirmPayment(order.pedido_id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Pedido</p>
                  <p className="font-mono">{selectedOrder.pedido_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedOrder.estado)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p>{selectedOrder.estudiante_nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p>{formatDate(selectedOrder.fecha_creacion)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Productos</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                      <span>{item.nombre || item.libro_id}</span>
                      <span>${item.precio_unitario?.toFixed(2)} x {item.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>${selectedOrder.total?.toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2">
                <Select 
                  value={selectedOrder.estado} 
                  onValueChange={(v) => {
                    updateOrderStatus(selectedOrder.pedido_id, v);
                    setSelectedOrder({...selectedOrder, estado: v});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="en_preparacion">En Preparación</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
