import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';
import SectionTitle from '@/components/ui/SectionTitle';

const API = RESOLVED_API_URL;

/** Resolve i18n field: try lang-specific, fall back to default */
function i18nField(data, field, lang) {
  if (!data) return '';
  if (lang === 'es' && data[`${field}_es`]) return data[`${field}_es`];
  if (lang === 'zh' && data[`${field}_zh`]) return data[`${field}_zh`];
  return data[field] || '';
}

/** Resolve column title from column_titles map, falling back to the ID */
function colTitle(colId, columnTitles) {
  return columnTitles?.[colId] || colId;
}

/** Highlight matching text in a string */
function HighlightText({ text, query }) {
  if (!query || query.length < 3 || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ItemCard({ item, showSubitems, columnTitles }) {
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
              <span className="text-[10px] opacity-70">{colTitle(key, columnTitles)}: </span>
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
                    <span key={k} className="text-muted-foreground">
                      <span className="text-[10px] opacity-70">{colTitle(k, columnTitles)}: </span>{v}
                    </span>
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

function ItemTable({ items, showSubitems, columns, columnTitles, query }) {
  const colIds = columns?.length > 0
    ? columns.map(c => c.id || c)
    : items.length > 0 ? Object.keys(items[0].columns || {}) : [];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {colIds.map(id => (
              <th key={id} className="text-left p-2 text-xs font-semibold">{colTitle(id, columnTitles)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <ItemTableRow key={item.id} item={item} colIds={colIds} showSubitems={showSubitems} columnTitles={columnTitles} query={query} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Get column value — handles the special "name" column (item name in Monday.com) */
function colVal(item, colId) {
  if (colId === 'name') return item.name || item.columns?.name || '';
  return item.columns?.[colId] || '';
}

function ItemTableRow({ item, colIds, showSubitems, columnTitles, query }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = showSubitems && item.subitems?.length > 0;

  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        {colIds.map((id, i) => (
          <td key={id} className="p-2 text-xs">
            {i === 0 ? (
              <div className="flex items-center gap-1.5">
                {hasSubs && (
                  <button onClick={() => setExpanded(!expanded)} className="p-0.5">
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                )}
                <span className="font-medium"><HighlightText text={colVal(item, id)} query={query} /></span>
              </div>
            ) : (
              <span className="text-muted-foreground"><HighlightText text={colVal(item, id)} query={query} /></span>
            )}
          </td>
        ))}
      </tr>
      {hasSubs && expanded && item.subitems.map(sub => (
        <tr key={sub.id} className="bg-primary/5 border-b">
          {colIds.map((id, i) => (
            <td key={id} className={`p-2 text-[11px] text-muted-foreground ${i === 0 ? 'pl-8' : ''}`}>{i === 0 ? sub.name : (sub.columns?.[id] || '')}</td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function MondayBoardWidget() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'en';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const CACHE_KEY = 'chipi_monday_widget';
    fetch(`${API}/api/monday/public-board-widget`, { signal: AbortSignal.timeout(10000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setData(d);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch {}
        }
        setLoading(false);
      })
      .catch(() => {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) setData(JSON.parse(cached));
        } catch {}
        setLoading(false);
      });
  }, []);

  const searchColumns = data?.search_columns || [];

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3) return data.items;
    return data.items.filter(item => {
      // If search_columns configured, only search those columns
      if (searchColumns.length > 0) {
        return searchColumns.some(colId => {
          const val = colId === 'name' ? item.name : (item.columns?.[colId] || '');
          return val?.toLowerCase().includes(q);
        });
      }
      // Fallback: search all columns
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
  }, [data, searchQuery, searchColumns]);

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
  const searchOnly = data.search_only || false;
  const columnTitles = data.column_titles || {};

  const title = i18nField(data, 'title', lang);
  const subtitle = i18nField(data, 'subtitle', lang);
  const placeholder = i18nField(data, 'search_placeholder', lang) || (
    lang === 'es' ? 'Buscar...' : lang === 'zh' ? '搜索...' : 'Search...'
  );

  const hasQuery = searchQuery.trim().length >= 3;
  const showItems = searchOnly ? hasQuery : true;

  return (
    <div className="space-y-4" data-testid="monday-board-widget">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && <SectionTitle title={title} subtitle={subtitle} />}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full h-9 pl-8 pr-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="widget-search-input"
          />
        </div>
      </div>

      {/* Items — only show if not in search_only mode or user has typed */}
      {showItems ? (
        <>
          {filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {searchQuery
                ? (lang === 'es' ? 'No se encontraron resultados.' : lang === 'zh' ? '未找到匹配项。' : 'No matching items found.')
                : (lang === 'es' ? 'No hay elementos para mostrar.' : lang === 'zh' ? '没有要显示的项目。' : 'No items to display.')}
            </p>
          ) : style === 'table' ? (
            <ItemTable items={filteredItems} showSubitems={showSubitems} columns={data.columns} columnTitles={columnTitles} query={searchQuery} />
          ) : style === 'list' ? (
            <div className="divide-y rounded-lg border">
              {filteredItems.map(item => (
                <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-muted/30" data-testid={`widget-item-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {Object.entries(item.columns || {}).filter(([,v]) => Boolean(v)).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {Object.entries(item.columns).filter(([,v]) => Boolean(v)).map(([k,v]) => `${colTitle(k, columnTitles)}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  {item.group && <span className="text-[10px] text-muted-foreground shrink-0">{item.group}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} showSubitems={showSubitems} columnTitles={columnTitles} />
              ))}
            </div>
          )}

          {/* Item count */}
          <p className="text-[10px] text-muted-foreground text-right">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {lang === 'es' ? 'Escribe un nombre para buscar.' : lang === 'zh' ? '输入名称进行搜索。' : 'Type a name to search.'}
        </p>
      )}
    </div>
  );
}
