/**
 * SysbookAlertsTab — Stock Alerts & Settings for Sysbook
 * View/dismiss alerts, configure thresholds, trigger stock checks.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  AlertTriangle, Bell, BellOff, CheckCircle, Settings, Search,
  Loader2, RefreshCw, XCircle, Package, Zap, Eye, EyeOff, Archive, Trash2, Undo2
} from 'lucide-react';
import axios from 'axios';
import { BoardHeader } from '@/components/shared/BoardHeader';
import ArchiveTab from '@/components/shared/ArchiveTab';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;
const SYSBOOK_API = `${API_URL}/api/sysbook`;

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400',
};

export default function SysbookAlertsTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [alerts, setAlerts] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [checking, setChecking] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [archiveCount, setArchiveCount] = useState(0);

  const handleArchiveAlert = async (alertId) => {
    try {
      await fetch(`${API_URL}/api/archive/alerts/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: [alertId] }),
      });
      toast.success('Alert archived');
      fetchAlerts();
    } catch { toast.error('Error archiving alert'); }
  };

  const handleArchiveAll = async () => {
    const ids = alerts.map(a => a.alert_id);
    if (!ids.length) return;
    try {
      await fetch(`${API_URL}/api/archive/alerts/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      toast.success(`${ids.length} alerts archived`);
      fetchAlerts();
    } catch { toast.error('Error archiving alerts'); }
  };

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SYSBOOK_API}/alerts`, { headers, params: { status: statusFilter } });
      setAlerts(data.alerts || []);
      setActiveCount(data.active_count || 0);
    } catch { toast.error('Error loading alerts'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SYSBOOK_API}/alerts/settings`, { headers });
      setSettings(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAlerts(); fetchSettings(); }, []);
  useEffect(() => { fetchAlerts(); }, [statusFilter]);

  const handleCheckStock = async () => {
    setChecking(true);
    try {
      const { data } = await axios.post(`${SYSBOOK_API}/alerts/check-stock`, {}, { headers });
      toast.success(`Stock check complete: ${data.new_alerts} new alerts, ${data.checked} products checked`);
      fetchAlerts();
    } catch { toast.error('Error checking stock'); }
    finally { setChecking(false); }
  };

  const handleDismiss = async (alertId) => {
    try {
      await axios.post(`${SYSBOOK_API}/alerts/dismiss`, { alert_ids: [alertId] }, { headers });
      toast.success('Alert dismissed');
      fetchAlerts();
    } catch { toast.error('Error dismissing'); }
  };

  const handleDismissAll = async () => {
    if (!confirm(`Dismiss all ${activeCount} active alerts?`)) return;
    try {
      const { data } = await axios.post(`${SYSBOOK_API}/alerts/dismiss-all`, {}, { headers });
      toast.success(`${data.dismissed} alerts dismissed`);
      fetchAlerts();
    } catch { toast.error('Error dismissing'); }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const { data } = await axios.put(`${SYSBOOK_API}/alerts/settings`, {
        global_low_stock_threshold: settings.global_low_stock_threshold,
        enable_push_notifications: settings.enable_push_notifications,
        enable_in_app_notifications: settings.enable_in_app_notifications,
      }, { headers });
      setSettings(data);
      toast.success('Settings saved');
      setShowSettings(false);
    } catch { toast.error('Error saving settings'); }
    finally { setSavingSettings(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3" data-testid="sysbook-alerts">
      <BoardHeader
        title="Stock Alerts"
        icon={AlertTriangle}
        subtitle="Monitor low stock and out-of-stock textbooks"
        stats={[
          { label: 'active alerts', value: activeCount, color: activeCount > 0 ? 'red' : 'default', highlight: activeCount > 0 },
          ...(settings ? [{ label: 'threshold', value: `${settings.global_low_stock_threshold} units`, color: 'default' }] : []),
        ]}
        loading={loading}
        onRefresh={fetchAlerts}
        actions={
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleCheckStock} disabled={checking} data-testid="check-stock-btn">
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Check Stock
            </Button>
            {activeCount > 0 && (
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-amber-600" onClick={handleDismissAll} data-testid="dismiss-all-btn">
                <BellOff className="h-3 w-3" /> Dismiss All
              </Button>
            )}
            <Button variant={showSettings ? 'default' : 'outline'} size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowSettings(!showSettings)} data-testid="alert-settings-btn">
              <Settings className="h-3 w-3" /> Settings
            </Button>
          </div>
        }
      />

      {/* Settings Panel */}
      {showSettings && settings && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Alert Settings</CardTitle>
            <CardDescription className="text-xs">Configure stock alert thresholds and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Low Stock Threshold (units)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.global_low_stock_threshold || 10}
                  onChange={e => setSettings(s => ({ ...s, global_low_stock_threshold: parseInt(e.target.value) || 10 }))}
                  className="h-8 text-sm"
                  data-testid="threshold-input"
                />
                <p className="text-[10px] text-muted-foreground">Products with stock at or below this number will trigger alerts</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Push Notifications</Label>
                  <Switch
                    checked={settings.enable_push_notifications ?? true}
                    onCheckedChange={v => setSettings(s => ({ ...s, enable_push_notifications: v }))}
                    data-testid="push-toggle"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">In-App Notifications</Label>
                  <Switch
                    checked={settings.enable_in_app_notifications ?? true}
                    onCheckedChange={v => setSettings(s => ({ ...s, enable_in_app_notifications: v }))}
                    data-testid="inapp-toggle"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings} data-testid="save-settings-btn">
                {savingSettings ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1">
        {[
          { value: 'active', label: 'Active', icon: Bell },
          { value: 'dismissed', label: 'Dismissed', icon: BellOff },
          { value: 'all', label: 'All', icon: Eye },
          { value: 'archived', label: 'Archived', icon: Archive, count: archiveCount || undefined },
        ].map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'ghost'}
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={() => setStatusFilter(tab.value)}
            data-testid={`filter-${tab.value}`}
          >
            <tab.icon className="h-3 w-3" /> {tab.label}
            {tab.count > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-0.5">{tab.count}</Badge>}
          </Button>
        ))}
        {alerts.length > 0 && statusFilter !== 'archived' && (
          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-red-600 ml-auto" onClick={handleArchiveAll} data-testid="archive-all-alerts">
            <Archive className="h-3 w-3" /> Archive All
          </Button>
        )}
      </div>

      {/* Archived View */}
      {statusFilter === 'archived' ? (
        <ArchiveTab
          entityType="alerts"
          token={token}
          idField="alert_id"
          onCountChange={setArchiveCount}
          searchFields={['product_name', 'product_code']}
          columns={[
            { key: 'product_name', label: 'Product' },
            { key: 'alert_type', label: 'Type', render: a => a.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock' },
            { key: 'severity', label: 'Severity' },
            { key: 'current_quantity', label: 'Qty' },
          ]}
        />
      ) : (
      <>
      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
          <p className="text-muted-foreground font-medium">
            {statusFilter === 'active' ? 'No active alerts — all stock levels OK' : 'No alerts found'}
          </p>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={handleCheckStock} disabled={checking}>
            <Search className="h-3 w-3" /> Run Stock Check
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Card key={alert.alert_id} className={`transition-all ${alert.dismissed ? 'opacity-60' : ''} ${alert.severity === 'critical' ? 'border-red-300 dark:border-red-700' : ''}`} data-testid={`alert-${alert.alert_id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${alert.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-950/40' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40'}`}>
                      {alert.severity === 'critical' ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{alert.product_name}</span>
                        <Badge variant="outline" className={SEVERITY_COLORS[alert.severity] || ''}>
                          {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                        {alert.grade && <Badge variant="outline" className="text-[10px] px-1">{alert.grade}</Badge>}
                        {alert.dismissed && <Badge variant="outline" className="text-[10px] px-1 text-muted-foreground">Dismissed</Badge>}
                        {alert.auto_resolved && <Badge variant="outline" className="text-[10px] px-1 text-emerald-600">Auto-resolved</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{alert.current_quantity}</span> units
                        {alert.product_code ? ` — ${alert.product_code}` : ''}
                        {alert.created_at ? ` — ${new Date(alert.created_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  {!alert.dismissed && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleDismiss(alert.alert_id); }} data-testid={`dismiss-${alert.alert_id}`}>
                        <BellOff className="h-3 w-3" /> Dismiss
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleArchiveAlert(alert.alert_id); }} data-testid={`archive-${alert.alert_id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {alert.dismissed && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 shrink-0" onClick={(e) => { e.stopPropagation(); handleArchiveAlert(alert.alert_id); }} data-testid={`archive-${alert.alert_id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
