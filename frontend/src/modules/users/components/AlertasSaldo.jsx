/**
 * AlertasSaldo - Componente para mostrar y gestionar alertas de saldo insuficiente
 * Muestra alertas bilaterales (usuario ↔ acudiente)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Loader2,
  CheckCircle,
  Send,
  Wallet,
  Bell,
  User,
  Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AlertasSaldo({ token, onTransfer }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState([]);
  
  // Estado para transferir desde alerta
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/conexiones/mis-alertas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlertas(data.alertas || []);
      }
    } catch (err) {
      console.error('Error loading alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolver = async (alertaId) => {
    try {
      const res = await fetch(`${API}/api/conexiones/alertas/${alertaId}/resolver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Error al resolver');
      
      toast.success('Alerta resuelta');
      loadAlertas();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTransferFromAlerta = async () => {
    if (!selectedAlerta || !transferAmount) return;
    
    setSending(true);
    try {
      const res = await fetch(`${API}/api/conexiones/transferir`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          para_usuario_id: selectedAlerta.usuario_id,
          monto: parseFloat(transferAmount),
          mensaje: `Recarga por alerta: ${selectedAlerta.descripcion}`
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en transferencia');
      
      toast.success('Transferencia realizada exitosamente');
      
      // Marcar alerta como resuelta
      await handleResolver(selectedAlerta.alerta_id);
      
      setShowTransferDialog(false);
      setSelectedAlerta(null);
      setTransferAmount('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-PA', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (alertas.length === 0) {
    return null; // No mostrar si no hay alertas
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg">
            <Bell className="h-5 w-5" />
            Alertas de Saldo ({alertas.length})
          </CardTitle>
          <CardDescription>
            Notificaciones de saldo insuficiente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertas.map((alerta) => (
            <div 
              key={alerta.alerta_id}
              className="p-3 bg-white dark:bg-gray-900 rounded-lg border shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {alerta.es_de_acudido ? (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        De acudido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Mi alerta
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(alerta.creado_en)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium">{alerta.descripcion}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Necesita: ${alerta.monto_requerido?.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      Tiene: ${alerta.saldo_actual?.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {alerta.es_de_acudido && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAlerta(alerta);
                        setTransferAmount((alerta.monto_requerido - alerta.saldo_actual).toFixed(2));
                        setShowTransferDialog(true);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Recargar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResolver(alerta.alerta_id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolver
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog para transferir desde alerta */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recargar Saldo</DialogTitle>
            <DialogDescription>
              Transferir fondos para resolver la alerta de saldo insuficiente
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlerta && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{selectedAlerta.descripcion}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-red-600">
                    Necesita: ${selectedAlerta.monto_requerido?.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    Tiene: ${selectedAlerta.saldo_actual?.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monto a transferir</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 text-xl font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sugerido: ${(selectedAlerta.monto_requerido - selectedAlerta.saldo_actual).toFixed(2)} (diferencia)
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTransferDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleTransferFromAlerta}
                  disabled={sending || !transferAmount || parseFloat(transferAmount) <= 0}
                  className="flex-1"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Transferir
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
