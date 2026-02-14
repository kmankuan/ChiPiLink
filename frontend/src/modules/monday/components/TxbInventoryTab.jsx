/**
 * TXB (Textbook) Inventory Board — Enhanced Configuration
 * Full bidirectional sync with Monday.com:
 * - Board config + column mappings (items + subitems)
 * - Full sync: push all textbooks to Monday.com
 * - Stock column sync (app → Monday and Monday → app via webhook)
 * - Grade-based grouping option
 * - Webhook management for stock changes
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Save, Package, RefreshCw, Users, Upload, Webhook, ArrowLeftRight,
  CheckCircle, AlertCircle, Clock, Loader2, Link2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const COLUMN_FIELDS = [
  { key: 'code', label: 'Book Code', description: 'Text column for ISBN/code (used to find textbook)', required: true },
  { key: 'name', label: 'Book Name', description: 'Text column for the book title' },
  { key: 'grade', label: 'Grade', description: 'Text/dropdown for grade level' },
  { key: 'publisher', label: 'Publisher', description: 'Text column for publisher name' },
  { key: 'subject', label: 'Subject', description: 'Text column for subject/materia' },
  { key: 'unit_price', label: 'Unit Price', description: 'Number column for price' },
  { key: 'stock_quantity', label: 'Stock Quantity', description: 'Number column for current stock (enables bidirectional sync)', required: true },
  { key: 'status', label: 'Status', description: 'Status column (auto-set: In Stock / Low Stock / Out of Stock)' },
];

const SUBITEM_FIELDS = [
  { key: 'quantity', label: 'Quantity Column', description: 'Number column for quantity ordered' },
  { key: 'date', label: 'Date Column', description: 'Date column for order date' },
];

export default function TxbInventoryTab() {
  const { t } = useTranslation();
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [registeringCreateWh, setRegisteringCreateWh] = useState(false);
  const [config, setConfig] = useState({
    board_id: '',
    enabled: false,
    group_id: '',
    use_grade_groups: false,
    column_mapping: {},
    subitem_column_mapping: {},
    webhook_config: {},
    create_item_webhook_config: {},
    last_full_sync: null,
    sync_stats: {},
  });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/txb-inventory-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          board_id: data.board_id || '',
          enabled: data.enabled || false,
          group_id: data.group_id || '',
          use_grade_groups: data.use_grade_groups || false,
          column_mapping: data.column_mapping || {},
          subitem_column_mapping: data.subitem_column_mapping || {},
          webhook_config: data.webhook_config || {},
          create_item_webhook_config: data.create_item_webhook_config || {},
          last_full_sync: data.last_full_sync || null,
          sync_stats: data.sync_stats || {},
        });
      }
    } catch (e) {
      console.error('Failed to fetch TXB inventory config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/store/monday/txb-inventory-config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('Configuration saved');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/store/monday/txb-inventory/full-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced! Created: ${data.created}, Updated: ${data.updated}, Failed: ${data.failed}`);
        fetchConfig();
      } else {
        toast.error(data.detail || 'Sync failed');
      }
    } catch {
      toast.error('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleRegisterWebhook = async () => {
    const webhookUrl = `${API}/api/store/monday/txb-inventory/webhook`;
    setRegisteringWebhook(true);
    try {
      const res = await fetch(`${API}/api/store/monday/txb-inventory/webhook/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Webhook registered successfully');
        fetchConfig();
      } else {
        toast.error(data.detail || data.error || 'Failed to register webhook');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const handleUnregisterWebhook = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/txb-inventory/webhook`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Webhook removed');
        fetchConfig();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const updateMapping = (key, value) => {
    setConfig(prev => ({
      ...prev,
      column_mapping: { ...prev.column_mapping, [key]: value || null },
    }));
  };

  const updateSubitemMapping = (key, value) => {
    setConfig(prev => ({
      ...prev,
      subitem_column_mapping: { ...prev.subitem_column_mapping, [key]: value || null },
    }));
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  const hasWebhook = !!config.webhook_config?.webhook_id;
  const stats = config.sync_stats || {};

  return (
    <div className="space-y-4">
      {/* Main Config */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base" data-testid="txb-title">
                <Package className="h-4 w-4" />
                Textbooks Inventory Board
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Full bidirectional sync between your textbook inventory and Monday.com.
                Stock changes propagate both ways.
              </CardDescription>
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-[10px]" data-testid="txb-status-badge">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Textbooks Sync</Label>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))}
              data-testid="txb-enable-switch"
            />
          </div>

          <div className="space-y-2">
            <Label>Textbooks Board ID</Label>
            <Input
              placeholder="e.g., 18397140920"
              value={config.board_id || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, board_id: e.target.value }))}
              data-testid="txb-board-id"
            />
          </div>

          <div className="space-y-2">
            <Label>Default Group ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g., topics"
              value={config.group_id || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, group_id: e.target.value }))}
              data-testid="txb-group-id"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-create Grade Groups</Label>
              <p className="text-[10px] text-muted-foreground">
                Automatically create groups by grade (e.g., "Grade G5", "Grade G6")
              </p>
            </div>
            <Switch
              checked={config.use_grade_groups}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, use_grade_groups: v }))}
              data-testid="txb-grade-groups"
            />
          </div>
        </CardContent>
      </Card>

      {/* Full Sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Full Sync
          </CardTitle>
          <CardDescription className="text-xs">
            Push all active textbooks to Monday.com. Creates new items or updates existing ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.last_full_sync && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="last-sync-info">
              <Clock className="h-3 w-3" />
              Last sync: {new Date(config.last_full_sync).toLocaleString()}
              {stats.created !== undefined && (
                <span className="ml-2">
                  (Created: {stats.created}, Updated: {stats.updated}, Failed: {stats.failed})
                </span>
              )}
            </div>
          )}
          <Button
            onClick={handleFullSync}
            disabled={syncing || !config.enabled || !config.board_id}
            className="w-full gap-2"
            variant="outline"
            data-testid="full-sync-btn"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {syncing ? 'Syncing all textbooks...' : 'Sync All Textbooks to Monday.com'}
          </Button>
          {(!config.enabled || !config.board_id) && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Enable the integration and set a board ID first
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bidirectional Stock Sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4" />
            Bidirectional Stock Sync
          </CardTitle>
          <CardDescription className="text-xs">
            Stock changes in the app auto-update Monday.com. Register a webhook so Monday.com changes update the app too.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg p-3 flex items-center justify-between" style={{
            background: hasWebhook ? '#ecfdf5' : '#fef3c7',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div className="flex items-center gap-2">
              {hasWebhook ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Webhook className="h-4 w-4 text-amber-600" />
              )}
              <div>
                <p className="text-xs font-medium" style={{ color: hasWebhook ? '#065f46' : '#92400e' }}>
                  {hasWebhook ? 'Webhook Active' : 'Webhook Not Registered'}
                </p>
                <p className="text-[10px]" style={{ color: hasWebhook ? '#047857' : '#b45309' }}>
                  {hasWebhook
                    ? `Monday.com → App sync enabled (ID: ${config.webhook_config.webhook_id})`
                    : 'App → Monday.com works, but Monday.com → App requires a webhook'}
                </p>
              </div>
            </div>
            {hasWebhook ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUnregisterWebhook}
                className="text-xs text-red-500 hover:text-red-700"
                data-testid="unregister-webhook-btn"
              >
                Remove
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRegisterWebhook}
                disabled={registeringWebhook || !config.enabled || !config.board_id}
                className="text-xs gap-1"
                data-testid="register-webhook-btn"
              >
                {registeringWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                Register
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            The webhook URL will be: <code className="bg-muted px-1 rounded text-[9px]">{API}/api/store/monday/txb-inventory/webhook</code>
          </p>
        </CardContent>
      </Card>

      {/* Item Column Mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Textbook Item Columns</CardTitle>
          <CardDescription className="text-xs">
            Map Monday.com column IDs for the main textbook items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COLUMN_FIELDS.map(({ key, label, description, required }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                {label}
                {required && <span className="text-red-500 text-xs">*</span>}
              </Label>
              <Input
                placeholder={`Monday.com column ID for ${key}`}
                value={config.column_mapping[key] || ''}
                onChange={(e) => updateMapping(key, e.target.value)}
                className="text-sm"
                data-testid={`col-${key}`}
              />
              <p className="text-[10px] text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Subitem Column Mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Subitem Columns (Student Orders)
          </CardTitle>
          <CardDescription className="text-xs">
            Each student order creates a subitem under the textbook. Name = "Student Name - Order Reference".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SUBITEM_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm">{label}</Label>
              <Input
                placeholder={`Monday.com column ID for ${key}`}
                value={config.subitem_column_mapping[key] || ''}
                onChange={(e) => updateSubitemMapping(key, e.target.value)}
                className="text-sm"
                data-testid={`subcol-${key}`}
              />
              <p className="text-[10px] text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" data-testid="txb-save-btn">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Configuration
      </Button>
    </div>
  );
}
