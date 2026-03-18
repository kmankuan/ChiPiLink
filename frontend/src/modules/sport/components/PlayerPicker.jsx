/**
 * PlayerPicker — Smart player selector with dropdown, photos, roles
 * Shows recent players as tappable chips + searchable dropdown with photos.
 * Photo upload uses AvatarUpload component with camera + crop support.
 */
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, Search, Plus, Camera } from 'lucide-react';
import AvatarUpload from '@/components/shared/AvatarUpload';
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
    // Use photo_base64 first, fallback to avatar_url
    if (onPhotoChange) {
      onPhotoChange(p.photo_base64 || p.avatar_url || '');
    }
    setOpen(false);
    setSearch('');
  };

  const filtered = search
    ? players.filter(p => (p.nickname || '').toLowerCase().includes(search.toLowerCase()))
    : players;

  const selectedPlayer = players.find(p => p.nickname === value);
  // Resolve the best photo source
  const displayPhoto = photoValue || selectedPlayer?.photo_base64 || selectedPlayer?.avatar_url;

  return (
    <div className="space-y-1" ref={wrapRef}>
      <Label className="text-xs">{label}</Label>

      {/* Selected or input */}
      <div className="relative">
        {value ? (
          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-card cursor-pointer" onClick={() => setOpen(!open)}>
            {displayPhoto ? (
              <img src={displayPhoto} className="w-6 h-6 rounded-full object-cover" alt="" />
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
                  {(p.photo_base64 || p.avatar_url) ? (
                    <img src={p.photo_base64 || p.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
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

      {/* Photo: show small preview + upload button (NOT raw base64 text) */}
      {onPhotoChange && value && (
        <div className="flex items-center gap-2">
          {displayPhoto ? (
            <img src={displayPhoto} className="w-8 h-8 rounded-full object-cover border" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
              {(value || '?')[0]}
            </div>
          )}
          <label className="flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-muted-foreground">
            <Camera className="h-3 w-3" />
            {displayPhoto ? 'Change' : 'Add photo'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { return; }
              const reader = new FileReader();
              reader.onload = (ev) => {
                // Resize to max 200x200 for the live session (keep payload small)
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const size = 200;
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext('2d');
                  const min = Math.min(img.width, img.height);
                  const sx = (img.width - min) / 2;
                  const sy = (img.height - min) / 2;
                  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                  onPhotoChange(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = ev.target.result;
              };
              reader.readAsDataURL(file);
            }} />
          </label>
          {displayPhoto && (
            <button type="button" onClick={() => onPhotoChange('')} className="text-xs text-muted-foreground hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
