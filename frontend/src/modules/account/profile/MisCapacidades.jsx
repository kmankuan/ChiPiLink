/**
 * UserCapabilities - Component to view user capabilities/abilities
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

export default function UserCapabilities({ token }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'es';
  
  const [loading, setLoading] = useState(true);
  const [myCapabilities, setMyCapabilities] = useState([]);
  const [allCapabilities, setAllCapabilities] = useState([]);
  
  // State for requesting capability
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        fetch(`${API}/api/connections/my-capabilities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API}/api/connections/capabilities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (myRes.ok) {
        const data = await myRes.json();
        setMyCapabilities(data.capacidades || []);
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllCapabilities(data.capacidades || []);
      }
    } catch (err) {
      console.error('Error loading capabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const key = `capacidades.types.${type}`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'predeterminada': return CheckCircle2;
      case 'por_suscripcion': return Star;
      case 'beneficio_extendido': return Gift;
      case 'solicitada': return Clock;
      default: return Zap;
    }
  };

  const getTypeBadgeVariant = (type) => {
    switch (type) {
      case 'predeterminada': return 'secondary';
      case 'por_suscripcion': return 'default';
      case 'beneficio_extendido': return 'outline';
      case 'solicitada': return 'outline';
      default: return 'secondary';
    }
  };

  const handleRequestCapability = async () => {
    if (!selectedCapability) return;

    setSendingRequest(true);
    try {
      // This endpoint would need to be implemented on the backend
      // For now, show informational message
      toast.info(t('capabilities.featureComingSoon'));
      setShowRequestDialog(false);
      setSelectedCapability(null);
      setRequestReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const getCapabilityName = (cap) => {
    if (cap.nombre && typeof cap.nombre === 'object') {
      return cap.nombre[lang] || cap.nombre['es'] || Object.values(cap.nombre)[0];
    }
    return cap.nombre || cap.capacidad_id;
  };

  const getCapabilityDescription = (cap) => {
    if (cap.descripcion && typeof cap.descripcion === 'object') {
      return cap.descripcion[lang] || cap.descripcion['es'] || '';
    }
    return cap.descripcion || '';
  };

  // Filter available capabilities (ones I don't have)
  const myCapabilityIds = new Set(myCapabilities.map(c => c.capacidad_id));
  const availableCapabilities = allCapabilities.filter(
    c => !myCapabilityIds.has(c.capacidad_id) && c.activa
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

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            {t('capacidades.active')} ({myCapabilities.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            {t('capacidades.available')} ({availableCapabilities.length})
          </TabsTrigger>
        </TabsList>

        {/* My active capabilities */}
        <TabsContent value="active" className="mt-4">
          {myCapabilities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('capabilities.noActiveCapabilities')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myCapabilities.map((cap) => {
                const Icon = getTypeIcon(cap.tipo);
                // Find complete config
                const fullConfig = allCapabilities.find(
                  c => c.capacidad_id === cap.capacidad_id
                );

                return (
                  <Card key={cap.capacidad_id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2 rounded-lg text-2xl"
                          style={{ backgroundColor: `${fullConfig?.color || '#6366f1'}20` }}
                        >
                          {fullConfig?.icono || '⚡'}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {getCapabilityName(fullConfig || cap)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getCapabilityDescription(fullConfig || cap)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={getTypeBadgeVariant(cap.tipo)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getTypeLabel(cap.tipo)}
                        </Badge>
                        {cap.activa ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('capabilities.active')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t('capabilities.inactive')}
                          </span>
                        )}
                      </div>
                      {cap.origen && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('capabilities.origin')}: {cap.origen}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Available capabilities to request */}
        <TabsContent value="available" className="mt-4">
          {availableCapabilities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('capabilities.allCapabilitiesOwned')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableCapabilities.map((cap) => {
                const Icon = getTypeIcon(cap.tipo);
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
                            {getCapabilityName(cap)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getCapabilityDescription(cap)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={getTypeBadgeVariant(cap.tipo)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getTypeLabel(cap.tipo)}
                        </Badge>
                        
                        {canRequest && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCapability(cap);
                              setShowRequestDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {t('capacidades.request')}
                          </Button>
                        )}
                        
                        {needsSubscription && cap.membresia_requerida && (
                          <span className="text-xs text-muted-foreground">
                            {t('capabilities.requiresMembership')}
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

      {/* Dialog to request capability */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('capabilities.requestDialogTitle')}: {selectedCapability && getCapabilityName(selectedCapability)}
            </DialogTitle>
            <DialogDescription>
              {t('capabilities.requestDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('capabilities.requestReason')}</Label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder={t('capabilities.requestPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRequestDialog(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleRequestCapability}
                disabled={sendingRequest}
                className="flex-1"
              >
                {sendingRequest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('capabilities.sendRequest')}
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

// Keep backward compatibility with old name
export { UserCapabilities as MisCapacidades };
