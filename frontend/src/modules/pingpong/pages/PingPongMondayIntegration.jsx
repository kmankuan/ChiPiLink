import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  Save,
  Users,
  Swords,
  Trophy,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Play,
  BarChart3
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongMondayIntegration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({
    players_board_id: '',
    matches_board_id: '',
    tournaments_board_id: '',
    auto_sync_players: false,
    auto_sync_matches: true,
    auto_sync_results: true
  });
  const [boards, setBoards] = useState([]);
  const [stats, setStats] = useState(null);
  const [configDialog, setConfigDialog] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch status, config and stats in parallel
      const [statusRes, configRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/pingpong/monday/status`, { headers }),
        axios.get(`${BACKEND_URL}/api/pingpong/monday/config`, { headers }),
        axios.get(`${BACKEND_URL}/api/pingpong/monday/stats`, { headers })
      ]);

      setStatus(statusRes.data);
      setConfig(configRes.data.config);
      setStats(statsRes.data);

      // Fetch boards if API key is configured
      if (configRes.data.has_api_key) {
        try {
          const boardsRes = await axios.get(`${BACKEND_URL}/api/pingpong/monday/boards`, { headers });
          setBoards(boardsRes.data.boards || []);
        } catch (e) {
          console.error('Error fetching boards:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error cargando datos de integración');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const headers = getAuthHeaders();
      await axios.put(`${BACKEND_URL}/api/pingpong/monday/config`, config, { headers });
      toast.success('Configuración guardada');
      setConfigDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const syncPlayers = async () => {
    try {
      setSyncing(true);
      const headers = getAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/api/pingpong/monday/sync/players`, {}, { headers });
      setSyncResults({ type: 'players', ...response.data });
      toast.success(`${response.data.synced_count} jugadores sincronizados`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error sincronizando jugadores');
    } finally {
      setSyncing(false);
    }
  };

  const syncActiveMatches = async () => {
    try {
      setSyncing(true);
      const headers = getAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/api/pingpong/monday/sync/matches/active`, {}, { headers });
      setSyncResults({ type: 'matches', ...response.data });
      toast.success(`${response.data.synced_count} partidos sincronizados`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error sincronizando partidos');
    } finally {
      setSyncing(false);
    }
  };

  const syncResults_action = async () => {
    try {
      setSyncing(true);
      const headers = getAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/api/pingpong/monday/sync/results`, {}, { headers });
      setSyncResults({ type: 'results', ...response.data });
      toast.success(`${response.data.synced_count} resultados sincronizados`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error sincronizando resultados');
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    try {
      setSyncing(true);
      const headers = getAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/api/pingpong/monday/test`, {}, { headers });
      toast.success(`Conectado como: ${response.data.user?.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error de conexión');
    } finally {
      setSyncing(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <img 
              src="https://cdn.monday.com/images/logos/monday_logo_icon.png" 
              alt="Monday.com" 
              className="h-8 w-8"
            />
            Monday.com + Ping Pong
          </h2>
          <p className="text-muted-foreground">
            Sincroniza jugadores, partidos y resultados con Monday.com
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {status?.connection_status === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.connection_status === 'connected' ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">Conectado</span>
              </div>
            ) : status?.connection_status === 'not_configured' ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-600">Sin API Key</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-600">Error</span>
              </div>
            )}
            {status?.monday_user && (
              <p className="text-xs text-muted-foreground mt-1">{status.monday_user}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Board Jugadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {config.players_board_id ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">Configurado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-600">Pendiente</span>
              </div>
            )}
            {config.players_board_id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {config.players_board_id}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Board Partidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {config.matches_board_id ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">Configurado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-600">Pendiente</span>
              </div>
            )}
            {config.matches_board_id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {config.matches_board_id}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Board Torneos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {config.tournaments_board_id ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">Configurado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-600">Pendiente</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sync" className="w-full">
        <TabsList>
          <TabsTrigger value="sync" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sincronización
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          {/* Sync Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sync Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Sincronizar Jugadores
                </CardTitle>
                <CardDescription>
                  Envía la lista de jugadores activos a Monday.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && (
                  <div className="text-sm space-y-1">
                    <p>Total: <span className="font-medium">{stats.players.total}</span></p>
                    <p>Sincronizados: <span className="font-medium text-green-600">{stats.players.synced}</span></p>
                    <p>Pendientes: <span className="font-medium text-yellow-600">{stats.players.pending}</span></p>
                  </div>
                )}
                <Button 
                  onClick={syncPlayers} 
                  disabled={syncing || !config.players_board_id}
                  className="w-full"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Jugadores
                </Button>
              </CardContent>
            </Card>

            {/* Sync Active Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-orange-500" />
                  Sincronizar Partidos
                </CardTitle>
                <CardDescription>
                  Envía partidos pendientes y en curso a Monday.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && (
                  <div className="text-sm space-y-1">
                    <p>Total: <span className="font-medium">{stats.matches.total}</span></p>
                    <p>Sincronizados: <span className="font-medium text-green-600">{stats.matches.synced}</span></p>
                    <p>En Curso: <span className="font-medium text-orange-600">{stats.matches.by_status?.en_curso || 0}</span></p>
                    <p>Pendientes: <span className="font-medium text-yellow-600">{stats.matches.by_status?.pendiente || 0}</span></p>
                  </div>
                )}
                <Button 
                  onClick={syncActiveMatches} 
                  disabled={syncing || !config.matches_board_id}
                  className="w-full"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Partidos
                </Button>
              </CardContent>
            </Card>

            {/* Sync Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  Sincronizar Resultados
                </CardTitle>
                <CardDescription>
                  Actualiza los resultados de partidos finalizados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && (
                  <div className="text-sm space-y-1">
                    <p>Finalizados: <span className="font-medium">{stats.matches.by_status?.finalizado || 0}</span></p>
                    <p>Cancelados: <span className="font-medium text-red-600">{stats.matches.by_status?.cancelado || 0}</span></p>
                  </div>
                )}
                <Button 
                  onClick={syncResults_action} 
                  disabled={syncing || !config.matches_board_id}
                  className="w-full"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Actualizar Resultados
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sync Results Display */}
          {syncResults && (
            <Card className={syncResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {syncResults.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Resultado de Sincronización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{syncResults.synced_count}</p>
                    <p className="text-sm text-muted-foreground">Sincronizados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{syncResults.failed_count}</p>
                    <p className="text-sm text-muted-foreground">Fallidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{syncResults.synced_count + syncResults.failed_count}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
                {syncResults.errors?.length > 0 && (
                  <div className="mt-4 p-3 bg-red-100 rounded text-sm text-red-700">
                    <p className="font-medium mb-1">Errores:</p>
                    <ul className="list-disc list-inside">
                      {syncResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Players Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Estadísticas de Jugadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total de Jugadores</span>
                      <Badge variant="secondary">{stats.players.total}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sincronizados en Monday</span>
                      <Badge variant="default" className="bg-green-500">{stats.players.synced}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Pendientes de Sincronizar</span>
                      <Badge variant="outline">{stats.players.pending}</Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ 
                          width: stats.players.total > 0 
                            ? `${(stats.players.synced / stats.players.total) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {stats.players.total > 0 
                        ? `${Math.round((stats.players.synced / stats.players.total) * 100)}% sincronizado`
                        : 'Sin jugadores'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Matches Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Estadísticas de Partidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total de Partidos</span>
                      <Badge variant="secondary">{stats.matches.total}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Pendientes: {stats.matches.by_status?.pendiente || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span>En Curso: {stats.matches.by_status?.en_curso || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Pausados: {stats.matches.by_status?.pausado || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Finalizados: {stats.matches.by_status?.finalizado || 0}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ 
                          width: stats.matches.total > 0 
                            ? `${(stats.matches.synced / stats.matches.total) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {stats.matches.synced} de {stats.matches.total} sincronizados en Monday
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Integración Monday.com</DialogTitle>
            <DialogDescription>
              Selecciona los tableros donde se sincronizarán los datos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Test Connection Button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={testConnection} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                Probar Conexión
              </Button>
            </div>

            {/* Board Selectors */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Board de Jugadores
                </Label>
                <Select
                  value={config.players_board_id || "none"}
                  onValueChange={(value) => setConfig({ ...config, players_board_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar board..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin configurar</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name} ({board.items_count} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aquí se crearán los jugadores del club
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  Board de Partidos
                </Label>
                <Select
                  value={config.matches_board_id || "none"}
                  onValueChange={(value) => setConfig({ ...config, matches_board_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar board..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin configurar</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name} ({board.items_count} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aquí se crearán los partidos y se actualizarán los resultados
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Board de Torneos (Opcional)
                </Label>
                <Select
                  value={config.tournaments_board_id || "none"}
                  onValueChange={(value) => setConfig({ ...config, tournaments_board_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar board..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin configurar</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name} ({board.items_count} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Manual Board ID Input */}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                O ingresa los Board IDs manualmente:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Board Jugadores"
                  value={config.players_board_id}
                  onChange={(e) => setConfig({ ...config, players_board_id: e.target.value })}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder="Board Partidos"
                  value={config.matches_board_id}
                  onChange={(e) => setConfig({ ...config, matches_board_id: e.target.value })}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder="Board Torneos"
                  value={config.tournaments_board_id}
                  onChange={(e) => setConfig({ ...config, tournaments_board_id: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Auto Sync Options */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Sincronización Automática</p>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-players" className="text-sm font-normal">
                  Sincronizar jugadores automáticamente
                </Label>
                <Switch
                  id="auto-players"
                  checked={config.auto_sync_players}
                  onCheckedChange={(checked) => setConfig({ ...config, auto_sync_players: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-matches" className="text-sm font-normal">
                  Sincronizar partidos nuevos
                </Label>
                <Switch
                  id="auto-matches"
                  checked={config.auto_sync_matches}
                  onCheckedChange={(checked) => setConfig({ ...config, auto_sync_matches: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-results" className="text-sm font-normal">
                  Actualizar resultados automáticamente
                </Label>
                <Switch
                  id="auto-results"
                  checked={config.auto_sync_results}
                  onCheckedChange={(checked) => setConfig({ ...config, auto_sync_results: checked })}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfigDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Configuración
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      {!config.players_board_id && !config.matches_board_id && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ¿Cómo configurar la integración?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <p>1. Asegúrate de que la API Key de Monday.com esté configurada en el sistema</p>
            <p>2. Haz clic en "Configurar" y selecciona los tableros donde quieres sincronizar:</p>
            <ul className="list-disc list-inside ml-4">
              <li><strong>Board de Jugadores:</strong> Lista de jugadores del club con su ELO y nivel</li>
              <li><strong>Board de Partidos:</strong> Registro de partidos con resultados en vivo</li>
              <li><strong>Board de Torneos:</strong> (Opcional) Seguimiento de torneos</li>
            </ul>
            <p>3. Una vez configurado, usa los botones de sincronización para enviar los datos</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
