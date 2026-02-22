import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Database, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Loader2,
  Play, ChevronDown, ChevronRight, Shield, Package, Users, Wallet,
  Trophy, MessageSquare, ShoppingCart, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

const MODULE_ICONS = {
  pinpanclub: Trophy,
  sysbook: BookOpen,
  store: ShoppingCart,
  users: Users,
  wallets: Wallet,
  memberships: Package,
  community: MessageSquare,
  crm: MessageSquare,
};

const MODULE_COLORS = {
  pinpanclub: 'from-orange-500 to-amber-500',
  sysbook: 'from-blue-500 to-indigo-500',
  store: 'from-emerald-500 to-green-500',
  users: 'from-violet-500 to-purple-500',
  wallets: 'from-teal-500 to-cyan-500',
  memberships: 'from-pink-500 to-rose-500',
  community: 'from-sky-500 to-blue-500',
  crm: 'from-fuchsia-500 to-purple-500',
};

export default function DataManagerModule() {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [clearing, setClearing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/data-manager/stats');
      setStats(res.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const toggleModule = (mod) => {
    setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleClearCollection = (collName, collLabel) => {
    setConfirmDialog({
      type: 'collection',
      collections: [collName],
      label: collLabel,
      message: `This will permanently delete all records from "${collLabel}".`,
    });
  };

  const handleClearModule = (modKey, modLabel, total) => {
    setConfirmDialog({
      type: 'module',
      module: modKey,
      label: modLabel,
      message: `This will permanently delete all ${total} records across all collections in "${modLabel}".`,
    });
  };

  const executeClear = async () => {
    if (!confirmDialog) return;
    const key = confirmDialog.module || confirmDialog.collections?.join(',');
    setClearing(key);
    setConfirmDialog(null);
    try {
      const body = { confirm: true };
      if (confirmDialog.module) body.module = confirmDialog.module;
      if (confirmDialog.collections) body.collections = confirmDialog.collections;

      const res = await api.post('/data-manager/clear', body);
      const results = res.data?.results || {};
      const totalDeleted = Object.values(results).reduce((sum, v) => sum + (v.deleted || 0), 0);
      setLastResult({ ...results, _totalDeleted: totalDeleted, _label: confirmDialog.label });
      toast.success(`Cleared ${totalDeleted} records from ${confirmDialog.label}`);
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Clear failed');
    } finally {
      setClearing(null);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api.post('/data-manager/seed-demo');
      toast.success('Demo data seeded successfully');
      fetchStats();
    } catch {
      toast.error('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const modules = stats ? Object.entries(stats).filter(([k]) => k !== '_meta') : [];
  const adminCount = stats?._meta?.admin_user_count || 0;
  const grandTotal = modules.reduce((sum, [, m]) => sum + m.total, 0);

  return (
    <div className="space-y-6 max-w-4xl" data-testid="data-manager-module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5" data-testid="data-manager-title">
            <Database className="h-5 w-5" /> Data Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View, seed, and clean data across all modules. <strong>{grandTotal}</strong> total records.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={fetchStats} disabled={loading}
            data-testid="refresh-stats-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSeedDemo} disabled={seeding}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
            data-testid="seed-demo-btn"
          >
            {seeding ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
            Seed Demo Data
          </Button>
        </div>
      </div>

      {/* Admin protection notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        <Shield className="h-4 w-4 shrink-0" />
        <span>{adminCount} admin account(s) are protected and will never be deleted.</span>
      </div>

      {/* Last result */}
      {lastResult && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20" data-testid="clear-result">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Cleared {lastResult._totalDeleted} records from {lastResult._label}
              </span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setLastResult(null)}>
                Dismiss
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(lastResult).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">
                  {k}: {v.deleted ?? (v.skipped ? 'skipped' : JSON.stringify(v))}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module cards */}
      <div className="space-y-3">
        {modules.map(([modKey, modInfo]) => {
          const Icon = MODULE_ICONS[modKey] || Database;
          const gradient = MODULE_COLORS[modKey] || 'from-gray-500 to-gray-600';
          const expanded = expandedModules[modKey];
          const collections = Object.entries(modInfo.collections || {});

          return (
            <Card key={modKey} className="overflow-hidden" data-testid={`module-card-${modKey}`}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleModule(modKey)}
                data-testid={`module-toggle-${modKey}`}
              >
                <div className={`p-1.5 rounded-md bg-gradient-to-br ${gradient}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{modInfo.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {collections.length} collections
                  </span>
                </div>
                <Badge
                  variant={modInfo.total > 0 ? 'default' : 'secondary'}
                  className="text-xs tabular-nums"
                >
                  {modInfo.total}
                </Badge>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={modInfo.total === 0 || clearing === modKey}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearModule(modKey, modInfo.label, modInfo.total);
                  }}
                  data-testid={`clear-module-${modKey}`}
                >
                  {clearing === modKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>

              {expanded && (
                <div className="border-t bg-muted/10 px-4 py-2 space-y-1" data-testid={`module-collections-${modKey}`}>
                  {collections.map(([collName, collInfo]) => (
                    <div
                      key={collName}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/40 transition-colors group"
                    >
                      <div className="min-w-0">
                        <span className="text-sm">{collInfo.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 font-mono">{collName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold tabular-nums ${collInfo.count > 0 ? '' : 'text-muted-foreground'}`}>
                          {collInfo.count}
                        </span>
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                          disabled={collInfo.count === 0 || clearing === collName}
                          onClick={() => handleClearCollection(collName, collInfo.label)}
                          data-testid={`clear-collection-${collName}`}
                        >
                          {clearing === collName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          {confirmDialog?.type === 'module' && confirmDialog?.module === 'users' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <Shield className="h-4 w-4 shrink-0" />
              Admin accounts ({adminCount}) will be preserved.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} data-testid="cancel-clear-btn">
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeClear} data-testid="confirm-clear-btn">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
