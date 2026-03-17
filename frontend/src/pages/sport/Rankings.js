import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Rankings() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getRankings()
      .then(res => setPlayers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="rankings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="text-amber-500" /> {t('rankings')}
        </h1>
      </div>

      {players.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-400">{t('noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {players.map((player, i) => (
                <Link
                  key={player.player_id}
                  to={`/sport/player/${player.player_id}`}
                  data-testid={`rank-${i + 1}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' :
                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                    i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{player.nickname}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{player.stats?.matches || 0} {t('matches').toLowerCase()}</span>
                      <span className="text-green-600">{player.stats?.wins || 0}W</span>
                      <span className="text-red-500">{player.stats?.losses || 0}L</span>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-gray-900">{player.elo}</p>
                    <div className="flex items-center gap-1 justify-end">
                      {player.stats?.current_streak > 0 ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                          <TrendingUp size={10} className="mr-1" />
                          {player.stats.current_streak}
                        </Badge>
                      ) : player.stats?.matches > 0 ? (
                        <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">
                          <Minus size={10} className="mr-1" /> 0
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="hidden md:block w-20 text-right">
                    <p className="text-sm font-medium">{player.stats?.win_rate || 0}%</p>
                    <p className="text-xs text-gray-400">{t('winRate')}</p>
                  </div>

                  {/* Roles */}
                  <div className="hidden lg:flex gap-1">
                    {player.roles?.includes('referee') && (
                      <Badge variant="outline" className="text-xs">Ref</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
