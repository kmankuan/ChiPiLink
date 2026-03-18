/**
 * Players List — Shows all registered players with ELO and stats
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, Users, Search, Trophy } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function PlayersList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API}/api/sport/players?limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(setPlayers)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p =>
    !search || (p.nickname || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sport')} className="shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Players</h1>
          <p className="text-sm text-muted-foreground">{players.length} player{players.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10"
          data-testid="player-search"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">{search ? 'No players match your search' : 'No players yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((player, i) => (
            <div
              key={player.player_id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/sport/player/${player.player_id}`)}
              data-testid={`player-row-${player.player_id}`}
            >
              {/* Rank */}
              <span className="w-8 text-center font-bold text-sm text-muted-foreground">
                {i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : i + 1}
              </span>

              {/* Avatar */}
              {player.avatar_url || player.photo_url ? (
                <img src={player.avatar_url || player.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-border" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(player.nickname || '?')[0].toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{player.nickname}</p>
                <p className="text-xs text-muted-foreground">
                  {player.matches || 0}W/{player.losses || 0}L
                  {player.roles?.includes('referee') && ' · Referee'}
                </p>
              </div>

              {/* ELO */}
              <div className="text-right shrink-0">
                <p className="font-mono font-bold text-sm">{player.elo || 1000}</p>
                <p className="text-[10px] text-muted-foreground">ELO</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
