/**
 * UIStyleModule — Admin UI for managing separate Public & Admin themes.
 * Supports template selection, fonts, colors, density, radius, card style.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Check, Palette, Type, RectangleHorizontal, SquareStack, Minimize2, Globe, Shield, ExternalLink, LayoutGrid, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RADIUS_OPTIONS = [
  { value: '0', label: 'Sharp' },
  { value: '0.375rem', label: 'Subtle' },
  { value: '0.75rem', label: 'Rounded' },
  { value: '1.25rem', label: 'Pill' },
];

const CARD_STYLE_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'bordered', label: 'Bordered' },
];

function TemplateCard({ template, isSelected, onSelect }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => onSelect(template.id)}
      data-testid={`template-${template.id}`}
      className={`relative p-3 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'border-border hover:border-primary/40'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className="flex gap-1 mb-2">
        {template.preview_colors.map((color, i) => (
          <div key={i} className="h-5 flex-1 rounded" style={{ backgroundColor: color }} />
        ))}
      </div>
      <p className="font-medium text-xs">{template.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
    </button>
  );
}

// Tiny SVG layout previews
const LAYOUT_PREVIEWS = {
  mobile_app: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="0" y="0" width="80" height="14" rx="1" className="fill-primary/30" />
      <rect x="6" y="18" width="10" height="10" rx="3" className="fill-primary/50" />
      <rect x="20" y="18" width="10" height="10" rx="3" className="fill-primary/40" />
      <rect x="34" y="18" width="10" height="10" rx="3" className="fill-primary/30" />
      <rect x="48" y="18" width="10" height="10" rx="3" className="fill-primary/20" />
      <rect x="2" y="32" width="76" height="4" rx="1" className="fill-muted-foreground/20" />
      <rect x="2" y="38" width="76" height="4" rx="1" className="fill-muted-foreground/15" />
      <rect x="2" y="44" width="76" height="4" rx="1" className="fill-muted-foreground/10" />
    </svg>
  ),
  bento_grid: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="2" y="2" width="46" height="22" rx="3" className="fill-primary/30" />
      <rect x="50" y="2" width="28" height="22" rx="3" className="fill-primary/15" />
      <rect x="2" y="26" width="28" height="22" rx="3" className="fill-primary/20" />
      <rect x="32" y="26" width="22" height="22" rx="3" className="fill-primary/10" />
      <rect x="56" y="26" width="22" height="22" rx="3" className="fill-primary/25" />
    </svg>
  ),
  tab_hub: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="4" y="2" width="30" height="4" rx="1" className="fill-foreground/30" />
      <rect x="4" y="8" width="20" height="2" rx="1" className="fill-muted-foreground/20" />
      <rect x="4" y="14" width="16" height="5" rx="2.5" className="fill-primary/60" />
      <rect x="22" y="14" width="18" height="5" rx="2.5" className="fill-muted-foreground/15" />
      <rect x="42" y="14" width="14" height="5" rx="2.5" className="fill-muted-foreground/15" />
      <rect x="58" y="14" width="14" height="5" rx="2.5" className="fill-muted-foreground/15" />
      <rect x="4" y="23" width="72" height="24" rx="3" className="fill-primary/10" />
      <rect x="8" y="27" width="14" height="14" rx="3" className="fill-primary/30" />
      <rect x="26" y="27" width="14" height="14" rx="3" className="fill-primary/25" />
      <rect x="44" y="27" width="14" height="14" rx="3" className="fill-primary/20" />
    </svg>
  ),
  social_feed: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <circle cx="10" cy="7" r="5" className="fill-primary/40" />
      <circle cx="24" cy="7" r="5" className="fill-primary/30" />
      <circle cx="38" cy="7" r="5" className="fill-primary/25" />
      <circle cx="52" cy="7" r="5" className="fill-primary/20" />
      <rect x="6" y="16" width="68" height="14" rx="3" className="fill-primary/15" />
      <rect x="6" y="32" width="68" height="8" rx="2" className="fill-muted-foreground/10" />
      <rect x="6" y="42" width="68" height="6" rx="2" className="fill-muted-foreground/08" />
    </svg>
  ),
  magazine: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="2" y="2" width="50" height="20" rx="3" className="fill-primary/30" />
      <rect x="54" y="2" width="24" height="10" rx="2" className="fill-primary/15" />
      <rect x="54" y="14" width="24" height="8" rx="2" className="fill-primary/10" />
      <rect x="2" y="24" width="24" height="12" rx="2" className="fill-muted-foreground/15" />
      <rect x="28" y="24" width="24" height="12" rx="2" className="fill-muted-foreground/12" />
      <rect x="54" y="24" width="24" height="24" rx="2" className="fill-primary/08" />
      <rect x="2" y="38" width="50" height="4" rx="1" className="fill-muted-foreground/10" />
      <rect x="2" y="44" width="50" height="4" rx="1" className="fill-muted-foreground/08" />
    </svg>
  ),
  living_grid: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="2" y="2" width="38" height="20" rx="3" className="fill-primary/35" />
      <rect x="42" y="2" width="17" height="9" rx="2" className="fill-emerald-500/30" />
      <rect x="61" y="2" width="17" height="9" rx="2" className="fill-amber-500/30" />
      <rect x="42" y="13" width="17" height="9" rx="2" className="fill-red-500/25" />
      <rect x="61" y="13" width="17" height="9" rx="2" className="fill-sky-500/25" />
      <rect x="2" y="24" width="38" height="10" rx="2" className="fill-muted-foreground/15" />
      <rect x="42" y="24" width="17" height="10" rx="2" className="fill-violet-500/20" />
      <rect x="61" y="24" width="17" height="10" rx="2" className="fill-teal-500/20" />
      <rect x="2" y="36" width="76" height="12" rx="2" className="fill-muted-foreground/10" />
    </svg>
  ),
  cinematic: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="0" y="0" width="80" height="50" rx="0" className="fill-foreground/80" />
      <rect x="6" y="28" width="30" height="3" rx="1" className="fill-white/40" />
      <rect x="6" y="33" width="20" height="2" rx="1" className="fill-white/20" />
      <rect x="6" y="38" width="14" height="5" rx="2" className="fill-white/30" />
      <circle cx="40" cy="46" r="1.5" className="fill-white/15" />
    </svg>
  ),
  horizon: (
    <svg viewBox="0 0 80 50" className="w-full h-full">
      <rect x="0" y="0" width="80" height="50" rx="0" fill="#FAF7F2" />
      <rect x="4" y="8" width="25" height="3" rx="1" className="fill-foreground/30" />
      <rect x="4" y="13" width="18" height="2" rx="1" className="fill-foreground/15" />
      <rect x="4" y="18" width="12" height="4" rx="2" fill="#C8102E" fillOpacity="0.5" />
      <rect x="44" y="4" width="32" height="32" rx="4" className="fill-primary/15" />
      <rect x="4" y="40" width="16" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="22" y="40" width="16" height="6" rx="3" className="fill-muted-foreground/12" />
      <rect x="40" y="40" width="16" height="6" rx="3" className="fill-muted-foreground/10" />
    </svg>
  ),
};

function StyleEditor({ style, onChange, templates, fonts, densityOptions, layouts }) {
  const update = (key, value) => onChange({ ...style, [key]: value });

  // Separate structural from CSS-overlay layouts
  const structuralLayouts = (layouts || []).filter(l => l.category === 'structural');
  const cssLayouts = (layouts || []).filter(l => l.category === 'css_overlay');

  return (
    <div className="space-y-4">
      {/* Page Layout — Structural */}
      {structuralLayouts.length > 0 && (
        <div>
          <Label className="text-xs font-medium mb-2 block flex items-center gap-1">
            <LayoutGrid className="h-3 w-3" /> Page Layout
          </Label>
          <p className="text-[10px] text-muted-foreground mb-2">Choose a page structure. Each option renders content in a completely different arrangement.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {structuralLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => update('layout', layout.id)}
                data-testid={`layout-${layout.id}`}
                className={`relative rounded-xl border-2 transition-all text-left overflow-hidden ${
                  style.layout === layout.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {style.layout === layout.id && (
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="h-14 p-2 bg-muted/30">
                  {LAYOUT_PREVIEWS[layout.id] || (
                    <div className="w-full h-full rounded bg-muted-foreground/10" />
                  )}
                </div>
                <div className="p-2">
                  <p className="font-medium text-xs">{layout.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{layout.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CSS Overlay Layouts (optional tweak) */}
      {cssLayouts.length > 0 && (
        <details className="group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            Advanced: CSS overlay tweaks ({cssLayouts.length} options)
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
            {cssLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => update('layout', layout.id)}
                data-testid={`layout-${layout.id}`}
                className={`relative p-2.5 rounded-xl border-2 transition-all text-left ${
                  style.layout === layout.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {style.layout === layout.id && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                )}
                <p className="font-medium text-xs">{layout.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{layout.description}</p>
              </button>
            ))}
          </div>
        </details>
      )}

      {/* Color Theme */}
      <div>
        <Label className="text-xs font-medium mb-2 block">Color Theme</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              isSelected={style.template === tmpl.id}
              onSelect={(id) => update('template', id)}
            />
          ))}
        </div>
      </div>

      {/* Customization row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Primary Color */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Palette className="h-3 w-3" /> Primary Color
          </Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={style.primary_color || '#16a34a'}
              onChange={(e) => update('primary_color', e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer"
              data-testid="primary-color-picker"
            />
            <Input
              value={style.primary_color || ''}
              onChange={(e) => update('primary_color', e.target.value)}
              className="h-8 text-xs font-mono flex-1"
              placeholder="#16a34a"
            />
          </div>
        </div>

        {/* Font Family */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Type className="h-3 w-3" /> Font
          </Label>
          <select
            value={style.font_family || 'Inter'}
            onChange={(e) => update('font_family', e.target.value)}
            className="w-full h-8 px-2 text-xs border rounded-md bg-background"
            data-testid="font-select"
          >
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} ({f.category})
              </option>
            ))}
          </select>
        </div>

        {/* Density */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Minimize2 className="h-3 w-3" /> Density
          </Label>
          <select
            value={style.density || 'comfortable'}
            onChange={(e) => update('density', e.target.value)}
            className="w-full h-8 px-2 text-xs border rounded-md bg-background"
            data-testid="density-select"
          >
            {densityOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Border Radius */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <RectangleHorizontal className="h-3 w-3" /> Radius
          </Label>
          <select
            value={style.border_radius || '0.75rem'}
            onChange={(e) => update('border_radius', e.target.value)}
            className="w-full h-8 px-2 text-xs border rounded-md bg-background"
            data-testid="radius-select"
          >
            {RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Card Style */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <SquareStack className="h-3 w-3" /> Cards
          </Label>
          <select
            value={style.card_style || 'elevated'}
            onChange={(e) => update('card_style', e.target.value)}
            className="w-full h-8 px-2 text-xs border rounded-md bg-background"
            data-testid="card-style-select"
          >
            {CARD_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Preview */}
      <div className="p-3 rounded-lg border bg-muted/30">
        <p className="text-[10px] text-muted-foreground mb-2">Preview</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="px-3 py-1.5 text-white text-xs font-medium"
            style={{
              backgroundColor: style.primary_color || '#16a34a',
              borderRadius: style.border_radius || '0.75rem',
              fontFamily: style.font_family || 'Inter',
            }}
          >
            Button
          </div>
          <div
            className="px-3 py-1.5 text-xs border"
            style={{
              borderRadius: style.border_radius || '0.75rem',
              fontFamily: style.font_family || 'Inter',
              boxShadow: style.card_style === 'elevated' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              borderColor: style.card_style === 'bordered' ? (style.primary_color || '#16a34a') : undefined,
            }}
          >
            Card
          </div>
          <Badge
            style={{
              backgroundColor: (style.primary_color || '#16a34a') + '20',
              color: style.primary_color || '#16a34a',
              borderRadius: style.border_radius || '0.75rem',
            }}
          >
            Badge
          </Badge>
          <span className="text-[10px] text-muted-foreground ml-1">
            density: {style.density || 'comfortable'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UIStyleModule() {
  const { refreshUIStyle } = useTheme();
  const [fullStyle, setFullStyle] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [densityOptions, setDensityOptions] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchStyle();
  }, []);

  const fetchStyle = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_URL}/api/admin/ui-style`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const style = data.style || {};
      // Ensure public/admin sub-objects
      const defaultBase = { template: 'default', layout: 'mobile_app', primary_color: '#16a34a', font_family: 'Inter', border_radius: '0.75rem', card_style: 'elevated', density: 'comfortable' };
      if (!style.public) style.public = { ...defaultBase };
      if (!style.admin) style.admin = { ...defaultBase, template: 'minimal', density: 'compact' };
      setFullStyle(style);
      setTemplates(data.available_templates || []);
      setFonts(data.available_fonts || [{ value: 'Inter', label: 'Inter', category: 'sans-serif' }]);
      setDensityOptions(data.density_options || [{ value: 'comfortable', label: 'Comfortable' }]);
      setLayouts(data.available_layouts || []);
    } catch {
      toast.error('Failed to load UI style config');
    } finally {
      setLoading(false);
    }
  };

  const updatePublic = (newPublic) => {
    setFullStyle(prev => ({ ...prev, public: newPublic }));
    setHasChanges(true);
  };

  const updateAdmin = (newAdmin) => {
    setFullStyle(prev => ({ ...prev, admin: newAdmin }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Save the full style with public + admin
      await axios.put(`${API_URL}/api/admin/ui-style`, { style: fullStyle }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasChanges(false);
      // Clean up any leftover preview data
      localStorage.removeItem('chipi_preview_style');
      await refreshUIStyle();
      toast.success('UI style saved and applied!');
    } catch {
      toast.error('Failed to save UI style');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewAsUser = () => {
    // Store the current unsaved public style in localStorage
    localStorage.setItem('chipi_preview_style', JSON.stringify(fullStyle.public));
    // Open the public landing page in a new tab with preview flag
    window.open('/?preview_theme=1', '_blank');
    toast.success('Preview opened in a new tab. Close the tab when done.');
  };

  if (loading || !fullStyle) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ui-style-module">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="h-5 w-5" /> UI Style
          </h2>
          <p className="text-xs text-muted-foreground">Configure separate themes for public site and admin panel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePreviewAsUser} data-testid="preview-as-user-btn" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Preview as User
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} data-testid="save-style-btn">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="public">
        <TabsList className="mb-3">
          <TabsTrigger value="public" className="gap-1.5" data-testid="public-theme-tab">
            <Globe className="h-3.5 w-3.5" /> Public Site
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1.5" data-testid="admin-theme-tab">
            <Shield className="h-3.5 w-3.5" /> Admin Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Public Site Theme</CardTitle>
              <CardDescription className="text-xs">Applied to landing, store, user-facing pages</CardDescription>
            </CardHeader>
            <CardContent>
              <StyleEditor
                style={fullStyle.public}
                onChange={updatePublic}
                templates={templates}
                fonts={fonts}
                densityOptions={densityOptions}
                layouts={layouts}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Admin Panel Theme</CardTitle>
              <CardDescription className="text-xs">Applied to the admin dashboard and management pages</CardDescription>
            </CardHeader>
            <CardContent>
              <StyleEditor
                style={fullStyle.admin}
                onChange={updateAdmin}
                templates={templates}
                fonts={fonts}
                densityOptions={densityOptions}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
