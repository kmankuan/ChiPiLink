/**
 * SysbookAnalyticsTab — Inventory analytics with charts for Sysbook
 * Shows stock trends, grade breakdown, and subject distribution.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, TrendingDown, Package, BookOpen, Loader2,
  RefreshCw, Archive, Truck, ArrowUpDown
} from 'lucide-react';
import axios from 'axios';
import { BoardHeader } from '@/components/shared/BoardHeader';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SYSBOOK_API = `${API_URL}/api/sysbook`;

const BAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
  'bg-teal-500', 'bg-pink-500', 'bg-lime-500', 'bg-sky-500',
];

function MiniBar({ value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SysbookAnalyticsTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [overview, setOverview] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, grRes, subRes, trRes] = await Promise.all([
        axios.get(`${SYSBOOK_API}/analytics/overview`, { headers }),
        axios.get(`${SYSBOOK_API}/analytics/grade-summary`, { headers }),
        axios.get(`${SYSBOOK_API}/analytics/subject-summary`, { headers }),
        axios.get(`${SYSBOOK_API}/analytics/stock-trends?days=${trendDays}`, { headers }),
      ]);
      setOverview(ovRes.data);
      setGrades(grRes.data.grades || []);
      setSubjects(subRes.data.subjects || []);
      setTrends(trRes.data.trends || []);
    } catch { toast.error('Error loading analytics'); }
    finally { setLoading(false); }
  }, [trendDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const maxGradeStock = Math.max(...grades.map(g => g.total_stock), 1);
  const maxSubjectStock = Math.max(...subjects.map(s => s.total_stock), 1);
  const maxTrendMovement = Math.max(...trends.map(t => Math.max(t.additions, t.removals)), 1);

  return (
    <div className="space-y-4" data-testid="sysbook-analytics">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Products', value: overview?.total_products ?? 0, icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Total Stock', value: overview?.total_stock ?? 0, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Value', value: `$${(overview?.total_value ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
          { label: 'Archived', value: overview?.archived_products ?? 0, icon: Archive, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Movements (7d)', value: overview?.recent_movements_7d ?? 0, icon: ArrowUpDown, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40' },
          { label: 'Pending Orders', value: overview?.pending_stock_orders ?? 0, icon: Truck, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40', highlight: (overview?.pending_stock_orders ?? 0) > 0 },
        ].map(kpi => (
          <Card key={kpi.label} className={kpi.highlight ? 'border-rose-300 dark:border-rose-700' : ''}>
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

      {/* Grade Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Stock by Grade</CardTitle>
          <CardDescription className="text-xs">Inventory distribution across grades</CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No grade data</p>
          ) : (
            <div className="space-y-2">
              {grades.map((g, i) => (
                <div key={g.grade} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate">{g.grade}</span>
                  <div className="flex-1"><MiniBar value={g.total_stock} max={maxGradeStock} color={BAR_COLORS[i % BAR_COLORS.length]} /></div>
                  <div className="flex gap-2 text-xs text-muted-foreground w-40 justify-end shrink-0">
                    <span>{g.product_count} products</span>
                    <span className="font-mono font-medium text-foreground">{g.total_stock} units</span>
                    {g.low_stock > 0 && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[9px] px-1">{g.low_stock} low</Badge>}
                    {g.out_of_stock > 0 && <Badge variant="outline" className="text-red-600 border-red-300 text-[9px] px-1">{g.out_of_stock} out</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Subject Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Stock by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subject data</p>
            ) : (
              <div className="space-y-2">
                {subjects.map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-28 truncate">{s.subject}</span>
                    <div className="flex-1"><MiniBar value={s.total_stock} max={maxSubjectStock} color={BAR_COLORS[i % BAR_COLORS.length]} /></div>
                    <span className="text-xs font-mono w-12 text-right">{s.total_stock}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Trends */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Movement Trends</CardTitle>
              <div className="flex gap-1">
                {[7, 14, 30].map(d => (
                  <Button key={d} variant={trendDays === d ? 'default' : 'ghost'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setTrendDays(d)}>{d}d</Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No movement data for this period</p>
            ) : (
              <div className="space-y-1">
                {trends.map(t => (
                  <div key={t.date} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-muted-foreground font-mono">{t.date.slice(5)}</span>
                    <div className="flex-1 flex gap-0.5 items-center">
                      <div className="flex-1 flex justify-end">
                        <div className="h-3 bg-emerald-400 rounded-sm transition-all" style={{ width: `${(t.additions / maxTrendMovement) * 100}%`, minWidth: t.additions > 0 ? '2px' : 0 }} />
                      </div>
                      <div className="w-px h-4 bg-border" />
                      <div className="flex-1">
                        <div className="h-3 bg-red-400 rounded-sm transition-all" style={{ width: `${(t.removals / maxTrendMovement) * 100}%`, minWidth: t.removals > 0 ? '2px' : 0 }} />
                      </div>
                    </div>
                    <span className={`w-8 text-right font-mono ${t.net_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.net_change >= 0 ? '+' : ''}{t.net_change}
                    </span>
                  </div>
                ))}
                <div className="flex justify-center gap-4 pt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Additions</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Removals</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
