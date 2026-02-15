/**
 * LayoutPreviewModule — Admin panel for previewing landing page layouts
 * and customizing navigation icons per layout.
 * Supports both Lucide icons and custom image URLs.
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Check, Save, Loader2, Plus, Trash2, ExternalLink, Image,
  ChevronDown, ChevronUp, Pencil, Eye,
  // Lucide icon library for the picker
  Store, Trophy, Zap, Calendar, Users, Heart, Globe,
  GraduationCap, Gamepad2, Music, BookOpen, Church,
  Crown, Flame, Star, Sun, Moon, Coffee, Utensils,
  Palette, Camera, MapPin, Flag, Anchor, Ship,
  Shirt, Dumbbell, Target, Medal, Swords, Dice1,
  Baby, School, Sparkles, Gem, Flower2, Cross,
  MessageCircle, Rss, ShoppingBag, Wallet, Bell,
  Home, Search, Settings, ArrowRight, Play,
  Monitor, Smartphone, Tv, Headphones, Mic
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('auth_token');

// Curated set of Lucide icons for the picker
const ICON_CATALOG = {
  Store, Trophy, Zap, Calendar, Users, Heart, Globe,
  GraduationCap, Gamepad2, Music, BookOpen, Church,
  Crown, Flame, Star, Sun, Moon, Coffee, Utensils,
  Palette, Camera, MapPin, Flag, Anchor, Ship,
  Shirt, Dumbbell, Target, Medal, Swords, Dice1,
  Baby, School, Sparkles, Gem, Flower2, Cross,
  MessageCircle, Rss, ShoppingBag, Wallet, Bell,
  Home, Search, Settings, Play, Image,
  Monitor, Smartphone, Tv, Headphones, Mic
};

const ICON_NAMES = Object.keys(ICON_CATALOG);

// Layout metadata for preview cards
const LAYOUT_META = {
  living_grid: {
    name: 'Living Grid',
    desc: 'Bento-style tiles with time greeting, cultural identity',
    theme: 'bg-slate-50',
    accent: '#16a34a',
  },
  cinematic: {
    name: 'Cinematic',
    desc: 'Full-screen dark hero with parallax, bold typography',
    theme: 'bg-zinc-900',
    accent: '#f59e0b',
  },
  horizon: {
    name: 'Horizon',
    desc: 'Split-screen hero, warm cream tones, native-app feel',
    theme: 'bg-[#FAF7F2]',
    accent: '#C8102E',
  },
  mosaic_community: {
    name: 'Mosaic Community',
    desc: 'Cultural mosaic grid — no hero, blends diverse heritage themes',
    theme: 'bg-[#FBF7F0]',
    accent: '#C8102E',
  },
};

// SVG mini-previews
const LAYOUT_SVGS = {
  living_grid: (
    <svg viewBox="0 0 120 70" className="w-full h-full">
      <rect x="0" y="0" width="120" height="70" rx="4" fill="#f8fafc" />
      <rect x="4" y="4" width="52" height="28" rx="4" fill="#16a34a" opacity="0.2" />
      <rect x="60" y="4" width="26" height="13" rx="3" fill="#059669" opacity="0.25" />
      <rect x="90" y="4" width="26" height="13" rx="3" fill="#d97706" opacity="0.25" />
      <rect x="60" y="20" width="26" height="12" rx="3" fill="#dc2626" opacity="0.2" />
      <rect x="90" y="20" width="26" height="12" rx="3" fill="#0284c7" opacity="0.2" />
      <rect x="4" y="36" width="52" height="14" rx="3" fill="#6366f1" opacity="0.12" />
      <rect x="60" y="36" width="26" height="14" rx="3" fill="#7c3aed" opacity="0.15" />
      <rect x="90" y="36" width="26" height="14" rx="3" fill="#0d9488" opacity="0.15" />
      <rect x="4" y="54" width="112" height="12" rx="3" fill="#94a3b8" opacity="0.08" />
    </svg>
  ),
  cinematic: (
    <svg viewBox="0 0 120 70" className="w-full h-full">
      <rect x="0" y="0" width="120" height="70" rx="4" fill="#18181b" />
      <rect x="8" y="38" width="50" height="5" rx="1.5" fill="#fff" opacity="0.3" />
      <rect x="8" y="46" width="30" height="3" rx="1" fill="#fff" opacity="0.15" />
      <rect x="8" y="52" width="20" height="7" rx="3" fill="#f59e0b" opacity="0.35" />
      <rect x="8" y="8" width="6" height="6" rx="3" fill="#f59e0b" opacity="0.15" />
      <circle cx="60" cy="64" r="2" fill="#fff" opacity="0.1" />
    </svg>
  ),
  horizon: (
    <svg viewBox="0 0 120 70" className="w-full h-full">
      <rect x="0" y="0" width="120" height="70" rx="4" fill="#FAF7F2" />
      <rect x="6" y="12" width="40" height="5" rx="1.5" fill="#1a1a1a" opacity="0.25" />
      <rect x="6" y="20" width="28" height="3" rx="1" fill="#1a1a1a" opacity="0.12" />
      <rect x="6" y="27" width="18" height="6" rx="3" fill="#C8102E" opacity="0.4" />
      <rect x="70" y="6" width="44" height="36" rx="6" fill="#C8102E" opacity="0.1" />
      <rect x="6" y="48" width="24" height="14" rx="4" fill="#059669" opacity="0.1" />
      <rect x="34" y="48" width="24" height="14" rx="4" fill="#d97706" opacity="0.1" />
      <rect x="62" y="48" width="24" height="14" rx="4" fill="#C8102E" opacity="0.1" />
      <rect x="90" y="48" width="24" height="14" rx="4" fill="#7c3aed" opacity="0.1" />
    </svg>
  ),
  mosaic_community: (
    <svg viewBox="0 0 120 70" className="w-full h-full">
      <rect x="0" y="0" width="120" height="70" rx="4" fill="#FBF7F0" />
      {/* Icon row */}
      <circle cx="16" cy="10" r="5" fill="#d97706" opacity="0.2" />
      <circle cx="32" cy="10" r="5" fill="#059669" opacity="0.2" />
      <circle cx="48" cy="10" r="5" fill="#C8102E" opacity="0.2" />
      <circle cx="64" cy="10" r="5" fill="#7c3aed" opacity="0.2" />
      <circle cx="80" cy="10" r="5" fill="#0284c7" opacity="0.2" />
      <circle cx="96" cy="10" r="5" fill="#ec4899" opacity="0.2" />
      {/* Mosaic tiles */}
      <rect x="4" y="18" width="52" height="24" rx="4" fill="#C8102E" opacity="0.15" />
      <rect x="60" y="18" width="26" height="11" rx="3" fill="#d97706" opacity="0.2" />
      <rect x="90" y="18" width="26" height="11" rx="3" fill="#059669" opacity="0.12" />
      <rect x="60" y="32" width="26" height="10" rx="3" fill="#0284c7" opacity="0.15" />
      <rect x="90" y="32" width="26" height="10" rx="3" fill="#dc2626" opacity="0.12" />
      <rect x="4" y="46" width="52" height="10" rx="3" fill="#7c3aed" opacity="0.1" />
      <rect x="60" y="46" width="26" height="10" rx="3" fill="#0284c7" opacity="0.1" />
      <rect x="90" y="46" width="26" height="10" rx="3" fill="#0d9488" opacity="0.1" />
      <rect x="4" y="60" width="112" height="6" rx="3" fill="#C8102E" opacity="0.08" />
    </svg>
  ),
};

