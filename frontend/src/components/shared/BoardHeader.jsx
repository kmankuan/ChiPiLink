/**
 * BoardHeader — Monday.com-inspired unified table header component.
 * Consolidates title, tabs, search, filters, stats, and actions into a clean bar.
 * Reusable across any admin table/board view.
 *
 * Props:
 * - title: string
 * - icon: LucideIcon (optional)
 * - subtitle: string (optional, hidden on mobile)
 * - tabs: Array<{ value, label, icon?, activeColor? }>
 * - activeTab / onTabChange
 * - search / onSearchChange / searchPlaceholder
 * - filters: Array<{ value, onChange, options: [{value, label}], placeholder, testId? }>
 * - stats: Array<{ label, value, color?, onClick?, highlight? }>
 * - hasActiveFilters / onClearFilters
 * - actions: ReactNode (buttons rendered on the right)
 * - viewModes: Array<{ value, label, icon }> (optional toggle)
 * - activeView / onViewChange
 * - loading: boolean
 * - onRefresh: function
 */
import { Search, X, RefreshCw, Loader2, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const STAT_COLORS = {
  default: 'bg-muted text-foreground',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
};

function TabSegment({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5" data-testid="board-tabs">
      {tabs.map(tab => {
        const isActive = activeTab === tab.value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-150 whitespace-nowrap
              ${isActive
                ? tab.activeColor || 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
            data-testid={`board-tab-${tab.value}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function StatChip({ label, value, color = 'default', highlight, onClick }) {
  const colorCls = STAT_COLORS[color] || STAT_COLORS.default;
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] tabular-nums
        transition-all duration-150 whitespace-nowrap shrink-0
        ${colorCls}
        ${highlight ? 'font-bold' : 'font-medium'}
        ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-foreground/20' : 'cursor-default'}
      `}
      data-testid={`board-stat-${label.replace(/\s+/g, '-')}`}
    >
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </button>
  );
}

function FilterDropdown({ value, onChange, options, placeholder, testId }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-2 text-xs border rounded-md bg-background text-foreground appearance-none pr-6 cursor-pointer hover:border-foreground/30 transition-colors"
      data-testid={testId}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 4px center',
        backgroundSize: '12px',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function BoardHeader({
  title,
  icon: TitleIcon,
  subtitle,
  tabs = [],
  activeTab,
  onTabChange,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  stats = [],
  hasActiveFilters = false,
  onClearFilters,
  actions,
  viewModes = [],
  activeView,
  onViewChange,
  loading = false,
  onRefresh,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = filters.length > 0;

  return (
    <div className="space-y-0 rounded-lg border bg-card" data-testid="board-header">
      {/* Row 1: Title + View Modes + Actions */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          {TitleIcon && (
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
              <TitleIcon className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight leading-none">{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* View mode toggles */}
          {viewModes.length > 0 && (
            <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
              {viewModes.map(vm => {
                const VmIcon = vm.icon;
                return (
                  <button
                    key={vm.value}
                    onClick={() => onViewChange?.(vm.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      activeView === vm.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`board-view-${vm.value}`}
                  >
                    {VmIcon && <VmIcon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{vm.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-7 w-7 p-0" data-testid="board-refresh">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}

          {actions}
        </div>
      </div>

      {/* Row 2: Tabs + Search + Filters */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="overflow-x-auto scrollbar-hide shrink-0">
            <TabSegment tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          </div>
        )}

        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-7 pl-7 pr-7 text-xs"
              data-testid="board-search"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Desktop filters */}
        {hasFilters && (
          <div className="hidden md:flex items-center gap-1.5">
            {filters.map((f, i) => (
              <FilterDropdown key={i} {...f} />
            ))}
          </div>
        )}

        {/* Mobile filter toggle */}
        {hasFilters && (
          <Button
            variant={showFilters ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className="h-7 gap-1 text-xs md:hidden"
            data-testid="board-filter-toggle"
          >
            <Filter className="h-3 w-3" />
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Button>
        )}

        {/* Clear filters */}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="board-clear-filters"
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Mobile filters (expandable) */}
      {hasFilters && showFilters && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 md:hidden" data-testid="board-mobile-filters">
          {filters.map((f, i) => (
            <FilterDropdown key={i} {...f} />
          ))}
        </div>
      )}

      {/* Row 3: Stats chips */}
      {stats.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t overflow-x-auto scrollbar-hide" data-testid="board-stats">
          {stats.map((s, i) => (
            <StatChip key={i} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
