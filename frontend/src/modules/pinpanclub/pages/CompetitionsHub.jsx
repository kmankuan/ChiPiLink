/**
 * CompetitionsHub — Unified competition center.
 * Merges League (SuperPin), Rapid Pin, and Arena into one view.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Zap, Swords, Award, Users, Plus, ArrowRight, Clock, Star, Shield
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function CompCard({ icon: Icon, title, desc, count, color, onClick }) {
  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
      style={{ background: `linear-gradient(145deg, #FBF7F0, #F5EDE0)`, border: '1px solid rgba(139,115,85,0.12)' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: '#2d2217' }}>{title}</h3>
            {count > 0 && <Badge variant="secondary" className="text-[9px] h-5">{count} active</Badge>}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: '#8b7355' }}>{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 mt-1" style={{ color: '#8b7355' }} />
      </div>
    </div>
  );
}

export default function CompetitionsHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tab, setTab] = useState('all');
  const token = localStorage.getItem('auth_token');
  const isAdmin = user?.is_admin;

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    // Fetch all competition types
    Promise.all([
      fetch(`${API}/api/pinpanclub/superpin/leagues`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/pinpanclub/rapidpin/seasons`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/pinpanclub/arena/tournaments`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([l, s, a]) => {
      setLeagues(Array.isArray(l) ? l : l?.leagues || []);
      setSeasons(Array.isArray(s) ? s : s?.seasons || []);
      setTournaments(Array.isArray(a) ? a : a?.tournaments || []);
    });
  }, [token]);

  const activeLeagues = leagues.filter(l => l.status === 'active');
  const activeSeasons = seasons.filter(s => s.status === 'active');
  const activeTournaments = tournaments.filter(t => t.status === 'active' || t.status === 'registration');

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: '#B8860B' }} />
              <h1 className="text-lg font-bold text-white">Competitions</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white rounded-full text-xs h-7"
                onClick={() => navigate('/pinpanclub/superpin/ranking')}>
                <Star className="h-3.5 w-3.5 mr-1" /> Ranking
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white rounded-full text-xs h-7"
                onClick={() => navigate('/pinpanclub/hall-of-fame')}>
                <Award className="h-3.5 w-3.5 mr-1" /> Hall of Fame
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Create — admin only */}
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 rounded-full text-xs text-white" style={{ background: '#B8860B' }}
              onClick={() => navigate('/pinpanclub/superpin/admin')}>
              <Plus className="h-3 w-3 mr-1" /> New League
            </Button>
            <Button size="sm" className="flex-1 rounded-full text-xs text-white" style={{ background: '#C8102E' }}
              onClick={() => navigate('/pinpanclub/rapidpin')}>
              <Plus className="h-3 w-3 mr-1" /> New Season
            </Button>
            <Button size="sm" className="flex-1 rounded-full text-xs text-white" style={{ background: '#2d2217' }}
              onClick={() => navigate('/pinpanclub/arena/create')}>
              <Plus className="h-3 w-3 mr-1" /> New Tournament
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full h-auto gap-1 p-1" style={{ background: 'rgba(139,115,85,0.08)' }}>
            <TabsTrigger value="all" className="flex-1 text-xs rounded-full">All</TabsTrigger>
            <TabsTrigger value="leagues" className="flex-1 text-xs rounded-full gap-1">
              <Shield className="h-3 w-3" /> Leagues
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex-1 text-xs rounded-full gap-1">
              <Zap className="h-3 w-3" /> Seasons
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex-1 text-xs rounded-full gap-1">
              <Swords className="h-3 w-3" /> Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-3">
            {activeLeagues.length === 0 && activeSeasons.length === 0 && activeTournaments.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: '#8b7355' }}>No active competitions. {isAdmin ? 'Create one above!' : ''}</p>
            )}
            {activeLeagues.map(l => (
              <CompCard key={l.liga_id} icon={Shield} title={l.name} desc={`${l.players?.length || 0} players · League`}
                count={0} color="#B8860B" onClick={() => navigate(`/pinpanclub/superpin/ranking`)} />
            ))}
            {activeSeasons.map(s => (
              <CompCard key={s.season_id} icon={Zap} title={s.name} desc={`${s.matches_count || 0} matches · Rapid Pin Season`}
                count={0} color="#C8102E" onClick={() => navigate(`/pinpanclub/rapidpin/season/${s.season_id}`)} />
            ))}
            {activeTournaments.map(t => (
              <CompCard key={t.tournament_id} icon={Swords} title={t.name} desc={`${t.participants?.length || 0} participants · Tournament`}
                count={0} color="#2d2217" onClick={() => navigate(`/pinpanclub/arena/${t.tournament_id}`)} />
            ))}
            {/* Also show inactive ones */}
            {[...leagues.filter(l => l.status !== 'active'), ...seasons.filter(s => s.status !== 'active'), ...tournaments.filter(t => t.status !== 'active' && t.status !== 'registration')].map((item, i) => (
              <CompCard key={i} icon={Clock} title={item.name} desc={item.status || 'Ended'}
                count={0} color="#8b7355" onClick={() => {}} />
            ))}
          </TabsContent>

          <TabsContent value="leagues" className="space-y-3 mt-3">
            {leagues.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: '#8b7355' }}>No leagues yet</p>
            ) : leagues.map(l => (
              <CompCard key={l.liga_id} icon={Shield} title={l.name}
                desc={`${l.players?.length || 0} players · ${l.status}`}
                count={0} color="#B8860B" onClick={() => navigate(`/pinpanclub/superpin/ranking`)} />
            ))}
          </TabsContent>

          <TabsContent value="seasons" className="space-y-3 mt-3">
            {seasons.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: '#8b7355' }}>No seasons yet</p>
            ) : seasons.map(s => (
              <CompCard key={s.season_id} icon={Zap} title={s.name}
                desc={`${s.matches_count || 0} matches · ${s.status}`}
                count={0} color="#C8102E" onClick={() => navigate(`/pinpanclub/rapidpin/season/${s.season_id}`)} />
            ))}
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-3 mt-3">
            {tournaments.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: '#8b7355' }}>No tournaments yet</p>
            ) : tournaments.map(t => (
              <CompCard key={t.tournament_id} icon={Swords} title={t.name}
                desc={`${t.participants?.length || 0} participants · ${t.status}`}
                count={0} color="#2d2217" onClick={() => navigate(`/pinpanclub/arena/${t.tournament_id}`)} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
