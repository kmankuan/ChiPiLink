/**
 * League Detail — Standings table, match matrix, match history
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Grid3x3, List } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState('standings');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/sport/leagues/${leagueId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/sport/leagues/${leagueId}/standings`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/sport/matches?league_id=${leagueId}&limit=50`).then(r => r.ok ? r.json() : []),
    ]).then(([l, s, m]) => { setLeague(l); setStandings(s); setMatches(m); }).catch(() => {});
  }, [leagueId]);

  if (!league) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><span className="text-muted-foreground">Loading...</span></div>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-base font-bold text-white">{league.name}</h1>
              <p className="text-[10px] text-white/50">{league.season} • {league.rating_system}</p>
            </div>
            <Badge className="ml-auto bg-green-500/20 text-green-300 text-[10px]">{league.status}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="standings" className="flex-1 text-xs gap-1"><Trophy className="h-3 w-3" /> {t('sport.standings')}</TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1 text-xs gap-1"><Grid3x3 className="h-3 w-3" /> {t('sport.matrix')}</TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 text-xs gap-1"><List className="h-3 w-3" /> {t('sport.matchHistory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card>
              <CardContent className="p-2">
                {standings.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">{t('sport.noPlayers')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="py-2 text-left pl-2 w-8">{t('sport.position')}</th>
                          <th className="py-2 text-left">Player</th>
                          <th className="py-2 text-center w-10">{t('sport.points')}</th>
                          <th className="py-2 text-center w-8">{t('sport.winsShort')}</th>
                          <th className="py-2 text-center w-8">{t('sport.lossesShort')}</th>
                          <th className="py-2 text-center w-10">{t('sport.elo')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr key={s.player_id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 pl-2 font-bold">{i < 3 ? medals[i] : i + 1}</td>
                            <td className="py-2 font-medium">{s.nickname}</td>
                            <td className="py-2 text-center font-bold">{s.points}</td>
                            <td className="py-2 text-center text-green-600">{s.wins}</td>
                            <td className="py-2 text-center text-red-500">{s.losses}</td>
                            <td className="py-2 text-center font-mono">{s.elo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground text-center py-4">Matrix view — coming in Phase 2</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardContent className="p-2">
                {matches.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">{t('sport.noMatches')}</p>
                ) : (
                  <div className="space-y-2">
                    {matches.map(m => {
                      const pa = m.player_a || {}; const pb = m.player_b || {};
                      const isAWin = m.winner_id === pa.player_id;
                      return (
                        <div key={m.match_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-medium truncate ${isAWin ? 'text-green-600 font-bold' : ''}`}>{pa.nickname}</span>
                            <span className="text-[9px] text-muted-foreground">vs</span>
                            <span className={`text-xs font-medium truncate ${!isAWin ? 'text-green-600 font-bold' : ''}`}>{pb.nickname}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold">{m.score_winner}-{m.score_loser}</span>
                            <span className={`text-[9px] ${isAWin ? 'text-amber-600' : 'text-blue-600'}`}>
                              {isAWin ? pa.nickname?.charAt(0) : pb.nickname?.charAt(0)}✓
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
