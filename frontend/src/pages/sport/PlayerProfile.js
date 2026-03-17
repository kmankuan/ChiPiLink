import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, Swords } from 'lucide-react';

export default function PlayerProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          sportApi.getPlayer(id),
          sportApi.getMatches({ player_id: id }).catch(() => ({ data: [] }))
        ]);
        setPlayer(pRes.data);
        setMatches(mRes.data || []);
      } catch {} 
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!player) return <div className="text-center py-12 text-gray-400">Player not found</div>;

  return (
    <div className="space-y-6" data-testid="player-profile">
      <Link to="/sport/players" className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('back')}
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-3xl font-bold">
              {player.nickname?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{player.nickname}</h1>
              <p className="text-gray-500">{player.name}</p>
              <div className="flex gap-2 mt-2">
                {player.roles?.map(role => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))}
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold font-mono text-red-600">{player.elo}</p>
              <p className="text-sm text-gray-500">{t('elo')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('matches'), value: player.stats?.matches || 0, color: 'bg-blue-50 text-blue-700' },
          { label: t('wins'), value: player.stats?.wins || 0, color: 'bg-green-50 text-green-700' },
          { label: t('losses'), value: player.stats?.losses || 0, color: 'bg-red-50 text-red-700' },
          { label: t('winRate'), value: `${player.stats?.win_rate || 0}%`, color: 'bg-amber-50 text-amber-700' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className={`p-4 text-center ${stat.color} rounded-lg`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Swords size={18} /> Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-center text-gray-400 py-4">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {matches.map(m => {
                const won = m.winner_id === player.player_id;
                const opponent = m.player_a?.player_id === player.player_id ? m.player_b : m.player_a;
                return (
                  <div key={m.match_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant={won ? 'default' : 'destructive'} className="w-6 text-center">
                        {won ? 'W' : 'L'}
                      </Badge>
                      <span>vs {opponent?.nickname}</span>
                    </div>
                    <span className="font-mono text-sm">{m.score_winner}-{m.score_loser}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
