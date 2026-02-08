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
import { Loader2, Save, Check, Palette, Type, RectangleHorizontal, SquareStack, Minimize2, Globe, Shield, ExternalLink, LayoutGrid } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';

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

function StyleEditor({ style, onChange, templates, fonts, densityOptions, layouts }) {
  const update = (key, value) => onChange({ ...style, [key]: value });

  return (
    <div className="space-y-4">
      {/* Page Layout */}
      {layouts && layouts.length > 0 && (
        <div>
          <Label className="text-xs font-medium mb-2 block flex items-center gap-1">
            <LayoutGrid className="h-3 w-3" /> Page Layout
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {layouts.map((layout) => (
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
        </div>
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
      const defaultBase = { template: 'default', primary_color: '#16a34a', font_family: 'Inter', border_radius: '0.75rem', card_style: 'elevated', density: 'comfortable' };
      if (!style.public) style.public = { ...defaultBase };
      if (!style.admin) style.admin = { ...defaultBase, template: 'minimal', density: 'compact' };
      setFullStyle(style);
      setTemplates(data.available_templates || []);
      setFonts(data.available_fonts || [{ value: 'Inter', label: 'Inter', category: 'sans-serif' }]);
      setDensityOptions(data.density_options || [{ value: 'comfortable', label: 'Comfortable' }]);
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
