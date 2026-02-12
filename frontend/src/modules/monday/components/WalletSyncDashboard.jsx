/**
 * WalletSyncDashboard — Real-time sync status between app and Monday.com
 * Shows stats, recent sync events, errors, linked users, and manual re-sync.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, Users, ArrowUpDown, CheckCircle2,
  XCircle, AlertTriangle, RotateCcw, Upload, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletSyncDashboard() {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/sync-dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Failed to load sync dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/sync-all-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Synced ${result.synced} users, ${result.failed} failed`);
        fetchData();
      } else {
        toast.error(result.detail || 'Sync failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSyncing(false);
    }
  };

  const handleResyncUser = async (userId) => {
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/resync-user/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Re-synced: item ${result.monday_item_id}`);
        fetchData();
      } else {
        toast.error(result.detail || 'Re-sync failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-5" data-testid="wallet-sync-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Sync Dashboard</h3>
          <p className="text-xs text-muted-foreground">
            Real-time sync status between the app and Monday.com
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-1.5 text-xs"
            data-testid="refresh-sync-dashboard"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing}
            className="gap-1.5 text-xs"
            data-testid="sync-all-users-btn"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Sync All Users
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Linked Users"
          value={stats.linked_users || 0}
          icon={<Users className="h-4 w-4" />}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          label="Processed Tx"
          value={stats.processed_subitems || 0}
          icon={<ArrowUpDown className="h-4 w-4" />}
          color="text-purple-600"
          bg="bg-purple-50 dark:bg-purple-950/30"
        />
        <StatCard
          label="Webhook OK"
          value={stats.webhook_success || 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-green-600"
          bg="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          label="Errors"
          value={stats.webhook_errors || 0}
          icon={<XCircle className="h-4 w-4" />}
          color="text-red-600"
          bg="bg-red-50 dark:bg-red-950/30"
        />
        <StatCard
          label="Ignored"
          value={stats.webhook_ignored || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-950/30"
        />
      </div>

      {/* Linked Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Linked Users ({data?.user_items?.length || 0})
          </CardTitle>
          <CardDescription className="text-xs">
            Users with Monday.com parent items on the Chipi Wallet board
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.user_items?.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {data.user_items.map((item) => (
                <div
                  key={item.user_id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors"
                  data-testid={`linked-user-${item.user_id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {(item.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.email}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Item: {item.monday_item_id} &middot; Board: {item.board_id}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleResyncUser(item.user_id)}
                    title="Re-sync this user"
                    data-testid={`resync-user-${item.user_id}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users linked yet. Register a user or click "Sync All Users".
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Webhook Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recent_logs?.length > 0 ? (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.recent_logs.map((log, i) => (
                <LogRow key={i} log={log} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No webhook events yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Errors */}
      {data?.recent_errors?.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Recent Errors ({data.recent_errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.recent_errors.map((log, i) => (
                <LogRow key={i} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }) {
  return (
    <Card className={`${bg} border-0`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LogRow({ log }) {
  const statusColor = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    ignored: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  }[log.status] || 'bg-gray-100 text-gray-800';

  const time = log.timestamp
    ? new Date(log.timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 text-xs gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColor}`}>
          {log.status}
        </Badge>
        <span className="truncate text-muted-foreground">{log.detail || 'No detail'}</span>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{time}</span>
    </div>
  );
}
