/**
 * TelegramAdminModule — Admin panel for Telegram Channel integration.
 * Manage channel config, sync, visibility, feed containers, and view stats.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Settings, Eye, BarChart3, Loader2, CheckCircle, AlertCircle,
  Radio, Plus, Trash2, GripVertical, Copy, ChevronDown, ChevronUp,
  Palette, Type, Layout, ToggleLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#faf6f0', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" style={{ color: '#b8956a' }} />
        <span className="text-[11px] font-medium" style={{ color: '#8B6914' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#2d2217' }}>{value}</p>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-medium flex-1" style={{ color: '#8B6914' }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border cursor-pointer"
          style={{ borderColor: 'rgba(0,0,0,0.1)' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 rounded text-[11px] border"
          style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#2d2217' }}
        />
      </div>
    </div>
  );
}

/* ────────── Container Editor ────────── */

function ContainerEditor({ container, onSave, onDelete, onDuplicate, isNew }) {
  const [data, setData] = useState(container);
  const [expanded, setExpanded] = useState(isNew);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: '#fff', border: `1px solid ${data.is_active ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)'}`, opacity: data.is_active ? 1 : 0.6 }}
      data-testid={`container-editor-${data.container_id || 'new'}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: '#b8956a' }} />
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: data.accent_color || '#0088cc' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: '#2d2217' }}>{data.title || 'Untitled Feed'}</p>
          <p className="text-[10px]" style={{ color: '#b8956a' }}>
            {data.channel_id ? `Channel: ${data.channel_id}` : 'No channel set'} &middot; {data.card_style}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!data.is_active && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">HIDDEN</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" style={{ color: '#b8956a' }} /> : <ChevronDown className="h-4 w-4" style={{ color: '#b8956a' }} />}
        </div>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {/* Basic Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-3.5 w-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-bold" style={{ color: '#2d2217' }}>Content</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Title</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => update('title', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                data-testid="container-title-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Subtitle</label>
              <input
                type="text"
                value={data.subtitle || ''}
                onChange={(e) => update('subtitle', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                data-testid="container-subtitle-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Channel ID</label>
                <input
                  type="number"
                  value={data.channel_id || ''}
                  onChange={(e) => update('channel_id', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Auto-detect"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                  data-testid="container-channel-id"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Post Limit</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={data.post_limit || 5}
                  onChange={(e) => update('post_limit', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                  data-testid="container-post-limit"
                />
              </div>
            </div>
          </div>

          {/* Layout Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-3.5 w-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-bold" style={{ color: '#2d2217' }}>Layout Mode</span>
            </div>
            <div className="flex gap-2">
              {['horizontal', 'vertical'].map(mode => (
                <button
                  key={mode}
                  onClick={() => update('layout_mode', mode)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center"
                  style={{
                    background: (data.layout_mode || 'horizontal') === mode ? '#2d2217' : '#f5f5f5',
                    color: (data.layout_mode || 'horizontal') === mode ? '#fff' : '#666',
                  }}
                  data-testid={`layout-mode-${mode}`}
                >
                  {mode === 'horizontal' ? 'Horizontal Scroll' : 'Vertical List'}
                </button>
              ))}
            </div>

            {/* Horizontal-specific settings */}
            {(data.layout_mode || 'horizontal') === 'horizontal' && (
              <div className="space-y-3 pt-2 pl-2 border-l-2" style={{ borderColor: '#e5ddd0' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Card Width (px)</label>
                    <input
                      type="number"
                      min={150}
                      max={400}
                      value={data.card_width || 220}
                      onChange={(e) => update('card_width', parseInt(e.target.value) || 220)}
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                      data-testid="container-card-width"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Card Height (px)</label>
                    <input
                      type="number"
                      min={200}
                      max={500}
                      value={data.card_height || 300}
                      onChange={(e) => update('card_height', parseInt(e.target.value) || 300)}
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
                      data-testid="container-card-height"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Description Max Lines</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => update('description_max_lines', n)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: (data.description_max_lines || 2) === n ? '#2d2217' : '#f5f5f5',
                          color: (data.description_max_lines || 2) === n ? '#fff' : '#666',
                        }}
                        data-testid={`max-lines-${n}`}
                      >
                        {n} {n === 1 ? 'line' : 'lines'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-3.5 w-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-bold" style={{ color: '#2d2217' }}>Appearance</span>
            </div>
            <ColorInput label="Background" value={data.bg_color} onChange={(v) => update('bg_color', v)} />
            <ColorInput label="Accent" value={data.accent_color} onChange={(v) => update('accent_color', v)} />
            <ColorInput label="Header BG" value={data.header_bg} onChange={(v) => update('header_bg', v)} />
            <ColorInput label="Icon" value={data.icon_color} onChange={(v) => update('icon_color', v)} />
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Card Style</label>
              <div className="flex gap-2">
                {['compact', 'expanded', 'minimal'].map(style => (
                  <button
                    key={style}
                    onClick={() => update('card_style', style)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: data.card_style === style ? '#2d2217' : '#f5f5f5',
                      color: data.card_style === style ? '#fff' : '#666',
                    }}
                    data-testid={`style-${style}`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Border Radius</label>
              <div className="flex gap-2">
                {['none', 'lg', 'xl', '2xl'].map(r => (
                  <button
                    key={r}
                    onClick={() => update('border_radius', r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: data.border_radius === r ? '#2d2217' : '#f5f5f5',
                      color: data.border_radius === r ? '#fff' : '#666',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer & CTA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-3.5 w-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-bold" style={{ color: '#2d2217' }}>Footer & CTA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: '#8B6914' }}>Show Footer</span>
              <button
                onClick={() => update('show_footer', !data.show_footer)}
                className={`w-10 h-5 rounded-full transition-colors relative ${data.show_footer ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.show_footer ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>CTA Text</label>
              <input
                type="text"
                value={data.cta_text || ''}
                onChange={(e) => update('cta_text', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>CTA Link</label>
              <input
                type="text"
                value={data.cta_link || ''}
                onChange={(e) => update('cta_link', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ToggleLeft className="h-3.5 w-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-bold" style={{ color: '#2d2217' }}>Toggles</span>
            </div>
            {[
              { key: 'show_post_count', label: 'Show Post Count' },
              { key: 'show_media_count', label: 'Show Media Count' },
              { key: 'is_active', label: 'Active (visible on landing)' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#8B6914' }}>{label}</span>
                <button
                  onClick={() => update(key, !data[key])}
                  className={`w-10 h-5 rounded-full transition-colors relative ${data[key] ? 'bg-green-500' : 'bg-gray-300'}`}
                  data-testid={`toggle-${key}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data[key] ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
              style={{ background: '#0088cc' }}
              data-testid="container-save-btn"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {isNew ? 'Create' : 'Save'}
            </button>
            {!isNew && (
              <>
                <button
                  onClick={() => onDuplicate(data)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{ background: '#f0f4f8', color: '#64748b' }}
                  data-testid="container-duplicate-btn"
                  title="Duplicate this container"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(data.container_id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
                  data-testid="container-delete-btn"
                  title="Delete this container"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Main Admin Module ────────── */

export default function TelegramAdminModule() {
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [visibility, setVisibility] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [showNewContainer, setShowNewContainer] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, configRes, visRes, containersRes] = await Promise.all([
        fetch(`${API_URL}/api/community-v2/feed/admin/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/community-v2/feed/admin/config`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/community-v2/feed/admin/visibility`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/community-v2/feed/admin/containers`, { headers: authHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d.config);
        setBotInfo(d.bot);
      }
      if (visRes.ok) setVisibility(await visRes.json());
      if (containersRes.ok) {
        const d = await containersRes.json();
        setContainers(d.containers || []);
      }
    } catch (e) {
      setError('Failed to load Telegram config');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_URL}/api/community-v2/feed/admin/sync`, {
        method: 'POST', headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncResult(`Synced ${data.new_posts || 0} new posts`);
        fetchAll();
      } else {
        setSyncResult('Sync failed');
      }
    } catch {
      setSyncResult('Sync error');
    }
    setSyncing(false);
  };

  const handleConfigSave = async (updates) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/community-v2/feed/admin/config`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates),
      });
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleVisibilitySave = async (vis, roles) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/community-v2/feed/admin/visibility`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ visibility: vis, allowed_roles: roles }),
      });
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Container CRUD
  const handleContainerSave = async (containerData) => {
    if (containerData.container_id) {
      await fetch(`${API_URL}/api/community-v2/feed/admin/containers/${containerData.container_id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(containerData),
      });
    } else {
      await fetch(`${API_URL}/api/community-v2/feed/admin/containers`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(containerData),
      });
      setShowNewContainer(false);
    }
    fetchAll();
  };

  const handleContainerDelete = async (containerId) => {
    if (!window.confirm('Delete this feed container?')) return;
    await fetch(`${API_URL}/api/community-v2/feed/admin/containers/${containerId}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    fetchAll();
  };

  const handleContainerDuplicate = async (containerData) => {
    const newData = { ...containerData, title: `${containerData.title} (Copy)` };
    delete newData.container_id;
    delete newData.created_at;
    delete newData.created_by;
    delete newData.updated_at;
    await fetch(`${API_URL}/api/community-v2/feed/admin/containers`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(newData),
    });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#b8956a' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: '#fef2f2' }}>
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchAll} className="mt-3 text-xs font-bold text-red-600 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#2d2217' }}>Telegram Channel</h2>
          <p className="text-xs" style={{ color: '#b8956a' }}>
            {botInfo ? `Bot: @${botInfo.username}` : 'Manage your community channel integration'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
          style={{ background: '#0088cc' }}
          data-testid="telegram-sync-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {syncResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#ecfdf5', color: '#065f46' }}>
          <CheckCircle className="h-3.5 w-3.5" /> {syncResult}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3" data-testid="telegram-stats">
        <StatCard label="Posts" value={stats?.total_posts || 0} icon={BarChart3} />
        <StatCard label="Likes" value={stats?.total_likes || 0} icon={BarChart3} />
        <StatCard label="Comments" value={stats?.total_comments || 0} icon={BarChart3} />
      </div>

      {/* ════════ Feed Containers ════════ */}
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4" style={{ color: '#8B6914' }} />
            <h3 className="text-sm font-bold" style={{ color: '#2d2217' }}>Feed Containers</h3>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#f5ede0', color: '#8B6914' }}>
              {containers.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewContainer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: '#0088cc' }}
            data-testid="add-container-btn"
          >
            <Plus className="h-3.5 w-3.5" /> Add Container
          </button>
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#b8956a' }}>
          Each container can show posts from a different channel or group. Customize their appearance independently.
        </p>
        <div className="space-y-3">
          {containers.map(c => (
            <ContainerEditor
              key={c.container_id}
              container={c}
              onSave={handleContainerSave}
              onDelete={handleContainerDelete}
              onDuplicate={handleContainerDuplicate}
              isNew={false}
            />
          ))}
          {showNewContainer && (
            <ContainerEditor
              container={{
                title: 'New Feed',
                subtitle: 'Latest updates',
                channel_id: null,
                post_limit: 10,
                bg_color: '#ffffff',
                accent_color: '#0088cc',
                header_bg: '#E8F4FE',
                icon_color: '#0088cc',
                card_style: 'compact',
                show_footer: true,
                cta_text: 'Open Community Feed',
                cta_link: '/comunidad',
                border_radius: '2xl',
                show_post_count: true,
                show_media_count: true,
                is_active: true,
                layout_mode: 'horizontal',
                card_width: 220,
                card_height: 300,
                description_max_lines: 2,
              }}
              onSave={handleContainerSave}
              onDelete={() => setShowNewContainer(false)}
              onDuplicate={() => {}}
              isNew={true}
            />
          )}
          {containers.length === 0 && !showNewContainer && (
            <div className="text-center py-8">
              <Layout className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4c5b0' }} />
              <p className="text-xs" style={{ color: '#b8956a' }}>No containers configured. The default channel will be used.</p>
              <p className="text-[10px] mt-1" style={{ color: '#b8956a' }}>Add a container to customize the feed appearance.</p>
            </div>
          )}
        </div>
      </div>

      {/* Channel Config */}
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4" style={{ color: '#8B6914' }} />
          <h3 className="text-sm font-bold" style={{ color: '#2d2217' }}>Channel Settings</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Channel ID</label>
            <input
              type="text"
              readOnly
              value={config?.channel_id || 'Auto-detected on first message'}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: '#faf6f0', borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
              data-testid="telegram-channel-id"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Channel Title</label>
            <input
              type="text"
              value={config?.channel_title || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, channel_title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
              data-testid="telegram-channel-title"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#2d2217' }}>Auto Sync</p>
              <p className="text-[10px]" style={{ color: '#b8956a' }}>Automatically poll for new posts</p>
            </div>
            <button
              onClick={() => {
                const newVal = !(config?.auto_sync ?? true);
                setConfig(prev => ({ ...prev, auto_sync: newVal }));
                handleConfigSave({ auto_sync: newVal });
              }}
              className={`w-10 h-5 rounded-full transition-colors relative ${config?.auto_sync !== false ? 'bg-green-500' : 'bg-gray-300'}`}
              data-testid="telegram-auto-sync-toggle"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config?.auto_sync !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: '#8B6914' }}>Poll Interval (seconds)</label>
            <input
              type="number"
              min={30}
              max={3600}
              value={config?.poll_interval || 120}
              onChange={(e) => setConfig(prev => ({ ...prev, poll_interval: parseInt(e.target.value) || 120 }))}
              onBlur={() => handleConfigSave({ poll_interval: config?.poll_interval || 120 })}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#2d2217' }}
              data-testid="telegram-poll-interval"
            />
          </div>
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4" style={{ color: '#8B6914' }} />
          <h3 className="text-sm font-bold" style={{ color: '#2d2217' }}>Feed Visibility</h3>
        </div>
        <div className="space-y-3">
          {[
            { value: 'all_users', label: 'All Users', desc: 'Everyone can see the feed' },
            { value: 'admin_only', label: 'Admin Only', desc: 'Only admins can access' },
            { value: 'specific_roles', label: 'Specific Roles', desc: 'Restrict by role' },
          ].map(opt => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              style={{
                background: visibility?.visibility === opt.value ? '#faf6f0' : 'transparent',
                border: `1px solid ${visibility?.visibility === opt.value ? '#d4a84b' : 'rgba(0,0,0,0.06)'}`,
              }}
              data-testid={`visibility-${opt.value}`}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility?.visibility === opt.value}
                onChange={() => handleVisibilitySave(opt.value, visibility?.allowed_roles || [])}
                className="mt-0.5 accent-amber-600"
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#2d2217' }}>{opt.label}</p>
                <p className="text-[10px]" style={{ color: '#b8956a' }}>{opt.desc}</p>
              </div>
            </label>
          ))}

          {visibility?.visibility === 'specific_roles' && visibility?.available_roles?.length > 0 && (
            <div className="pl-6 pt-2 space-y-2">
              {visibility.available_roles.map(role => (
                <label key={role.role_id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(visibility?.allowed_roles || []).includes(role.role_id)}
                    onChange={(e) => {
                      const roles = [...(visibility?.allowed_roles || [])];
                      if (e.target.checked) roles.push(role.role_id);
                      else roles.splice(roles.indexOf(role.role_id), 1);
                      setVisibility(prev => ({ ...prev, allowed_roles: roles }));
                      handleVisibilitySave('specific_roles', roles);
                    }}
                    className="accent-amber-600"
                  />
                  <span className="text-sm" style={{ color: '#2d2217' }}>{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: botInfo ? '#ecfdf5' : '#fef3c7', border: '1px solid rgba(0,0,0,0.06)' }}>
        <Radio className="h-4 w-4" style={{ color: botInfo ? '#065f46' : '#92400e' }} />
        <div>
          <p className="text-xs font-bold" style={{ color: botInfo ? '#065f46' : '#92400e' }}>
            {botInfo ? 'Bot Connected' : 'Bot Not Connected'}
          </p>
          <p className="text-[10px]" style={{ color: botInfo ? '#047857' : '#b45309' }}>
            {botInfo ? `@${botInfo.username} (ID: ${botInfo.id})` : 'Set TELEGRAM_BOT_TOKEN in environment'}
          </p>
        </div>
      </div>
    </div>
  );
}