// Lucide icon picker component
function IconPicker({ value, onChange, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = ICON_NAMES.filter(n => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-64 bg-card border rounded-xl shadow-xl overflow-hidden" data-testid="icon-picker">
      <div className="p-2 border-b sticky top-0 bg-card">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="h-7 text-xs"
          autoFocus
          data-testid="icon-picker-search"
        />
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 overflow-y-auto max-h-48">
        {filtered.map(name => {
          const Icon = ICON_CATALOG[name];
          return (
            <button
              key={name}
              onClick={() => { onChange(name); onClose(); }}
              title={name}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${value === name ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted'}`}
              data-testid={`icon-opt-${name}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No icons found</p>
      )}
    </div>
  );
}

// Status options for module icons
const STATUS_OPTIONS = [
  { value: 'ready', label: 'Ready', color: 'bg-green-500' },
  { value: 'building', label: 'Building', color: 'bg-amber-500' },
  { value: 'coming_soon', label: 'Coming Soon', color: 'bg-blue-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-red-500' },
];

// Single icon editor row
function IconRow({ item, index, onUpdate, onRemove }) {
  const [showPicker, setShowPicker] = useState(false);
  const Icon = ICON_CATALOG[item.icon] || Store;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50" data-testid={`icon-row-${item.key}`}>
      {/* Icon preview */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: item.accent_bg || '#f5f5f5', border: `1px solid ${item.accent || '#ccc'}30` }}
          data-testid={`icon-btn-${item.key}`}
        >
          {item.type === 'image' && item.image_url ? (
            <img src={item.image_url} alt={item.label} className="w-6 h-6 rounded object-cover" />
          ) : (
            <Icon className="h-5 w-5" style={{ color: item.accent || '#666' }} />
          )}
        </button>
        {showPicker && (
          <IconPicker
            value={item.icon}
            onChange={(iconName) => onUpdate(index, { ...item, icon: iconName, type: 'lucide' })}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div>
          <Label className="text-[9px] text-muted-foreground">Label</Label>
          <Input
            value={item.label || ''}
            onChange={(e) => onUpdate(index, { ...item, label: e.target.value })}
            className="h-7 text-xs"
            data-testid={`icon-label-${item.key}`}
          />
        </div>
        <div>
          <Label className="text-[9px] text-muted-foreground">Route (optional)</Label>
          <Input
            value={item.to || ''}
            onChange={(e) => onUpdate(index, { ...item, to: e.target.value })}
            className="h-7 text-xs font-mono"
            placeholder="Leave empty to disable"
          />
        </div>
        <div>
          <Label className="text-[9px] text-muted-foreground">Status</Label>
          <select
            value={item.status || 'building'}
            onChange={(e) => onUpdate(index, { ...item, status: e.target.value })}
            className="h-7 w-full px-2 text-xs border rounded-md bg-background"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[9px] text-muted-foreground">Image URL (optional)</Label>
          <Input
            value={item.image_url || ''}
            onChange={(e) => onUpdate(index, { ...item, image_url: e.target.value, type: e.target.value ? 'image' : 'lucide' })}
            className="h-7 text-xs"
            placeholder="https://..."
          />
        </div>
        <div className="flex items-end gap-1">
          <div>
            <Label className="text-[9px] text-muted-foreground">Color</Label>
            <input
              type="color"
              value={item.accent || '#666666'}
              onChange={(e) => onUpdate(index, { ...item, accent: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0"
            />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">BG</Label>
            <input
              type="color"
              value={item.accent_bg || '#f5f5f5'}
              onChange={(e) => onUpdate(index, { ...item, accent_bg: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0"
            />
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg self-center shrink-0"
        data-testid={`icon-remove-${item.key}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}


export default function LayoutPreviewModule() {
  const [iconConfig, setIconConfig] = useState(null);
  const [activeLayout, setActiveLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const [iconsRes, styleRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/ticker/layout-icons`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/public/ui-style`)
      ]);
      if (iconsRes.ok) {
        const data = await iconsRes.json();
        setIconConfig(data.resolved || {});
      }
      if (styleRes.ok) {
        const styleData = await styleRes.json();
        setActiveLayout(styleData?.public?.layout || styleData?.layout || 'living_grid');
      }
    } catch (e) {
      toast.error('Failed to load layout config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const activateLayout = async (layoutId) => {
    try {
      const token = getToken();
      // Get current style
      const { data: current } = await fetch(`${API_URL}/api/admin/ui-style`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json().then(d => ({ data: d })));

      const style = current.style || {};
      const publicStyle = style.public || {};
      publicStyle.layout = layoutId;
      style.public = publicStyle;
      style.layout = layoutId;

      await fetch(`${API_URL}/api/admin/ui-style`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ style })
      });
      setActiveLayout(layoutId);
      toast.success(`Layout "${LAYOUT_META[layoutId]?.name || layoutId}" activated!`);
    } catch (e) {
      toast.error('Failed to activate layout');
    }
  };

  const saveIcons = async (layoutId) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ticker/layout-icons/${layoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ icons: iconConfig[layoutId] || [] })
      });
      if (res.ok) {
        toast.success('Icons saved');
        setHasChanges(false);
      }
    } catch (e) {
      toast.error('Failed to save icons');
    } finally {
      setSaving(false);
    }
  };

  const updateIcon = (layoutId, index, updatedIcon) => {
    setIconConfig(prev => {
      const icons = [...(prev[layoutId] || [])];
      icons[index] = updatedIcon;
      return { ...prev, [layoutId]: icons };
    });
    setHasChanges(true);
  };

  const removeIcon = (layoutId, index) => {
    setIconConfig(prev => {
      const icons = (prev[layoutId] || []).filter((_, i) => i !== index);
      return { ...prev, [layoutId]: icons };
    });
    setHasChanges(true);
  };

  const addIcon = (layoutId) => {
    const newIcon = {
      key: `icon_${Date.now()}`,
      label: 'New',
      to: '',
      type: 'lucide',
      icon: 'Star',
      image_url: '',
      accent: '#6366f1',
      accent_bg: '#EEF2FF',
      status: 'building'
    };
    setIconConfig(prev => ({
      ...prev,
      [layoutId]: [...(prev[layoutId] || []), newIcon]
    }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const layoutIds = Object.keys(LAYOUT_META);

  return (
    <div className="space-y-6" data-testid="layout-preview-module">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Eye className="h-5 w-5" /> Layout Preview & Icons
        </h2>
        <p className="text-xs text-muted-foreground">
          Preview, activate, and customize icons for each landing page layout
        </p>
      </div>

      {/* Layout Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="layout-cards">
        {layoutIds.map(id => {
          const meta = LAYOUT_META[id];
          const isActive = activeLayout === id;
          const isEditing = editingLayout === id;
          const icons = iconConfig?.[id] || [];

          return (
            <div
              key={id}
              className={`rounded-2xl border-2 overflow-hidden transition-all ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                  : 'border-border/50 hover:border-primary/30 hover:shadow-md'
              }`}
              data-testid={`layout-card-${id}`}
            >
              {/* SVG Preview */}
              <div className={`relative h-28 ${meta.theme} p-3`}>
                {LAYOUT_SVGS[id]}
                {isActive && (
                  <Badge className="absolute top-2 right-2 text-[9px] px-2 py-0.5 bg-primary text-primary-foreground">
                    Active
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{meta.name}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{meta.desc}</p>
                </div>

                {/* Icon preview strip */}
                {icons.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {icons.map((ic, i) => {
                      const LucideIcon = ICON_CATALOG[ic.icon] || Star;
                      return (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: ic.accent_bg || '#f5f5f5' }}
                          title={ic.label}
                        >
                          {ic.type === 'image' && ic.image_url ? (
                            <img src={ic.image_url} alt={ic.label} className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <LucideIcon className="h-3.5 w-3.5" style={{ color: ic.accent || '#666' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isActive && (
                    <Button
                      size="sm"
                      onClick={() => activateLayout(id)}
                      className="flex-1 h-8 text-xs gap-1"
                      data-testid={`activate-${id}`}
                    >
                      <Check className="h-3 w-3" /> Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setEditingLayout(isEditing ? null : id)}
                    className={`${isActive && !isEditing ? 'flex-1' : ''} h-8 text-xs gap-1`}
                    data-testid={`edit-icons-${id}`}
                  >
                    <Pencil className="h-3 w-3" /> {isEditing ? 'Close' : 'Icons'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/?preview_layout=${id}`, '_blank')}
                    className="h-8 text-xs gap-1"
                    data-testid={`preview-${id}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Icon Editor Panel (shown when editing a layout) */}
      {editingLayout && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 space-y-3" data-testid="icon-editor">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                {LAYOUT_META[editingLayout]?.name} — Navigation Icons
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Click an icon to change it. Add custom image URLs for cultural icons.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addIcon(editingLayout)}
                className="h-7 text-xs gap-1"
                data-testid="add-icon-btn"
              >
                <Plus className="h-3 w-3" /> Add Icon
              </Button>
              <Button
                size="sm"
                onClick={() => saveIcons(editingLayout)}
                disabled={saving || !hasChanges}
                className="h-7 text-xs gap-1"
                data-testid="save-icons-btn"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save Icons
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {(iconConfig?.[editingLayout] || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No icons configured for this layout. Click "Add Icon" to start.
              </p>
            ) : (
              (iconConfig[editingLayout] || []).map((item, i) => (
                <IconRow
                  key={item.key || i}
                  item={item}
                  index={i}
                  onUpdate={(idx, updated) => updateIcon(editingLayout, idx, updated)}
                  onRemove={(idx) => removeIcon(editingLayout, idx)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
