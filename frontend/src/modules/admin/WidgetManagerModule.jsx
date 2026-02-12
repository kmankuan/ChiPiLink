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
import { useTranslation } from 'react-i18next';

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
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'middle-right', label: 'Middle Right' },
  { value: 'middle-left', label: 'Middle Left' },
];

const ICON_OPTIONS = [
  { value: 'book', label: 'Book' },
  { value: 'chat', label: 'Chat Bubble' },
  { value: 'store', label: 'Store' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'circle', label: 'Circle' },
  { value: 'plus', label: 'Plus' },
];

const ICON_SVGS = {
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  store: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  graduation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>,
  circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><circle cx="12" cy="12" r="10"/><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-full h-full"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

const STYLE_OPTIONS = [
  { value: 'pill', label: 'Pill (icon + text)' },
  { value: 'square', label: 'Rounded Square (icon + text)' },
  { value: 'icon-only', label: 'Icon Only (rounded)' },
  { value: 'circle', label: 'Circle (icon only)' },
];

/* ── Live Preview of Floating Button ── */
function ButtonPreview({ position, icon, style, label, color, offsetX, offsetY }) {
  const iconEl = ICON_SVGS[icon] || ICON_SVGS.book;
  const showLabel = style === 'pill' || style === 'square';
  const isCircle = style === 'circle';
  const iconSize = isCircle ? 'w-5 h-5' : 'w-4 h-4';

  const btnClasses = [
    'flex items-center justify-center gap-1.5 text-white font-semibold shadow-lg absolute transition-all duration-300',
    isCircle ? 'p-3 rounded-full' : '',
    style === 'icon-only' ? 'p-2.5 rounded-2xl' : '',
    style === 'pill' ? 'px-3 py-2 rounded-full' : '',
    style === 'square' ? 'px-3 py-2 rounded-xl' : '',
  ].join(' ');

  // Map position to CSS for the preview box
  const ox = parseInt(offsetX) || 20;
  const oy = parseInt(offsetY) || 20;
  const scale = 0.6; // Scale offsets for the small preview
  const px = Math.round(ox * scale);
  const py = Math.round(oy * scale);

  const posStyle = {};
  if (position.includes('bottom')) posStyle.bottom = `${py}px`;
  if (position.includes('top')) posStyle.top = `${py}px`;
  if (position.includes('right')) posStyle.right = `${px}px`;
  if (position.includes('left') && !position.includes('center')) posStyle.left = `${px}px`;
  if (position === 'bottom-center') { posStyle.left = '50%'; posStyle.transform = 'translateX(-50%)'; }
  if (position === 'middle-right') { posStyle.top = '50%'; posStyle.transform = 'translateY(-50%)'; }
  if (position === 'middle-left') { posStyle.top = '50%'; posStyle.transform = 'translateY(-50%)'; }

  return (
    <div
      className="relative rounded-xl border-2 border-dashed border-muted bg-muted/20 overflow-hidden"
      style={{ height: 180 }}
      data-testid="widget-button-preview"
    >
      {/* Simulated page content */}
      <div className="absolute inset-0 p-3 opacity-30">
        <div className="h-2 w-20 bg-muted rounded mb-2" />
        <div className="h-1.5 w-32 bg-muted rounded mb-1.5" />
        <div className="h-1.5 w-28 bg-muted rounded mb-1.5" />
        <div className="h-1.5 w-36 bg-muted rounded mb-4" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
      </div>

      {/* Floating button preview */}
      <div className={btnClasses} style={{ ...posStyle, backgroundColor: color, fontSize: 11 }}>
        <span className={iconSize}>{iconEl}</span>
        {showLabel && <span>{label}</span>}
      </div>

      {/* Label */}
      <div className="absolute top-1.5 left-1.5 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-muted-foreground font-medium">
        Preview — {position}
      </div>
    </div>
  );
}

export default function WidgetManagerModule() {
  const { t } = useTranslation();
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
      toast.error(t('widgetManager.loadError'));
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
      toast.success(t('widgetManager.configSaved'));
    } catch {
      toast.error(t('widgetManager.saveError'));
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
      toast.success(t('widgetManager.configReset'));
    } catch {
      toast.error(t('widgetManager.resetError'));
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
    toast.success(t('widgetManager.embedCopied'));
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
          <p className="text-xs text-muted-foreground">{t("widgetManager.titleDesc")}</p>
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
            <p className="text-sm font-semibold">{t("widgetManager.widgetEnabled")}</p>
            <p className="text-xs text-muted-foreground">{t("widgetManager.widgetEnabledDesc")}</p>
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
              <CardTitle className="text-sm">{t("widgetManager.widgetFeatures")}</CardTitle>
              <CardDescription className="text-xs">{t("widgetManager.widgetFeaturesDesc")}</CardDescription>
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

        {/* ── Display ── */}
        <TabsContent value="display">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("widgetManager.displayOptions")}</CardTitle>
              <CardDescription className="text-xs">{t("widgetManager.displayOptionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Maintenance Mode */}
              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${config.maintenance?.active ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}`} data-testid="widget-maintenance-toggle">
                <div>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    {config.maintenance?.active && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    Maintenance Mode
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("widgetManager.maintenanceModeDesc")}</p>
                </div>
                <Switch
                  checked={config.maintenance?.active ?? false}
                  onCheckedChange={(v) => update('maintenance.active', v)}
                />
              </div>

              {config.maintenance?.active && (
                <div className="ml-4 space-y-2">
                  <div>
                    <Label className="text-xs">{t("widgetManager.maintenanceMessage")}</Label>
                    <Input
                      value={config.maintenance?.message || ''}
                      onChange={(e) => update('maintenance.message', e.target.value)}
                      placeholder="We're currently performing maintenance..."
                      className="h-8 text-xs"
                      data-testid="widget-maintenance-message"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between p-2.5 rounded-lg border" data-testid="widget-display-hide-url">
                <div>
                  <p className="text-xs font-medium">{t("widgetManager.hideUrlBar")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("widgetManager.hideUrlBarDesc")}</p>
                </div>
                <Switch
                  checked={config.display?.hide_url_bar ?? true}
                  onCheckedChange={(v) => update('display.hide_url_bar', v)}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border" data-testid="widget-display-hide-navbar">
                <div>
                  <p className="text-xs font-medium">{t("widgetManager.hideNavbarFooter")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("widgetManager.hideNavbarFooterDesc")}</p>
                </div>
                <Switch
                  checked={config.display?.hide_navbar ?? true}
                  onCheckedChange={(v) => { update('display.hide_navbar', v); update('display.hide_footer', v); }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-primary/5" data-testid="widget-display-streamlined">
                <div>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> Streamlined Textbook Flow
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Only show: LaoPan Login &rarr; Link Student &rarr; Textbook Orders (if approved) &rarr; Wallet. Hides all other elements.
                  </p>
                </div>
                <Switch
                  checked={config.display?.streamlined_flow ?? true}
                  onCheckedChange={(v) => update('display.streamlined_flow', v)}
                />
              </div>

              {config.display?.streamlined_flow && (
                <div className="ml-4 p-2.5 rounded-lg border border-dashed text-[10px] text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-xs">Streamlined Flow Steps:</p>
                  <p>1. User sees <strong>Login with LaoPan</strong> button</p>
                  <p>2. After login, if no students linked &rarr; show <strong>Link Student</strong> workflow</p>
                  <p>3. If student is approved &rarr; show <strong>Textbook List</strong> for ordering</p>
                  <p>4. <strong>Wallet</strong> is always accessible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("widgetManager.widgetAppearance")}</CardTitle>
              <CardDescription className="text-xs">{t("widgetManager.widgetAppearanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.primaryColorLabel")}</Label>
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
                  <Label className="text-xs">{t("widgetManager.accentColorLabel")}</Label>
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
                  <Label className="text-xs">{t("widgetManager.fontFamily")}</Label>
                  <Input
                    value={config.appearance?.font_family || 'Inter'}
                    onChange={(e) => update('appearance.font_family', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-font-family"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.borderRadius")}</Label>
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
                <Label className="text-xs">{t("widgetManager.compactMode")}</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Placement ── */}
        <TabsContent value="placement">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("widgetManager.widgetPlacement")}</CardTitle>
              <CardDescription className="text-xs">{t("widgetManager.widgetPlacementDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.placement?.floating_button !== false}
                  onCheckedChange={(v) => update('placement.floating_button', v)}
                  data-testid="widget-floating-toggle"
                />
                <Label className="text-xs">{t("widgetManager.showFloatingButton")}</Label>
              </div>

              <Separator />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t("widgetManager.positionOffset")}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.position")}</Label>
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
                  <Label className="text-xs">{t("widgetManager.horizontalOffset")}</Label>
                  <Input
                    value={config.placement?.floating_offset_x || '20px'}
                    onChange={(e) => update('placement.floating_offset_x', e.target.value)}
                    placeholder="20px"
                    className="h-8 text-xs"
                    data-testid="widget-offset-x"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.verticalOffset")}</Label>
                  <Input
                    value={config.placement?.floating_offset_y || '20px'}
                    onChange={(e) => update('placement.floating_offset_y', e.target.value)}
                    placeholder="20px"
                    className="h-8 text-xs"
                    data-testid="widget-offset-y"
                  />
                </div>
              </div>

              <Separator />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t("widgetManager.buttonDesign")}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.icon")}</Label>
                  <select
                    value={config.placement?.floating_icon || 'book'}
                    onChange={(e) => update('placement.floating_icon', e.target.value)}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                    data-testid="widget-floating-icon"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.buttonStyle")}</Label>
                  <select
                    value={config.placement?.floating_style || 'pill'}
                    onChange={(e) => update('placement.floating_style', e.target.value)}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                    data-testid="widget-floating-style"
                  >
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.labelText")}</Label>
                  <Input
                    value={config.placement?.floating_label || 'ChiPi Link'}
                    onChange={(e) => update('placement.floating_label', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-floating-label"
                  />
                </div>
              </div>

              <Separator />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t("widgetManager.panelSizes")}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.sidebarWidth")}</Label>
                  <Input
                    value={config.placement?.sidebar_width || '380px'}
                    onChange={(e) => update('placement.sidebar_width', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-sidebar-width"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("widgetManager.fullPageMaxWidth")}</Label>
                  <Input
                    value={config.placement?.fullpage_max_width || '900px'}
                    onChange={(e) => update('placement.fullpage_max_width', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="widget-fullpage-width"
                  />
                </div>
              </div>

              <Separator />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t("widgetManager.livePreview")}</p>

              <ButtonPreview
                position={config.placement?.floating_position || 'bottom-right'}
                icon={config.placement?.floating_icon || 'book'}
                style={config.placement?.floating_style || 'pill'}
                label={config.placement?.floating_label || 'ChiPi Link'}
                color={config.appearance?.primary_color || '#16a34a'}
                offsetX={config.placement?.floating_offset_x || '20px'}
                offsetY={config.placement?.floating_offset_y || '20px'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("widgetManager.securityTitle")}</CardTitle>
              <CardDescription className="text-xs">Manage allowed origins that can embed the widget</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs mb-1.5 block">{t("widgetManager.allowedOrigins")}</Label>
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
              <CardTitle className="text-sm">{t("widgetManager.embedTitle")}</CardTitle>
              <CardDescription className="text-xs">
                Copy this code and paste it into your laopan.online site (Invision Pages block or custom HTML)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Site URL */}
              <div>
                <Label className="text-xs font-medium mb-1 block">{t("widgetManager.siteUrl")}</Label>
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
                <Label className="text-xs font-medium mb-1 block">{t("widgetManager.floatingButton")}</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  {t("widgetManager.floatingButtonDesc")}
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
                <Label className="text-xs font-medium mb-1 block">{t("widgetManager.fullPageEmbed")}</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  {t("widgetManager.fullPageEmbedDesc")}
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
                <Label className="text-xs font-medium mb-1 block">{t("widgetManager.sidebarEmbed")}</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  {t("widgetManager.sidebarEmbedDesc")}
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
