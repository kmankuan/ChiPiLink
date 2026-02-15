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
import Lottie from 'lottie-react';
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

// Status options loaded from backend (with fallbacks)
const DEFAULT_STATUS_OPTIONS = [
  { value: 'ready', label: 'Ready', color: '#22c55e', animation: 'none', gif_url: '' },
  { value: 'building', label: 'Building', color: '#f59e0b', animation: 'building_bars', gif_url: '' },
  { value: 'coming_soon', label: 'Coming Soon', color: '#3b82f6', animation: 'pulse', gif_url: '' },
  { value: 'maintenance', label: 'Maintenance', color: '#ef4444', animation: 'wrench', gif_url: '' },
];

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  // Original
  { value: 'building_bars', label: 'Building Bars' },
  { value: 'pulse', label: 'Pulse Glow' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'spinner', label: 'Spinner' },
  { value: 'blocks', label: 'Stacking Blocks' },
  { value: 'hammer', label: 'Hammer' },
  { value: 'wrench', label: 'Wrench Spin' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'wave', label: 'Wave' },
  // NEW: Chinese / Cultural
  { value: 'lantern', label: 'Lantern (Chinese)' },
  { value: 'dragon', label: 'Dragon (Chinese)' },
  { value: 'bamboo', label: 'Bamboo Growth' },
  { value: 'temple', label: 'Temple / Pagoda' },
  { value: 'sparkle', label: 'Sparkle' },
  // NEW: Construction
  { value: 'crane', label: 'Crane' },
  // NEW: Tech / Digital
  { value: 'coding', label: 'Coding' },
  { value: 'data_sync', label: 'Data Sync' },
  // NEW: Celebration
  { value: 'fireworks', label: 'Fireworks' },
  // NEW: Progress
  { value: 'progress_bar', label: 'Progress Bar' },
  // NEW: Scene-based
  { value: 'coding_scene', label: 'Person Coding (Scene)' },
  { value: 'building_progress', label: 'Building Progress 0-100%' },
  // Lottie
  { value: 'lottie_url', label: 'Lottie Animation (URL)' },
  // Custom
  { value: 'custom_gif', label: 'Custom GIF/Image' },
];

