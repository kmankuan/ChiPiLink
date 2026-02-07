/**
 * TXB (Textbook) Inventory Board Configuration
 * Admin UI to configure Monday.com textbooks board for subitem-based order tracking.
 * Each textbook gets subitems with student names when orders are placed.
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
import { Save, Package, RefreshCw, Users } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const COLUMN_FIELDS = [
  { key: 'code', label: 'Book Code Column', description: 'Text column for book ISBN/code (used to find textbook)' },
  { key: 'name', label: 'Book Name Column', description: 'Text column for book title' },
  { key: 'grade', label: 'Grade Column', description: 'Text/dropdown for grade level' },
  { key: 'publisher', label: 'Publisher Column', description: 'Text column for publisher name' },
  { key: 'unit_price', label: 'Unit Price Column', description: 'Number column for unit price' },
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
  const [config, setConfig] = useState({
    board_id: '',
    enabled: false,
    group_id: '',
    column_mapping: {},
    subitem_column_mapping: {},
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
          column_mapping: data.column_mapping || {},
          subitem_column_mapping: data.subitem_column_mapping || {},
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
        toast.success(t('admin.configSaved', 'Configuration saved'));
      } else {
        toast.error(t('admin.configError', 'Failed to save configuration'));
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                {t('admin.txbInventory', 'Textbooks Board')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Sync textbook orders as subitems under each textbook. Each student order creates a subitem so Monday.com auto-counts the demand.
              </CardDescription>
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-[10px]">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t('admin.enableInventory', 'Enable Textbooks Sync')}</Label>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('admin.boardId', 'Textbooks Board ID')}</Label>
            <Input
              placeholder="e.g., 18397140920"
              value={config.board_id || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, board_id: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('admin.groupId', 'Group ID')} <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g., topics"
              value={config.group_id || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, group_id: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Item Column Mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('admin.columnMapping', 'Textbook Item Columns')}</CardTitle>
          <CardDescription className="text-xs">
            Map Monday.com column IDs for the main textbook items (used to find/create textbooks)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COLUMN_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm">{label}</Label>
              <Input
                placeholder={`Monday.com column ID for ${key}`}
                value={config.column_mapping[key] || ''}
                onChange={(e) => updateMapping(key, e.target.value)}
                className="text-sm"
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
            Each student order creates a subitem under the textbook. The subitem name = "Student Name - Order Reference".
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
              />
              <p className="text-[10px] text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t('admin.saveConfig', 'Save Configuration')}
      </Button>
    </div>
  );
}
