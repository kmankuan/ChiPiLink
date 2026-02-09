/**
 * WidgetManagerModule — Admin UI for configuring the embeddable widget.
 * Toggle features, customize appearance, configure placement, manage allowed origins,
 * and generate the embed snippet for laopan.online.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, Save, Copy, Check, Settings, Palette, Layout,
  Shield, Code, BookOpen, Users, Package, Bell, ExternalLink, Eye, RotateCcw,
  Wallet, Monitor, Link2
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DEFAULT_SITE_URL = 'https://chipilink.me';

const FEATURE_ICONS = {
  textbook_orders: BookOpen,
  my_students: Users,
  order_status: Package,
  notifications: Bell,
  wallet: Wallet,
};

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
];

export default function WidgetManagerModule() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_URL}/api/widget/admin/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(data);
    } catch {
      toast.error('Failed to load widget config');
    } finally {
      setLoading(false);
    }
  };

  const update = (path, value) => {
    setConfig(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let target = copy;
      for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
      target[keys[keys.length - 1]] = value;
      return copy;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`${API_URL}/api/widget/admin/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasChanges(false);
      toast.success('Widget config saved!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.post(`${API_URL}/api/widget/admin/config/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(data);
      setHasChanges(false);
      toast.success('Config reset to defaults');
    } catch {
      toast.error('Failed to reset');
    }
  };

  // Use the configured site_url or fallback to default production URL
  const siteUrl = config?.site_url || DEFAULT_SITE_URL;
  const loaderUrl = `${siteUrl}/api/widget/loader.js`;
  const embedUrl = `${siteUrl}/embed/widget`;

  const embedSnippet = `<!-- ChiPi Link Widget -->\n<script src="${loaderUrl}" defer></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const previewWidget = () => {
    window.open(`${siteUrl}/embed/widget`, '_blank');
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="widget-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layout className="h-5 w-5" /> Widget Manager
          </h2>
          <p className="text-xs text-muted-foreground">Configure the embeddable widget for laopan.online</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={previewWidget} data-testid="widget-preview-btn">
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="widget-reset-btn" className="text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} data-testid="widget-save-btn">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Master Switch */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Widget Enabled</p>
            <p className="text-xs text-muted-foreground">Turn the widget on or off globally</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => update('enabled', v)}
            data-testid="widget-enabled-switch"
          />
        </div>
      </Card>

      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features" className="gap-1.5" data-testid="widget-tab-features">
            <Settings className="h-3.5 w-3.5" /> Features
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-1.5" data-testid="widget-tab-display">
            <Monitor className="h-3.5 w-3.5" /> Display
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5" data-testid="widget-tab-appearance">
            <Palette className="h-3.5 w-3.5" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="placement" className="gap-1.5" data-testid="widget-tab-placement">
            <Layout className="h-3.5 w-3.5" /> Placement
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5" data-testid="widget-tab-security">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="embed" className="gap-1.5" data-testid="widget-tab-embed">
            <Code className="h-3.5 w-3.5" /> Embed Code
          </TabsTrigger>
        </TabsList>

        {/* ── Features ── */}
        <TabsContent value="features">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Widget Features</CardTitle>
              <CardDescription className="text-xs">Toggle which features are available in the widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(config.features || {}).map(([key, feat]) => {
                const Icon = FEATURE_ICONS[key] || Settings;
                return (
                  <div key={key} className="flex items-center justify-between p-2.5 rounded-lg border" data-testid={`widget-feature-${key}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{feat.label}</p>
                        <p className="text-[10px] text-muted-foreground">Feature key: {key}</p>
                      </div>
                    </div>
                    <Switch
                      checked={feat.enabled}
                      onCheckedChange={(v) => update(`features.${key}.enabled`, v)}
                      data-testid={`widget-feature-toggle-${key}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Widget Appearance</CardTitle>
              <CardDescription className="text-xs">Customize how the widget looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.appearance?.primary_color || '#16a34a'}
                      onChange={(e) => update('appearance.primary_color', e.target.value)}
                      className="h-8 w-10 rounded border cursor-pointer"
                      data-testid="widget-primary-color"
                    />
                    <Input
                      value={config.appearance?.primary_color || ''}
                      onChange={(e) => update('appearance.primary_color', e.target.value)}
                      className="h-8 text-xs font-mono flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Accent Color</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.appearance?.accent_color || '#f59e0b'}
                      onChange={(e) => update('appearance.accent_color', e.target.value)}
                      className="h-8 w-10 rounded border cursor-pointer"
                      data-testid="widget-accent-color"
                    />
                    <Input
                      value={config.appearance?.accent_color || ''}
                      onChange={(e) => update('appearance.accent_color', e.target.value)}
                      className="h-8 text-xs font-mono flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Family</Label>
                  <Input
                    value={config.appearance?.font_family || 'Inter'}
                    onChange={(e) => update('appearance.font_family', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-font-family"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Border Radius</Label>
                  <Input
                    value={config.appearance?.border_radius || '0.75rem'}
                    onChange={(e) => update('appearance.border_radius', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-border-radius"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={config.appearance?.compact_mode || false}
                  onCheckedChange={(v) => update('appearance.compact_mode', v)}
                  data-testid="widget-compact-mode"
                />
                <Label className="text-xs">Compact Mode (reduced padding, smaller text)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Placement ── */}
        <TabsContent value="placement">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Widget Placement</CardTitle>
              <CardDescription className="text-xs">Configure how the widget appears on laopan.online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.placement?.floating_button !== false}
                  onCheckedChange={(v) => update('placement.floating_button', v)}
                  data-testid="widget-floating-toggle"
                />
                <Label className="text-xs">Show floating button</Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Button Position</Label>
                  <select
                    value={config.placement?.floating_position || 'bottom-right'}
                    onChange={(e) => update('placement.floating_position', e.target.value)}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                    data-testid="widget-floating-position"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Button Label</Label>
                  <Input
                    value={config.placement?.floating_label || 'ChiPi Link'}
                    onChange={(e) => update('placement.floating_label', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-floating-label"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sidebar Width</Label>
                  <Input
                    value={config.placement?.sidebar_width || '380px'}
                    onChange={(e) => update('placement.sidebar_width', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-sidebar-width"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Full-page Max Width</Label>
                  <Input
                    value={config.placement?.fullpage_max_width || '900px'}
                    onChange={(e) => update('placement.fullpage_max_width', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-fullpage-width"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Security</CardTitle>
              <CardDescription className="text-xs">Manage allowed origins that can embed the widget</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs mb-1.5 block">Allowed Origins (one per line)</Label>
              <textarea
                value={(config.security?.allowed_origins || []).join('\n')}
                onChange={(e) => update('security.allowed_origins', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                className="w-full h-24 p-2 text-xs border rounded-md bg-background font-mono resize-none"
                placeholder="https://laopan.online"
                data-testid="widget-allowed-origins"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                These domains are allowed to embed the widget iframe. Leave empty to allow all origins.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Embed Code ── */}
        <TabsContent value="embed">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Embed Code</CardTitle>
              <CardDescription className="text-xs">
                Copy this code and paste it into your laopan.online site (Invision Pages block or custom HTML)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Site URL */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Site URL</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  Your production domain. All embed codes will use this URL.
                </p>
                <Input
                  value={config?.site_url || DEFAULT_SITE_URL}
                  onChange={(e) => update('site_url', e.target.value)}
                  placeholder="https://chipilink.me"
                  className="h-8 text-xs font-mono"
                  data-testid="widget-site-url"
                />
              </div>

              <Separator />

              {/* Floating Button (1 line) */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Option 1: Floating Button (recommended)</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  Adds a floating button to the page that opens the widget as a slide-out panel.
                </p>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto border">
                    {embedSnippet}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copySnippet}
                    className="absolute top-1.5 right-1.5 h-7 px-2"
                    data-testid="widget-copy-snippet"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Full Page Embed */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Option 2: Full Page Embed</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  Embed the widget directly in an Invision Pages block or custom page as a full component.
                </p>
                <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto border">
{`<iframe
  src="${embedUrl}"
  style="width:100%;max-width:${config.placement?.fullpage_max_width || '900px'};height:600px;border:none;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);"
  allow="clipboard-write"
></iframe>`}
                </pre>
              </div>

              <Separator />

              {/* Sidebar Embed */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Option 3: Sidebar Embed</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  Add to a sidebar or narrow container on laopan.online.
                </p>
                <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto border">
{`<iframe
  src="${embedUrl}"
  style="width:${config.placement?.sidebar_width || '380px'};height:500px;border:none;border-radius:8px;"
  allow="clipboard-write"
></iframe>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
