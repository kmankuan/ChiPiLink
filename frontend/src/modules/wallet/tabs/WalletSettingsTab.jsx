/**
 * WalletSettingsTab — Monday.com integration config + webhook logs
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Wallet, Copy, Loader2, Save, CheckCircle2, Info,
  RefreshCw, AlertTriangle, Clock, ScrollText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletSettingsTab() {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    board_id: '',
    column_mapping: { email: 'email' },
    subitem_column_mapping: { amount: 'numeric_mm0ep8ka', note: 'text_mkwrw3fp', status: 'color_mm0ewpq0' },
    status_labels: { add: 'Added', deduct: 'Deducted', stuck: 'Stuck' },
    enabled: true,
  });
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const walletWebhookUrl = `${window.location.origin}/api/monday/webhooks/incoming`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (e) {
      console.error('Failed to fetch wallet config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/logs?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); fetchLogs(); }, [fetchConfig, fetchLogs]);

  const handleSave = async () => {
    if (!config.board_id) { toast.error('Board ID is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (res.ok) { toast.success('Config saved'); fetchConfig(); }
      else { const err = await res.json(); toast.error(err.detail || 'Failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const copyUrl = (url) => { navigator.clipboard.writeText(url); toast.success('URL copied'); };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

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
              <li>Add a <strong>subitem</strong> under the customer's item on Customers Admin board</li>
              <li>Set the <strong>Chipi Wallet</strong> column to the amount</li>
              <li>Change the <strong>Wallet Event</strong> status to "<strong>Added</strong>" or "<strong>Deducted</strong>"</li>
              <li>Monday.com automation sends webhook → user's wallet is updated</li>
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
          <p className="text-[10px] text-muted-foreground">Use this URL in your Monday.com automation: "When subitem's column changes → Send webhook"</p>
        </CardContent>
      </Card>

      {/* Board + Column Config */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Board Configuration</CardTitle>
              <CardDescription className="text-xs mt-1">Customers Admin board columns</CardDescription>
            </div>
            <Badge variant={config.board_id ? 'default' : 'secondary'} className="text-[10px] gap-1">
              {config.board_id ? <><CheckCircle2 className="h-3 w-3" /> Configured</> : 'Not configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Board ID</Label>
            <Input value={config.board_id} onChange={(e) => setConfig(p => ({ ...p, board_id: e.target.value }))}
              placeholder="5931665026" className="font-mono" data-testid="wallet-board-id-input" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer Email Column ID</Label>
            <Input value={config.column_mapping?.email || ''} onChange={(e) => setConfig(p => ({
              ...p, column_mapping: { ...p.column_mapping, email: e.target.value }
            }))} placeholder="email" className="font-mono text-xs" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subitem Columns</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chipi Wallet (Amount)</Label>
                <Input value={config.subitem_column_mapping?.amount || ''} onChange={(e) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, amount: e.target.value }
                }))} className="font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nota (Description)</Label>
                <Input value={config.subitem_column_mapping?.note || ''} onChange={(e) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, note: e.target.value }
                }))} className="font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Wallet Event (Status)</Label>
                <Input value={config.subitem_column_mapping?.status || ''} onChange={(e) => setConfig(p => ({
                  ...p, subitem_column_mapping: { ...p.subitem_column_mapping, status: e.target.value }
                }))} className="font-mono text-xs" />
              </div>
            </div>
          </div>

          {/* Status Labels */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status Labels</Label>
            <p className="text-xs text-muted-foreground">Must match exactly what's in your Monday.com "Wallet Event" status column</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Top-Up Label</Label>
                <Input value={config.status_labels?.add || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, add: e.target.value }
                }))} className="text-xs border-green-200" data-testid="status-add-label" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-red-700">Deduct Label</Label>
                <Input value={config.status_labels?.deduct || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, deduct: e.target.value }
                }))} className="text-xs border-red-200" data-testid="status-deduct-label" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-amber-700">Stuck Label</Label>
                <Input value={config.status_labels?.stuck || ''} onChange={(e) => setConfig(p => ({
                  ...p, status_labels: { ...p.status_labels, stuck: e.target.value }
                }))} className="text-xs border-amber-200" />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2" data-testid="save-wallet-config-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4" /> Webhook Event Log
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading} className="gap-1">
              <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <CardDescription className="text-xs">Recent webhook events for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No webhook events received yet. Make sure your Monday.com automation is sending webhooks to the URL above.
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
