/**
 * WalletSettingsTab — Dynamic board selector + item-level column mapping + webhook logs
 * 
 * Item-level flow: Each Monday.com item = one wallet transaction
 * Automation: "When Status changes to Added/Deducted → send webhook"
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

  const [config, setConfig] = useState({
    board_id: '',
    column_mapping: { email: '', amount_topup: '', amount_deduct: '', note: '', status: '' },
    status_labels: { add: 'Added', deduct: 'Deducted', stuck: 'Stuck' },
    enabled: true,
  });

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [columns, setColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [descriptions, setDescriptions] = useState({ topup: 'Wallet top-up', deduct: 'Wallet deduction' });
  const [savingDesc, setSavingDesc] = useState(false);

  const walletWebhookUrl = `${window.location.origin}/api/monday/webhooks/incoming`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/monday/adapters/wallet/config`, { headers });
      if (res.data.config) {
        setConfig(prev => ({ ...prev, ...res.data.config }));
        if (res.data.config.board_id) fetchColumns(res.data.config.board_id);
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await axios.get(`${API}/api/monday/boards`, { headers });
      const mainBoards = (res.data.boards || []).filter(b => !b.name.startsWith('Subitems of'));
      setBoards(mainBoards);
    } catch {
      toast.error('Error loading boards');
    } finally {
      setLoadingBoards(false);
    }
  };

  const fetchColumns = async (boardId) => {
    if (!boardId) return;
    setLoadingColumns(true);
    try {
      const res = await axios.get(`${API}/api/monday/boards/${boardId}/columns`, { headers });
      setColumns(res.data.columns || []);
    } catch (e) {
      console.error('Error loading columns:', e);
    } finally {
      setLoadingColumns(false);
    }
  };

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

  useEffect(() => { fetchConfig(); fetchBoards(); fetchLogs(); fetchDescriptions(); }, [fetchConfig, fetchLogs]);

  const fetchDescriptions = async () => {
    try {
      const res = await axios.get(`${API}/api/wallet/admin/default-descriptions`, { headers });
      if (res.data.descriptions) setDescriptions(res.data.descriptions);
    } catch (e) { console.error(e); }
  };

  const saveDescriptions = async () => {
    setSavingDesc(true);
    try {
      await axios.put(`${API}/api/wallet/admin/default-descriptions`, { descriptions }, { headers });
      toast.success('Transaction descriptions saved');
    } catch (e) {
      toast.error('Error saving descriptions');
    } finally {
      setSavingDesc(false);
    }
  };

  const handleBoardSelect = (boardId) => {
    setConfig(prev => ({ ...prev, board_id: boardId }));
    fetchColumns(boardId);
  };

  const updateMapping = (key, value) => {
    setConfig(prev => ({
      ...prev,
      column_mapping: { ...prev.column_mapping, [key]: value }
    }));
  };

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

  const emailColumns = columns.filter(c => ['email', 'text', 'mirror'].includes(c.type));
  const numberColumns = columns.filter(c => ['numbers', 'numeric'].includes(c.type));
  const textColumns = columns.filter(c => ['text', 'long_text'].includes(c.type));
  const statusColumns = columns.filter(c => c.type === 'status');

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">How it works (Item-Level Trigger):</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Each item on the board = one wallet transaction</li>
              <li>Fill in: Email + Top Up amount (or Deduct amount)</li>
              <li>Monday.com automation: <strong>"When Status changes to Added → send webhook"</strong></li>
              <li>Create a second automation: <strong>"When Status changes to Deducted → send webhook"</strong></li>
              <li>Both automations point to the webhook URL below</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Descriptions (user-facing) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Transaction Descriptions</CardTitle>
          <CardDescription className="text-xs">
            Customize the message users see in their wallet transaction history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Top-Up Description</Label>
            <Input value={descriptions.topup || ''} onChange={(e) => setDescriptions(p => ({ ...p, topup: e.target.value }))}
              placeholder="e.g. Wallet top-up" className="text-sm" data-testid="desc-topup-input" />
            <p className="text-[10px] text-muted-foreground">Shown when admin adds funds (e.g. "Recarga de billetera")</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Deduction Description</Label>
            <Input value={descriptions.deduct || ''} onChange={(e) => setDescriptions(p => ({ ...p, deduct: e.target.value }))}
              placeholder="e.g. Wallet deduction" className="text-sm" data-testid="desc-deduct-input" />
            <p className="text-[10px] text-muted-foreground">Shown when admin deducts funds (e.g. "Deduccion de billetera")</p>
          </div>
          <Button onClick={saveDescriptions} disabled={savingDesc} variant="outline" className="w-full gap-2" data-testid="save-descriptions-btn">
            {savingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Descriptions
          </Button>
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
          <p className="text-[10px] text-muted-foreground">Monday.com automation: "When Status changes to something → Send webhook" to this URL</p>
        </CardContent>
      </Card>

      {/* Board Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">1. Choose Board</CardTitle>
              <CardDescription className="text-xs mt-1">Select the Monday.com board for wallet transactions</CardDescription>
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

      {/* Column Mapping (all at item level) */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Map Item Columns</CardTitle>
            <CardDescription className="text-xs mt-1">
              Map the columns on each item: customer email, wallet amount, note, and status trigger
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingColumns ? (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading columns...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1">
                  <Label className="text-sm">Email Column</Label>
                  <Select value={config.column_mapping?.email || ''} onValueChange={(v) => updateMapping('email', v)}>
                    <SelectTrigger data-testid="email-column-selector"><SelectValue placeholder="Select email column" /></SelectTrigger>
                    <SelectContent>
                      {emailColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id} ({c.type})</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Top Up Amount */}
                <div className="space-y-1">
                  <Label className="text-sm">Top Up Amount Column (number)</Label>
                  <Select value={config.column_mapping?.amount_topup || ''} onValueChange={(v) => updateMapping('amount_topup', v)}>
                    <SelectTrigger data-testid="topup-column-selector"><SelectValue placeholder="Select top-up amount column" /></SelectTrigger>
                    <SelectContent>
                      {numberColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Deduct Amount */}
                <div className="space-y-1">
                  <Label className="text-sm">Deduct Amount Column (number)</Label>
                  <Select value={config.column_mapping?.amount_deduct || ''} onValueChange={(v) => updateMapping('amount_deduct', v)}>
                    <SelectTrigger data-testid="deduct-column-selector"><SelectValue placeholder="Select deduct amount column" /></SelectTrigger>
                    <SelectContent>
                      {numberColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Note (optional) */}
                <div className="space-y-1">
                  <Label className="text-sm">Note Column <span className="text-muted-foreground">(optional)</span></Label>
                  <Select value={config.column_mapping?.note || 'none'} onValueChange={(v) => updateMapping('note', v === 'none' ? '' : v)}>
                    <SelectTrigger data-testid="note-column-selector"><SelectValue placeholder="Select note column (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {textColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-sm">Status Column (trigger)</Label>
                  <Select value={config.column_mapping?.status || ''} onValueChange={(v) => updateMapping('status', v)}>
                    <SelectTrigger data-testid="status-column-selector"><SelectValue placeholder="Select status column" /></SelectTrigger>
                    <SelectContent>
                      {statusColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-1 text-[10px]">{c.id}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Labels */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Status Labels</CardTitle>
            <CardDescription className="text-xs mt-1">
              Must match exactly what's in your Monday.com Status column labels
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

      {/* Test Webhook */}
      {config.board_id && <TestWebhookCard headers={headers} />}

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
              No webhook events received yet.
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

      {/* Raw Request Log */}
      <RawWebhookLogs headers={headers} />
    </div>
  );
}

