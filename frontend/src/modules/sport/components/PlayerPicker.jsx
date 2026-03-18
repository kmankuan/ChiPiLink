/**
 * PlayerPicker — Smart player selector with dropdown, photos, roles
 * Shows recent players as tappable chips + searchable dropdown with photos.
 */
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, Search, Plus } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function PlayerPicker({ label, value, photoValue, onChange, onPhotoChange, filterRole, placeholder = 'Name...', testId }) {
  const [players, setPlayers] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/sport/players?limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        let filtered = data;
        if (filterRole === 'referee') {
          const refs = data.filter(p => (p.roles || []).includes('referee')).sort((a, b) => (b.stats?.matches_refereed || 0) - (a.stats?.matches_refereed || 0));
          filtered = refs.length >= 2 ? refs : data;
        } else {
          filtered = data.sort((a, b) => (b.stats?.matches || 0) - (a.stats?.matches || 0));
        }
        setPlayers(filtered);
      }).catch(() => {});
  }, [filterRole]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectPlayer = (p) => {
    onChange(p.nickname);
    if (onPhotoChange && p.avatar_url) onPhotoChange(p.avatar_url);
    setOpen(false);
    setSearch('');
  };

  const filtered = search
    ? players.filter(p => (p.nickname || '').toLowerCase().includes(search.toLowerCase()))
    : players;

  const selectedPlayer = players.find(p => p.nickname === value);

  return (
    <div className="space-y-1" ref={wrapRef}>
      <Label className="text-xs">{label}</Label>

      {/* Selected or input */}
      <div className="relative">
        {value ? (
          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-card cursor-pointer" onClick={() => setOpen(!open)}>
            {(selectedPlayer?.avatar_url || photoValue) ? (
              <img src={selectedPlayer?.avatar_url || photoValue} className="w-6 h-6 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">{(value || '?')[0]}</div>
            )}
            <span className="text-sm font-medium flex-1 truncate">{value}</span>
            {selectedPlayer?.elo && <span className="text-[9px] text-muted-foreground">{selectedPlayer.elo}</span>}
            {filterRole === 'referee' && selectedPlayer?.stats?.matches_refereed > 0 && (
              <span className="text-[9px] text-muted-foreground">⚖️{selectedPlayer.stats.matches_refereed}</span>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); if (onPhotoChange) onPhotoChange(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 h-10 px-3 rounded-md border bg-card cursor-pointer" onClick={() => setOpen(!open)}>
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">{placeholder}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-xl max-h-60 overflow-hidden">
            {/* Search */}
            <div className="p-1.5 border-b">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search or type new name..."
                className="h-8 text-xs"
                autoFocus
                data-testid={`${testId}-search`}
              />
            </div>

            {/* Player list */}
            <div className="max-h-44 overflow-y-auto">
              {filtered.length === 0 && !search && (
                <p className="text-xs text-muted-foreground text-center py-3">No players yet</p>
              )}
              {filtered.map(p => (
                <button key={p.player_id} type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => selectPlayer(p)}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{(p.nickname || '?')[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.nickname}</p>
                    <div className="flex items-center gap-1">
                      {(p.roles || []).map(r => (
                        <span key={r} className="text-[8px] text-muted-foreground">{r === 'referee' ? '⚖️' : '🏓'}</span>
                      ))}
                      <span className="text-[8px] text-muted-foreground">{p.elo} ELO · {p.stats?.matches || 0}M</span>
                    </div>
                  </div>
                </button>
              ))}

              {/* Create new option */}
              {search && !filtered.some(p => p.nickname.toLowerCase() === search.toLowerCase()) && (
                <button type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left border-t"
                  onClick={() => { onChange(search); setOpen(false); setSearch(''); }}>
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700">Create "{search}"</p>
                    <p className="text-[8px] text-green-600">New player</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Photo upload */}
      {onPhotoChange && (
        <div className="flex gap-1 items-center">
          <Input value={photoValue || ''} onChange={e => onPhotoChange(e.target.value)} placeholder="Photo URL or upload →" className="h-7 text-[10px] text-muted-foreground flex-1" />
          <label className="shrink-0 cursor-pointer px-2 py-1 rounded text-[9px] bg-muted hover:bg-muted/80 text-muted-foreground">
            📷
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onPhotoChange(ev.target.result); };
              reader.readAsDataURL(file);
            }} />
          </label>
        </div>
      )}
    </div>
  );
}
