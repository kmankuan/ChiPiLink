import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import BookOrdersMondayTab from './components/BookOrdersMondayTab';
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

import TxbInventoryTab from './components/TxbInventoryTab';
import WebhooksTab from './components/WebhooksTab';
import StatusMappingTab from './components/StatusMappingTab';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MondayModule() {
  const [activeTab, setActiveTab] = useState('workspaces');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('auth_token');

  // Connection status
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Workspaces
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Available boards
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [groups, setGroups] = useState([]);

  // Store configuration (Books)
  const [storeConfig, setStoreConfig] = useState({
    board_id: '',
    group_id: '',
    auto_sync: true,
    column_mapping: {
      student: 'text',
      grade: 'text0',
      guardian: 'text4',
      books: 'long_text',
      total: 'numbers',
      status: 'status',
      date: 'date',
      order_id: 'text6'
    },
    // Subitem configuration for products
    subitems_enabled: false,
    subitem_column_mapping: {
      name: 'name',
      quantity: 'numbers',
      unit_price: 'numbers0',
      subtotal: 'numbers1',
      code: 'text',
      subject: 'text0',
      status: 'status'
    }
  });
  const [savingStoreConfig, setSavingStoreConfig] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  
  // Subitem columns
  const [subitemColumns, setSubitemColumns] = useState([]);

  // General configuration (legacy)
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
      toast.error('Enter a valid API Key');
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
        throw new Error(errData.detail || 'Error adding workspace');
      }
      
      const data = await res.json();
      toast.success(`Workspace "${data.workspace_name}" added`);
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
      
      if (!res.ok) throw new Error('Error activating workspace');
      
      toast.success('Workspace activated');
      await loadWorkspaces();
      await testConnection();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveWorkspace = async (workspaceId) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return;
    
    try {
      const res = await fetch(`${API}/api/store/monday/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error deleting workspace');
      
      toast.success('Workspace deleted');
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
      
      if (!res.ok) throw new Error('Error saving configuration');
      toast.success('Books configuration saved');
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
        toast.success(`Synced: ${data.synced}, Failed: ${data.failed}`);
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
      toast.error('Please enter a Board ID');
      return;
    }

    try {
      setSavingLegacy(true);
      await axios.put(
        `${API}/api/admin/monday/config`,
        { board_id: legacyBoardId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Board ID saved successfully');
      loadLegacyStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving configuration');
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
      toast.error(error.response?.data?.detail || 'Error testing integration');
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
          <h2 className="text-2xl font-serif font-bold">Monday.com Integration</h2>
          <p className="text-muted-foreground">
            Configure connection and sync with Monday.com for different modules
          </p>
        </div>
        <Button variant="outline" onClick={loadAllData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="workspaces" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="libros" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Book Orders
          </TabsTrigger>
          <TabsTrigger value="txb-inventory" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            TXB Inventory
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
            <Plug className="h-3.5 w-3.5" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="status-mapping" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Status Mapping
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
        </TabsList>

        {/* ========== TAB: WORKSPACES ========== */}
        <TabsContent value="workspaces" className="space-y-6 mt-6">
          {/* Connection status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Active Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {connected ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Connected</p>
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
                        <p className="font-medium text-red-600">Not connected</p>
                        <p className="text-sm text-muted-foreground">
                          {connectionInfo?.error || 'Add a workspace with a valid API Key'}
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
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workspaces List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configured Workspaces
              </CardTitle>
              <CardDescription>
                Each workspace uses its own API Key. You can configure multiple Monday.com accounts.
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
                          <Badge variant="default" className="ml-2">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ws.workspace_id !== activeWorkspaceId && !ws.is_env_key && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleActivateWorkspace(ws.workspace_id)}
                          >
                            Activate
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
              
              {/* Add new workspace */}
              {showApiKeyInput ? (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <Label>Monday.com API Key</Label>
                  <p className="text-sm text-muted-foreground">
                    Get your API Key from: Monday.com → Your profile → Admin → API → Personal API tokens
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
                        'Add'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      setShowApiKeyInput(false);
                      setApiKeyInput('');
                    }}>
                      Cancel
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
                  Add Workspace
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Help info */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                How to get your API Key?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-300">
              <ol className="list-decimal list-inside space-y-2">
                <li>Log in to Monday.com</li>
                <li>Click your profile picture (top right corner)</li>
                <li>Go to <strong>Administration</strong> → <strong>Developers</strong></li>
                <li>In the <strong>My access tokens</strong> section, click <strong>Show</strong></li>
                <li>Copy your personal token and paste it here</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB: BOOKS ========== */}
        <TabsContent value="libros" className="mt-6">
          <BookOrdersMondayTab connected={connected} boards={boards} />
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
                      <span className="font-medium text-green-600">Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-600">Not configured</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

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
                      <span className="font-medium text-green-600">Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-600">Not configured</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  General Board ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {legacyStatus?.board_id_configured ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-600">Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium text-yellow-600">Pending</span>
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
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {legacyStatus?.connected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-600">Disconnected</span>
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
                <CardTitle>Available Boards</CardTitle>
                <CardDescription>
                  Select a board as general destination for integrations
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
                        <Badge variant="default" className="mt-2">Active</Badge>
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
              <CardTitle>Manual Configuration</CardTitle>
              <CardDescription>
                Enter the Board ID manually if it doesn't appear in the list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={legacyBoardId}
                  onChange={(e) => setLegacyBoardId(e.target.value)}
                  placeholder="Board ID (e.g. 1234567890)"
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
              Test Integration
            </Button>
            <Button variant="outline" onClick={loadLegacyStatus} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
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

        {/* ========== TAB: TXB INVENTORY ========== */}
        <TabsContent value="txb-inventory" className="mt-6">
          <TxbInventoryTab />
        </TabsContent>

        {/* ========== TAB: WEBHOOKS ========== */}
        <TabsContent value="webhooks" className="mt-6">
          <WebhooksTab />
        </TabsContent>

        {/* ========== TAB: STATUS MAPPING ========== */}
        <TabsContent value="status-mapping" className="mt-6">
          <StatusMappingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
