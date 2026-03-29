import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Server, Users, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function AdminStatsWidget({ config }) {
  const { i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const title = typeof config?.title === 'object' ? (config.title[i18n.language] || config.title.en || 'System Health') : (config?.title || 'System Health');

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const res = await fetch(`${API}/api/admin/system-monitor/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = config?.refresh_interval || 30;
    const tid = setInterval(fetchStats, interval * 1000);
    return () => clearInterval(tid);
  }, [config]);

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 flex justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> {title}</span>
          <span className="text-xs font-mono text-muted-foreground">Uptime: {stats.uptime_hours}h</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3"/> CPU</span>
            <span className="text-lg font-bold">{stats.system?.cpu_percent || 0}%</span>
          </div>
          <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3"/> RAM</span>
            <span className="text-lg font-bold">{stats.system?.memory_percent || 0}%</span>
          </div>
          <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> Active (5m)</span>
            <span className="text-lg font-bold text-green-600">{stats.active_users?.users_5m || 0}</span>
          </div>
          <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3"/> Requests</span>
            <span className="text-lg font-bold">{stats.requests?.total || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
