/**
 * TelegramAdminModule — Admin panel for Telegram Channel integration.
 * Manage channel config, sync, visibility, and view stats.
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, Eye, BarChart3, Loader2, CheckCircle, AlertCircle, Radio } from 'lucide-react';

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

export default function TelegramAdminModule() {
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [visibility, setVisibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, configRes, visRes] = await Promise.all([
        fetch(`${API_URL}/api/community-v2/feed/admin/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/community-v2/feed/admin/config`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/community-v2/feed/admin/visibility`, { headers: authHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d.config);
        setBotInfo(d.bot);
      }
      if (visRes.ok) setVisibility(await visRes.json());
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
