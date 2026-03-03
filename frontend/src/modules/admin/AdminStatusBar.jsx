/**
 * AdminStatusBar — VS Code-style status bar for admin panel.
 * Shows configurable system indicators. Click to open System Monitor.
 * Draggable between top/bottom. Indicators configurable via gear icon.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Cpu, HardDrive, Database, Clock, AlertTriangle,
  Zap, Users, Settings, X, GripHorizontal, Wifi, MonitorSmartphone, Globe
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const ALL_INDICATORS = [
  { id: 'memory', label: 'Memory', icon: HardDrive, getValue: h => `${h?.process?.memory_mb || 0}MB`, warn: h => (h?.process?.memory_mb || 0) > 500 },
  { id: 'cpu', label: 'CPU', icon: Cpu, getValue: h => `${h?.system?.cpu_percent || 0}%`, warn: h => (h?.system?.cpu_percent || 0) > 80 },
  { id: 'active_users', label: 'Users', icon: Users, getValue: h => h?.active_users?.users_5m || 0, warn: () => false },
  { id: 'live_ws', label: 'Live', icon: Wifi, getValue: h => h?.websockets?.total || 0, warn: () => false },
  { id: 'requests', label: 'Reqs', icon: Activity, getValue: h => h?.requests?.total || 0, warn: () => false },
  { id: 'errors', label: 'Errors', icon: AlertTriangle, getValue: h => h?.requests?.errors || 0, warn: h => (h?.requests?.errors || 0) > 0 },
  { id: 'fe_load', label: 'Load', icon: MonitorSmartphone, getValue: h => h?.frontend?.load_ms ? `${h.frontend.load_ms}ms` : '-', warn: h => (h?.frontend?.load_ms || 0) > 5000 },
  { id: 'fe_errors', label: 'JS Err', icon: Globe, getValue: h => h?.frontend?.errors || 0, warn: h => (h?.frontend?.errors || 0) > 0 },
  { id: 'slow', label: 'Slow', icon: Clock, getValue: h => h?.requests?.slow_5s || 0, warn: h => (h?.requests?.slow_5s || 0) > 3 },
  { id: 'uptime', label: 'Up', icon: Zap, getValue: h => `${h?.uptime_hours || 0}h`, warn: () => false },
  { id: 'db', label: 'DB', icon: Database, getValue: h => `${h?.database?.size_mb || '?'}MB`, warn: () => false },
  { id: 'ips', label: 'IPs', icon: Globe, getValue: h => h?.active_users?.unique_ips_5m || 0, warn: () => false },
  { id: 'threads', label: 'Threads', icon: Users, getValue: h => h?.process?.threads || 0, warn: () => false },
  { id: 'error_rate', label: 'Err%', icon: AlertTriangle, getValue: h => `${h?.requests?.error_rate || 0}%`, warn: h => (h?.requests?.error_rate || 0) > 5 },
];

const DEFAULT_VISIBLE = ['memory', 'cpu', 'active_users', 'live_ws', 'requests', 'errors', 'fe_load'];
const STORAGE_KEY = 'admin_statusbar_config';

export default function AdminStatusBar({ onNavigateToMonitor }) {
  const [health, setHealth] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [position, setPosition] = useState('bottom'); // 'top' or 'bottom'
  const [visibleIds, setVisibleIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.visible || DEFAULT_VISIBLE; } catch { return DEFAULT_VISIBLE; }
  });

  const token = localStorage.getItem('auth_token');

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/system-monitor/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setHealth(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible: visibleIds, position }));
    } catch {}
  }, [visibleIds, position]);

  const toggleIndicator = (id) => {
    setVisibleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const visibleIndicators = ALL_INDICATORS.filter(ind => visibleIds.includes(ind.id));
  const hasWarning = visibleIndicators.some(ind => ind.warn(health));

  return (
    <>
      {/* Status Bar */}
      <div
        className={`fixed left-0 right-0 z-40 h-6 bg-[#1e1e2e] text-[#cdd6f4] flex items-center px-2 gap-0 text-[10px] font-mono select-none ${
          position === 'top' ? 'top-0' : 'bottom-0'
        }`}
        data-testid="admin-status-bar"
      >
        {/* Drag handle — click to toggle position */}
        <button
          onClick={() => setPosition(p => p === 'bottom' ? 'top' : 'bottom')}
          className="flex items-center gap-0.5 px-1.5 h-full hover:bg-white/10 text-white/40 shrink-0"
          title="Click to move bar"
        >
          <GripHorizontal className="h-2.5 w-2.5" />
        </button>

        {/* Status indicator */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mx-1 ${hasWarning ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />

        {/* Indicators — click any to open full monitor */}
        <div className="flex items-center gap-0 flex-1 overflow-hidden cursor-pointer" onClick={onNavigateToMonitor}>
          {visibleIndicators.map(ind => {
            const Icon = ind.icon;
            const isWarn = ind.warn(health);
            return (
              <div
                key={ind.id}
                className={`flex items-center gap-1 px-1.5 h-full hover:bg-white/10 transition-colors ${isWarn ? 'text-red-400' : ''}`}
                title={ind.label}
              >
                <Icon className="h-2.5 w-2.5 opacity-60" />
                <span>{ind.getValue(health)}</span>
              </div>
            );
          })}
        </div>

        {/* Config gear */}
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center px-1.5 h-full hover:bg-white/10 shrink-0"
          title="Configure indicators"
          data-testid="statusbar-config-btn"
        >
          <Settings className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Config Dropdown */}
      {configOpen && (
        <div className={`fixed right-2 z-50 w-56 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-xl p-2 ${
          position === 'bottom' ? 'bottom-8' : 'top-8'
        }`} data-testid="statusbar-config">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Status Bar Indicators</span>
            <button onClick={() => setConfigOpen(false)} className="text-white/40 hover:text-white"><X className="h-3 w-3" /></button>
          </div>
          <div className="space-y-0.5">
            {ALL_INDICATORS.map(ind => {
              const Icon = ind.icon;
              const active = visibleIds.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                  data-testid={`indicator-toggle-${ind.id}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="flex-1 text-left">{ind.label}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
