import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Link2, Loader2, RefreshCw, Check, X, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function VinculacionesTab({ token }) {
  const [vinculaciones, setVinculaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVinculaciones();
  }, []);

  const fetchVinculaciones = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/store/vinculacion/admin/todas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setVinculaciones(data.vinculaciones || []);
    } catch (error) {
      console.error('Error fetching vinculaciones:', error);
      toast.error('Error al cargar vinculaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (vinculacionId) => {
    try {
      const response = await fetch(`${API}/api/store/vinculacion/admin/${vinculacionId}/aprobar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Vinculación aprobada');
        fetchVinculaciones();
      }
    } catch (error) {
      toast.error('Error al aprobar');
    }
  };

  const handleRechazar = async (vinculacionId) => {
    try {
      const response = await fetch(`${API}/api/store/vinculacion/admin/${vinculacionId}/rechazar`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo: 'Rechazado por administrador' })
      });
      if (response.ok) {
        toast.success('Vinculación rechazada');
        fetchVinculaciones();
      }
    } catch (error) {
      toast.error('Error al rechazar');
    }
  };

  const pendientes = vinculaciones.filter(v => v.vinculacion?.estado === 'pendiente');
  const aprobadas = vinculaciones.filter(v => v.vinculacion?.estado === 'aprobada');

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
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Vinculaciones Estudiante-Acudiente</CardTitle>
                <CardDescription>
                  Gestiona las solicitudes de vinculación entre acudientes y estudiantes PCA
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVinculaciones}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">Pendientes de Aprobación</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{aprobadas.length}</div>
            <p className="text-xs text-muted-foreground">Vinculaciones Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{vinculaciones.length}</div>
            <p className="text-xs text-muted-foreground">Total Vinculaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Solicitudes Pendientes ({pendientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendientes.map(({ vinculacion, estudiante, acudiente }) => (
                <div key={vinculacion.vinculacion_id} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="font-medium">{acudiente?.nombre || 'Acudiente'}</p>
                    <p className="text-sm text-muted-foreground">
                      → {estudiante?.nombre_completo || 'Estudiante'} ({estudiante?.grado})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rol solicitado: {vinculacion.rol}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAprobar(vinculacion.vinculacion_id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRechazar(vinculacion.vinculacion_id)}>
                      <X className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todas las vinculaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Vinculaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acudiente</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculaciones.map(({ vinculacion, estudiante, acudiente }) => (
                  <TableRow key={vinculacion.vinculacion_id}>
                    <TableCell>{acudiente?.nombre || acudiente?.email || '-'}</TableCell>
                    <TableCell>{estudiante?.nombre_completo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{estudiante?.grado || '-'}</Badge>
                    </TableCell>
                    <TableCell>{vinculacion.rol}</TableCell>
                    <TableCell>
                      <Badge variant={
                        vinculacion.estado === 'aprobada' ? 'default' :
                        vinculacion.estado === 'pendiente' ? 'outline' : 'destructive'
                      }>
                        {vinculacion.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
