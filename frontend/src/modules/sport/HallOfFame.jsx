/**
 * Hall of Fame — Season champions, records, milestones
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Zap, Medal, Crown, Scale, Target } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function RecordCard({ icon: Icon, title, player, value, color }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-sm font-bold truncate">{player}</p>
      </div>
      <span className="text-lg font-black" style={{ color }}>{value}</span>
    </div>
  );
}

export default function HallOfFame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/sport/players?limit=100`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/sport/leagues`).then(r => r.ok ? r.json() : []),
    ]).then(([p, l]) => { setPlayers(p); setLeagues(l); }).catch(() => {});
  }, []);

  // Compute records
  const topElo = players.length > 0 ? players.reduce((a, b) => a.elo > b.elo ? a : b) : null;
  const topWins = players.length > 0 ? players.reduce((a, b) => (a.stats?.wins || 0) > (b.stats?.wins || 0) ? a : b) : null;
  const topStreak = players.length > 0 ? players.reduce((a, b) => (a.stats?.best_streak || 0) > (b.stats?.best_streak || 0) ? a : b) : null;
  const topWinRate = players.filter(p => (p.stats?.matches || 0) >= 5).length > 0 ? players.filter(p => (p.stats?.matches || 0) >= 5).reduce((a, b) => (a.stats?.win_rate || 0) > (b.stats?.win_rate || 0) ? a : b) : null;
  const topReferee = players.filter(p => (p.stats?.matches_refereed || 0) > 0).length > 0 ? players.filter(p => (p.stats?.matches_refereed || 0) > 0).reduce((a, b) => (a.stats?.matches_refereed || 0) > (b.stats?.matches_refereed || 0) ? a : b) : null;
  const mostMatches = players.length > 0 ? players.reduce((a, b) => (a.stats?.matches || 0) > (b.stats?.matches || 0) ? a : b) : null;

  const finishedLeagues = leagues.filter(l => l.status === 'finished');

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)' }} className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button variant="ghost" size="sm" className="text-white mb-1" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Hall of Fame</h1>
              <p className="text-yellow-200/60 text-xs">Records & Champions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* All-Time Records */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Crown className="h-4 w-4 text-amber-500" /> All-Time Records</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topElo && <RecordCard icon={Trophy} title="Highest ELO" player={topElo.nickname} value={topElo.elo} color="#B8860B" />}
            {topWins && <RecordCard icon={Medal} title="Most Wins" player={topWins.nickname} value={topWins.stats?.wins || 0} color="#22c55e" />}
            {topStreak && (topStreak.stats?.best_streak || 0) > 0 && <RecordCard icon={Zap} title="Longest Streak" player={topStreak.nickname} value={`${topStreak.stats?.best_streak}🔥`} color="#ef4444" />}
            {topWinRate && <RecordCard icon={Target} title="Best Win Rate (5+ matches)" player={topWinRate.nickname} value={`${topWinRate.stats?.win_rate}%`} color="#3b82f6" />}
            {topReferee && <RecordCard icon={Scale} title="Top Referee" player={topReferee.nickname} value={topReferee.stats?.matches_refereed || 0} color="#a855f7" />}
            {mostMatches && <RecordCard icon={Medal} title="Most Active" player={mostMatches.nickname} value={`${mostMatches.stats?.matches || 0} matches`} color="#8b7355" />}
            {players.length === 0 && <p className="text-center py-4 text-muted-foreground text-xs">Play some matches to see records!</p>}
          </CardContent>
        </Card>

        {/* League Champions */}
        {finishedLeagues.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Trophy className="h-4 w-4 text-yellow-500" /> League Champions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {finishedLeagues.map(l => (
                <div key={l.league_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-50/50 border border-yellow-200/50">
                  <div>
                    <p className="text-sm font-bold">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground">{l.season}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">Champion</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top Players */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Players</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {players.slice(0, 10).map((p, i) => (
              <div key={p.player_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/sport/player/${p.player_id}`)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-5 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                  {p.avatar_url ? <img src={p.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" /> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">{(p.nickname || '?')[0]}</div>}
                  <span className="text-xs font-medium">{p.nickname}</span>
                </div>
                <span className="text-xs font-mono font-bold">{p.elo}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
