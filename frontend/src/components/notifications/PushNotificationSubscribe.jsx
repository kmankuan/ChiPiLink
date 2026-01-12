import { useState } from 'react';
import { useOneSignal } from '@/contexts/OneSignalContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationSubscribe({ variant = 'full' }) {
  const { 
    isInitialized, 
    isSubscribed, 
    permission, 
    error, 
    subscribe, 
    unsubscribe 
  } = useOneSignal();
  
  const [loading, setLoading] = useState(false);

  const handleToggleSubscription = async () => {
    setLoading(true);
    
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          toast.success('Notificaciones push desactivadas');
        }
      } else {
        const success = await subscribe();
        if (success) {
          toast.success('¡Notificaciones push activadas!');
        } else if (permission === 'denied') {
          toast.error('Permiso denegado. Habilita las notificaciones en la configuración de tu navegador.');
        }
      }
    } catch (err) {
      toast.error('Error al cambiar configuración de notificaciones');
    } finally {
      setLoading(false);
    }
  };

  // Simple button variant
  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? "secondary" : "default"}
        size="sm"
        onClick={handleToggleSubscription}
        disabled={!isInitialized || loading}
        className="gap-2"
        data-testid="push-subscribe-btn"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellOff className="h-4 w-4" />
            <span className="hidden sm:inline">Desactivar</span>
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Activar Push</span>
          </>
        )}
      </Button>
    );
  }

  // Compact switch variant
  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between" data-testid="push-subscribe-switch">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <BellRing className="h-4 w-4 text-green-500" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Notificaciones Push</span>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggleSubscription}
          disabled={!isInitialized || loading}
        />
      </div>
    );
  }

  // Full card variant
  return (
    <Card data-testid="push-notification-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
              {isSubscribed ? (
                <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Notificaciones Push</CardTitle>
              <CardDescription>
                Recibe alertas en tu navegador
              </CardDescription>
            </div>
          </div>
          <Badge variant={isSubscribed ? "default" : "secondary"}>
            {isSubscribed ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.includes('environment') 
                ? 'Las notificaciones push estarán disponibles en producción (chipilink.me)'
                : error
              }
            </AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && !error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Las notificaciones están bloqueadas. Para habilitarlas, ve a la configuración de tu navegador.
            </AlertDescription>
          </Alert>
        )}

        {isSubscribed ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm">
              Recibirás notificaciones de partidos, retos y anuncios importantes.
            </span>
          </div>
        ) : !error && (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Al activar las notificaciones push recibirás:</p>
            <ul className="space-y-1 ml-4">
              <li>• 💰 Alertas de saldo insuficiente</li>
              <li>• 💸 Confirmaciones de transferencias recibidas</li>
              <li>• 🔗 Solicitudes de conexión nuevas</li>
              <li>• 🏓 Alertas de partidos y resultados</li>
              <li>• 🏆 Recordatorios de retos semanales</li>
              <li>• 📢 Anuncios importantes del club</li>
            </ul>
          </div>
        )}

        {!error && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToggleSubscription}
              disabled={!isInitialized || loading || permission === 'denied'}
              variant={isSubscribed ? "outline" : "default"}
              className="flex-1"
              data-testid="push-toggle-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desactivar Notificaciones
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Activar Notificaciones
                </>
              )}
            </Button>
          </div>
        )}

        {!isInitialized && !error && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Smartphone className="h-3 w-3" />
          <span>Powered by OneSignal</span>
        </div>
      </CardContent>
    </Card>
  );
}