function TestWebhookCard({ headers }) {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('topup');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async () => {
    if (!email || !amount) { toast.error('Email and amount are required'); return; }
    setTesting(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/monday/adapters/wallet/test-webhook`, {
        email, amount: parseFloat(amount), action
      }, { headers });
      setResult(res.data);
      toast.success(`Test ${action} of $${amount} for ${email} succeeded`);
    } catch (err) {
      setResult({ status: 'error', detail: err.response?.data?.detail || err.message });
      toast.error(err.response?.data?.detail || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" /> Test Wallet (Manual)
        </CardTitle>
        <CardDescription className="text-xs">
          Bypass Monday.com and directly test wallet top-up/deduction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">User Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="text-xs" data-testid="test-webhook-email" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount ($)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10.00" className="text-xs" data-testid="test-webhook-amount" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="text-xs" data-testid="test-webhook-action"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="topup">Top Up</SelectItem>
                <SelectItem value="deduct">Deduct</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={runTest} disabled={testing} variant="outline" className="w-full gap-2 text-xs" data-testid="test-webhook-btn">
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
          Run Test
        </Button>
        {result && (
          <div className={`p-2 rounded text-xs ${result.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.status === 'success'
              ? `${result.action} $${result.amount} for ${result.email} — Transaction OK`
              : `Error: ${result.detail}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RawWebhookLogs({ headers }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchRaw = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/monday/adapters/wallet/raw-logs?limit=15`, { headers });
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (expanded) fetchRaw(); }, [expanded]);

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            Raw Incoming Requests (Debug)
          </CardTitle>
          <div className="flex items-center gap-2">
            {expanded && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); fetchRaw(); }} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{expanded ? '▼' : '▶'}</span>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              No raw requests received. Monday.com has not reached this endpoint yet.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="p-2 bg-muted/50 rounded text-[11px] font-mono">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{log.has_challenge ? 'Challenge' : `Board: ${log.board_id || 'N/A'}`}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
