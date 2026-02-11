/**
 * WalletSettingsTab — Dynamic board selector + column mapping + webhook logs
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Wallet, Copy, Loader2, Save, CheckCircle2, Info,
  RefreshCw, AlertTriangle, Clock, ScrollText, Search
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletSettingsTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config state
  const [config, setConfig] = useState({
    board_id: '',
    column_mapping: { email: '' },
    subitem_column_mapping: { amount: '', note: '', status: '' },
    status_labels: { add: 'Added', deduct: 'Deducted', stuck: 'Stuck' },
    enabled: true,
  });

  // Board & column discovery
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [itemColumns, setItemColumns] = useState([]);
  const [subitemColumns, setSubitemColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Status column labels (from Monday.com)
  const [statusLabels, setStatusLabels] = useState([]);

  // Webhook logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const walletWebhookUrl = `${window.location.origin}/api/monday/webhooks/incoming`;

  // Fetch saved config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/monday/adapters/wallet/config`, { headers });
      if (res.data.config) {
        setConfig(prev => ({ ...prev, ...res.data.config }));
        // If board_id is set, load its columns
        if (res.data.config.board_id) {
          fetchColumns(res.data.config.board_id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch boards
  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await axios.get(`${API}/api/monday/boards`, { headers });
      // Filter out subitem boards
      const mainBoards = (res.data.boards || []).filter(b => !b.name.startsWith('Subitems of'));
      setBoards(mainBoards);
    } catch {
      toast.error('Error loading boards');
    } finally {
      setLoadingBoards(false);
    }
  };

  // Fetch columns for a board
  const fetchColumns = async (boardId) => {
    if (!boardId) return;
    setLoadingColumns(true);
    try {
      const [itemRes, subitemRes] = await Promise.all([
        axios.get(`${API}/api/monday/boards/${boardId}/columns`, { headers }),
        axios.get(`${API}/api/monday/boards/${boardId}/subitem-columns`, { headers }),
      ]);
      setItemColumns(itemRes.data.columns || []);
      const subCols = subitemRes.data.columns || [];
      setSubitemColumns(subCols);

      // Extract status labels from the wallet event column settings
      const walletStatusCol = subCols.find(c => c.type === 'status' && c.id === config.subitem_column_mapping?.status);
      // We'll let the user set labels manually since we can't easily get them from the column list
    } catch (e) {
      console.error('Error loading columns:', e);
    } finally {
      setLoadingColumns(false);
    }
  };

  // Fetch webhook logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await axios.get(`${API}/api/monday/adapters/wallet/logs?limit=20`, { headers });
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    fetchBoards();
    fetchLogs();
  }, [fetchConfig, fetchLogs]);

  // Handle board selection
  const handleBoardSelect = (boardId) => {
    setConfig(prev => ({ ...prev, board_id: boardId }));
    fetchColumns(boardId);
  };

  // Handle save
  const handleSave = async () => {
    if (!config.board_id) { toast.error('Select a board first'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/api/monday/adapters/wallet/config`, { config }, { headers });
      toast.success('Wallet settings saved');
      fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (url) => { navigator.clipboard.writeText(url); toast.success('URL copied'); };
  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  // Column type filters for dropdowns
  const emailColumns = itemColumns.filter(c => ['email', 'text', 'mirror'].includes(c.type));
  const numberColumns = subitemColumns.filter(c => ['numbers', 'numeric'].includes(c.type));
  const textColumns = subitemColumns.filter(c => ['text', 'long_text'].includes(c.type));
  const statusColumns = subitemColumns.filter(c => c.type === 'status');

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">Wallet Top-Up Workflow:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Select the board where your customers are managed</li>
              <li>Map the customer email column and subitem wallet columns</li>
              <li>Add a <strong>subitem</strong> → set <strong>Chipi Wallet</strong> amount → change <strong>Wallet Event</strong> status</li>
              <li>Monday.com automation sends webhook → wallet is updated</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Webhook URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input value={walletWebhookUrl} readOnly className="text-xs font-mono bg-muted" data-testid="wallet-webhook-url" />
            <Button variant="ghost" size="icon" onClick={() => copyUrl(walletWebhookUrl)}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Monday.com automation: "When subitem's column changes → Send webhook" to this URL</p>
        </CardContent>
      </Card>

      {/* Board Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">1. Choose Board</CardTitle>
              <CardDescription className="text-xs mt-1">Select the Monday.com board where customers are managed</CardDescription>
            </div>
            {config.board_id && <Badge className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Board selected</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <Select value={config.board_id || ''} onValueChange={handleBoardSelect}>
            <SelectTrigger data-testid="board-selector">
              <SelectValue placeholder={loadingBoards ? "Loading boards..." : "Select a board"} />
            </SelectTrigger>
            <SelectContent>
              {boards.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} <span className="text-muted-foreground ml-1 text-[10px]">({b.id})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Column Mapping - Item (Customer) */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Map Customer Item Columns</CardTitle>
            <CardDescription className="text-xs mt-1">
              Map the column that contains the customer's email on the main board items
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingColumns ? (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading columns...
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Email Column</Label>
                <Select
                  value={config.column_mapping?.email || ''}
                  onValueChange={(v) => setConfig(p => ({ ...p, column_mapping: { ...p.column_mapping, email: v } }))}
                >
                  <SelectTrigger data-testid="email-column-selector">
                    <SelectValue placeholder="Select email column" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailColumns.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id} ({c.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Mapping - Subitem (Wallet Event) */}
      {config.board_id && subitemColumns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Map Subitem Columns</CardTitle>
            <CardDescription className="text-xs mt-1">
              Map the subitem columns for wallet amount, notes, and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Column */}
            <div className="space-y-2">
              <Label className="text-sm">Chipi Wallet (Amount)</Label>
              <Select
                value={config.subitem_column_mapping?.amount || ''}
                onValueChange={(v) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, amount: v }
                }))}
              >
                <SelectTrigger data-testid="amount-column-selector">
                  <SelectValue placeholder="Select amount column" />
                </SelectTrigger>
                <SelectContent>
                  {numberColumns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note Column */}
            <div className="space-y-2">
              <Label className="text-sm">Note / Description</Label>
              <Select
                value={config.subitem_column_mapping?.note || ''}
                onValueChange={(v) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, note: v }
                }))}
              >
                <SelectTrigger data-testid="note-column-selector">
                  <SelectValue placeholder="Select note column" />
                </SelectTrigger>
                <SelectContent>
                  {textColumns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Column */}
            <div className="space-y-2">
              <Label className="text-sm">Wallet Event (Status)</Label>
              <Select
                value={config.subitem_column_mapping?.status || ''}
                onValueChange={(v) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, status: v }
                }))}
              >
                <SelectTrigger data-testid="status-column-selector">
                  <SelectValue placeholder="Select status column" />
                </SelectTrigger>
                <SelectContent>
                  {statusColumns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Labels */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Status Labels</CardTitle>
            <CardDescription className="text-xs mt-1">
              Must match exactly what's in your Monday.com "Wallet Event" status column
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Top-Up Label</Label>
                <Input value={config.status_labels?.add || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, add: e.target.value }
                }))} className="text-sm border-green-200" data-testid="status-add-label" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-red-700">Deduct Label</Label>
                <Input value={config.status_labels?.deduct || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, deduct: e.target.value }
                }))} className="text-sm border-red-200" data-testid="status-deduct-label" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-amber-700">Stuck Label</Label>
                <Input value={config.status_labels?.stuck || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, stuck: e.target.value }
                }))} className="text-sm border-amber-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      {config.board_id && (
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg" data-testid="save-wallet-config-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </Button>
      )}

      {/* Webhook Logs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4" /> Webhook Event Log</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading} className="gap-1">
              <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <CardDescription className="text-xs">Recent webhook events for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No webhook events received yet. Set up your Monday.com automation to send webhooks.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                  log.status === 'success' ? 'bg-green-50 border-green-200' :
                  log.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {log.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      {log.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                      {log.status === 'ignored' && <Clock className="h-3 w-3 text-gray-500" />}
                      <Badge variant="outline" className="text-[10px]">{log.status}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-muted-foreground">{log.detail}</p>
                  {log.result && (
                    <p className="mt-1 font-medium">
                      {log.result.action === 'topup' ? '+' : '-'}${log.result.amount?.toFixed(2)} → {log.result.email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
