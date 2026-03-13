/**
 * Sport Dashboard — Main entry page
 * Shows: live matches, recent matches, top players, quick actions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Zap, Plus, Users, Award, ChevronRight, Radio, Medal, Scale } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  const [live, setLive] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    const h = { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` };
    Promise.all([
      fetch(`${API}/api/sport/live`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/sport/matches?limit=10`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/sport/players?limit=10`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/sport/leagues`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([l, m, p, lg]) => { setLive(l); setMatches(m); setPlayers(p); setLeagues(lg); });
  }, []);

  const topPlayers = players.slice(0, 5);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏓</span>
              <h1 className="text-lg font-bold text-white">{t('sport.title')}</h1>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white text-xs" onClick={() => navigate('/sport/admin')}>
                  {t('sport.admin')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-14 rounded-xl text-white font-bold text-sm" style={{ background: '#C8102E' }}
            onClick={() => navigate('/sport/match/new')}>
            <Plus className="h-5 w-5 mr-2" /> {t('sport.recordMatch')}
          </Button>
          <Button className="h-14 rounded-xl text-white font-bold text-sm" style={{ background: '#2d2217' }}
            onClick={() => navigate('/sport/live/new')}>
            <Radio className="h-5 w-5 mr-2" /> {t('sport.live.startLive')}
          </Button>
        </div>

        {/* Live Matches */}
        {live.length > 0 && (
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-3">
              <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4 animate-pulse" /> {t('sport.liveNow')}
              </h3>
              {live.map(s => (
                <div key={s.session_id} className="flex items-center justify-between p-2 rounded-lg bg-white cursor-pointer hover:bg-red-50" onClick={() => navigate(`/sport/live/${s.session_id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{s.player_a?.nickname}</span>
                    <span className="text-xs text-red-500 font-mono">{s.score?.a}-{s.score?.b}</span>
                    <span className="font-bold text-sm">{s.player_b?.nickname}</span>
                  </div>
                  <Badge className="bg-red-100 text-red-700 text-[10px]">LIVE</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Nav Row */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" onClick={() => navigate('/sport/rankings')}>
            <Trophy className="h-3.5 w-3.5 mr-1" /> {t('sport.rankings')}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" onClick={() => navigate('/sport/leagues')}>
            <Medal className="h-3.5 w-3.5 mr-1" /> {t('sport.leagues')}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" onClick={() => navigate('/sport/players')}>
            <Users className="h-3.5 w-3.5 mr-1" /> {t('sport.players')}
          </Button>
        </div>

        {/* Top Players */}
        {topPlayers.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-500" /> {t('sport.rankings')}</h3>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => navigate('/sport/rankings')}>{t('sport.back')} <ChevronRight className="h-3 w-3 ml-1" /></Button>
              </div>
              <div className="space-y-1">
                {topPlayers.map((p, i) => (
                  <div key={p.player_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                      <span className="text-sm font-medium">{p.nickname}</span>
                      {p.stats?.current_streak >= 3 && <span className="text-[10px]">🔥{p.stats.current_streak}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">{p.elo}</span>
                      <span>{p.stats?.wins || 0}W/{p.stats?.losses || 0}L</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Matches */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-bold mb-2">{t('sport.recentMatches')}</h3>
            {matches.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t('sport.noMatches')}</p>
            ) : (
              <div className="space-y-2">
                {matches.map(m => {
                  const pa = m.player_a || {};
                  const pb = m.player_b || {};
                  const isAWinner = m.winner_id === pa.player_id;
                  return (
                    <div key={m.match_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/sport/match/${m.match_id}`)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-medium truncate ${isAWinner ? 'text-green-600' : ''}`}>{pa.nickname}</span>
                        <span className="text-[10px] text-muted-foreground">vs</span>
                        <span className={`text-sm font-medium truncate ${!isAWinner ? 'text-green-600' : ''}`}>{pb.nickname}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-sm font-bold">{m.score_winner}-{m.score_loser}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{m.status === 'validated' ? '✓' : '⏳'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leagues */}
        {leagues.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-1"><Medal className="h-4 w-4" /> {t('sport.leagues')}</h3>
              </div>
              {leagues.map(l => (
                <div key={l.league_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/sport/league/${l.league_id}`)}>
                  <div>
                    <span className="text-sm font-medium">{l.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{l.rating_system}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{l.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
