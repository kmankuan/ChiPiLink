/**
 * PlayerPicker — Smart player selector
 * Shows recent players as tappable chips, with autocomplete for new names.
 * Auto-fills photo URL from player's stored photo.
 */
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function PlayerPicker({ label, value, photoValue, onChange, onPhotoChange, filterRole, placeholder = 'Name...', testId }) {
  const [players, setPlayers] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/sport/players?limit=50`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        let filtered = data;
        if (filterRole === 'referee') {
          // Show players who have refereed, sorted by most refereed
          filtered = data.filter(p => (p.roles || []).includes('referee'))
            .sort((a, b) => (b.stats?.matches_refereed || 0) - (a.stats?.matches_refereed || 0));
          // If few referees, also show all players
          if (filtered.length < 3) filtered = data;
        } else {
          // Sort by most matches played
          filtered = data.sort((a, b) => (b.stats?.matches || 0) - (a.stats?.matches || 0));
        }
        setPlayers(filtered);
      })
      .catch(() => {});
  }, [filterRole]);

  const selectPlayer = (p) => {
    onChange(p.nickname);
    if (onPhotoChange && p.avatar_url) onPhotoChange(p.avatar_url);
  };

  const visiblePlayers = showAll ? players : players.slice(0, 6);
  const hasMore = players.length > 6;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      
      {/* Recent players as chips */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visiblePlayers.map(p => (
            <button
              key={p.player_id}
              type="button"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all ${
                value === p.nickname
                  ? 'bg-green-600 text-white ring-2 ring-green-400/50'
                  : 'bg-white/80 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => selectPlayer(p)}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} className="w-3.5 h-3.5 rounded-full object-cover" alt="" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[7px] font-bold text-gray-600">
                  {(p.nickname || '?')[0]}
                </span>
              )}
              {p.nickname}
              {filterRole === 'referee' && p.stats?.matches_refereed > 0 && (
                <span className="text-[8px] opacity-60">⚖️{p.stats.matches_refereed}</span>
              )}
              {filterRole !== 'referee' && p.elo !== 1000 && (
                <span className="text-[8px] opacity-60">{p.elo}</span>
              )}
            </button>
          ))}
          {hasMore && !showAll && (
            <button type="button" className="text-[10px] text-muted-foreground hover:underline px-1" onClick={() => setShowAll(true)}>
              +{players.length - 6} more
            </button>
          )}
        </div>
      )}
      
      {/* Text input for new names */}
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm flex-1"
          data-testid={testId}
          list={`players-${testId}`}
        />
        {value && (
          <button type="button" className="text-gray-400 hover:text-gray-600 px-1" onClick={() => { onChange(''); if (onPhotoChange) onPhotoChange(''); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {/* Photo URL */}
      {onPhotoChange && (
        <Input
          value={photoValue || ''}
          onChange={e => onPhotoChange(e.target.value)}
          placeholder="Photo URL (optional)"
          className="h-7 text-[10px] text-muted-foreground"
        />
      )}

      {/* Hidden datalist for browser autocomplete */}
      <datalist id={`players-${testId}`}>
        {players.map(p => <option key={p.player_id} value={p.nickname} />)}
      </datalist>
    </div>
  );
}
