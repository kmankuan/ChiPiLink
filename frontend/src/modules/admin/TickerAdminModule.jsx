/**
 * TickerAdminModule — Full configuration panel for the activity ticker + sponsors.
 * Controls: sources, rotation, sponsors, styling, page visibility.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Trophy, UserPlus, ShoppingBag, MessageCircle, Wallet,
  Megaphone, Plus, Trash2, Save, RefreshCw, Eye, EyeOff,
  Settings, Palette, Clock, Layout, Sparkles, Image, Link,
  ChevronDown, ChevronUp, GripVertical
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('auth_token');

const SOURCE_ICONS = {
  matches: Trophy, new_users: UserPlus, orders: ShoppingBag,
  community: MessageCircle, transactions: Wallet, custom: Megaphone
};

const SOURCE_LABELS = {
  matches: 'PinPanClub Matches',
  new_users: 'New Members',
  orders: 'Store Orders',
  community: 'Community Posts',
  transactions: 'Wallet Activity',
  custom: 'Custom Messages'
};

export default function TickerAdminModule() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [landingImages, setLandingImages] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ sources: true, sponsors: true, style: false, pages: false, images: false });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/ticker/config`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      toast.error('Failed to load ticker config');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ticker/feed`);
      if (res.ok) setPreview(await res.json());
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { fetchConfig(); fetchPreview(); }, [fetchConfig, fetchPreview]);

  const saveConfig = async (updates) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ticker/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(updates || config)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        toast.success('Ticker settings saved');
        fetchPreview();
      }
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    setConfig(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addSponsor = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/ticker/sponsors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: 'New Sponsor', label: 'Check out our sponsor!', bg_color: '#FFD700', active: true })
      });
      if (res.ok) {
        toast.success('Sponsor added');
        fetchConfig();
      }
    } catch (e) {
      toast.error('Failed to add sponsor');
    }
  };

  const deleteSponsor = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/ticker/sponsors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      toast.success('Sponsor removed');
      fetchConfig();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const updateSponsor = async (id, updates) => {
    try {
      await fetch(`${API_URL}/api/admin/ticker/sponsors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(updates)
      });
    } catch (e) { /* save on blur */ }
  };

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading ticker config...</div>;
  if (!config) return <div className="p-6 text-center text-muted-foreground">Failed to load config</div>;

  return (
    <div className="space-y-4" data-testid="ticker-admin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Activity Ticker</h2>
          <p className="text-xs text-muted-foreground">Configure the live activity bar and sponsor banners</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Label className="text-xs">Enabled</Label>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => { updateField('enabled', v); saveConfig({ enabled: v }); }}
              data-testid="ticker-enabled-toggle"
            />
          </div>
          <Button size="sm" variant="outline" onClick={fetchPreview} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />Preview
          </Button>
          <Button size="sm" onClick={() => saveConfig()} disabled={saving} className="gap-1" data-testid="ticker-save-btn">
            <Save className="h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      {preview?.activities?.length > 0 && (
        <div className="rounded-lg overflow-hidden border" data-testid="ticker-preview">
          <div
            className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium"
            style={{
              background: config.style?.bg_color || '#1A1A1A',
              color: config.style?.text_color || '#fff',
              height: `${config.style?.height_px || 36}px`
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: config.style?.accent_color || '#C8102E' }} />
            <span>{preview.activities[0]?.text}</span>
          </div>
          <div className="bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground text-center">
            Preview — {preview.activities.length} activities, {preview.sponsors.length} sponsors
          </div>
        </div>
      )}

      {/* ─── General Settings ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Rotation (ms)</Label>
          <Input
            type="number" min={1000} step={500}
            value={config.rotation_interval_ms || 4000}
            onChange={(e) => updateField('rotation_interval_ms', parseInt(e.target.value))}
            className="h-8 text-sm"
            data-testid="ticker-rotation-input"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Sponsor every N</Label>
          <Input
            type="number" min={1}
            value={config.sponsor_frequency || 5}
            onChange={(e) => updateField('sponsor_frequency', parseInt(e.target.value))}
            className="h-8 text-sm"
            data-testid="ticker-sponsor-freq"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Max activities</Label>
          <Input
            type="number" min={5} max={50}
            value={config.max_activities || 20}
            onChange={(e) => updateField('max_activities', parseInt(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.pause_on_hover}
              onCheckedChange={(v) => updateField('pause_on_hover', v)}
            />
            <Label className="text-xs">Pause on hover</Label>
          </div>
        </div>
      </div>

      {/* ─── Activity Sources ─── */}
      <CollapsibleSection
        title="Activity Sources" icon={Settings}
        open={expandedSections.sources} onToggle={() => toggleSection('sources')}
      >
        <div className="space-y-2">
          {Object.entries(config.activity_sources || {}).map(([key, source]) => {
            const Icon = SOURCE_ICONS[key] || Megaphone;
            return (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: source.color || '#999' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{SOURCE_LABELS[key] || key}</p>
                  {key === 'custom' && source.enabled && (
                    <div className="mt-2 space-y-1">
                      {(source.messages || []).map((msg, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={msg.text || ''}
                            onChange={(e) => {
                              const msgs = [...(source.messages || [])];
                              msgs[i] = { ...msgs[i], text: e.target.value };
                              updateField(`activity_sources.custom.messages`, msgs);
                            }}
                            className="h-7 text-xs flex-1"
                            placeholder="Custom message text..."
                          />
                          <button
                            onClick={() => {
                              const msgs = (source.messages || []).filter((_, j) => j !== i);
                              updateField('activity_sources.custom.messages', msgs);
                            }}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => {
                          const msgs = [...(source.messages || []), { text: '', icon: 'megaphone', color: '#C8102E', active: true }];
                          updateField('activity_sources.custom.messages', msgs);
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />Add message
                      </Button>
                    </div>
                  )}
                </div>
                <input
                  type="color" value={source.color || '#999'}
                  onChange={(e) => updateField(`activity_sources.${key}.color`, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <Switch
                  checked={source.enabled}
                  onCheckedChange={(v) => updateField(`activity_sources.${key}.enabled`, v)}
                  data-testid={`source-${key}-toggle`}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ─── Sponsors ─── */}
      <CollapsibleSection
        title="Sponsor Banners" icon={Image}
        open={expandedSections.sponsors} onToggle={() => toggleSection('sponsors')}
        action={<Button size="sm" variant="outline" onClick={addSponsor} className="gap-1 h-7"><Plus className="h-3 w-3" />Add</Button>}
      >
        {(config.sponsors || []).length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No sponsors yet. Add one to show between activities.</p>
        ) : (
          <div className="space-y-2">
            {(config.sponsors || []).map((sponsor) => (
              <div key={sponsor.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                  <Input
                    value={sponsor.name || ''}
                    onChange={(e) => {
                      const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, name: e.target.value } : s);
                      updateField('sponsors', sponsors);
                    }}
                    onBlur={() => updateSponsor(sponsor.id, { name: sponsor.name })}
                    className="h-7 text-sm font-medium flex-1"
                    placeholder="Sponsor name"
                  />
                  <Switch
                    checked={sponsor.active !== false}
                    onCheckedChange={(v) => {
                      const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, active: v } : s);
                      updateField('sponsors', sponsors);
                      updateSponsor(sponsor.id, { active: v });
                    }}
                  />
                  <button onClick={() => deleteSponsor(sponsor.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Display text</Label>
                    <Input
                      value={sponsor.label || ''}
                      onChange={(e) => {
                        const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, label: e.target.value } : s);
                        updateField('sponsors', sponsors);
                      }}
                      onBlur={() => updateSponsor(sponsor.id, { label: sponsor.label })}
                      className="h-7 text-xs" placeholder="Banner text..."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Link URL</Label>
                    <Input
                      value={sponsor.link_url || ''}
                      onChange={(e) => {
                        const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, link_url: e.target.value } : s);
                        updateField('sponsors', sponsors);
                      }}
                      onBlur={() => updateSponsor(sponsor.id, { link_url: sponsor.link_url })}
                      className="h-7 text-xs" placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Image URL</Label>
                    <Input
                      value={sponsor.image_url || ''}
                      onChange={(e) => {
                        const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, image_url: e.target.value } : s);
                        updateField('sponsors', sponsors);
                      }}
                      onBlur={() => updateSponsor(sponsor.id, { image_url: sponsor.image_url })}
                      className="h-7 text-xs" placeholder="Logo URL..."
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">BG</Label>
                      <input
                        type="color" value={sponsor.bg_color || '#FFD700'}
                        onChange={(e) => {
                          const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, bg_color: e.target.value } : s);
                          updateField('sponsors', sponsors);
                          updateSponsor(sponsor.id, { bg_color: e.target.value });
                        }}
                        className="w-8 h-7 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Text</Label>
                      <input
                        type="color" value={sponsor.text_color || '#1A1A1A'}
                        onChange={(e) => {
                          const sponsors = (config.sponsors || []).map(s => s.id === sponsor.id ? { ...s, text_color: e.target.value } : s);
                          updateField('sponsors', sponsors);
                          updateSponsor(sponsor.id, { text_color: e.target.value });
                        }}
                        className="w-8 h-7 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ─── Style ─── */}
      <CollapsibleSection
        title="Appearance" icon={Palette}
        open={expandedSections.style} onToggle={() => toggleSection('style')}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Background</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color" value={config.style?.bg_color || '#1A1A1A'}
                onChange={(e) => updateField('style.bg_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={config.style?.bg_color || '#1A1A1A'}
                onChange={(e) => updateField('style.bg_color', e.target.value)}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Text</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color" value={config.style?.text_color || '#FFFFFF'}
                onChange={(e) => updateField('style.text_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={config.style?.text_color || '#FFFFFF'}
                onChange={(e) => updateField('style.text_color', e.target.value)}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Accent</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color" value={config.style?.accent_color || '#C8102E'}
                onChange={(e) => updateField('style.accent_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={config.style?.accent_color || '#C8102E'}
                onChange={(e) => updateField('style.accent_color', e.target.value)}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height (px)</Label>
            <Input
              type="number" min={24} max={60}
              value={config.style?.height_px || 36}
              onChange={(e) => updateField('style.height_px', parseInt(e.target.value))}
              className="h-8 text-sm mt-1"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* ─── Page Visibility ─── */}
      <CollapsibleSection
        title="Page Visibility" icon={Layout}
        open={expandedSections.pages} onToggle={() => toggleSection('pages')}
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Show on pages (one per line, * = all)</Label>
            <textarea
              value={(config.show_on_pages || ['*']).join('\n')}
              onChange={(e) => updateField('show_on_pages', e.target.value.split('\n').filter(Boolean))}
              className="w-full h-20 text-xs p-2 rounded-lg border bg-background font-mono"
              placeholder="*"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hide on pages (one per line)</Label>
            <textarea
              value={(config.hide_on_pages || []).join('\n')}
              onChange={(e) => updateField('hide_on_pages', e.target.value.split('\n').filter(Boolean))}
              className="w-full h-20 text-xs p-2 rounded-lg border bg-background font-mono"
              placeholder="/admin&#10;/login"
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, open, onToggle, children, action }) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}