// Single icon editor row
function IconRow({ item, index, onUpdate, onRemove, statusOptions }) {
  const [showPicker, setShowPicker] = useState(false);
  const Icon = ICON_CATALOG[item.icon] || Store;
  const currentStatus = statusOptions.find(s => s.value === item.status) || statusOptions[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50" data-testid={`icon-row-${item.key}`}>
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
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              onChange={(e) => {
                const s = statusOptions.find(o => o.value === e.target.value);
                onUpdate(index, {
                  ...item,
                  status: e.target.value,
                  status_animation: s?.animation || 'none',
                  status_gif_url: s?.gif_url || '',
                  status_color: s?.color || '#666',
                });
              }}
              className="h-7 w-full px-2 text-xs border rounded-md bg-background"
              data-testid={`icon-status-${item.key}`}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">Status Label (override)</Label>
            <Input
              value={item.status_label || ''}
              onChange={(e) => onUpdate(index, { ...item, status_label: e.target.value })}
              className="h-7 text-xs"
              placeholder={currentStatus?.label || 'Auto'}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <div>
            <Label className="text-[9px] text-muted-foreground">Status Animation</Label>
            <select
              value={item.status_animation || currentStatus?.animation || 'none'}
              onChange={(e) => onUpdate(index, { ...item, status_animation: e.target.value })}
              className="h-7 w-full px-2 text-xs border rounded-md bg-background"
              data-testid={`icon-anim-${item.key}`}
            >
              {ANIMATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {(item.status_animation === 'custom_gif' || item.status_animation === 'lottie_url' || currentStatus?.animation === 'custom_gif' || currentStatus?.animation === 'lottie_url') && (
            <div>
              <Label className="text-[9px] text-muted-foreground">{item.status_animation === 'lottie_url' ? 'Lottie JSON URL' : 'GIF/Image URL'}</Label>
              <Input
                value={item.status_gif_url || ''}
                onChange={(e) => onUpdate(index, { ...item, status_gif_url: e.target.value })}
                className="h-7 text-xs"
                placeholder="https://...gif"
              />
            </div>
          )}
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


// Lottie animation loader for admin preview
function LottiePreview({ url, size = 32 }) {
  const [animData, setAnimData] = useState(null);
  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then(r => r.json())
      .then(setAnimData)
      .catch(() => setAnimData(null));
  }, [url]);
  if (!animData) return <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />;
  return <Lottie animationData={animData} loop autoplay style={{ width: size, height: size }} />;
}

// Animation preview for status manager
function StatusAnimationPreview({ animation, color, gifUrl }) {
  const c = color || '#f59e0b';
  switch (animation) {
    case 'building_bars':
      return (
        <div className="flex gap-[2px] items-end h-3">
          {[4,7,5,4].map((h,i) => (
            <span key={i} className="w-[3px] rounded-sm" style={{ background: c, height: `${h}px`, animation: `building 0.5s ease-in-out ${i*100}ms infinite` }} />
          ))}
        </div>
      );
    case 'pulse':
      return <div className="w-4 h-4 rounded-full" style={{ background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />;
    case 'bounce':
      return <div className="w-3 h-3 rounded-full" style={{ background: c, animation: 'statusBounce 0.6s ease-in-out infinite' }} />;
    case 'spinner':
      return <div className="w-4 h-4 rounded-full border-2 border-transparent" style={{ borderTopColor: c, animation: 'spin 0.8s linear infinite' }} />;
    case 'blocks':
      return (
        <div className="flex gap-[1px] items-end h-4">
          {[3,5,7,4,6].map((h,i) => (
            <span key={i} className="w-[3px] rounded-sm" style={{ background: c, animation: `blocks 1.2s ease ${i*150}ms infinite`, height: `${h}px` }} />
          ))}
        </div>
      );
    case 'hammer':
      return <div className="text-[14px]" style={{ animation: 'hammer 0.6s ease-in-out infinite alternate', transformOrigin: 'bottom right' }}>&#128296;</div>;
    case 'wrench':
      return <div className="text-[14px]" style={{ animation: 'spin 2s linear infinite' }}>&#128295;</div>;
    case 'rocket':
      return <div className="text-[14px]" style={{ animation: 'rocket 1s ease-in-out infinite' }}>&#128640;</div>;
    case 'wave':
      return (
        <div className="flex gap-[1px] items-center h-3">
          {[0,1,2,3,4].map(i => (
            <span key={i} className="w-[2px] rounded-full" style={{ background: c, height: '8px', animation: `wave 1s ease-in-out ${i*120}ms infinite` }} />
          ))}
        </div>
      );

    /* ── NEW animations ── */
    case 'lantern':
      return <div className="text-[16px]" style={{ animation: 'lanternGlow 2s ease-in-out infinite', transformOrigin: 'top center' }}>&#127982;</div>;
    case 'dragon':
      return <div className="text-[16px]" style={{ animation: 'dragonFloat 2.5s ease-in-out infinite' }}>&#128009;</div>;
    case 'crane':
      return (
        <div className="relative w-7 h-5">
          <div className="absolute bottom-0 left-1/2 w-[2px] h-5 -translate-x-1/2" style={{ background: `${c}99` }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px]" style={{ background: `${c}cc`, transformOrigin: 'center', animation: 'craneHook 2s ease-in-out infinite' }} />
          <div className="absolute top-[2px] right-0 w-[2px] h-[6px]" style={{ background: c, animation: 'statusBounce 1s ease-in-out infinite' }} />
        </div>
      );
    case 'bamboo':
      return (
        <div className="flex gap-[4px] items-end h-5">
          {[0,1,2].map(i => (
            <div key={i} className="flex flex-col items-center gap-[1px]">
              <span className="w-[3px] rounded-full" style={{ background: '#22c55e', height: `${8+i*3}px`, animation: `bambooGrow 2s ease-out ${i*400}ms infinite`, transformOrigin: 'bottom' }} />
              <span className="w-[6px] h-[2px] rounded-full" style={{ background: '#16a34a80' }} />
            </div>
          ))}
        </div>
      );
    case 'fireworks':
      return (
        <div className="relative w-7 h-5">
          {[0,1,2,3,4,5].map(i => {
            const angle = i * 60;
            const rad = angle * Math.PI / 180;
            const x = 14 + Math.cos(rad) * 8;
            const y = 10 + Math.sin(rad) * 8;
            return <span key={i} className="absolute w-[3px] h-[3px] rounded-full" style={{
              left: `${x}px`, top: `${y}px`,
              background: i % 2 === 0 ? '#ef4444' : '#f59e0b',
              animation: `fireworkBurst 1.5s ease-out ${i*100}ms infinite`,
            }} />;
          })}
          <span className="absolute left-[12px] top-[8px] w-[4px] h-[4px] rounded-full" style={{ background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />
        </div>
      );
    case 'coding':
      return (
        <div className="flex items-center gap-[2px] h-4">
          <span className="text-[10px] font-mono font-bold" style={{ color: `${c}cc` }}>&lt;/&gt;</span>
          <span className="w-[2px] h-[10px]" style={{ background: c, animation: 'typingCursor 0.8s step-end infinite' }} />
        </div>
      );
    case 'data_sync':
      return (
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: c, borderRightColor: `${c}60`, animation: 'dataOrbit 1.2s linear infinite' }} />
          <div className="absolute inset-[5px] rounded-full" style={{ background: `${c}40` }} />
        </div>
      );
    case 'progress_bar':
      return (
        <div className="w-8 h-[4px] rounded-full overflow-hidden" style={{ background: `${c}25` }}>
          <div className="h-full rounded-full" style={{ background: c, animation: 'progressFill 2.5s ease-in-out infinite' }} />
        </div>
      );
    case 'temple':
      return (
        <div className="flex flex-col items-center gap-[1px]">
          <span className="w-4 h-[3px] rounded-t-sm" style={{ background: `${c}bb`, animation: 'templeStack 2s ease-out 0ms infinite' }} />
          <span className="w-5 h-[3px]" style={{ background: `${c}99`, animation: 'templeStack 2s ease-out 300ms infinite' }} />
          <span className="w-7 h-[3px] rounded-b-sm" style={{ background: `${c}77`, animation: 'templeStack 2s ease-out 600ms infinite' }} />
        </div>
      );
    case 'sparkle':
      return (
        <div className="relative w-6 h-5 flex items-center justify-center">
          <span className="text-[14px] inline-block" style={{ color: c, animation: 'sparkleRotate 2s linear infinite' }}>&#10024;</span>
          <span className="absolute -right-0.5 top-0 text-[8px]" style={{ color: `${c}80`, animation: 'sparkleRotate 3s linear 0.5s infinite' }}>&#10024;</span>
        </div>
      );

    /* ── Coding Scene ── */
    case 'coding_scene':
      return (
        <div className="relative w-10 h-7" style={{ animation: 'statusBounce 3s ease-in-out infinite' }}>
          {/* Person */}
          <div className="absolute left-[4px] top-[2px] w-[6px] h-[6px] rounded-full" style={{ background: c }} />
          <div className="absolute left-[5px] top-[8px] w-[4px] h-[6px] rounded-sm" style={{ background: `${c}cc` }} />
          {/* Laptop */}
          <div className="absolute left-[14px] top-[8px] w-[14px] h-[2px] rounded-sm" style={{ background: `${c}88` }} />
          <div className="absolute left-[14px] top-[2px] w-[14px] h-[6px] rounded-t-sm overflow-hidden" style={{ background: '#1a1a2e', border: `1px solid ${c}44` }}>
            <div className="absolute left-[2px] top-[1px] h-[1.5px] rounded-full" style={{ background: '#4ade80', animation: 'progressFill 1.5s ease-in-out infinite', maxWidth: '8px' }} />
            <div className="absolute left-[2px] top-[3px] h-[1.5px] rounded-full" style={{ background: '#60a5fa', animation: 'progressFill 1.8s ease-in-out 0.3s infinite', maxWidth: '6px' }} />
          </div>
          <div className="absolute bottom-0 left-[2px] w-[26px] h-[1px]" style={{ background: `${c}33` }} />
        </div>
      );

    /* ── Building Progress 0-100% ── */
    case 'building_progress':
      return (
        <div className="relative w-10 h-8">
          {/* Building */}
          <div className="absolute bottom-0 left-[2px] w-[16px] h-[22px] rounded-t-sm overflow-hidden" style={{ border: `1px solid ${c}44`, borderBottom: 'none' }}>
            <div className="absolute bottom-0 left-0 w-full" style={{ background: `${c}55`, animation: 'progressFill 3s ease-in-out infinite' }} />
            {[0,1,2,3].map(i => (
              <div key={i} className="absolute w-full h-[0.5px]" style={{ bottom: `${i * 25}%`, background: `${c}33` }} />
            ))}
            {[0,1,2].map(r => [0,1].map(col => (
              <div key={`${r}-${col}`} className="absolute w-[3px] h-[3px] rounded-[0.5px]" style={{
                bottom: `${10 + r * 30}%`, left: `${20 + col * 45}%`,
                background: `${c}66`,
              }} />
            )))}
          </div>
          {/* Crane */}
          <div className="absolute top-0 right-[4px]" style={{ transformOrigin: 'bottom center', animation: 'craneHook 2s ease-in-out infinite' }}>
            <div className="w-[2px] h-[14px]" style={{ background: `${c}88` }} />
            <div className="absolute top-0 left-[-4px] w-[8px] h-[1.5px]" style={{ background: `${c}66` }} />
          </div>
          <div className="absolute bottom-0 right-0 text-[7px] font-bold font-mono" style={{ color: c }}>%</div>
        </div>
      );

    /* ── Lottie URL ── */
    case 'lottie_url':
      return gifUrl ? <LottiePreview url={gifUrl} size={32} /> : <span className="text-[8px] text-muted-foreground">No URL</span>;

    case 'custom_gif':
      return gifUrl ? <img src={gifUrl} alt="status" className="w-8 h-8 object-contain" /> : <span className="text-[8px] text-muted-foreground">No GIF</span>;
    default:
      return <div className="w-3 h-3 rounded-full" style={{ background: c }} />;
  }
}

export default function LayoutPreviewModule() {
  const [iconConfig, setIconConfig] = useState(null);
  const [activeLayout, setActiveLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [savingStatuses, setSavingStatuses] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const [iconsRes, styleRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/ticker/layout-icons`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/public/ui-style`),
        fetch(`${API_URL}/api/admin/ticker/icon-statuses`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (iconsRes.ok) {
        const data = await iconsRes.json();
        setIconConfig(data.resolved || {});
      }
      if (styleRes.ok) {
        const styleData = await styleRes.json();
        setActiveLayout(styleData?.public?.layout || styleData?.layout || 'living_grid');
      }
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.statuses?.length > 0) {
          setStatusOptions(statusData.statuses);
        }
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
      status: 'building',
      status_animation: 'building_bars',
      status_gif_url: '',
      status_color: '#f59e0b',
      status_label: '',
    };
    setIconConfig(prev => ({
      ...prev,
      [layoutId]: [...(prev[layoutId] || []), newIcon]
    }));
    setHasChanges(true);
  };

  // Status management
  const addCustomStatus = () => {
    const id = `custom_${Date.now()}`;
    setStatusOptions(prev => [...prev, {
      value: id,
      label: 'New Status',
      color: '#8b5cf6',
      animation: 'pulse',
      gif_url: '',
    }]);
  };

  const updateStatus = (idx, field, val) => {
    setStatusOptions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removeStatus = (idx) => {
    setStatusOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const saveStatuses = async () => {
    setSavingStatuses(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ticker/icon-statuses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ statuses: statusOptions }),
      });
      if (res.ok) toast.success('Statuses saved');
    } catch {
      toast.error('Failed to save statuses');
    } finally {
      setSavingStatuses(false);
    }
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
      {/* Shared keyframes for animation previews */}
      <style>{`
        @keyframes building { 0%, 100% { transform: scaleY(0.6); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }
        @keyframes blocks { 0% { transform: scaleY(0.3); opacity: 0.4; } 50% { transform: scaleY(1.2); opacity: 1; } 100% { transform: scaleY(0.3); opacity: 0.4; } }
        @keyframes wave { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1.4); } }
        @keyframes hammer { 0% { transform: rotate(0deg); } 100% { transform: rotate(-30deg); } }
        @keyframes rocket { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes statusBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes statusPulse { 0%, 100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes lanternGlow { 0%, 100% { filter: brightness(0.8); transform: rotate(-3deg); } 50% { filter: brightness(1.3); transform: rotate(3deg); } }
        @keyframes dragonFloat { 0% { transform: translateX(-2px) translateY(0); } 25% { transform: translateX(2px) translateY(-1px); } 50% { transform: translateX(0px) translateY(-2px); } 75% { transform: translateX(-1px) translateY(-1px); } 100% { transform: translateX(-2px) translateY(0); } }
        @keyframes craneHook { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
        @keyframes bambooGrow { 0% { transform: scaleY(0); opacity: 0; } 60% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 1; } }
        @keyframes fireworkBurst { 0% { transform: scale(0); opacity: 1; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.6); opacity: 0; } }
        @keyframes typingCursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dataOrbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes progressFill { 0% { width: 0%; } 80% { width: 100%; } 100% { width: 100%; opacity: 0.5; } }
        @keyframes templeStack { 0% { transform: translateY(4px); opacity: 0; } 40% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes sparkleRotate { 0% { transform: rotate(0deg) scale(0.8); opacity: 0.6; } 50% { transform: rotate(180deg) scale(1.2); opacity: 1; } 100% { transform: rotate(360deg) scale(0.8); opacity: 0.6; } }
      `}</style>
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
                  statusOptions={statusOptions}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Status Manager */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3" data-testid="status-manager">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowStatusManager(!showStatusManager)}
            className="flex items-center gap-2 text-left"
          >
            <Settings className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Custom Statuses</h3>
              <p className="text-[10px] text-muted-foreground">
                {statusOptions.length} statuses — Create and customize status indicators
              </p>
            </div>
            {showStatusManager ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showStatusManager && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addCustomStatus} className="h-7 text-xs gap-1" data-testid="add-status-btn">
                <Plus className="h-3 w-3" /> Add Status
              </Button>
              <Button size="sm" onClick={saveStatuses} disabled={savingStatuses} className="h-7 text-xs gap-1" data-testid="save-statuses-btn">
                {savingStatuses ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
            </div>
          )}
        </div>

        {showStatusManager && (
          <div className="space-y-3">
            {/* How-to-use info */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300" data-testid="status-howto">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed">
                <strong>How to apply:</strong> Click the <strong>"Icons"</strong> button on a layout card above, then set the <strong>"Status"</strong> dropdown on each icon to one of these statuses. The animation will appear on the landing page icons.
              </p>
            </div>

            {statusOptions.map((st, idx) => (
              <div
                key={st.value}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30"
                data-testid={`status-row-${st.value}`}
              >
                <input
                  type="color"
                  value={st.color || '#666'}
                  onChange={(e) => updateStatus(idx, 'color', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 shrink-0"
                />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">ID</Label>
                    <Input
                      value={st.value}
                      onChange={(e) => updateStatus(idx, 'value', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="h-7 text-xs font-mono"
                      data-testid={`status-id-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Display Name</Label>
                    <Input
                      value={st.label}
                      onChange={(e) => updateStatus(idx, 'label', e.target.value)}
                      className="h-7 text-xs"
                      data-testid={`status-label-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Animation</Label>
                    <select
                      value={st.animation || 'none'}
                      onChange={(e) => updateStatus(idx, 'animation', e.target.value)}
                      className="h-7 w-full px-2 text-xs border rounded-md bg-background"
                    >
                      {ANIMATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {(st.animation === 'custom_gif' || st.animation === 'lottie_url') && (
                    <div>
                      <Label className="text-[9px] text-muted-foreground">{st.animation === 'lottie_url' ? 'Lottie JSON URL' : 'GIF/Image URL'}</Label>
                      <Input
                        value={st.gif_url || ''}
                        onChange={(e) => updateStatus(idx, 'gif_url', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="https://...gif"
                      />
                    </div>
                  )}
                </div>
                {/* Preview */}
                <div className="shrink-0 w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden" title="Preview">
                  <StatusAnimationPreview animation={st.animation} color={st.color} gifUrl={st.gif_url} />
                </div>
                <button
                  onClick={() => removeStatus(idx)}
                  className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
