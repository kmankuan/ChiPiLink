import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function TournamentDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getTournament(id)
      .then(res => setTournament(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!tournament) return <div className="text-center py-12 text-gray-400">Not found</div>;

  const roundNames = {
    1: t('quarterfinals'),
    2: t('semifinals'),
    3: t('final'),
    4: t('third_place'),
  };

  return (
    <div className="space-y-6" data-testid="tournament-detail">
      <Link to="/sport/tournaments" className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('back')}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <Badge variant={tournament.status === 'in_progress' ? 'default' : 'secondary'}>{tournament.status}</Badge>
      </div>

      {/* Bracket View */}
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max p-4">
          {tournament.brackets?.map((bracket, idx) => (
            <div key={idx} className="space-y-4 min-w-[220px]">
              <h3 className="font-semibold text-center text-sm">
                {bracket.name || roundNames[bracket.round] || `Round ${bracket.round}`}
              </h3>
              <div className="space-y-3" style={{ paddingTop: idx * 30 }}>
                {bracket.matches?.map(match => (
                  <Card key={match.match_id} className={`${
                    match.status === 'completed' ? 'border-green-200 bg-green-50' :
                    match.status === 'pending' ? 'border-blue-200' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className={`flex items-center justify-between text-sm ${
                          match.winner_id === match.player_a?.player_id ? 'font-bold text-green-700' : ''
                        }`}>
                          <span>{match.player_a?.nickname || 'TBD'}</span>
                          {match.player_a?.seed && <span className="text-xs text-gray-400">#{match.player_a.seed}</span>}
                        </div>
                        <div className="border-t" />
                        <div className={`flex items-center justify-between text-sm ${
                          match.winner_id === match.player_b?.player_id ? 'font-bold text-green-700' : ''
                        }`}>
                          <span>{match.player_b?.nickname || 'TBD'}</span>
                          {match.player_b?.seed && <span className="text-xs text-gray-400">#{match.player_b.seed}</span>}
                        </div>
                      </div>
                      {match.score && (
                        <p className="text-xs text-center text-gray-500 mt-1">{match.score}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participants */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Participants ({tournament.participants?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tournament.participants?.map(p => (
              <div key={p.player_id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <span className="text-xs font-bold text-gray-400">#{p.seed}</span>
                <span className="text-sm font-medium">{p.nickname}</span>
                <span className="text-xs text-gray-500 ml-auto">{p.elo}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
