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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Save,
  Building2,
  Plus,
  Trash2,
  Key,
  BookOpen,
  LayoutGrid,
  Plug,
  Layers
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MondayModule() {
  const [activeTab, setActiveTab] = useState('workspaces');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('auth_token');

  // Estado de conexión
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Workspaces
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Boards disponibles
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [groups, setGroups] = useState([]);

  // Configuración de Libros (Store)
  const [storeConfig, setStoreConfig] = useState({
    board_id: '',
    group_id: '',
    auto_sync: true,
    column_mapping: {
      estudiante: 'text',
      grado: 'text0',
      acudiente: 'text4',
      libros: 'long_text',
      total: 'numbers',
      estado: 'status',
      fecha: 'date',
      pedido_id: 'text6'
    },
    // Configuración de subitems para productos
    subitems_enabled: false,
    subitem_column_mapping: {
      nombre: 'name',
      cantidad: 'numbers',
      precio_unitario: 'numbers0',
      subtotal: 'numbers1',
      codigo: 'text',
      materia: 'text0',
      estado: 'status'
    }
  });
  const [savingStoreConfig, setSavingStoreConfig] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  
  // Columnas de subitems
  const [subitemColumns, setSubitemColumns] = useState([]);

  // Configuración General (legacy)
  const [legacyStatus, setLegacyStatus] = useState(null);
  const [legacyBoardId, setLegacyBoardId] = useState('');
  const [savingLegacy, setSavingLegacy] = useState(false);
  const [testingLegacy, setTestingLegacy] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (storeConfig.board_id) {
      loadBoardColumns(storeConfig.board_id);
    }
  }, [storeConfig.board_id]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadWorkspaces(),
      testConnection(),
      loadStoreConfig(),
      loadLegacyStatus()
    ]);
    setLoading(false);
  };

  // ========== WORKSPACES ==========
  const loadWorkspaces = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/workspaces`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data?.workspaces || []);
        setActiveWorkspaceId(data?.active_workspace_id);
      }
    } catch (err) {
      console.error('Error loading workspaces:', err);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API}/api/store/monday/test-connection`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setConnected(data.connected || false);
      setConnectionInfo(data);
      
      if (data.connected) {
        loadBoards();
      }
    } catch (err) {
      setConnected(false);
      setConnectionInfo({ error: 'Error de conexión' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddWorkspace = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('Ingresa una API Key válida');
      return;
    }
    
    setSavingWorkspace(true);
    try {
      const res = await fetch(`${API}/api/store/monday/workspaces`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKeyInput })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error agregando workspace');
      }
      
      const data = await res.json();
      toast.success(`Workspace "${data.workspace_name}" agregado`);
      setApiKeyInput('');
      setShowApiKeyInput(false);
      await loadWorkspaces();
      await testConnection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleActivateWorkspace = async (workspaceId) => {
    try {
      const res = await fetch(`${API}/api/store/monday/workspaces/${workspaceId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error activando workspace');
      
      toast.success('Workspace activado');
      await loadWorkspaces();
      await testConnection();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveWorkspace = async (workspaceId) => {
    if (!confirm('¿Estás seguro de eliminar este workspace?')) return;
    
    try {
      const res = await fetch(`${API}/api/store/monday/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error eliminando workspace');
      
      toast.success('Workspace eliminado');
      await loadWorkspaces();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ========== BOARDS ==========
  const loadBoards = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/boards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBoards(data.boards || []);
    } catch (err) {
      console.error('Error loading boards:', err);
    }
  };

  const loadBoardColumns = async (boardId) => {
    try {
      const res = await fetch(`${API}/api/store/monday/boards/${boardId}/columns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setColumns(data.columns || []);
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Error loading columns:', err);
    }
  };

  // ========== STORE CONFIG (Libros) ==========
  const loadStoreConfig = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setStoreConfig(prev => ({
          ...prev,
          ...data,
          board_id: data.board_id || '',
          group_id: data.group_id || '',
          auto_sync: data.auto_sync !== false,
          subitems_enabled: data.subitems_enabled || false,
          subitem_column_mapping: data.subitem_column_mapping || prev.subitem_column_mapping
        }));
      }
    } catch (err) {
      console.error('Error loading store config:', err);
    }
  };

  const handleSaveStoreConfig = async () => {
    setSavingStoreConfig(true);
    try {
      const res = await fetch(`${API}/api/store/monday/config`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeConfig)
      });
      
      if (!res.ok) throw new Error('Error guardando configuración');
      toast.success('Configuración de Libros guardada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStoreConfig(false);
    }
  };

  const handleSyncAllOrders = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch(`${API}/api/store/monday/sync-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Sincronizados: ${data.synced}, Fallidos: ${data.failed}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  // ========== LEGACY (General) ==========
  const loadLegacyStatus = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/monday/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLegacyStatus(response.data);
      setLegacyBoardId(response.data.board_id || '');
    } catch (error) {
      console.error('Error loading legacy status:', error);
    }
  };

  const handleSaveLegacyBoard = async () => {
    if (!legacyBoardId.trim()) {
      toast.error('Por favor ingresa un Board ID');
      return;
    }

    try {
      setSavingLegacy(true);
      await axios.put(
        `${API}/api/admin/monday/config`,
        { board_id: legacyBoardId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Board ID guardado correctamente');
      loadLegacyStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error guardando configuración');
    } finally {
      setSavingLegacy(false);
    }
  };

  const handleTestLegacy = async () => {
    try {
      setTestingLegacy(true);
      const response = await axios.post(`${API}/api/admin/monday/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error probando integración');
    } finally {
      setTestingLegacy(false);
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
            Configura la conexión y sincronización con Monday.com para diferentes módulos
          </p>
        </div>
        <Button variant="outline" onClick={loadAllData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workspaces" className="gap-2">
            <Building2 className="h-4 w-4" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="libros" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Pedidos de Libros
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* ========== TAB: WORKSPACES ========== */}
        <TabsContent value="workspaces" className="space-y-6 mt-6">
          {/* Estado de conexión */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Conexión Activa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {connected ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Conectado</p>
                        {connectionInfo?.user && (
                          <p className="text-sm text-muted-foreground">
                            {connectionInfo.user.name} ({connectionInfo.user.email})
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <div>
                        <p className="font-medium text-red-600">No conectado</p>
                        <p className="text-sm text-muted-foreground">
                          {connectionInfo?.error || 'Agrega un workspace con API Key válida'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verificar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Workspaces */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Workspaces Configurados
              </CardTitle>
              <CardDescription>
                Cada workspace utiliza su propia API Key. Puedes configurar múltiples cuentas de Monday.com.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspaces.length > 0 && (
                <div className="space-y-2">
                  {workspaces.map((ws) => (
                    <div 
                      key={ws.workspace_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        ws.workspace_id === activeWorkspaceId 
                          ? 'bg-primary/5 border-primary' 
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {ws.workspace_id === activeWorkspaceId ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{ws.name}</p>
                          <p className="text-xs text-muted-foreground">
                            API Key: {ws.api_key_masked}
                            {ws.user_email && ` • ${ws.user_email}`}
                          </p>
                        </div>
                        {ws.workspace_id === activeWorkspaceId && (
                          <Badge variant="default" className="ml-2">Activo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ws.workspace_id !== activeWorkspaceId && !ws.is_env_key && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleActivateWorkspace(ws.workspace_id)}
                          >
                            Activar
                          </Button>
                        )}
                        {!ws.is_env_key && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveWorkspace(ws.workspace_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Agregar nuevo workspace */}
              {showApiKeyInput ? (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <Label>API Key de Monday.com</Label>
                  <p className="text-sm text-muted-foreground">
                    Obtén tu API Key desde: Monday.com → Tu perfil → Admin → API → Personal API tokens
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiJ9..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button onClick={handleAddWorkspace} disabled={savingWorkspace}>
                      {savingWorkspace ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Agregar'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      setShowApiKeyInput(false);
                      setApiKeyInput('');
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setShowApiKeyInput(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Workspace
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info de ayuda */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                ¿Cómo obtener tu API Key?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-300">
              <ol className="list-decimal list-inside space-y-2">
                <li>Inicia sesión en Monday.com</li>
                <li>Haz clic en tu foto de perfil (esquina superior derecha)</li>
                <li>Ve a <strong>Administration</strong> → <strong>Developers</strong></li>
                <li>En la sección <strong>My access tokens</strong>, haz clic en <strong>Show</strong></li>
                <li>Copia tu token personal y pégalo aquí</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB: LIBROS ========== */}
        <TabsContent value="libros" className="space-y-6 mt-6">
          {!connected ? (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Conexión requerida</p>
                    <p className="text-sm text-yellow-700">
                      Primero configura un workspace en la pestaña &quot;Workspaces&quot; para poder configurar los pedidos de libros.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selección de Board */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Board de Pedidos de Libros
                  </CardTitle>
                  <CardDescription>
                    Selecciona el tablero donde se sincronizarán los pedidos de libros escolares (Books de Light).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Board de Pedidos</Label>
                      <Select 
                        value={storeConfig.board_id || ''} 
                        onValueChange={(v) => setStoreConfig(prev => ({...prev, board_id: v}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un board" />
                        </SelectTrigger>
                        <SelectContent>
                          {boards.map((board) => (
                            <SelectItem key={board.id} value={board.id}>
                              {board.name} ({board.items_count || 0} items)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {groups.length > 0 && (
                      <div className="space-y-2">
                        <Label>Grupo (opcional)</Label>
                        <Select 
                          value={storeConfig.group_id || 'none'} 
                          onValueChange={(v) => setStoreConfig(prev => ({...prev, group_id: v === 'none' ? '' : v}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin grupo específico</SelectItem>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="auto-sync-libros"
                      checked={storeConfig.auto_sync}
                      onCheckedChange={(checked) => setStoreConfig(prev => ({...prev, auto_sync: checked}))}
                    />
                    <Label htmlFor="auto-sync-libros">Sincronizar automáticamente al cambiar estado de pedidos</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Mapeo de columnas */}
              {storeConfig.board_id && columns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Mapeo de Columnas</CardTitle>
                    <CardDescription>
                      Asocia cada campo del pedido con una columna de Monday.com
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['estudiante', 'grado', 'acudiente', 'libros', 'total', 'estado', 'fecha', 'pedido_id'].map((field) => (
                        <div key={field} className="space-y-2">
                          <Label className="capitalize">{field.replace('_', ' ')}</Label>
                          <Select 
                            value={storeConfig.column_mapping?.[field] || 'none'} 
                            onValueChange={(v) => setStoreConfig(prev => ({
                              ...prev, 
                              column_mapping: {
                                ...prev.column_mapping,
                                [field]: v === 'none' ? '' : v
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Columna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No mapear</SelectItem>
                              {columns.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.title} ({col.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Configuración de Subitems (Productos) */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Subitems (Productos del Pedido)
                      </CardTitle>
                      <CardDescription>
                        Crear un subitem en Monday.com por cada producto del pedido
                      </CardDescription>
                    </div>
                    <Switch
                      checked={storeConfig.subitems_enabled}
                      onCheckedChange={(checked) => setStoreConfig(prev => ({
                        ...prev,
                        subitems_enabled: checked
                      }))}
                    />
                  </div>
                </CardHeader>
                
                {storeConfig.subitems_enabled && (
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        📦 Cada producto del pedido se creará como un subitem dentro del item principal.
                        Asegúrate de que el board tenga subitems habilitados en Monday.com.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'cantidad', label: 'Cantidad', icon: '🔢' },
                        { key: 'precio_unitario', label: 'Precio Unitario', icon: '💰' },
                        { key: 'subtotal', label: 'Subtotal', icon: '💵' },
                        { key: 'codigo', label: 'Código/ISBN', icon: '📖' },
                        { key: 'materia', label: 'Materia/Categoría', icon: '📚' },
                        { key: 'estado', label: 'Estado', icon: '📋' }
                      ].map(({ key, label, icon }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <Label className="min-w-[120px]">{label}</Label>
                          <Select
                            value={storeConfig.subitem_column_mapping?.[key] || 'none'}
                            onValueChange={(value) => setStoreConfig(prev => ({
                              ...prev,
                              subitem_column_mapping: {
                                ...prev.subitem_column_mapping,
                                [key]: value
                              }
                            }))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleccionar columna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin mapear</SelectItem>
                              <SelectItem value="numbers">numbers (Número)</SelectItem>
                              <SelectItem value="numbers0">numbers0</SelectItem>
                              <SelectItem value="numbers1">numbers1</SelectItem>
                              <SelectItem value="numbers2">numbers2</SelectItem>
                              <SelectItem value="text">text (Texto)</SelectItem>
                              <SelectItem value="text0">text0</SelectItem>
                              <SelectItem value="text1">text1</SelectItem>
                              <SelectItem value="status">status (Estado)</SelectItem>
                              <SelectItem value="status0">status0</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      💡 El nombre del producto se usa automáticamente como nombre del subitem.
                      Si no conoces los IDs de las columnas, puedes verlos en la configuración del board de Monday.com.
                    </p>
                  </CardContent>
                )}
              </Card>

              {/* Acciones */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 flex-wrap">
                    <Button onClick={handleSaveStoreConfig} disabled={savingStoreConfig || !storeConfig.board_id}>
                      {savingStoreConfig ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar Configuración
                    </Button>
                    
                    <Button variant="outline" onClick={handleSyncAllOrders} disabled={syncingAll || !storeConfig.board_id}>
                      {syncingAll ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar Todos los Pedidos
                    </Button>
                    
                    {storeConfig.board_id && (
                      <a 
                        href={`https://view.monday.com/board/${storeConfig.board_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Board en Monday.com
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== TAB: GENERAL ========== */}
        <TabsContent value="general" className="space-y-6 mt-6">
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
                  {legacyStatus?.api_key_configured ? (
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
                  Board ID General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {legacyStatus?.board_id_configured ? (
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
                {legacyStatus?.board_id && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {legacyStatus.board_id}
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
                  {legacyStatus?.connected ? (
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
          {legacyStatus?.connected && legacyStatus?.boards?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tableros Disponibles</CardTitle>
                <CardDescription>
                  Selecciona un tablero como destino general para integraciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {legacyStatus.boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => setLegacyBoardId(board.id)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        legacyStatus.board_id === board.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{board.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        ID: {board.id}
                      </p>
                      {legacyStatus.board_id === board.id && (
                        <Badge variant="default" className="mt-2">Activo</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Board ID Input */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración Manual</CardTitle>
              <CardDescription>
                Ingresa el Board ID manualmente si no aparece en la lista
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={legacyBoardId}
                  onChange={(e) => setLegacyBoardId(e.target.value)}
                  placeholder="Board ID (ej: 1234567890)"
                  className="font-mono"
                />
                <Button onClick={handleSaveLegacyBoard} disabled={savingLegacy}>
                  {savingLegacy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button 
              onClick={handleTestLegacy}
              disabled={testingLegacy || !legacyStatus?.board_id_configured}
              className="gap-2"
            >
              {testingLegacy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Probar Integración
            </Button>
            <Button variant="outline" onClick={loadLegacyStatus} className="gap-2">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
