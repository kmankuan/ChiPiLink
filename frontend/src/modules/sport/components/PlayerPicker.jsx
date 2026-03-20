/**
 * PlayerPicker — Smart player selector with dropdown, photos, roles
 * Photo handling: uses AvatarUpload for camera + gallery + crop/resize.
 * Auto-resizes player photos to thumbnails for live session payloads.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, Search, Plus } from 'lucide-react';
import AvatarUpload from '@/components/shared/AvatarUpload';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

/** Resize any image (URL or base64) to a small JPEG thumbnail */
function resizeToThumbnail(src, size = 200) {
  return new Promise((resolve) => {
    if (!src) { resolve(''); return; }
    // If it's a short URL (not base64), keep as-is
    if (src.length < 500 && !src.startsWith('data:')) { resolve(src); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

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

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectPlayer = useCallback(async (p) => {
    onChange(p.nickname);
    if (onPhotoChange) {
      // Resize stored photo to thumbnail for the live session payload
      const rawPhoto = p.photo_base64 || p.avatar_url || '';
      const thumb = await resizeToThumbnail(rawPhoto);
      onPhotoChange(thumb);
    }
    setOpen(false);
    setSearch('');
  }, [onChange, onPhotoChange]);

  const filtered = search
    ? players.filter(p => (p.nickname || '').toLowerCase().includes(search.toLowerCase()))
    : players;

  const selectedPlayer = players.find(p => p.nickname === value);
  const displayPhoto = photoValue || selectedPlayer?.photo_base64 || selectedPlayer?.avatar_url;

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <Label className="text-xs">{label}</Label>

      {/* Selected player or search input */}
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
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); if (onPhotoChange) onPhotoChange(''); }}
              className="text-muted-foreground hover:text-foreground">
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
            <div className="p-1.5 border-b">
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search or type new name..." className="h-8 text-xs" autoFocus
                data-testid={`${testId}-search`} />
            </div>
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
              {search && !filtered.some(p => p.nickname.toLowerCase() === search.toLowerCase()) && (
                <button type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left border-t"
                  onClick={() => { onChange(search); setOpen(false); setSearch(''); }}>
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-green-700">Create "{search}"</p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Photo: AvatarUpload with camera + gallery + crop/resize */}
      {onPhotoChange && value && (
        <AvatarUpload
          currentPhoto={displayPhoto}
          currentInitial={(value || '?')[0]}
          size="sm"
          onUpload={async (base64) => {
            const thumb = await resizeToThumbnail(base64, 200);
            onPhotoChange(thumb);
            // ALSO save to player record so TV and future sessions have it
            const player = players.find(p => p.nickname === value);
            if (player?.player_id) {
              try {
                const token = localStorage.getItem('auth_token');
                await fetch(`${API}/api/sport/players/${player.player_id}/photo`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ photo_base64: base64 }),
                });
              } catch {}
            }
          }}
        />
      )}
    </div>
  );
}
