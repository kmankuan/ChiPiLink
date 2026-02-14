/**
 * MondaySyncWidget — Unified Monday.com sync status dashboard widget.
 * Shows real-time sync health across all boards with quick actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Clock, Loader2, ArrowRight, Webhook, Package,
  ShoppingCart, Wallet, Activity, ExternalLink
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('auth_token');

const BOARD_ICONS = {
  txb_inventory: Package,
  textbook_orders: ShoppingCart,
  wallet_recharge: Wallet,
};

const HEALTH_CONFIG = {
  healthy: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', label: 'Healthy', icon: CheckCircle },
  degraded: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', label: 'Degraded', icon: AlertTriangle },
  not_synced: { color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700', label: 'Not Synced', icon: Clock },
  inactive: { color: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-700', label: 'Inactive', icon: XCircle },
  partial: { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', label: 'Partial', icon: Activity },
};

function HealthDot({ health }) {
  const cfg = HEALTH_CONFIG[health] || HEALTH_CONFIG.inactive;
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.color}`} title={cfg.label} />
  );
}

function TimeAgo({ dateStr }) {
  if (!dateStr) return <span className="text-muted-foreground text-xs">Never</span>;
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  let label;
  if (mins < 1) label = 'Just now';
  else if (mins < 60) label = `${mins}m ago`;
  else if (hours < 24) label = `${hours}h ago`;
  else label = `${days}d ago`;

  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1" title={d.toLocaleString()}>
      <Clock className="h-3 w-3" /> {label}
    </span>
  );
}

function BoardCard({ board, onSyncNow, syncing }) {
  const Icon = BOARD_ICONS[board.id] || Package;
  const healthCfg = HEALTH_CONFIG[board.health] || HEALTH_CONFIG.inactive;
  const HealthIcon = healthCfg.icon;
  const stats = board.sync_stats || {};

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-all ${healthCfg.border} ${healthCfg.bg}`}
      data-testid={`sync-board-${board.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${healthCfg.color}/10`}>
            <Icon className={`h-4 w-4 ${healthCfg.text}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold leading-tight">{board.name}</h4>
            <p className="text-[10px] text-muted-foreground">
              Board: {board.board_id || 'Not configured'}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] gap-1 ${healthCfg.text} border-current/20`}
          data-testid={`health-badge-${board.id}`}
        >
          <HealthIcon className="h-3 w-3" />
          {healthCfg.label}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {board.id === 'txb_inventory' && (
          <>
            {stats.total_textbooks != null && (
              <span><strong>{stats.total_textbooks}</strong> textbooks</span>
            )}
            {stats.updated != null && (
              <span className="text-emerald-600"><strong>{stats.updated}</strong> updated</span>
            )}
            {stats.failed > 0 && (
              <span className="text-red-600"><strong>{stats.failed}</strong> failed</span>
            )}
          </>
        )}
        {board.id === 'textbook_orders' && (
          <>
            <span><strong>{stats.synced_orders || 0}</strong> synced</span>
            {stats.unsynced_orders > 0 && (
              <span className="text-amber-600"><strong>{stats.unsynced_orders}</strong> unsynced</span>
            )}
            {stats.auto_sync && (
              <span className="text-emerald-600">Auto-sync on</span>
            )}
          </>
        )}
        {board.id === 'wallet_recharge' && (
          <>
            <span><strong>{stats.monday_items || 0}</strong> items</span>
            {stats.pending > 0 && (
              <span className="text-amber-600"><strong>{stats.pending}</strong> pending</span>
            )}
            <span className="text-emerald-600"><strong>{stats.approved || 0}</strong> approved</span>
            {stats.webhook_errors > 0 && (
              <span className="text-red-600"><strong>{stats.webhook_errors}</strong> errors</span>
            )}
          </>
        )}
      </div>

      {/* Footer: last sync + actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <TimeAgo dateStr={board.last_sync || stats.synced_at} />
        <div className="flex gap-1.5">
          {board.webhook_active && (
            <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-600 border-emerald-300">
              <Webhook className="h-2.5 w-2.5" /> Live
            </Badge>
          )}
          {board.id === 'txb_inventory' && board.enabled && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => onSyncNow(board.id)}
              disabled={syncing}
              data-testid={`sync-now-${board.id}`}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync
            </Button>
          )}
          {board.id === 'textbook_orders' && board.enabled && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => onSyncNow(board.id)}
              disabled={syncing}
              data-testid={`sync-now-${board.id}`}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync All
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={() => window.location.hash = 'integrations'}
            data-testid={`view-config-${board.id}`}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MondaySyncWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/monday/sync-dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Failed to load sync dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSyncNow = async (boardId) => {
    setSyncing(boardId);
    try {
      let url;
      if (boardId === 'txb_inventory') {
        url = `${API}/api/store/monday/txb-inventory/full-sync`;
      } else if (boardId === 'textbook_orders') {
        url = `${API}/api/store/monday/sync-all`;
      } else {
        toast.info('Manual sync not available for this board');
        return;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Sync complete: ${JSON.stringify(result).slice(0, 100)}`);
        fetchDashboard();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Sync failed');
      }
    } catch (e) {
      toast.error('Sync request failed');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const overallCfg = HEALTH_CONFIG[data.overall_health] || HEALTH_CONFIG.inactive;
  const OverallIcon = overallCfg.icon;

  return (
    <Card data-testid="monday-sync-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Monday.com Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${overallCfg.text}`}
              data-testid="overall-health-badge"
            >
              <OverallIcon className="h-3.5 w-3.5" />
              {overallCfg.label}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => { setLoading(true); fetchDashboard(); }}
              data-testid="refresh-sync-dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.active_boards}/{data.total_boards} boards active
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onSyncNow={handleSyncNow}
            syncing={syncing === board.id}
          />
        ))}

        {/* Recent Activity */}
        {data.boards.some(b => b.recent_activity?.length > 0) && (
          <div className="pt-2 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground mb-2">Recent Sync Activity</h5>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {data.boards
                .flatMap(b => (b.recent_activity || []).map(a => ({ ...a, board: b.name })))
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                .slice(0, 8)
                .map((activity, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-muted/30">
                    <HealthDot health={activity.status === 'error' ? 'degraded' : 'healthy'} />
                    <span className="font-medium truncate flex-1">
                      {activity.product_name || activity.event_type || activity.notes || 'Sync event'}
                    </span>
                    <span className="text-muted-foreground text-[10px] flex-shrink-0">
                      {activity.board}
                    </span>
                    <TimeAgo dateStr={activity.timestamp} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
