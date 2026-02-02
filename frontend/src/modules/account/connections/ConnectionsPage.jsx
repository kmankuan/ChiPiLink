/**
 * MisConexiones - Componente para gestionar conexiones entre usuarios
 * Incluye: lista de conexiones, solicitudes, invitaciones
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Check,
  X,
  Loader2,
  Send,
  Wallet,
  Eye,
  Bell,
  ArrowRightLeft,
  Trash2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MisConexiones({ token }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [conexiones, setConexiones] = useState([]);
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);
  
  // State for adding connection
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [relationshipType, setRelationshipType] = useState('');
  const [relationshipSubtype, setRelationshipSubtype] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  
  // State for invitation
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const relationshipTypes = [
    { value: 'familiar', label: t('conexiones.types.familiar') },
    { value: 'social', label: t('conexiones.types.social') },
    { value: 'especial', label: t('conexiones.types.especial') },
  ];

  const subtypesByType = {
    familiar: [
      { value: 'padre', label: t('conexiones.subtypes.padre') },
      { value: 'madre', label: t('conexiones.subtypes.madre') },
      { value: 'hijo', label: t('conexiones.subtypes.hijo') },
      { value: 'hija', label: t('conexiones.subtypes.hija') },
      { value: 'hermano', label: t('conexiones.subtypes.hermano') },
      { value: 'hermana', label: t('conexiones.subtypes.hermana') },
      { value: 'abuelo', label: t('conexiones.subtypes.abuelo') },
      { value: 'abuela', label: t('conexiones.subtypes.abuela') },
      { value: 'tio', label: t('conexiones.subtypes.tio') },
      { value: 'tia', label: t('conexiones.subtypes.tia') },
      { value: 'primo', label: t('conexiones.subtypes.primo') },
      { value: 'prima', label: t('conexiones.subtypes.prima') },
    ],
    social: [
      { value: 'amigo', label: t('conexiones.subtypes.amigo') },
      { value: 'conocido', label: t('conexiones.subtypes.conocido') },
      { value: 'companero_club', label: t('conexiones.subtypes.companero_club') },
      { value: 'vecino', label: t('conexiones.subtypes.vecino') },
    ],
    especial: [
      { value: 'acudiente', label: t('conexiones.subtypes.acudiente') },
      { value: 'acudido', label: t('conexiones.subtypes.acudido') },
      { value: 'tutor', label: t('conexiones.subtypes.tutor') },
    ],
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [conRes, recRes, envRes] = await Promise.all([
        fetch(`${API}/api/conexiones/mis-conexiones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/conexiones/solicitudes/recibidas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/conexiones/solicitudes/enviadas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (conRes.ok) {
        const data = await conRes.json();
        setConexiones(data.conexiones || []);
      }
      if (recRes.ok) {
        const data = await recRes.json();
        setSolicitudesRecibidas(data.solicitudes || []);
      }
      if (envRes.ok) {
        const data = await envRes.json();
        setSolicitudesEnviadas(data.solicitudes || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/conexiones/buscar?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || data.usuarios || []);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedUser || !relationshipType || !relationshipSubtype) {
      toast.error('Complete all fields');
      return;
    }
    
    setSendingRequest(true);
    try {
      const res = await fetch(`${API}/api/conexiones/solicitar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          para_usuario_id: selectedUser.user_id,
          tipo: relationshipType,
          subtipo: relationshipSubtype,
          etiqueta: customLabel || null,
          mensaje: requestMessage || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      // Success message with notification info
      const pushSent = data.push_notification?.success;
      if (pushSent) {
        toast.success(`${t('conexiones.requestSent')} User was notified`);
      } else {
        toast.success(t('conexiones.requestSent'));
      }
      
      setShowAddDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Enter an email address');
      return;
    }
    
    setSendingInvite(true);
    try {
      const res = await fetch(`${API}/api/conexiones/invitar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          nombre: inviteName || null,
          mensaje: inviteMessage || null,
          tipo_relacion: relationshipType || null,
          subtipo: relationshipSubtype || null
        })
      });
      
      const data = await res.json();
      
      if (data.existe) {
        // User already registered, offer to connect directly
        toast.info('This user is already registered. You can send them a connection request.');
        setSelectedUser({ user_id: data.user_id, email: inviteEmail });
        setShowInviteDialog(false);
        return;
      }
      
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      toast.success(t('conexiones.inviteSent'));
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteName('');
      setInviteMessage('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRespondRequest = async (solicitudId, accept) => {
    try {
      const res = await fetch(`${API}/api/conexiones/solicitudes/${solicitudId}/responder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ aceptar: accept })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error');
      }
      
      // Message with notification indicator
      const pushSent = data.push_notification?.success;
      if (accept) {
        toast.success(pushSent 
          ? 'Request accepted. User was notified.' 
          : 'Request accepted');
      } else {
        toast.success(pushSent 
          ? 'Request rejected. User was notified.'
          : 'Request rejected');
      }
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveConnection = async (conexionId) => {
    if (!confirm('Delete this connection?')) return;
    
    try {
      const res = await fetch(`${API}/api/conexiones/${conexionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error deleting connection');
      
      toast.success('Connection deleted');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setRelationshipType('');
    setRelationshipSubtype('');
    setCustomLabel('');
    setRequestMessage('');
  };

  const getSubtypeLabel = (tipo, subtipo) => {
    const key = `conexiones.subtypes.${subtipo}`;
    const translated = t(key);
    return translated !== key ? translated : subtipo;
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
            <Users className="h-6 w-6" />
            {t('conexiones.title')}
          </h2>
          <p className="text-muted-foreground">{t('conexiones.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                {t('conexiones.inviteEmail')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('conexiones.inviteUser')}</DialogTitle>
                <DialogDescription>
                  Invite someone to register on ChiPiLink
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (optional)</Label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Person's name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('conexiones.inviteMessage')}</Label>
                  <Input
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Hello, I invite you to join..."
                  />
                </div>
                <Button 
                  onClick={handleSendInvite} 
                  disabled={sendingInvite || !inviteEmail}
                  className="w-full"
                >
                  {sendingInvite ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                {t('conexiones.addConnection')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('conexiones.addConnection')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* User Search */}
                {!selectedUser ? (
                  <div className="space-y-2">
                    <Label>{t('conexiones.searchUser')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('conexiones.searchUser')}
                        className="pl-9"
                      />
                    </div>
                    
                    {searching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user.user_id}
                            className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 text-left"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.name} {user.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No users found</p>
                        <Button 
                          variant="link" 
                          onClick={() => {
                            setShowAddDialog(false);
                            setShowInviteDialog(true);
                            setInviteEmail(searchQuery.includes('@') ? searchQuery : '');
                          }}
                        >
                          Invite by email?
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Usuario seleccionado */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar>
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback>
                          {selectedUser.nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {selectedUser.nombre} {selectedUser.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedUser.email}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedUser(null)}
                      >
                        Cambiar
                      </Button>
                    </div>
                    
                    {/* Tipo de relación */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('conexiones.relationshipType')} *</Label>
                        <Select value={relationshipType} onValueChange={(v) => {
                          setRelationshipType(v);
                          setRelationshipSubtype('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {relationshipTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t('conexiones.relationshipSubtype')} *</Label>
                        <Select 
                          value={relationshipSubtype} 
                          onValueChange={setRelationshipSubtype}
                          disabled={!relationshipType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(subtypesByType[relationshipType] || []).map((sub) => (
                              <SelectItem key={sub.value} value={sub.value}>
                                {sub.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t('conexiones.customLabel')}</Label>
                      <Input
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="Ej: Mi tío favorito"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Mensaje (opcional)</Label>
                      <Input
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="Hola, me gustaría conectar contigo..."
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSendRequest}
                      disabled={sendingRequest || !relationshipType || !relationshipSubtype}
                      className="w-full"
                    >
                      {sendingRequest ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {t('conexiones.sendRequest')}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="conexiones">
        <TabsList>
          <TabsTrigger value="conexiones">
            Conexiones ({conexiones.length})
          </TabsTrigger>
          <TabsTrigger value="recibidas">
            {t('conexiones.pendingRequests')} ({solicitudesRecibidas.length})
          </TabsTrigger>
          <TabsTrigger value="enviadas">
            {t('conexiones.sentRequests')} ({solicitudesEnviadas.filter(s => s.estado === 'pendiente').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conexiones" className="mt-4">
          {conexiones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('conexiones.noConnections')}</p>
                <Button 
                  variant="link" 
                  onClick={() => setShowAddDialog(true)}
                  className="mt-2"
                >
                  {t('conexiones.addConnection')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {conexiones.map((con) => (
                <Card key={con.conexion_id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={con.usuario_avatar} />
                        <AvatarFallback>
                          {con.usuario_nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{con.usuario_nombre}</p>
                          {con.usuario_estado === 'acudido' && (
                            <Badge variant="secondary" className="text-xs">
                              {t('acudidos.accountStatus.acudido')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getSubtypeLabel(con.tipo, con.subtipo)}</span>
                          {con.etiqueta && (
                            <>
                              <span>•</span>
                              <span>{con.etiqueta}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Indicadores de permisos */}
                      <div className="flex items-center gap-1">
                        {con.permisos?.transferir_wallet && (
                          <div className="p-1.5 rounded-full bg-green-100 text-green-600" title={t('conexiones.canTransfer')}>
                            <ArrowRightLeft className="h-3 w-3" />
                          </div>
                        )}
                        {con.permisos?.ver_wallet && (
                          <div className="p-1.5 rounded-full bg-blue-100 text-blue-600" title={t('conexiones.canViewWallet')}>
                            <Eye className="h-3 w-3" />
                          </div>
                        )}
                        {con.permisos?.recibir_alertas && (
                          <div className="p-1.5 rounded-full bg-yellow-100 text-yellow-600" title={t('conexiones.receivesAlerts')}>
                            <Bell className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveConnection(con.conexion_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recibidas" className="mt-4">
          {solicitudesRecibidas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tienes solicitudes pendientes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitudesRecibidas.map((sol) => (
                <Card key={sol.solicitud_id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {sol.de_usuario_nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-medium">{sol.de_usuario_nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Quiere conectar como: {getSubtypeLabel(sol.tipo, sol.subtipo)}
                        </p>
                        {sol.mensaje && (
                          <p className="text-sm mt-1 italic">&ldquo;{sol.mensaje}&rdquo;</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRespondRequest(sol.solicitud_id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('conexiones.reject')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleRespondRequest(sol.solicitud_id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t('conexiones.accept')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enviadas" className="mt-4">
          {solicitudesEnviadas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No has enviado solicitudes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitudesEnviadas.map((sol) => (
                <Card key={sol.solicitud_id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {sol.para_usuario_nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-medium">{sol.para_usuario_nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {getSubtypeLabel(sol.tipo, sol.subtipo)}
                        </p>
                      </div>
                      
                      <Badge variant={
                        sol.estado === 'pendiente' ? 'secondary' :
                        sol.estado === 'aceptada' ? 'default' : 'destructive'
                      }>
                        {sol.estado === 'pendiente' && 'Pendiente'}
                        {sol.estado === 'aceptada' && 'Aceptada'}
                        {sol.estado === 'rechazada' && 'Rechazada'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
