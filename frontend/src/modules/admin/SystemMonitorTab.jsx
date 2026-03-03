/**
 * SystemMonitorTab — Real-time system health dashboard for admins.
 * Shows CPU, memory, database stats, request counts, and recent logs.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity, Cpu, HardDrive, Database, RefreshCw, Clock,
  AlertTriangle, CheckCircle2, Loader2, Server, Zap
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function StatCard({ icon: Icon, label, value, unit, color = 'blue', warning }) {
  return (
    <div className={`p-3 rounded-lg border ${warning ? 'border-red-200 bg-red-50' : 'bg-card'}`} data-testid={`stat-${label}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${warning ? 'text-red-500' : `text-${color}-500`}`} />
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold ${warning ? 'text-red-600' : ''}`}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default function SystemMonitorTab() {
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const token = localStorage.getItem('auth_token');

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/system-monitor/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setHealth(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/system-monitor/logs?lines=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.lines || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchHealth();
    fetchLogs();
  }, [fetchHealth, fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchHealth(); }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const p = health?.process || {};
  const s = health?.system || {};
  const d = health?.database || {};
  const r = health?.requests || {};

  return (
    <div className="space-y-4" data-testid="system-monitor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">System Monitor</h2>
          {health?.status === 'ok' && <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Healthy</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? <><Zap className="h-3 w-3 text-green-500" /> Live</> : <><Clock className="h-3 w-3" /> Paused</>}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { fetchHealth(); fetchLogs(); }}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={HardDrive} label="Process Memory" value={p.memory_mb || 0} unit="MB" warning={p.memory_mb > 500} />
        <StatCard icon={Cpu} label="Process CPU" value={`${p.cpu_percent || 0}%`} warning={p.cpu_percent > 80} />
        <StatCard icon={Server} label="System Memory" value={`${s.memory_percent || 0}%`} warning={s.memory_percent > 85} />
        <StatCard icon={Cpu} label="System CPU" value={`${s.cpu_percent || 0}%`} warning={s.cpu_percent > 90} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={Database} label="Database" value={d.size_mb || '?'} unit="MB" />
        <StatCard icon={Clock} label="Uptime" value={health?.uptime_hours || 0} unit="hours" />
        <StatCard icon={Activity} label="Requests" value={r.total || 0} />
        <StatCard icon={AlertTriangle} label="Error Rate" value={`${r.error_rate || 0}%`} warning={r.error_rate > 5} color="red" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Server} label="Threads" value={p.threads || 0} />
        <StatCard icon={AlertTriangle} label="Errors" value={r.errors || 0} color="red" warning={r.errors > 10} />
        <StatCard icon={Clock} label="Slow (>5s)" value={r.slow_5s || 0} color="amber" warning={r.slow_5s > 5} />
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4" /> Recent Backend Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="font-mono text-[10px] space-y-0.5">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No recent logs</p>
              ) : logs.map((line, i) => (
                <div key={i} className={`px-1 py-0.5 rounded ${
                  line.includes('ERROR') ? 'bg-red-50 text-red-700' :
                  line.includes('WARNING') ? 'bg-amber-50 text-amber-700' :
                  'text-muted-foreground'
                }`}>{line}</div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
