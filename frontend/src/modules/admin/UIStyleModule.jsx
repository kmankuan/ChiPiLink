/**
 * UIStyleModule — Admin UI for selecting app design templates/styles
 * Allows picking from predefined themes and customizing primary color
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Check, Palette, Type, RectangleHorizontal, SquareStack } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Lora', label: 'Lora (Serif)' },
];

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
  const [primary, secondary, text] = template.preview_colors;

  return (
    <button
      onClick={() => onSelect(template.id)}
      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'border-border hover:border-primary/40'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Color preview strip */}
      <div className="flex gap-1 mb-3">
        {template.preview_colors.map((color, i) => (
          <div
            key={i}
            className="h-6 flex-1 rounded"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <p className="font-medium text-sm">{template.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
    </button>
  );
}

export default function UIStyleModule() {
  const { refreshUIStyle } = useTheme();
  const [style, setStyle] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalStyle, setOriginalStyle] = useState(null);

  useEffect(() => {
    fetchStyle();
  }, []);

  const fetchStyle = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_URL}/api/admin/ui-style`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStyle(data.style);
      setOriginalStyle(JSON.parse(JSON.stringify(data.style)));
      setTemplates(data.available_templates);
    } catch (err) {
      toast.error('Failed to load UI style config');
    } finally {
      setLoading(false);
    }
  };

  const updateStyle = (key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`${API_URL}/api/admin/ui-style`, { style }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOriginalStyle(JSON.parse(JSON.stringify(style)));
      setHasChanges(false);
      toast.success('UI style saved! Changes will apply on next page reload.');
    } catch (err) {
      toast.error('Failed to save UI style');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !style) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" /> UI Style
              </CardTitle>
              <CardDescription>Choose a design template for your application</CardDescription>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {templates.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                isSelected={style.template === tmpl.id}
                onSelect={(id) => updateStyle('template', id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Customization</CardTitle>
          <CardDescription>Fine-tune the selected template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" /> Primary Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.primary_color}
                  onChange={(e) => updateStyle('primary_color', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={style.primary_color}
                  onChange={(e) => updateStyle('primary_color', e.target.value)}
                  className="h-9 text-xs font-mono"
                  placeholder="#16a34a"
                />
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Type className="h-3.5 w-3.5" /> Font Family
              </Label>
              <select
                value={style.font_family}
                onChange={(e) => updateStyle('font_family', e.target.value)}
                className="w-full h-9 px-3 text-xs border rounded-md bg-background"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <RectangleHorizontal className="h-3.5 w-3.5" /> Border Radius
              </Label>
              <select
                value={style.border_radius}
                onChange={(e) => updateStyle('border_radius', e.target.value)}
                className="w-full h-9 px-3 text-xs border rounded-md bg-background"
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Card Style */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <SquareStack className="h-3.5 w-3.5" /> Card Style
              </Label>
              <select
                value={style.card_style}
                onChange={(e) => updateStyle('card_style', e.target.value)}
                className="w-full h-9 px-3 text-xs border rounded-md bg-background"
              >
                {CARD_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-6 p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3">Live Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 text-white text-sm font-medium"
                style={{
                  backgroundColor: style.primary_color,
                  borderRadius: style.border_radius,
                  fontFamily: style.font_family,
                }}
              >
                Sample Button
              </div>
              <div
                className="px-4 py-2 text-sm border"
                style={{
                  borderRadius: style.border_radius,
                  fontFamily: style.font_family,
                  boxShadow: style.card_style === 'elevated' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  borderColor: style.card_style === 'bordered' ? style.primary_color : undefined,
                }}
              >
                Sample Card
              </div>
              <Badge
                style={{
                  backgroundColor: style.primary_color + '20',
                  color: style.primary_color,
                  borderRadius: style.border_radius,
                }}
              >
                Badge
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
