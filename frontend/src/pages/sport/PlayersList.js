import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PlayersList() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    sportApi.getPlayers({ sort_by: 'elo', order: 'desc' })
      .then(res => setPlayers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p =>
    p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="players-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-purple-500" /> {t('players')}
        </h1>
        {isAdmin && (
          <Button data-testid="add-player-btn" size="sm">
            <Plus size={16} className="mr-1" /> {t('create')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          data-testid="search-players"
          placeholder={t('search') + '...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400">{t('noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(player => (
            <Link key={player.player_id} to={`/sport/player/${player.player_id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 mx-auto flex items-center justify-center text-white text-xl font-bold mb-3">
                    {player.nickname?.charAt(0)?.toUpperCase()}
                  </div>
                  <p className="font-semibold truncate">{player.nickname}</p>
                  <p className="text-lg font-bold font-mono text-red-600">{player.elo}</p>
                  <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="text-green-600">{player.stats?.wins || 0}W</span>
                    <span className="text-red-500">{player.stats?.losses || 0}L</span>
                  </div>
                  <div className="flex justify-center gap-1 mt-2">
                    {player.roles?.map(role => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
