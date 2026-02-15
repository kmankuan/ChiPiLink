/**
 * MondayBoardWidget — Landing page component that displays cached Monday.com board data.
 * Fetches from the public (no auth) endpoint and renders as cards, table, or list.
 */
import { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MondayBoardWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/monday/public-board-widget`)
      .then(r => r.ok ? r.json() : { enabled: false })
      .then(setData)
      .catch(() => setData({ enabled: false }));
  }, []);

  if (!data || !data.enabled || !data.items?.length) return null;

  const { title, subtitle, display_style, columns, items } = data;
  const colMeta = columns || [];
  const colIds = colMeta.map(c => typeof c === 'string' ? c : c.id);
  const colNames = colMeta.reduce((m, c) => {
    if (typeof c === 'string') m[c] = c;
    else m[c.id] = c.title;
    return m;
  }, {});

  return (
    <div className="w-full" data-testid="monday-board-widget">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="h-4 w-4" style={{ color: '#c4b5a0' }} />
          <h3 className="text-base font-bold tracking-tight" style={{ color: '#2d2217' }}>{title}</h3>
        </div>
        {subtitle && <p className="text-xs leading-snug" style={{ color: '#8a7a6a' }}>{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {display_style === 'table' ? (
          <TableView items={items} colIds={colIds} colNames={colNames} />
        ) : display_style === 'list' ? (
          <ListView items={items} colIds={colIds} colNames={colNames} />
        ) : (
          <CardsView items={items} colIds={colIds} colNames={colNames} />
        )}
      </div>
    </div>
  );
}

/* ─── Cards View ─── */
function CardsView({ items, colIds, colNames }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="widget-cards">
      {items.map(item => (
        <div
          key={item.id}
          className="rounded-xl p-3.5 border transition-shadow hover:shadow-sm"
          style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fdfcfa' }}
        >
          <p className="text-sm font-semibold mb-1.5 truncate" style={{ color: '#2d2217' }}>{item.name}</p>
          {item.group && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-2 inline-block"
              style={{ background: 'rgba(196,181,160,0.15)', color: '#8a7a6a' }}>
              {item.group}
            </span>
          )}
          <div className="space-y-1 mt-1.5">
            {(colIds.length > 0 ? colIds : Object.keys(item.columns || {})).map(cid => {
              const val = (item.columns || {})[cid];
              if (!val) return null;
              return (
                <div key={cid} className="flex justify-between gap-2">
                  <span className="text-[10px] font-medium truncate" style={{ color: '#8a7a6a' }}>
                    {colNames[cid] || cid}
                  </span>
                  <span className="text-[11px] font-medium text-right truncate max-w-[60%]" style={{ color: '#2d2217' }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Table View ─── */
function TableView({ items, colIds, colNames }) {
  const visibleCols = colIds.length > 0 ? colIds : [...new Set(items.flatMap(i => Object.keys(i.columns || {})))];

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }} data-testid="widget-table">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: '#f8f5f0' }}>
            <th className="text-left px-3 py-2 font-bold" style={{ color: '#2d2217' }}>Name</th>
            {visibleCols.map(cid => (
              <th key={cid} className="text-left px-3 py-2 font-bold truncate" style={{ color: '#2d2217' }}>
                {colNames[cid] || cid}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
              <td className="px-3 py-2 font-medium" style={{ color: '#2d2217' }}>{item.name}</td>
              {visibleCols.map(cid => (
                <td key={cid} className="px-3 py-2 truncate max-w-[150px]" style={{ color: '#5a4a3a' }}>
                  {(item.columns || {})[cid] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── List View ─── */
function ListView({ items, colIds, colNames }) {
  return (
    <div className="space-y-0 divide-y" style={{ '--tw-divide-opacity': '0.06' }} data-testid="widget-list">
      {items.map(item => (
        <div key={item.id} className="py-2.5 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#2d2217' }}>{item.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {(colIds.length > 0 ? colIds : Object.keys(item.columns || {})).map(cid => {
                const val = (item.columns || {})[cid];
                if (!val) return null;
                return (
                  <span key={cid} className="text-[10px]" style={{ color: '#8a7a6a' }}>
                    <span className="font-medium">{colNames[cid] || cid}:</span> {val}
                  </span>
                );
              })}
            </div>
          </div>
          {item.group && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(196,181,160,0.15)', color: '#8a7a6a' }}>
              {item.group}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
