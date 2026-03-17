import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords } from 'lucide-react';

export default function MatchesList() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getMatches({ limit: 50 })
      .then(res => setMatches(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6" data-testid="matches-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="text-blue-500" /> {t('matches')}
        </h1>
        <Link to="/sport/match/new">
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">+ {t('record_match')}</Badge>
        </Link>
      </div>

      {matches.length === 0 ? (
        <Card><CardContent className="text-center py-12"><p className="text-gray-400">{t('noData')}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {matches.map(m => (
            <Card key={m.match_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${m.winner_id === m.player_a?.player_id ? 'text-green-700' : ''}`}>
                      {m.player_a?.nickname}
                      {m.player_a?.elo_change != null && (
                        <span className={`text-xs ml-1 ${m.player_a.elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {m.player_a.elo_change > 0 ? '+' : ''}{m.player_a.elo_change}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className={`font-semibold ${m.winner_id === m.player_b?.player_id ? 'text-green-700' : ''}`}>
                      {m.player_b?.nickname}
                      {m.player_b?.elo_change != null && (
                        <span className={`text-xs ml-1 ${m.player_b.elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {m.player_b.elo_change > 0 ? '+' : ''}{m.player_b.elo_change}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold">{m.score_winner}-{m.score_loser}</span>
                    <Badge variant={m.status === 'validated' ? 'default' : 'secondary'}>{m.status}</Badge>
                  </div>
                </div>
                {m.referee && (
                  <p className="text-xs text-gray-400 mt-1">Ref: {m.referee.nickname}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
