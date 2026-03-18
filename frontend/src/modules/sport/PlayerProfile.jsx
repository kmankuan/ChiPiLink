/**
 * Player Profile — Stats, match history, ELO graph, H2H records, achievements
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Zap, Scale, TrendingUp, Swords, Target, Award, Link2 } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function StatCard({ icon: Icon, label, value, color }) {

function AnalyticsTab({ playerId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/api/sport/players/${playerId}/analytics`).then(r => r.ok ? r.json() : null).then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, [playerId]);
  if (loading) return <p className="text-center py-6 text-muted-foreground text-xs">Loading...</p>;
  if (!report || report.total_analyzed_points === 0) return (
    <Card><CardContent className="p-4 text-center"><Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium">No technique data yet</p><p className="text-xs text-muted-foreground mt-1">{report?.message || 'Referee needs to enable technique tagging (⚡ button) during live matches.'}</p></CardContent></Card>
  );
  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3"><div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-bold">{report.win_rate_tagged}%</p><p className="text-[9px] text-muted-foreground">Win Rate (tagged)</p></div>
        <div><p className="text-lg font-bold">{report.serve_accuracy}%</p><p className="text-[9px] text-muted-foreground">Serve Accuracy</p></div>
        <div><p className="text-lg font-bold">{report.total_analyzed_points}</p><p className="text-[9px] text-muted-foreground">Points Analyzed</p></div>
      </div></CardContent></Card>
      {report.strengths?.length > 0 && (
        <Card><CardContent className="p-3"><h4 className="text-xs font-bold text-green-600 mb-2">💪 Strengths</h4>
          {report.strengths.map(s => (
            <div key={s.technique} className="flex items-center justify-between py-1">
              <span className="text-xs">{s.technique}</span>
              <div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{width:`${s.percentage}%`}} /></div><span className="text-[10px] text-green-600 font-bold w-8 text-right">{s.percentage}%</span></div>
            </div>
          ))}
        </CardContent></Card>
      )}
      {report.weaknesses?.length > 0 && (
        <Card><CardContent className="p-3"><h4 className="text-xs font-bold text-red-500 mb-2">🎯 Weaknesses</h4>
          {report.weaknesses.map(w => (
            <div key={w.technique} className="flex items-center justify-between py-1">
              <span className="text-xs">{w.technique}</span>
              <div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{width:`${w.percentage}%`}} /></div><span className="text-[10px] text-red-500 font-bold w-8 text-right">{w.percentage}%</span></div>
            </div>
          ))}
        </CardContent></Card>
      )}
      {report.recommendations?.length > 0 && (
        <Card><CardContent className="p-3"><h4 className="text-xs font-bold mb-2">💡 Training Tips</h4>
          {report.recommendations.map((r, i) => (
            <div key={i} className="py-1.5 border-b last:border-0"><Badge variant="outline" className={`text-[8px] mr-1 ${r.urgency === 'high' ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>{r.area}</Badge><span className="text-xs text-muted-foreground">{r.tip}</span></div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}

  return (
    <div className="p-2 rounded-lg bg-muted/30 text-center">
      <Icon className="h-4 w-4 mx-auto mb-0.5" style={{ color }} />
      <div className="text-lg font-black">{value}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function PlayerProfile() {
  const { playerId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState('stats');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/sport/players/${playerId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/sport/matches?limit=50`).then(r => r.ok ? r.json() : []),
    ]).then(([p, m]) => {
      setPlayer(p);
      // Filter matches involving this player
      const playerMatches = m.filter(match => 
        match.player_a?.player_id === playerId || match.player_b?.player_id === playerId
      );
      setMatches(playerMatches);
    }).catch(() => {});
  }, [playerId]);

  const requestLink = async () => {
    try {
      const res = await fetch(`${API}/api/sport/players/${playerId}/link-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) toast.success('Link request sent! Admin will review.');
      else { const e = await res.json(); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Error'); }
  };

  if (!player) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><span className="text-muted-foreground">Loading...</span></div>;

  const s = player.stats || {};
  // Build H2H from matches
  const h2h = {};
  matches.forEach(m => {
    const isA = m.player_a?.player_id === playerId;
    const opp = isA ? m.player_b : m.player_a;
    if (!opp?.player_id) return;
    if (!h2h[opp.player_id]) h2h[opp.player_id] = { nickname: opp.nickname, wins: 0, losses: 0 };
    if (m.winner_id === playerId) h2h[opp.player_id].wins++;
    else h2h[opp.player_id].losses++;
  });
  const h2hList = Object.values(h2h).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

  // ELO history from matches
  const eloHistory = [{ elo: 1000, label: 'Start' }];
  const sortedMatches = [...matches].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  let currentElo = 1000;
  sortedMatches.forEach((m, i) => {
    const isA = m.player_a?.player_id === playerId;
    const change = isA ? (m.player_a?.elo_change || 0) : (m.player_b?.elo_change || 0);
    currentElo += change;
    eloHistory.push({ elo: currentElo, label: `M${i + 1}` });
  });

  const canLink = user && !player.linked_user_id && user.user_id;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button variant="ghost" size="sm" className="text-white mb-2" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {(player.photo_base64 || player.avatar_url) ? (
                <img src={player.photo_base64 || player.avatar_url} className="w-16 h-16 rounded-full object-cover border-3 border-white/20" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-black text-white/40">{(player.nickname || '?')[0]}</div>
              )}
              {user?.is_admin && (
                <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <span className="text-white text-xs">📷</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        await fetch(`${API}/api/sport/players/${player.player_id}/photo`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ photo_base64: ev.target.result })
                        });
                        setPlayer(p => ({ ...p, photo_base64: ev.target.result }));
                        toast.success('Photo updated!');
                      } catch { toast.error('Upload failed'); }
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{player.nickname}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/10 text-white/70 text-[10px]">{player.elo} ELO</Badge>
                {(player.roles || []).map(r => <Badge key={r} className="bg-white/10 text-white/60 text-[9px]">{r}</Badge>)}
                {player.linked_user_id && <Badge className="bg-green-500/20 text-green-300 text-[9px]"><Link2 className="h-2.5 w-2.5 mr-0.5" />Linked</Badge>}
              </div>
              {s.current_streak >= 3 && <span className="text-sm">🔥{s.current_streak} streak!</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={Swords} label={t('sport.matches')} value={s.matches || 0} color="#8b7355" />
          <StatCard icon={Trophy} label={t('sport.wins')} value={s.wins || 0} color="#22c55e" />
          <StatCard icon={Target} label={t('sport.winRate')} value={`${s.win_rate || 0}%`} color="#3b82f6" />
          <StatCard icon={Zap} label={t('sport.bestStreak')} value={s.best_streak || 0} color="#ef4444" />
        </div>
        {(player.roles || []).includes('referee') && (
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Scale} label={t('sport.matchesRefereed')} value={s.matches_refereed || 0} color="#B8860B" />
            <StatCard icon={Award} label="Trusted" value={(s.matches_refereed || 0) >= 20 ? 'Yes' : `${20 - (s.matches_refereed || 0)} more`} color="#a855f7" />
          </div>
        )}

        {/* Link request button */}
        {canLink && (
          <Button variant="outline" size="sm" className="w-full" onClick={requestLink}>
            <Link2 className="h-4 w-4 mr-2" /> Claim this player profile
          </Button>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="stats" className="flex-1 text-xs"><TrendingUp className="h-3 w-3 mr-1" /> ELO</TabsTrigger>
            <TabsTrigger value="h2h" className="flex-1 text-xs"><Swords className="h-3 w-3 mr-1" /> H2H</TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 text-xs"><Trophy className="h-3 w-3 mr-1" /> History</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 text-xs"><Target className="h-3 w-3 mr-1" /> Tech</TabsTrigger>
          </TabsList>

          {/* ELO Graph */}
          <TabsContent value="stats">
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold mb-2">ELO Progression</h3>
                {eloHistory.length > 1 ? (
                  <div className="h-32 flex items-end gap-[2px]">
                    {eloHistory.map((point, i) => {
                      const min = Math.min(...eloHistory.map(p => p.elo));
                      const max = Math.max(...eloHistory.map(p => p.elo));
                      const range = Math.max(max - min, 50);
                      const height = ((point.elo - min) / range) * 100;
                      const isUp = i > 0 && point.elo > eloHistory[i - 1].elo;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end">
                          <span className="text-[7px] text-muted-foreground mb-0.5">{point.elo}</span>
                          <div className={`w-full rounded-t ${isUp ? 'bg-green-500' : i === 0 ? 'bg-gray-300' : 'bg-red-400'}`}
                            style={{ height: `${Math.max(height, 5)}%`, minHeight: 4 }} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Play more matches to see ELO progression</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Head to Head */}
          <TabsContent value="h2h">
            <Card>
              <CardContent className="p-2">
                {h2hList.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-xs">No opponents yet</p>
                ) : (
                  <div className="space-y-1">
                    {h2hList.map(opp => (
                      <div key={opp.nickname} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                        <span className="text-xs font-medium">{opp.nickname}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600 font-bold">{opp.wins}W</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-red-500 font-bold">{opp.losses}L</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match History */}
          <TabsContent value="matches">
            <Card>
              <CardContent className="p-2">
                {matches.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-xs">{t('sport.noMatches')}</p>
                ) : (
                  <div className="space-y-1">
                    {matches.slice(0, 30).map(m => {
                      const isA = m.player_a?.player_id === playerId;
                      const won = m.winner_id === playerId;
                      const opp = isA ? m.player_b : m.player_a;
                      const eloChange = isA ? (m.player_a?.elo_change || 0) : (m.player_b?.elo_change || 0);
                      return (
                        <div key={m.match_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${won ? 'text-green-600' : 'text-red-500'}`}>{won ? 'W' : 'L'}</span>
                            <span className="text-xs">vs {opp?.nickname || '?'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-mono font-bold">{m.score_winner}-{m.score_loser}</span>
                            <span className={eloChange >= 0 ? 'text-green-600' : 'text-red-500'}>{eloChange >= 0 ? '+' : ''}{eloChange}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsTab playerId={playerId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
