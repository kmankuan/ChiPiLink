/**
 * MisCapacidades - Componente para ver capacidades/habilidades del usuario
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Zap,
  Loader2,
  CheckCircle2,
  Clock,
  Star,
  Gift,
  Send
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MisCapacidades({ token }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'es';
  
  const [loading, setLoading] = useState(true);
  const [misCapacidades, setMisCapacidades] = useState([]);
  const [todasCapacidades, setTodasCapacidades] = useState([]);
  
  // Estado para solicitar capacidad
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCapacidad, setSelectedCapacidad] = useState(null);
  const [requestMotivo, setRequestMotivo] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [misRes, todasRes] = await Promise.all([
        fetch(`${API}/api/conexiones/mis-capacidades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/conexiones/capacidades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (misRes.ok) {
        const data = await misRes.json();
        setMisCapacidades(data.capacidades || []);
      }
      if (todasRes.ok) {
        const data = await todasRes.json();
        setTodasCapacidades(data.capacidades || []);
      }
    } catch (err) {
      console.error('Error loading capacidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo) => {
    const key = `capacidades.types.${tipo}`;
    const translated = t(key);
    return translated !== key ? translated : tipo;
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'predeterminada': return CheckCircle2;
      case 'por_suscripcion': return Star;
      case 'beneficio_extendido': return Gift;
      case 'solicitada': return Clock;
      default: return Zap;
    }
  };

  const getTipoBadgeVariant = (tipo) => {
    switch (tipo) {
      case 'predeterminada': return 'secondary';
      case 'por_suscripcion': return 'default';
      case 'beneficio_extendido': return 'outline';
      case 'solicitada': return 'outline';
      default: return 'secondary';
    }
  };

  const handleRequestCapacidad = async () => {
    if (!selectedCapacidad) return;

    setSendingRequest(true);
    try {
      // Este endpoint necesitaría ser implementado en el backend
      // Por ahora mostramos un mensaje informativo
      toast.info('Funcionalidad de solicitud próximamente disponible');
      setShowRequestDialog(false);
      setSelectedCapacidad(null);
      setRequestMotivo('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const getCapacidadNombre = (cap) => {
    if (cap.nombre && typeof cap.nombre === 'object') {
      return cap.nombre[lang] || cap.nombre['es'] || Object.values(cap.nombre)[0];
    }
    return cap.nombre || cap.capacidad_id;
  };

  const getCapacidadDescripcion = (cap) => {
    if (cap.descripcion && typeof cap.descripcion === 'object') {
      return cap.descripcion[lang] || cap.descripcion['es'] || '';
    }
    return cap.descripcion || '';
  };

  // Filtrar capacidades disponibles (que no tengo)
  const misCapacidadIds = new Set(misCapacidades.map(c => c.capacidad_id));
  const capacidadesDisponibles = todasCapacidades.filter(
    c => !misCapacidadIds.has(c.capacidad_id) && c.activa
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" />
          {t('capacidades.title')}
        </h2>
        <p className="text-muted-foreground">{t('capacidades.subtitle')}</p>
      </div>

      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas">
            {t('capacidades.active')} ({misCapacidades.length})
          </TabsTrigger>
          <TabsTrigger value="disponibles">
            {t('capacidades.available')} ({capacidadesDisponibles.length})
          </TabsTrigger>
        </TabsList>

        {/* Mis capacidades activas */}
        <TabsContent value="activas" className="mt-4">
          {misCapacidades.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No tienes capacidades activas aún
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {misCapacidades.map((cap) => {
                const Icon = getTipoIcon(cap.tipo);
                // Buscar la config completa
                const configCompleta = todasCapacidades.find(
                  c => c.capacidad_id === cap.capacidad_id
                );

                return (
                  <Card key={cap.capacidad_id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2 rounded-lg text-2xl"
                          style={{ backgroundColor: `${configCompleta?.color || '#6366f1'}20` }}
                        >
                          {configCompleta?.icono || '⚡'}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {getCapacidadNombre(configCompleta || cap)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getCapacidadDescripcion(configCompleta || cap)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={getTipoBadgeVariant(cap.tipo)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getTipoLabel(cap.tipo)}
                        </Badge>
                        {cap.activa ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Activa
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Inactiva
                          </span>
                        )}
                      </div>
                      {cap.origen && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Origen: {cap.origen}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Capacidades disponibles para solicitar */}
        <TabsContent value="disponibles" className="mt-4">
          {capacidadesDisponibles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Ya tienes todas las capacidades disponibles
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {capacidadesDisponibles.map((cap) => {
                const Icon = getTipoIcon(cap.tipo);
                const canRequest = cap.tipo === 'solicitada';
                const needsSubscription = cap.tipo === 'por_suscripcion';

                return (
                  <Card key={cap.capacidad_id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2 rounded-lg text-2xl"
                          style={{ backgroundColor: `${cap.color || '#6366f1'}20` }}
                        >
                          {cap.icono || '⚡'}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {getCapacidadNombre(cap)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getCapacidadDescripcion(cap)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={getTipoBadgeVariant(cap.tipo)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getTipoLabel(cap.tipo)}
                        </Badge>
                        
                        {canRequest && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCapacidad(cap);
                              setShowRequestDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {t('capacidades.request')}
                          </Button>
                        )}
                        
                        {needsSubscription && cap.membresia_requerida && (
                          <span className="text-xs text-muted-foreground">
                            Requiere membresía
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para solicitar capacidad */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Solicitar: {selectedCapacidad && getCapacidadNombre(selectedCapacidad)}
            </DialogTitle>
            <DialogDescription>
              Tu solicitud será revisada por un administrador
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>¿Por qué deseas esta capacidad?</Label>
              <Textarea
                value={requestMotivo}
                onChange={(e) => setRequestMotivo(e.target.value)}
                placeholder="Describe brevemente por qué necesitas esta capacidad..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRequestDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRequestCapacidad}
                disabled={sendingRequest}
                className="flex-1"
              >
                {sendingRequest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar solicitud
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
