/**
 * AdminUsuariosConexiones - Panel de administración del sistema de usuarios
 * Incluye: Capacidades, Tipos de Membresía, Permisos por Relación, Solicitudes
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Zap,
  Users,
  Link2,
  Loader2,
  Plus,
  Check,
  X,
  Edit,
  Trash2,
  Search,
  Settings,
  Crown,
  CreditCard,
  RefreshCw,
  ArrowRightLeft,
  Eye,
  Bell,
  Gift
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminUsuariosConexiones({ token }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'es';
  
  const [activeTab, setActiveTab] = useState('capacidades');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [capacidades, setCapacidades] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showCapacidadDialog, setShowCapacidadDialog] = useState(false);
  const [editingCapacidad, setEditingCapacidad] = useState(null);
  const [showOtorgarDialog, setShowOtorgarDialog] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [capRes, solRes] = await Promise.all([
        fetch(`${API}/api/conexiones/capacidades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/conexiones/admin/solicitudes-pendientes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (capRes.ok) {
        const data = await capRes.json();
        setCapacidades(data.capacidades || []);
      }
      if (solRes.ok) {
        const data = await solRes.json();
        setSolicitudesPendientes(data.solicitudes || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setUsuarios([]);
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/conexiones/buscar?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const handleRespondSolicitud = async (solicitudId, aceptar) => {
    try {
      const res = await fetch(`${API}/api/conexiones/admin/solicitudes/${solicitudId}/responder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ aceptar })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Error');
      }
      
      toast.success(aceptar ? 'Solicitud aprobada' : 'Solicitud rechazada');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOtorgarCapacidad = async (capacidadId, motivo) => {
    if (!selectedUsuario) return;
    
    try {
      const res = await fetch(`${API}/api/conexiones/admin/otorgar-capacidad`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUsuario.cliente_id,
          capacidad_id: capacidadId,
          motivo: motivo || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      toast.success('Capacidad otorgada exitosamente');
      setShowOtorgarDialog(false);
      setSelectedUsuario(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getCapacidadNombre = (cap) => {
    if (cap.nombre && typeof cap.nombre === 'object') {
      return cap.nombre[lang] || cap.nombre['es'] || Object.values(cap.nombre)[0];
    }
    return cap.nombre || cap.capacidad_id;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      predeterminada: 'Automática',
      por_suscripcion: 'Por Suscripción',
      beneficio_extendido: 'Beneficio Extendido',
      solicitada: 'Solicitable'
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeVariant = (tipo) => {
    const variants = {
      predeterminada: 'secondary',
      por_suscripcion: 'default',
      beneficio_extendido: 'outline',
      solicitada: 'outline'
    };
    return variants[tipo] || 'secondary';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Sistema de Usuarios
          </h2>
          <p className="text-muted-foreground">
            Gestiona capacidades, conexiones y permisos
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{capacidades.length}</p>
                <p className="text-xs text-muted-foreground">Capacidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Link2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{solicitudesPendientes.length}</p>
                <p className="text-xs text-muted-foreground">Solicitudes Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Conexiones Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Membresías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="capacidades" className="gap-2">
            <Zap className="h-4 w-4" />
            Capacidades
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="gap-2">
            <Link2 className="h-4 w-4" />
            Solicitudes ({solicitudesPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="otorgar" className="gap-2">
            <Gift className="h-4 w-4" />
            Otorgar Capacidad
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-2">
            <Settings className="h-4 w-4" />
            Permisos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Capacidades */}
        <TabsContent value="capacidades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Capacidades del Sistema</CardTitle>
                  <CardDescription>
                    Define las habilidades y roles que pueden tener los usuarios
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowCapacidadDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Capacidad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Membresía Requerida</TableHead>
                    <TableHead>Requiere Aprobación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacidades.map((cap) => (
                    <TableRow key={cap.capacidad_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cap.icono || '⚡'}</span>
                          <div>
                            <p className="font-medium">{getCapacidadNombre(cap)}</p>
                            <p className="text-xs text-muted-foreground">{cap.capacidad_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(cap.tipo)}>
                          {getTipoLabel(cap.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cap.membresia_requerida || '-'}
                      </TableCell>
                      <TableCell>
                        {cap.requiere_aprobacion ? (
                          <Badge variant="secondary">Sí</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cap.activa ? (
                          <Badge variant="default" className="bg-green-500">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingCapacidad(cap);
                            setShowCapacidadDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Solicitudes Pendientes */}
        <TabsContent value="solicitudes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Conexión Pendientes</CardTitle>
              <CardDescription>
                Revisa y aprueba/rechaza solicitudes de conexión entre usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {solicitudesPendientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitudesPendientes.map((sol) => (
                    <div 
                      key={sol.solicitud_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {sol.de_usuario_nombre?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {sol.de_usuario_nombre} → {sol.para_usuario_nombre}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {sol.tipo} / {sol.subtipo}
                            {sol.mensaje && ` • "${sol.mensaje}"`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondSolicitud(sol.solicitud_id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespondSolicitud(sol.solicitud_id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Otorgar Capacidad */}
        <TabsContent value="otorgar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Otorgar Capacidad a Usuario</CardTitle>
              <CardDescription>
                Busca un usuario y asígnale una capacidad como beneficio extendido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Búsqueda de usuario */}
              <div className="space-y-2">
                <Label>Buscar Usuario</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Resultados de búsqueda */}
              {usuarios.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {usuarios.map((user) => (
                    <button
                      key={user.cliente_id}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 text-left transition-colors ${
                        selectedUsuario?.cliente_id === user.cliente_id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedUsuario(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {user.nombre} {user.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      {selectedUsuario?.cliente_id === user.cliente_id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Usuario seleccionado y selección de capacidad */}
              {selectedUsuario && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedUsuario.nombre?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedUsuario.nombre} {selectedUsuario.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedUsuario.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Seleccionar Capacidad</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {capacidades.filter(c => c.activa).map((cap) => (
                        <button
                          key={cap.capacidad_id}
                          className="p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            if (confirm(`¿Otorgar "${getCapacidadNombre(cap)}" a ${selectedUsuario.nombre}?`)) {
                              handleOtorgarCapacidad(cap.capacidad_id, 'Otorgado por admin');
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cap.icono || '⚡'}</span>
                            <div>
                              <p className="font-medium text-sm">{getCapacidadNombre(cap)}</p>
                              <Badge variant={getTipoBadgeVariant(cap.tipo)} className="text-xs mt-1">
                                {getTipoLabel(cap.tipo)}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración de Permisos */}
        <TabsContent value="permisos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Permisos por Tipo de Relación</CardTitle>
              <CardDescription>
                Configura los permisos por defecto para cada tipo de relación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Relación</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowRightLeft className="h-4 w-4" />
                        Transferir
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="h-4 w-4" />
                        Ver Wallet
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        Recargar
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Bell className="h-4 w-4" />
                        Alertas
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Límite Diario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { tipo: 'especial', subtipo: 'acudiente', label: 'Acudiente', permisos: { transferir: true, ver: true, recargar: true, alertas: true, limite: null } },
                    { tipo: 'especial', subtipo: 'acudido', label: 'Acudido', permisos: { transferir: false, ver: false, recargar: false, alertas: false, limite: null } },
                    { tipo: 'familiar', subtipo: 'padre', label: 'Padre/Madre', permisos: { transferir: true, ver: false, recargar: true, alertas: false, limite: null } },
                    { tipo: 'familiar', subtipo: 'tio', label: 'Tío/Tía', permisos: { transferir: true, ver: false, recargar: true, alertas: false, limite: 500 } },
                    { tipo: 'social', subtipo: 'amigo', label: 'Amigo', permisos: { transferir: true, ver: false, recargar: false, alertas: false, limite: 100 } },
                    { tipo: 'social', subtipo: 'conocido', label: 'Conocido', permisos: { transferir: true, ver: false, recargar: false, alertas: false, limite: 50 } },
                  ].map((rel) => (
                    <TableRow key={`${rel.tipo}-${rel.subtipo}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rel.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {rel.tipo} / {rel.subtipo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rel.permisos.transferir} disabled />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rel.permisos.ver} disabled />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rel.permisos.recargar} disabled />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rel.permisos.alertas} disabled />
                      </TableCell>
                      <TableCell className="text-center">
                        {rel.permisos.limite ? `$${rel.permisos.limite}` : 'Sin límite'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                * La edición de permisos estará disponible próximamente
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para crear/editar capacidad (placeholder) */}
      <Dialog open={showCapacidadDialog} onOpenChange={setShowCapacidadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCapacidad ? 'Editar Capacidad' : 'Nueva Capacidad'}
            </DialogTitle>
            <DialogDescription>
              Esta funcionalidad estará disponible próximamente
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Por ahora, las capacidades se configuran en el código backend.
            </p>
          </div>
          <Button onClick={() => setShowCapacidadDialog(false)}>
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
