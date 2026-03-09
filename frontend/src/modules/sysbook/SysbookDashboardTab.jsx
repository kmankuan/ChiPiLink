/**
 * SysbookDashboardTab — Command center for school textbook management
 * Combines KPIs from Inventory, Alerts, Stock Movements, and Analytics.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BookOpen, Package, AlertTriangle, Truck, TrendingUp,
  ArrowUpDown, Archive, Loader2, ChevronRight, XCircle,
  CheckCircle, BarChart3, RefreshCw, Zap
} from 'lucide-react';
import axios from 'axios';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;
const SYSBOOK_API = `${API_URL}/api/sysbook`;

export default function SysbookDashboardTab({ onNavigate }) {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [grades, setGrades] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [pendingOrders, setPendingOrders] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, alertRes, gradeRes, dashRes, pendRes] = await Promise.all([
        axios.get(`${SYSBOOK_API}/analytics/overview`, { headers }),
        axios.get(`${SYSBOOK_API}/alerts?status=active&limit=5`, { headers }),
        axios.get(`${SYSBOOK_API}/analytics/grade-summary`, { headers }),
        axios.get(`${SYSBOOK_API}/inventory/dashboard`, { headers }),
        axios.get(`${SYSBOOK_API}/stock-orders/summary/pending`, { headers }),
      ]);
      setOverview(ovRes.data);
      setAlerts(alertRes.data.alerts || []);
      setAlertCount(alertRes.data.active_count || 0);
      setGrades(gradeRes.data.grades || []);
      setRecentMovements((dashRes.data.recent_movements || []).slice(0, 8));
      setPendingOrders(pendRes.data);
    } catch { toast.error('Error loading dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nav = (section) => {
    if (onNavigate) onNavigate(section);
    else window.location.hash = `#${section}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const maxGradeStock = Math.max(...grades.map(g => g.total_stock), 1);

  return (
    <div className="space-y-4" data-testid="sysbook-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Sysbook
          </h2>
          <p className="text-sm text-muted-foreground">School textbook inventory management</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={fetchAll} data-testid="refresh-dashboard">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Products', value: overview?.total_products ?? 0, icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40', link: 'sysbook-inventory' },
          { label: 'Total Stock', value: overview?.total_stock ?? 0, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', link: 'sysbook-inventory' },
          { label: 'Value', value: `$${(overview?.total_value ?? 0).toLocaleString('en', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40', link: 'sysbook-analytics' },
          { label: 'Active Alerts', value: alertCount, icon: AlertTriangle, color: alertCount > 0 ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', highlight: alertCount > 0, link: 'sysbook-alerts' },
          { label: 'Movements (7d)', value: overview?.recent_movements_7d ?? 0, icon: ArrowUpDown, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40', link: 'sysbook-stock-movements' },
          { label: 'Pending Orders', value: pendingOrders?.total ?? 0, icon: Truck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40', highlight: (pendingOrders?.total ?? 0) > 0, link: 'sysbook-stock-movements' },
        ].map(kpi => (
          <Card
            key={kpi.label}
            className={`cursor-pointer hover:shadow-md transition-shadow ${kpi.highlight ? 'border-red-300 dark:border-red-700' : ''}`}
            onClick={() => nav(kpi.link)}
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active Alerts */}
        <Card className={alertCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${alertCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                Stock Alerts
                {alertCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5">{alertCount}</Badge>}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5" onClick={() => nav('sysbook-alerts')}>
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-xs text-muted-foreground">All stock levels OK</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {alerts.map(a => (
                  <div key={a.alert_id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${a.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {a.severity === 'critical' ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <span className="truncate font-medium">{a.product_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.grade && <Badge variant="outline" className="text-[9px] px-1">{a.grade}</Badge>}
                      <span className="font-mono text-muted-foreground">{a.current_quantity}u</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Health */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Grade Health</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5" onClick={() => nav('sysbook-analytics')}>
                Details <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No grade data</p>
            ) : (
              <div className="space-y-2">
                {grades.map(g => {
                  const hasIssue = g.low_stock > 0 || g.out_of_stock > 0;
                  return (
                    <div key={g.grade} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{g.grade}</span>
                        <div className="flex items-center gap-1.5">
                          {g.out_of_stock > 0 && <Badge variant="outline" className="text-[9px] px-1 text-red-600 border-red-300">{g.out_of_stock} out</Badge>}
                          {g.low_stock > 0 && <Badge variant="outline" className="text-[9px] px-1 text-amber-600 border-amber-300">{g.low_stock} low</Badge>}
                          <span className="text-muted-foreground font-mono">{g.total_stock}u</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${hasIssue ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${(g.total_stock / maxGradeStock) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5" onClick={() => nav('sysbook-stock-movements')}>
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent movements</p>
            ) : (
              <div className="space-y-1.5">
                {recentMovements.map((m, i) => (
                  <div key={m.movement_id || i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.type === 'addition' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="truncate">{m.product_name || m.book_id}</span>
                    </div>
                    <span className={`font-mono shrink-0 ${m.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Quick Actions:</span>
            {[
              { label: 'Inventory', icon: Package, link: 'sysbook-inventory' },
              { label: 'Stock Movements', icon: Truck, link: 'sysbook-stock-movements' },
              { label: 'Analytics', icon: BarChart3, link: 'sysbook-analytics' },
              { label: 'Stock Alerts', icon: AlertTriangle, link: 'sysbook-alerts' },
            ].map(action => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => nav(action.link)}
                data-testid={`quick-${action.link}`}
              >
                <action.icon className="h-3 w-3" /> {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
