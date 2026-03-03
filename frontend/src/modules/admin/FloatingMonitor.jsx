/**
 * FloatingMonitor — Persistent corner widget showing system health.
 * Always visible in admin panel. Click to expand quick stats.
 */
import { useState, useEffect, useCallback } from 'react';
import { Activity, X } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function FloatingMonitor() {
  const [health, setHealth] = useState(null);
  const [expanded, setExpanded] = useState(false);
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
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!health) return null;

  const mem = health.process?.memory_mb || 0;
  const cpu = health.system?.cpu_percent || 0;
  const errRate = health.requests?.error_rate || 0;
  const hasWarning = mem > 500 || cpu > 80 || errRate > 5;

  return (
    <div className="fixed bottom-4 left-4 z-50" data-testid="floating-monitor">
      {/* Expanded panel */}
      {expanded && (
        <div className="mb-2 bg-card/95 backdrop-blur-xl border rounded-xl shadow-lg p-3 w-52 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">System Health</span>
            <button onClick={() => setExpanded(false)} className="p-0.5 rounded hover:bg-muted"><X className="h-3 w-3" /></button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Memory</span>
              <span className={`font-bold ${mem > 500 ? 'text-red-600' : ''}`}>{mem} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPU</span>
              <span className={`font-bold ${cpu > 80 ? 'text-red-600' : ''}`}>{cpu}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests</span>
              <span className="font-bold">{health.requests?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Errors</span>
              <span className={`font-bold ${errRate > 5 ? 'text-red-600' : ''}`}>{health.requests?.errors || 0} ({errRate}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slow (&gt;5s)</span>
              <span className="font-bold">{health.requests?.slow_5s || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-bold">{health.uptime_hours || 0}h</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating icon button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
          hasWarning
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-card border text-muted-foreground hover:text-foreground hover:shadow-xl'
        }`}
        title="System Monitor"
        data-testid="floating-monitor-btn"
      >
        <Activity className="h-4 w-4" />
      </button>
    </div>
  );
}
