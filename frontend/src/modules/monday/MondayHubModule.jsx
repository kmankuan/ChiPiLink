/**
 * MondayHubModule — Unified Monday.com admin panel.
 * Consolidates all Monday.com configs: boards, sync, webhooks, widget, queue.
 */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, RefreshCw, Globe, Bell, Activity, Plug } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

// Import existing Monday sub-modules
import { lazy, Suspense } from 'react';
const MondayModule = lazy(() => import('@/modules/monday/MondayModule'));
const MondayTextbookSyncModule = lazy(() => import('@/modules/school-textbooks/MondayTextbookSyncModule'));

const API = RESOLVED_API_URL;

function QueueStatus({ token }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/admin/system-monitor/health`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setStats(d.monday_queue))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [token]);

  if (!stats) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> API Queue Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{stats.queue_depth || 0}</p>
            <p className="text-[10px] text-muted-foreground">Queued</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{stats.running || 0}</p>
            <p className="text-[10px] text-muted-foreground">Running</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{stats.total_completed || 0}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className={`text-lg font-bold ${(stats.total_errors || 0) > 0 ? 'text-red-600' : ''}`}>{stats.total_errors || 0}</p>
            <p className="text-[10px] text-muted-foreground">Errors</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MondayHubModule() {
  const token = localStorage.getItem('auth_token');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-[#FF3D57]/10">
          <Plug className="h-5 w-5 text-[#FF3D57]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Monday.com</h2>
          <p className="text-xs text-muted-foreground">Central hub for all Monday.com integrations</p>
        </div>
      </div>

      {/* Queue Status — always visible */}
      <QueueStatus token={token} />

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="connection" className="gap-1 text-xs"><Link2 className="h-3 w-3" />Connection</TabsTrigger>
          <TabsTrigger value="sync" className="gap-1 text-xs"><RefreshCw className="h-3 w-3" />Sync</TabsTrigger>
          <TabsTrigger value="widget" className="gap-1 text-xs"><Globe className="h-3 w-3" />Widget</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1 text-xs"><Bell className="h-3 w-3" />Webhooks</TabsTrigger>
        </TabsList>

        {/* Connection — workspaces, API key, boards overview */}
        <TabsContent value="connection">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <MondayModule initialTab="workspaces" />
          </Suspense>
        </TabsContent>

        {/* Sync — textbook sync, inventory sync, status mapping */}
        <TabsContent value="sync">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <MondayTextbookSyncModule />
          </Suspense>
        </TabsContent>

        {/* Widget — public board widget config */}
        <TabsContent value="widget">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <MondayModule initialTab="public-widget" />
          </Suspense>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <MondayModule initialTab="webhooks" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
