import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileEdit, Send, Link, Loader, CheckCircle, Package, XCircle,
  Check, ShoppingCart, MapPin, PackageCheck, AlertTriangle,
  PackageX, RefreshCw, CheckCircle2, Save, RotateCcw,
  Palette, Eye
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ICON_OPTIONS = [
  { value: 'FileEdit', label: 'Edit', Icon: FileEdit },
  { value: 'Send', label: 'Send', Icon: Send },
  { value: 'Link', label: 'Link', Icon: Link },
  { value: 'Loader', label: 'Loader', Icon: Loader },
  { value: 'CheckCircle', label: 'Check Circle', Icon: CheckCircle },
  { value: 'CheckCircle2', label: 'Check Circle 2', Icon: CheckCircle2 },
  { value: 'Package', label: 'Package', Icon: Package },
  { value: 'PackageCheck', label: 'Package Check', Icon: PackageCheck },
  { value: 'PackageX', label: 'Package X', Icon: PackageX },
  { value: 'XCircle', label: 'X Circle', Icon: XCircle },
  { value: 'Check', label: 'Check', Icon: Check },
  { value: 'ShoppingCart', label: 'Shopping Cart', Icon: ShoppingCart },
  { value: 'MapPin', label: 'Map Pin', Icon: MapPin },
  { value: 'AlertTriangle', label: 'Alert', Icon: AlertTriangle },
  { value: 'RefreshCw', label: 'Refresh', Icon: RefreshCw },
];

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(o => [o.value, o.Icon]));

const PRESET_COLORS = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#059669',
  '#047857', '#2563eb', '#7c3aed', '#6d28d9', '#9ca3af',
  '#6b7280', '#374151', '#C8102E', '#B8860B', '#8b7355',
];

function StatusBadgePreview({ config, status }) {
  const IconComp = ICON_MAP[config?.icon] || Check;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        color: config?.color || '#374151',
        backgroundColor: config?.bg || '#f3f4f6',
      }}
    >
      <IconComp className="w-3 h-3" />
      {config?.label || status}
    </span>
  );
}

function StatusEditor({ status, config, onChange }) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (field, value) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
    onChange(status, updated);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 w-32">
        <StatusBadgePreview config={localConfig} status={status} />
      </div>
      
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Label</Label>
          <Input
            value={localConfig?.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="h-8 text-xs"
            data-testid={`badge-label-${status}`}
          />
        </div>
        
        <div>
          <Label className="text-[10px] text-muted-foreground">Text Color</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={localConfig?.color || '#374151'}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={localConfig?.color || ''}
              onChange={(e) => handleChange('color', e.target.value)}
              className="h-8 text-xs font-mono flex-1"
              placeholder="#hex"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-[10px] text-muted-foreground">Background</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={localConfig?.bg || '#f3f4f6'}
              onChange={(e) => handleChange('bg', e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={localConfig?.bg || ''}
              onChange={(e) => handleChange('bg', e.target.value)}
              className="h-8 text-xs font-mono flex-1"
              placeholder="#hex"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-[10px] text-muted-foreground">Icon</Label>
          <Select
            value={localConfig?.icon || 'Check'}
            onValueChange={(val) => handleChange('icon', val)}
          >
            <SelectTrigger className="h-8 text-xs" data-testid={`badge-icon-${status}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map(opt => {
                const Ic = opt.Icon;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <Ic className="w-3 h-3" /> {opt.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default function BadgeCustomizationModule() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/admin/badge-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load badge config:', err);
      toast.error('Failed to load badge configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleStatusChange = (category, status, newConfig) => {
    setConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [status]: newConfig
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/admin/badge-config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('Badge configuration saved successfully');
        setHasChanges(false);
      } else {
        toast.error('Failed to save badge configuration');
      }
    } catch (err) {
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Delete config to reset to defaults
      await fetch(`${API}/api/admin/badge-config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      await fetchConfig();
      setHasChanges(false);
      toast.success('Reset to default badges');
    } catch (err) {
      toast.error('Error resetting configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="badge-customization-module">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Badge Customization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure colors, icons, and labels for order status badges across the application
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
            data-testid="badge-reset-btn"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            data-testid="badge-save-btn"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="order_statuses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="order_statuses" data-testid="tab-order-statuses">
            Order Statuses
          </TabsTrigger>
          <TabsTrigger value="item_statuses" data-testid="tab-item-statuses">
            Item Statuses
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order_statuses" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Status Badges</CardTitle>
              <CardDescription>
                Customize how order-level status badges appear throughout the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {config?.order_statuses && Object.entries(config.order_statuses).map(([status, cfg]) => (
                <StatusEditor
                  key={status}
                  status={status}
                  config={cfg}
                  onChange={(s, c) => handleStatusChange('order_statuses', s, c)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="item_statuses" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Item Status Badges</CardTitle>
              <CardDescription>
                Customize how individual item status badges appear in order details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {config?.item_statuses && Object.entries(config.item_statuses).map(([status, cfg]) => (
                <StatusEditor
                  key={status}
                  status={status}
                  config={cfg}
                  onChange={(s, c) => handleStatusChange('item_statuses', s, c)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Badge Preview</CardTitle>
              <CardDescription>See how all badges look together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Order Statuses</h4>
                  <div className="flex flex-wrap gap-2">
                    {config?.order_statuses && Object.entries(config.order_statuses).map(([status, cfg]) => (
                      <StatusBadgePreview key={status} config={cfg} status={status} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Item Statuses</h4>
                  <div className="flex flex-wrap gap-2">
                    {config?.item_statuses && Object.entries(config.item_statuses).map(([status, cfg]) => (
                      <StatusBadgePreview key={status} config={cfg} status={status} />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Color Presets</CardTitle>
              <CardDescription>Quick reference for the Mosaic Community palette and common colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <div
                    key={color}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs"
                    style={{ borderColor: color }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-mono">{color}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
