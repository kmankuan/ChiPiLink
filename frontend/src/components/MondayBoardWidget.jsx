import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function ItemCard({ item, showSubitems }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = showSubitems && item.subitems?.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow" data-testid={`widget-item-${item.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasSubs && (
              <button onClick={() => setExpanded(!expanded)} className="p-0.5 rounded hover:bg-accent shrink-0" data-testid={`expand-${item.id}`}>
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
          </div>
          {item.group && <span className="text-[10px] text-muted-foreground">{item.group}</span>}
        </div>
      </div>
      {Object.keys(item.columns || {}).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(item.columns).map(([key, val]) => val ? (
            <span key={key} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{val}</span>
            </span>
          ) : null)}
        </div>
      )}
      {hasSubs && expanded && (
        <div className="mt-3 pl-4 border-l-2 border-primary/20 space-y-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Subitems ({item.subitems.length})</p>
          {item.subitems.map(sub => (
            <div key={sub.id} className="text-xs py-1.5 border-b border-border/50 last:border-0">
              <span className="font-medium">{sub.name}</span>
              {Object.keys(sub.columns || {}).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {Object.entries(sub.columns).map(([k, v]) => v ? (
                    <span key={k} className="text-muted-foreground">{v}</span>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemTable({ items, showSubitems, columns }) {
  const colIds = columns?.length > 0
    ? columns.map(c => c.id || c)
    : items.length > 0 ? Object.keys(items[0].columns || {}) : [];

  const colTitles = columns?.length > 0
    ? columns.reduce((acc, c) => { acc[c.id || c] = c.title || c.id || c; return acc; }, {})
    : colIds.reduce((acc, id) => { acc[id] = id; return acc; }, {});

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 text-xs font-semibold">Name</th>
            {colIds.map(id => <th key={id} className="text-left p-2 text-xs font-semibold">{colTitles[id] || id}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <ItemTableRow key={item.id} item={item} colIds={colIds} showSubitems={showSubitems} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemTableRow({ item, colIds, showSubitems }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = showSubitems && item.subitems?.length > 0;

  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        <td className="p-2 text-xs">
          <div className="flex items-center gap-1.5">
            {hasSubs && (
              <button onClick={() => setExpanded(!expanded)} className="p-0.5">
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            <span className="font-medium">{item.name}</span>
          </div>
        </td>
        {colIds.map(id => <td key={id} className="p-2 text-xs text-muted-foreground">{item.columns?.[id] || ''}</td>)}
      </tr>
      {hasSubs && expanded && item.subitems.map(sub => (
        <tr key={sub.id} className="bg-primary/5 border-b">
          <td className="p-2 pl-8 text-[11px] text-muted-foreground">{sub.name}</td>
          {colIds.map(id => <td key={id} className="p-2 text-[11px] text-muted-foreground">{sub.columns?.[id] || ''}</td>)}
        </tr>
      ))}
    </>
  );
}

export default function MondayBoardWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${API}/api/monday/public-board-widget/items`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase();
    return data.items.filter(item => {
      if (item.name?.toLowerCase().includes(q)) return true;
      if (item.group?.toLowerCase().includes(q)) return true;
      if (Object.values(item.columns || {}).some(v => v?.toLowerCase().includes(q))) return true;
      if (item.subitems?.some(sub => {
        if (sub.name?.toLowerCase().includes(q)) return true;
        if (Object.values(sub.columns || {}).some(v => v?.toLowerCase().includes(q))) return true;
        return false;
      })) return true;
      return false;
    });
  }, [data, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.enabled) return null;

  const style = data.display_style || 'cards';
  const showSubitems = data.show_subitems || false;

  return (
    <div className="space-y-4" data-testid="monday-board-widget">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {data.title && <h3 className="text-lg font-bold">{data.title}</h3>}
          {data.subtitle && <p className="text-sm text-muted-foreground">{data.subtitle}</p>}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full h-9 pl-8 pr-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="widget-search-input"
          />
        </div>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {searchQuery ? 'No matching items found.' : 'No items to display.'}
        </p>
      ) : style === 'table' ? (
        <ItemTable items={filteredItems} showSubitems={showSubitems} columns={data.columns} />
      ) : style === 'list' ? (
        <div className="divide-y rounded-lg border">
          {filteredItems.map(item => (
            <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-muted/30" data-testid={`widget-item-${item.id}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {Object.values(item.columns || {}).filter(Boolean).length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">{Object.values(item.columns).filter(Boolean).join(' · ')}</p>
                )}
              </div>
              {item.group && <span className="text-[10px] text-muted-foreground shrink-0">{item.group}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} showSubitems={showSubitems} />
          ))}
        </div>
      )}

      {/* Item count */}
      <p className="text-[10px] text-muted-foreground text-right">
        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </p>
    </div>
  );
}
