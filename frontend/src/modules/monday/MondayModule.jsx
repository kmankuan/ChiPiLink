import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  ExternalLink,
  Settings,
  Save
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MondayModule() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/admin/monday/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
      setSelectedBoardId(response.data.board_id || '');
    } catch (error) {
      toast.error('Error cargando estado de Monday.com');
    } finally {
      setLoading(false);
    }
  };

  const saveBoardId = async () => {
    if (!selectedBoardId.trim()) {
      toast.error('Por favor ingresa un Board ID');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      await axios.put(
        `${BACKEND_URL}/api/admin/monday/config`,
        { board_id: selectedBoardId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Board ID guardado correctamente');
      setConfigDialog(false);
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async () => {
    if (!status?.board_id_configured) {
      toast.error('Configura el Board ID primero');
      return;
    }

    try {
      setTesting(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`${BACKEND_URL}/api/admin/monday/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error probando integración');
    } finally {
      setTesting(false);
    }
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
          <h2 className="text-2xl font-serif font-bold">Integración Monday.com</h2>
          <p className="text-muted-foreground">
            Los pedidos se envían automáticamente a tu tablero de Monday.com
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfigDialog(true)} className="gap-2">
          <Settings className="h-4 w-4" />
          Configurar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.api_key_configured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Configurada</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">No configurada</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Board ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.board_id_configured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Configurado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-yellow-600">Pendiente</span>
                </>
              )}
            </div>
            {status?.board_id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {status.board_id}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">Desconectado</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Board Selection */}
      {status?.connected && status?.boards?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tableros Disponibles</CardTitle>
            <CardDescription>
              Haz clic en un tablero para seleccionarlo como destino de los pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {status.boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => {
                    setSelectedBoardId(board.id);
                    setConfigDialog(true);
                  }}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    status.board_id === board.id 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{board.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {board.id}
                  </p>
                  {status.board_id === board.id && (
                    <Badge variant="default" className="mt-2">Activo</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={testIntegration}
          disabled={testing || !status?.board_id_configured}
          className="gap-2"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Probar Integración
        </Button>
        <Button variant="outline" onClick={fetchStatus} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
        <a 
          href="https://monday.com" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Abrir Monday.com
          </Button>
        </a>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Monday.com Board</DialogTitle>
            <DialogDescription>
              Ingresa el ID del tablero donde se enviarán los pedidos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="board-id">Board ID</Label>
              <Input
                id="board-id"
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                placeholder="Ejemplo: 1234567890"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Puedes seleccionar un tablero de la lista o ingresar el ID manualmente
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfigDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveBoardId} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      {!status?.board_id_configured && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ¿Cómo configurar?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 dark:text-blue-300">
            <ol className="list-decimal list-inside space-y-2">
              <li>Selecciona un tablero de la lista de arriba o haz clic en &quot;Configurar&quot;</li>
              <li>Ingresa el Board ID y guarda</li>
              <li>Haz clic en &quot;Probar Integración&quot; para verificar</li>
              <li>¡Listo! Los pedidos se enviarán automáticamente</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
