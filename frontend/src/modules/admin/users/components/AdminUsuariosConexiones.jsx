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
  DialogFooter,
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
  Gift,
  Save
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminUsuariosConexiones({ token }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'es';
  
  const [activeTab, setActiveTab] = useState('capacidades');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [capacidades, setCapacidades] = useState([]);
  const [permisosRelacion, setPermisosRelacion] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showCapacidadDialog, setShowCapacidadDialog] = useState(false);
  const [editingCapacidad, setEditingCapacidad] = useState(null);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [savingPermisos, setSavingPermisos] = useState({});
  const [savingCapacidad, setSavingCapacidad] = useState(false);
  
  // Capacidad form
  const [capacidadForm, setCapacidadForm] = useState({
    capacidad_id: '',
    nombre_es: '',
    nombre_en: '',
    descripcion_es: '',
    descripcion_en: '',
    icono: '⚡',
    color: '#6366f1',
    tipo: 'solicitada',
    membresia_requerida: '',
    requiere_aprobacion: false,
    activa: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [capRes, permRes, solRes] = await Promise.all([
        fetch(`${API}/api/connections/capabilities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/connections/admin/relationship-permissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/connections/admin/pending-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (capRes.ok) {
        const data = await capRes.json();
        setCapacidades(data.capacidades || []);
      }
      if (permRes.ok) {
        const data = await permRes.json();
        setPermisosRelacion(data.permisos || []);
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
      const res = await fetch(`${API}/api/connections/search?q=${encodeURIComponent(query)}`, {
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
      const res = await fetch(`${API}/api/connections/admin/requests/${solicitudId}/respond`, {
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
      
      toast.success(aceptar ? 'Request approved' : 'Request rejected');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOtorgarCapacidad = async (capacidadId, motivo) => {
    if (!selectedUsuario) return;
    
    try {
      const res = await fetch(`${API}/api/connections/admin/grant-capability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUsuario.user_id,
          capacidad_id: capacidadId,
          motivo: motivo || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      toast.success('Capability granted successfully');
      setSelectedUsuario(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ============== PERMISSIONS ==============
  
  const handleUpdatePermiso = async (tipo, subtipo, field, value) => {
    const key = `${tipo}-${subtipo}`;
    setSavingPermisos(prev => ({ ...prev, [key]: true }));
    
    // Find current permission
    const current = permisosRelacion.find(p => p.tipo === tipo && p.subtipo === subtipo);
    const currentPermisos = current?.permisos || {};
    
    const updatedPermisos = {
      tipo,
      subtipo,
      transferir_wallet: currentPermisos.transferir_wallet || false,
      ver_wallet: currentPermisos.ver_wallet || false,
      recargar_wallet: currentPermisos.recargar_wallet || false,
      recibir_alertas: currentPermisos.recibir_alertas || false,
      limite_transferencia_diario: currentPermisos.limite_transferencia_diario || null,
      [field]: value
    };
    
    try {
      const res = await fetch(`${API}/api/connections/admin/relationship-permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPermisos)
      });
      
      if (!res.ok) throw new Error('Error saving');
      
      // Update local state
      setPermisosRelacion(prev => {
        const idx = prev.findIndex(p => p.tipo === tipo && p.subtipo === subtipo);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], permisos: { ...updated[idx].permisos, [field]: value } };
          return updated;
        }
        return [...prev, { tipo, subtipo, permisos: { [field]: value } }];
      });
      
      toast.success('Permission updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPermisos(prev => ({ ...prev, [key]: false }));
    }
  };

  // ============== CAPABILITIES ==============
  
  const resetCapacidadForm = () => {
    setCapacidadForm({
      capacidad_id: '',
      nombre_es: '',
      nombre_en: '',
      descripcion_es: '',
      descripcion_en: '',
      icono: '⚡',
      color: '#6366f1',
      tipo: 'solicitada',
      membresia_requerida: '',
      requiere_aprobacion: false,
      activa: true
    });
    setEditingCapacidad(null);
  };
  
  const openEditCapacidad = (cap) => {
    setEditingCapacidad(cap);
    setCapacidadForm({
      capacidad_id: cap.capacidad_id,
      nombre_es: cap.nombre?.es || cap.nombre || '',
      nombre_en: cap.nombre?.en || '',
      descripcion_es: cap.descripcion?.es || cap.descripcion || '',
      descripcion_en: cap.descripcion?.en || '',
      icono: cap.icono || '⚡',
      color: cap.color || '#6366f1',
      tipo: cap.tipo || 'solicitada',
      membresia_requerida: cap.membresia_requerida || '',
      requiere_aprobacion: cap.requiere_aprobacion || false,
      activa: cap.activa !== false
    });
    setShowCapacidadDialog(true);
  };
  
  const handleSaveCapacidad = async () => {
    if (!capacidadForm.capacidad_id || !capacidadForm.nombre_es) {
      toast.error('ID and name are required');
      return;
    }
    
    setSavingCapacidad(true);
    try {
      const url = editingCapacidad 
        ? `${API}/api/connections/admin/capabilities/${editingCapacidad.capacidad_id}`
        : `${API}/api/connections/admin/capabilities`;
      
      const res = await fetch(url, {
        method: editingCapacidad ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(capacidadForm)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      toast.success(editingCapacidad ? 'Capability updated' : 'Capability created');
      setShowCapacidadDialog(false);
      resetCapacidadForm();
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingCapacidad(false);
    }
  };
  
  const handleDeleteCapacidad = async (capacidadId) => {
    if (!confirm('Deactivate this capability?')) return;
    
    try {
      const res = await fetch(`${API}/api/connections/admin/capabilities/${capacidadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error deactivating');
      
      toast.success('Capability deactivated');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ============== HELPERS ==============

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
  
  const getPermisoValue = (tipo, subtipo, field) => {
    const permiso = permisosRelacion.find(p => p.tipo === tipo && p.subtipo === subtipo);
    return permiso?.permisos?.[field] ?? false;
  };
  
  const getLimiteValue = (tipo, subtipo) => {
    const permiso = permisosRelacion.find(p => p.tipo === tipo && p.subtipo === subtipo);
    return permiso?.permisos?.limite_transferencia_diario ?? null;
  };

  // Default relation types
  const defaultRelaciones = [
    { tipo: 'especial', subtipo: 'acudiente', label: 'Acudiente' },
    { tipo: 'especial', subtipo: 'acudido', label: 'Acudido' },
    { tipo: 'familiar', subtipo: 'padre', label: 'Padre/Madre' },
    { tipo: 'familiar', subtipo: 'hijo', label: 'Hijo/a' },
    { tipo: 'familiar', subtipo: 'hermano', label: 'Hermano/a' },
    { tipo: 'familiar', subtipo: 'tio', label: 'Tío/Tía' },
    { tipo: 'familiar', subtipo: 'abuelo', label: 'Abuelo/a' },
    { tipo: 'social', subtipo: 'amigo', label: 'Amigo' },
    { tipo: 'social', subtipo: 'conocido', label: 'Conocido' },
    { tipo: 'social', subtipo: 'companero', label: 'Compañero' },
  ];

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
                <p className="text-2xl font-bold">{permisosRelacion.length}</p>
                <p className="text-xs text-muted-foreground">Permisos Configurados</p>
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
                <p className="text-2xl font-bold">{defaultRelaciones.length}</p>
                <p className="text-xs text-muted-foreground">Tipos de Relación</p>
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
          <TabsTrigger value="permisos" className="gap-2">
            <Settings className="h-4 w-4" />
            Permisos
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="gap-2">
            <Link2 className="h-4 w-4" />
            Solicitudes ({solicitudesPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="otorgar" className="gap-2">
            <Gift className="h-4 w-4" />
            Otorgar
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
                <Button size="sm" onClick={() => { resetCapacidadForm(); setShowCapacidadDialog(true); }}>
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
                    <TableHead>Membresía</TableHead>
                    <TableHead>Aprobación</TableHead>
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
                      <TableCell>{cap.membresia_requerida || '-'}</TableCell>
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
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditCapacidad(cap)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {cap.activa && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteCapacidad(cap.capacidad_id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Permisos por Relación */}
        <TabsContent value="permisos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Permisos por Tipo de Relación</CardTitle>
              <CardDescription>
                Configura los permisos por defecto para cada tipo de relación. Los cambios se guardan automáticamente.
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
                  {defaultRelaciones.map((rel) => {
                    const key = `${rel.tipo}-${rel.subtipo}`;
                    const isSaving = savingPermisos[key];
                    
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rel.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {rel.tipo} / {rel.subtipo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={getPermisoValue(rel.tipo, rel.subtipo, 'transferir_wallet')}
                            onCheckedChange={(v) => handleUpdatePermiso(rel.tipo, rel.subtipo, 'transferir_wallet', v)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={getPermisoValue(rel.tipo, rel.subtipo, 'ver_wallet')}
                            onCheckedChange={(v) => handleUpdatePermiso(rel.tipo, rel.subtipo, 'ver_wallet', v)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={getPermisoValue(rel.tipo, rel.subtipo, 'recargar_wallet')}
                            onCheckedChange={(v) => handleUpdatePermiso(rel.tipo, rel.subtipo, 'recargar_wallet', v)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={getPermisoValue(rel.tipo, rel.subtipo, 'recibir_alertas')}
                            onCheckedChange={(v) => handleUpdatePermiso(rel.tipo, rel.subtipo, 'recibir_alertas', v)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            className="w-24 h-8 text-center mx-auto"
                            placeholder="Sin límite"
                            value={getLimiteValue(rel.tipo, rel.subtipo) || ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              handleUpdatePermiso(rel.tipo, rel.subtipo, 'limite_transferencia_diario', val);
                            }}
                            disabled={isSaving}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

              {usuarios.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {usuarios.map((user) => (
                    <button
                      key={user.user_id}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 text-left transition-colors ${
                        selectedUsuario?.user_id === user.user_id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedUsuario(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {selectedUsuario?.user_id === user.user_id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedUsuario && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{selectedUsuario.nombre?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUsuario.nombre} {selectedUsuario.apellido}</p>
                      <p className="text-xs text-muted-foreground">{selectedUsuario.email}</p>
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
      </Tabs>

      {/* Dialog para crear/editar capacidad */}
      <Dialog open={showCapacidadDialog} onOpenChange={(open) => { if (!open) resetCapacidadForm(); setShowCapacidadDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCapacidad ? 'Editar Capacidad' : 'Nueva Capacidad'}
            </DialogTitle>
            <DialogDescription>
              {editingCapacidad ? 'Modifica los datos de la capacidad' : 'Crea una nueva capacidad para el sistema'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID único *</Label>
                <Input
                  value={capacidadForm.capacidad_id}
                  onChange={(e) => setCapacidadForm(prev => ({ ...prev, capacidad_id: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  placeholder="ej: jugador_premium"
                  disabled={!!editingCapacidad}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select 
                  value={capacidadForm.tipo} 
                  onValueChange={(v) => setCapacidadForm(prev => ({ ...prev, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predeterminada">Automática (al registrar)</SelectItem>
                    <SelectItem value="por_suscripcion">Por Suscripción</SelectItem>
                    <SelectItem value="beneficio_extendido">Beneficio Extendido</SelectItem>
                    <SelectItem value="solicitada">Solicitable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre (Español) *</Label>
                <Input
                  value={capacidadForm.nombre_es}
                  onChange={(e) => setCapacidadForm(prev => ({ ...prev, nombre_es: e.target.value }))}
                  placeholder="Jugador Premium"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre (Inglés)</Label>
                <Input
                  value={capacidadForm.nombre_en}
                  onChange={(e) => setCapacidadForm(prev => ({ ...prev, nombre_en: e.target.value }))}
                  placeholder="Premium Player"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descripción (Español)</Label>
              <Textarea
                value={capacidadForm.descripcion_es}
                onChange={(e) => setCapacidadForm(prev => ({ ...prev, descripcion_es: e.target.value }))}
                placeholder="Describe qué permite esta capacidad..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ícono</Label>
                <Input
                  value={capacidadForm.icono}
                  onChange={(e) => setCapacidadForm(prev => ({ ...prev, icono: e.target.value }))}
                  placeholder="⚡"
                  className="text-center text-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={capacidadForm.color}
                    onChange={(e) => setCapacidadForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={capacidadForm.color}
                    onChange={(e) => setCapacidadForm(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Membresía Req.</Label>
                <Input
                  value={capacidadForm.membresia_requerida}
                  onChange={(e) => setCapacidadForm(prev => ({ ...prev, membresia_requerida: e.target.value }))}
                  placeholder="pinpanclub"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={capacidadForm.requiere_aprobacion}
                  onCheckedChange={(v) => setCapacidadForm(prev => ({ ...prev, requiere_aprobacion: v }))}
                />
                <Label>Requiere aprobación</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={capacidadForm.activa}
                  onCheckedChange={(v) => setCapacidadForm(prev => ({ ...prev, activa: v }))}
                />
                <Label>Activa</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCapacidadDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCapacidad} disabled={savingCapacidad}>
              {savingCapacidad ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingCapacidad ? 'Guardar Cambios' : 'Crear Capacidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
