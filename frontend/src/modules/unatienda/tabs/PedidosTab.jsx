import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ShoppingCart, Loader2, RefreshCw, Eye, ExternalLink } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PedidosTab({ token }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/store/pedidos/admin/todos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setPedidos(data.pedidos || []);
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const variants = {
      'pendiente': 'outline',
      'confirmado': 'default',
      'en_proceso': 'secondary',
      'listo': 'default',
      'entregado': 'default',
      'cancelado': 'destructive'
    };
    return variants[estado] || 'outline';
  };

  const pendientes = pedidos.filter(p => p.estado === 'pendiente');
  const confirmados = pedidos.filter(p => ['confirmado', 'en_proceso', 'listo'].includes(p.estado));
  const completados = pedidos.filter(p => p.estado === 'entregado');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Pedidos de Libros</CardTitle>
                <CardDescription>
                  Gestiona los pedidos de libros escolares del catálogo privado PCA
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPedidos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{confirmados.length}</div>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completados.length}</div>
            <p className="text-xs text-muted-foreground">Entregados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pedidos.length}</div>
            <p className="text-xs text-muted-foreground">Total Pedidos</p>
          </CardContent>
        </Card>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay pedidos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido ID</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monday</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => (
                    <TableRow key={p.pedido_id}>
                      <TableCell className="font-mono text-sm">{p.pedido_id?.slice(0, 12)}...</TableCell>
                      <TableCell className="font-medium">{p.estudiante_nombre || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.estudiante_grado || '-'}</Badge>
                      </TableCell>
                      <TableCell>{p.items?.length || 0} libros</TableCell>
                      <TableCell className="text-right font-medium">
                        ${p.total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadge(p.estado)}>
                          {p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.monday_item_id ? (
                          <Badge variant="outline" className="text-green-600">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Sync
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
