import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, Users } from 'lucide-react';

function BracketMatch({ match }) {
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';

  return (
    <Card className={`min-w-[200px] ${
      isCompleted ? 'border-green-200 bg-green-50/50' :
      isPending ? 'border-blue-200' : 'border-gray-200 bg-gray-50/50'
    }`}>
      <CardContent className="p-2.5 space-y-0.5">
        <div className={`flex items-center justify-between text-sm px-1 py-0.5 rounded ${
          match.winner_id && match.winner_id === match.player_a?.player_id ? 'font-bold text-green-700 bg-green-50' : ''
        }`}>
          <div className="flex items-center gap-1.5">
            {match.player_a?.seed && <span className="text-[10px] text-gray-400 w-4">#{match.player_a.seed}</span>}
            <span className="truncate max-w-[110px]">{match.player_a?.nickname || '—'}</span>
          </div>
        </div>
        <div className="border-t border-dashed" />
        <div className={`flex items-center justify-between text-sm px-1 py-0.5 rounded ${
          match.winner_id && match.winner_id === match.player_b?.player_id ? 'font-bold text-green-700 bg-green-50' : ''
        }`}>
          <div className="flex items-center gap-1.5">
            {match.player_b?.seed && <span className="text-[10px] text-gray-400 w-4">#{match.player_b.seed}</span>}
            <span className="truncate max-w-[110px]">{match.player_b?.nickname || '—'}</span>
          </div>
        </div>
        {match.score && (
          <p className="text-[10px] text-center text-gray-400 pt-0.5 border-t">{match.score}</p>
        )}
      </CardContent>
    </Card>
  );
}

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

  const isDoubleElim = tournament.format === 'double_elimination';

  // Group brackets by type for double elimination
  const winnersBrackets = tournament.brackets?.filter(b => b.name?.startsWith('Winners')) || [];
  const losersBrackets = tournament.brackets?.filter(b => b.name?.startsWith('Losers')) || [];
  const grandFinal = tournament.brackets?.filter(b =>
    b.name?.includes('Grand Final') || b.name === 'Grand Final Reset'
  ) || [];
  const thirdPlace = tournament.brackets?.filter(b => b.name === 'Third Place') || [];
  const singleElimBrackets = isDoubleElim ? [] : (tournament.brackets || []);

  return (
    <div className="space-y-6" data-testid="tournament-detail">
      <Link to="/sport/tournaments" className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('back')}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          {tournament.description && <p className="text-sm text-gray-500 mt-1">{tournament.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {tournament.format?.replace('_', ' ')}
          </Badge>
          <Badge variant={
            tournament.status === 'in_progress' ? 'default' :
            tournament.status === 'completed' ? 'secondary' : 'outline'
          }>{tournament.status}</Badge>
        </div>
      </div>

      {/* Single Elimination Bracket */}
      {!isDoubleElim && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Trophy size={16} /> {t('tournament_bracket')}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-6 min-w-max py-2">
                {singleElimBrackets.map((bracket, idx) => (
                  <div key={idx} className="min-w-[220px]">
                    <h4 className="text-xs font-semibold text-center text-gray-500 mb-3 uppercase tracking-wide">
                      {bracket.name}
                    </h4>
                    <div className="space-y-3" style={{ paddingTop: idx > 0 ? idx * 24 : 0 }}>
                      {bracket.matches?.map(match => (
                        <BracketMatch key={match.match_id} match={match} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Double Elimination Bracket */}
      {isDoubleElim && (
        <div className="space-y-4">
          {/* Winners Bracket */}
          {winnersBrackets.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <Trophy size={16} /> Winners Bracket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex gap-6 min-w-max py-2">
                    {winnersBrackets.map((bracket, idx) => (
                      <div key={idx} className="min-w-[220px]">
                        <h4 className="text-xs font-semibold text-center text-blue-500 mb-3 uppercase tracking-wide">
                          {bracket.name}
                        </h4>
                        <div className="space-y-3" style={{ paddingTop: idx > 0 ? idx * 24 : 0 }}>
                          {bracket.matches?.map(match => (
                            <BracketMatch key={match.match_id} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Losers Bracket */}
          {losersBrackets.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <Trophy size={16} className="rotate-180" /> Losers Bracket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex gap-6 min-w-max py-2">
                    {losersBrackets.map((bracket, idx) => (
                      <div key={idx} className="min-w-[220px]">
                        <h4 className="text-xs font-semibold text-center text-red-500 mb-3 uppercase tracking-wide">
                          {bracket.name}
                        </h4>
                        <div className="space-y-3" style={{ paddingTop: Math.min(idx, 3) * 12 }}>
                          {bracket.matches?.map(match => (
                            <BracketMatch key={match.match_id} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grand Final */}
          {grandFinal.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                  <Trophy size={16} /> Grand Final
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 justify-center">
                  {grandFinal.map((bracket, idx) => (
                    <div key={idx} className="min-w-[220px]">
                      <h4 className="text-xs font-semibold text-center text-amber-500 mb-3 uppercase tracking-wide">
                        {bracket.name}
                      </h4>
                      {bracket.matches?.map(match => (
                        <BracketMatch key={match.match_id} match={match} />
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={16} /> Participants ({tournament.participants?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tournament.participants?.map(p => (
              <Link key={p.player_id} to={`/sport/player/${p.player_id}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-xs font-bold text-gray-400 w-5">#{p.seed}</span>
                <span className="text-sm font-medium truncate">{p.nickname}</span>
                <span className="text-xs text-gray-500 ml-auto">{p.elo}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Winner */}
      {tournament.winner_id && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="text-center py-6">
            <Trophy className="mx-auto text-amber-500 mb-2" size={36} />
            <p className="text-xl font-bold text-amber-800">
              {tournament.participants?.find(p => p.player_id === tournament.winner_id)?.nickname || 'Winner'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
