import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Swords, Radio, Users, Plus, ArrowRight } from 'lucide-react';

export default function SportDashboard() {
  const { t } = useTranslation();
  const [topPlayers, setTopPlayers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [playersRes, matchesRes, liveRes] = await Promise.all([
          sportApi.getRankings().catch(() => ({ data: [] })),
          sportApi.getMatches({ limit: 5 }).catch(() => ({ data: [] })),
          sportApi.getLiveSessions().catch(() => ({ data: [] }))
        ]);
        setTopPlayers(playersRes.data?.slice(0, 5) || []);
        setRecentMatches(matchesRes.data?.slice(0, 5) || []);
        setLiveSessions(liveRes.data || []);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sport-dashboard">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 p-6 md:p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">🏓 ChiPi {t('sport_engine')}</h1>
          <p className="text-red-100 mb-4">{t('table_tennis')} • {t('live')} • {t('rankings')}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sport/match/new">
              <Button data-testid="btn-record-match" className="bg-white text-red-700 hover:bg-red-50">
                <Plus size={16} className="mr-1" /> {t('record_match')}
              </Button>
            </Link>
            <Link to="/sport/live/new">
              <Button data-testid="btn-start-live" variant="outline" className="border-white text-white hover:bg-white/10">
                <Radio size={16} className="mr-1" /> {t('start_live')}
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -right-4 -bottom-12 w-32 h-32 bg-white/5 rounded-full" />
      </div>

      {/* Live Sessions */}
      {liveSessions.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Radio size={20} className="animate-pulse" /> {t('active_matches')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {liveSessions.map(session => (
                <Link
                  key={session.session_id}
                  to={`/sport/live/${session.session_id}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                    <span className="font-medium">{session.player_a?.nickname}</span>
                    <span className="text-lg font-bold text-red-600">
                      {session.score?.a || 0} - {session.score?.b || 0}
                    </span>
                    <span className="font-medium">{session.player_b?.nickname}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Set {session.current_set}</span>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Players */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Trophy size={18} className="text-amber-500" /> {t('top_players')}
              </CardTitle>
              <Link to="/sport/rankings" className="text-xs text-red-600 hover:underline">{t('view_all')}</Link>
            </div>
          </CardHeader>
          <CardContent>
            {topPlayers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('noData')}</p>
            ) : (
              <div className="space-y-2">
                {topPlayers.map((player, i) => (
                  <Link
                    key={player.player_id}
                    to={`/sport/player/${player.player_id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.nickname}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono">{player.elo}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Swords size={18} className="text-blue-500" /> {t('recent_matches')}
              </CardTitle>
              <Link to="/sport/matches" className="text-xs text-red-600 hover:underline">{t('view_all')}</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMatches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('noData')}</p>
            ) : (
              <div className="space-y-2">
                {recentMatches.map(match => (
                  <div key={match.match_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={match.winner_id === match.player_a?.player_id ? 'font-bold text-green-700' : ''}>
                        {match.player_a?.nickname}
                      </span>
                      <span className="text-xs text-gray-400">vs</span>
                      <span className={match.winner_id === match.player_b?.player_id ? 'font-bold text-green-700' : ''}>
                        {match.player_b?.nickname}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">
                      {match.score_winner}-{match.score_loser}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users size={18} className="text-purple-500" /> Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-50 text-center">
                <p className="text-2xl font-bold text-red-700">{topPlayers.length}</p>
                <p className="text-xs text-red-600">{t('players')}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-center">
                <p className="text-2xl font-bold text-blue-700">{recentMatches.length}</p>
                <p className="text-xs text-blue-600">{t('matches')}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-center">
                <p className="text-2xl font-bold text-green-700">{liveSessions.length}</p>
                <p className="text-xs text-green-600">{t('live')}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  <Link to="/sport/tv" className="hover:underline">TV</Link>
                </p>
                <p className="text-xs text-amber-600">{t('tv_display')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
