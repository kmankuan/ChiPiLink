import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart, Package, ClipboardList, CheckCircle2, XCircle,
  UserPlus, Wallet, CreditCard, MessageSquare, RefreshCw, Link,
  Activity, Loader2, Filter, Calendar, Settings2, ChevronDown,
  Pause, Play,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const EVENT_ICONS = {
  order_submitted: ShoppingCart,
  order_status_changed: Package,
  access_request: ClipboardList,
  access_request_approved: CheckCircle2,
  access_request_rejected: XCircle,
  user_registered: UserPlus,
  wallet_topup: Wallet,
  wallet_transaction: CreditCard,
  crm_message: MessageSquare,
  monday_sync: RefreshCw,
  student_linked: Link,
};

const EVENT_COLORS = {
  order_submitted: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  order_status_changed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  access_request: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  access_request_approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  access_request_rejected: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  user_registered: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  wallet_topup: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  wallet_transaction: 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  crm_message: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
  monday_sync: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  student_linked: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
};

const DOT_COLORS = {
  order_submitted: 'bg-green-500',
  order_status_changed: 'bg-blue-500',
  access_request: 'bg-amber-500',
  access_request_approved: 'bg-emerald-500',
  access_request_rejected: 'bg-red-500',
  user_registered: 'bg-purple-500',
  wallet_topup: 'bg-emerald-500',
  wallet_transaction: 'bg-sky-500',
  crm_message: 'bg-indigo-500',
  monday_sync: 'bg-teal-500',
  student_linked: 'bg-violet-500',
};

const DATE_PRESETS = [
  { label: 'Last 24h', days: 1 },
  { label: 'Last 7d', days: 7 },
  { label: 'Last 30d', days: 30 },
  { label: 'Last 90d', days: 90 },
];

function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  const now = new Date();
  const date = new Date(isoStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTimestamp(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function EventItem({ event }) {
  const Icon = EVENT_ICONS[event.type] || Activity;
  const colorCls = EVENT_COLORS[event.type] || 'bg-muted text-foreground';
  const dotColor = DOT_COLORS[event.type] || 'bg-gray-400';

  return (
    <div className="flex gap-3 group" data-testid={`activity-event-${event.type}`}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-background shadow-sm`} />
        <div className="w-px flex-1 bg-border group-last:hidden mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded-md shrink-0 ${colorCls}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5" title={formatTimestamp(event.timestamp)}>
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState(7);
  const [enabledTypes, setEnabledTypes] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [eventTypeMeta, setEventTypeMeta] = useState({});
  const intervalRef = useRef(null);

  const fetchFeed = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getTime() - activeDays * 86400000).toISOString();
      const params = new URLSearchParams({ date_from: from, limit: '60' });
      if (enabledTypes && enabledTypes.length > 0 && enabledTypes.length < Object.keys(eventTypeMeta).length) {
        params.set('event_types', enabledTypes.join(','));
      }
      const res = await fetch(`${API}/api/admin/activity-feed?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
        if (data.event_type_meta) setEventTypeMeta(data.event_type_meta);
      }
    } catch {
      // silent fail for background refresh
    } finally {
      setLoading(false);
    }
  }, [token, activeDays, enabledTypes, eventTypeMeta]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchFeed(false), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchFeed]);

  const toggleType = (type) => {
    const allTypes = Object.keys(eventTypeMeta);
    if (!enabledTypes) {
      // All enabled → remove one
      setEnabledTypes(allTypes.filter(t => t !== type));
    } else if (enabledTypes.includes(type)) {
      const next = enabledTypes.filter(t => t !== type);
      setEnabledTypes(next.length === 0 ? null : next);
    } else {
      const next = [...enabledTypes, type];
      setEnabledTypes(next.length === allTypes.length ? null : next);
    }
  };

  const isTypeEnabled = (type) => !enabledTypes || enabledTypes.includes(type);
  const hasActiveFilter = enabledTypes && enabledTypes.length < Object.keys(eventTypeMeta).length;

  // Group events by date
  const grouped = {};
  events.forEach(e => {
    const d = e.timestamp ? new Date(e.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  });

  return (
    <Card data-testid="activity-feed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Activity Feed
            {autoRefresh && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-1.5">
            {/* Date presets */}
            <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setActiveDays(p.days)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    activeDays === p.days
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`activity-preset-${p.days}d`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={hasActiveFilter ? 'default' : 'ghost'} size="sm" className="h-7 gap-1 text-xs" data-testid="activity-filter-btn">
                  <Filter className="h-3 w-3" />
                  <span className="hidden sm:inline">Filter</span>
                  {hasActiveFilter && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{enabledTypes.length}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Event Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(eventTypeMeta).map(([key, meta]) => {
                  const Icon = EVENT_ICONS[key] || Activity;
                  return (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={isTypeEnabled(key)}
                      onCheckedChange={() => toggleType(key)}
                      className="gap-2 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!enabledTypes}
                  onCheckedChange={() => setEnabledTypes(null)}
                  className="text-xs font-medium"
                >
                  Show All
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auto-refresh toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
              data-testid="activity-auto-refresh-btn"
            >
              {autoRefresh ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>

            {/* Manual refresh */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => fetchFeed(true)}
              disabled={loading}
              data-testid="activity-refresh-btn"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
          <Badge variant="outline" className="text-[10px] shrink-0">{total} events</Badge>
          {Object.entries(
            events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {})
          ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => {
            const Icon = EVENT_ICONS[type] || Activity;
            return (
              <Badge key={type} variant="secondary" className="text-[10px] gap-1 shrink-0">
                <Icon className="h-3 w-3" />
                {count}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No activity in this period</p>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 bg-card z-10 py-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {dateLabel}
                  </span>
                </div>
                {dateEvents.map((event, i) => (
                  <EventItem key={`${event.type}-${event.timestamp}-${i}`} event={event} />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
