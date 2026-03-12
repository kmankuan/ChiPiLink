/**
 * Ping Pong Dashboard - Main page of the module
 * Shows live matches, rankings, tournaments
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Trophy,
  Users,
  Calendar,
  Play,
  TrendingUp,
  Plus,
  Search,
  Eye,
  Gavel,
  Medal,
  Target,
  Settings,
  Image,
  CalendarDays,
  Zap,
  Check,
  Clock,
  Scale,
  Award,
  BarChart3,
  Swords,
  Star
} from 'lucide-react';
import NotificationCenter from '../components/NotificationCenter';
import WeeklyChallenges from '../components/WeeklyChallenges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ScoreBoard from '../components/ScoreBoard';
import { PINPANCLUB_API, API_BASE } from '../config/api';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

export default function PingPongDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeMatches, setActiveMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [rapidPinData, setRapidPinData] = useState({ matches: [], season: null });
  const [rapidPinPendingCount, setRapidPinPendingCount] = useState(0);
  
  // Get current user ID from auth context
  const currentUserId = user?.user_id || null;
  
  // Check if user is admin or moderator
  const canManage = isAdmin || user?.role === 'moderator';
  
  // Detect if we're inside the admin panel
  const isInsideAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    fetchDashboardData();
    fetchRapidPinActivity();
    
    // Poll for active matches every 5 seconds
    const interval = setInterval(fetchActiveMatches, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [matchesRes, rankingsRes, tournamentsRes, recentRes] = await Promise.all([
        axios.get(PINPANCLUB_API.activeMatchesAll),
        axios.get(`${PINPANCLUB_API.rankings}?limit=10`),
        axios.get(`${PINPANCLUB_API.tournaments}?status=registration&limit=5`),
        axios.get(`${PINPANCLUB_API.matches}?status=finished&limit=5`)
      ]);
      
      setActiveMatches(matchesRes.data);
      setRankings(rankingsRes.data);
      setUpcomingTournaments(tournamentsRes.data);
      setRecentMatches(recentRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMatches = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pinpanclub/matches/active/all`);
      setActiveMatches(response.data);
    } catch (error) {
      console.error('Error fetching active matches:', error);
    }
  };

  const fetchRapidPinActivity = async () => {
    try {
      // Get active seasons
      const seasonsRes = await axios.get(`${API_BASE}/rapidpin/seasons?active_only=true`);
      if (seasonsRes.data && seasonsRes.data.length > 0) {
        const activeSeason = seasonsRes.data[0];
        // Get recent matches for this season
        const matchesRes = await axios.get(`${API_BASE}/rapidpin/seasons/${activeSeason.season_id}/matches?limit=5`);
        setRapidPinData({
          season: activeSeason,
          matches: matchesRes.data || []
        });
        
        // Get pending matches count for current user
        if (currentUserId) {
          const pendingRes = await axios.get(`${API_BASE}/rapidpin/seasons/${activeSeason.season_id}/pending/${currentUserId}`);
          setRapidPinPendingCount(pendingRes.data?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching Rapid Pin activity:', error);
    }
  };

  // Quick Stats
  const QuickStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { icon: Play, count: activeMatches.length, label: 'Live Matches', color: '#C8102E' },
        { icon: Users, count: rankings.length, label: 'Active Players', color: '#8b7355' },
        { icon: Trophy, count: upcomingTournaments.length, label: 'Tournaments', color: '#B8860B' },
        { icon: Target, count: recentMatches.length, label: 'Recent Matches', color: '#2d2217' },
      ].map(({ icon: Icon, count, label, color }) => (
        <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'linear-gradient(145deg, #FBF7F0, #F5EDE0)', border: '1px solid rgba(139,115,85,0.12)' }}>
          <Icon className="h-6 w-6 mx-auto mb-1.5" style={{ color }} />
          <div className="text-xl font-bold" style={{ color: '#2d2217' }}>{count}</div>
          <div className="text-[10px] font-medium" style={{ color: '#8b7355' }}>{label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={isInsideAdmin ? "" : "min-h-screen overflow-x-hidden"} style={{ background: isInsideAdmin ? 'transparent' : 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header - Only show if NOT inside admin */}
      {!isInsideAdmin && (
        <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'rgba(251,247,240,0.95)', borderColor: 'rgba(139,115,85,0.12)' }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏓</span>
                <h1 className="font-bold text-lg" style={{ color: '#2d2217' }}>PinpanClub</h1>
              </div>
              <div className="flex items-center gap-2">
                {currentUserId && (
                  <NotificationCenter 
                    userId={currentUserId} 
                    mode="both"
                  />
                )}
              </div>
            </div>
            {/* Scrollable nav buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                <Button variant="default" size="sm" onClick={() => navigate('/pinpanclub/competitions')}
                  className="text-white rounded-full text-xs shrink-0" style={{ background: '#B8860B' }}>
                  <Trophy className="h-3.5 w-3.5 mr-1" /> Competitions
                </Button>
                <Button variant="default" size="sm" onClick={() => navigate('/pinpanclub/hall-of-fame')}
                  className="text-white rounded-full text-xs shrink-0" style={{ background: '#8b7355' }}>
                  <Award className="h-3.5 w-3.5 mr-1" /> Hall of Fame
                </Button>
                {/* Configuration Menu - Only for admins/moderators */}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/pinpanclub/analytics')}>
                        <BarChart3 className="h-4 w-4 mr-2 text-indigo-500" />
                        Analytics Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/pinpanclub/referee-settings')}>
                        <Scale className="h-4 w-4 mr-2 text-purple-500" />
                        Referee Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/pinpanclub/monday')}>
                        <img 
                          src="https://cdn.monday.com/images/logos/monday_logo_icon.png" 
                          alt="Monday.com" 
                          className="h-4 w-4 mr-2"
                        />
                        Monday.com
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/pinpanclub/sponsors')}>
                        <Image className="h-4 w-4 mr-2" />
                        Sponsors
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/tv/pinpanclub')}>
                        <Eye className="h-4 w-4 mr-2" />
                        TV View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/canvas')}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Canvas
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* New Match button - Only for authenticated users */}
                {isAuthenticated && (
                  <Button size="sm" onClick={() => navigate('/pinpanclub/match/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Partido
                  </Button>
                )}
            </div>
          </div>
        </header>
      )}

      {/* Quick Actions Bar - Solo dentro del admin */}
      {isInsideAdmin && (
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/pinpanclub/arena')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            data-testid="admin-arena-btn"
          >
            <Swords className="h-4 w-4 mr-2" />
            Arena
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/pinpanclub/hall-of-fame')}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            data-testid="admin-hof-btn"
          >
            <Award className="h-4 w-4 mr-2" />
            Hall of Fame
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pinpanclub/competitions')}>
            <Trophy className="h-4 w-4 mr-2" />
            Competitions
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pinpanclub/monday')}>
            <img 
              src="https://cdn.monday.com/images/logos/monday_logo_icon.png" 
              alt="Monday.com" 
              className="h-4 w-4 mr-2"
            />
            Monday.com
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pinpanclub/sponsors')}>
            <Image className="h-4 w-4 mr-2" />
            Patrocinadores
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/tv/pinpanclub', '_blank')}>
            <Eye className="h-4 w-4 mr-2" />
            Vista TV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/canvas', '_blank')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Canvas
          </Button>
          <Button size="sm" onClick={() => navigate('/pinpanclub/match/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Partido
          </Button>
        </div>
      )}

      <main className={isInsideAdmin ? "space-y-6" : "px-4 py-6 space-y-6 max-w-2xl mx-auto"}>
        {/* Quick Stats */}
        <QuickStats />

        {/* Rapid Pin Activity Leaderboard */}
        {rapidPinData.season && (
          <section>
            <Card className="bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-yellow-500/20 rounded-xl shrink-0">
                      <Zap className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-white truncate">
                        Rapid Pin — {rapidPinData.season.nombre || rapidPinData.season.name}
                      </h2>
                      <p className="text-orange-200 text-xs">Actividad reciente</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" size="sm"
                    className="border-white/30 text-white hover:bg-white/10 shrink-0 text-xs"
                    onClick={() => navigate(`/pinpanclub/rapidpin/season/${rapidPinData.season.season_id}`)}
                  >
                    <Trophy className="h-3 w-3 mr-1" />
                    Ranking
                  </Button>
                </div>

                {rapidPinData.matches.length === 0 ? (
                  <div className="text-center py-6 text-orange-200">
                    <Zap className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>¡Aún no hay partidos! ¿Echamos un Rapid Pin?</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rapidPinData.matches.slice(0, 5).map((match) => {
                      const isPlayerAWinner = match.winner_id === match.player_a_id;
                      return (
                        <div 
                          key={match.match_id}
                          className={`p-3 rounded-lg ${
                            match.status === 'validated' 
                              ? 'bg-green-500/10 border border-green-500/20' 
                              : 'bg-yellow-500/10 border border-yellow-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className={`font-medium text-white text-sm truncate ${isPlayerAWinner ? 'text-green-400' : ''}`}>
                                {match.player_a_info?.nickname || match.player_a_info?.nombre || '?'}
                              </span>
                              <span className="text-orange-300 text-xs">vs</span>
                              <span className={`font-medium text-white text-sm truncate ${!isPlayerAWinner ? 'text-green-400' : ''}`}>
                                {match.player_b_info?.nickname || match.player_b_info?.nombre || '?'}
                              </span>
                              <Badge variant="outline" className="text-orange-200 border-orange-500/30 text-[10px] shrink-0">
                                <Scale className="w-3 h-3 mr-0.5" />
                                {match.referee_info?.nickname || match.referee_info?.nombre || '?'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-white text-sm">
                                {isPlayerAWinner 
                                  ? `${match.score_winner}-${match.score_loser}`
                                  : `${match.score_loser}-${match.score_winner}`
                                }
                              </span>
                              {match.status === 'validated' ? (
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">
                                  <Check className="w-3 h-3 mr-0.5" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]">
                                  <Clock className="w-3 h-3 mr-0.5" />
                                  Pend.
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center gap-4 text-xs text-orange-200 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      {rapidPinData.season.total_matches || 0} partidos
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {rapidPinData.season.total_players || 0} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" />
                      {rapidPinData.season.total_referees || 0} árbitros
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => navigate('/pinpanclub/rapidpin')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar Partido
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Weekly Challenges Section */}
        {currentUserId && (
          <section>
            <Card className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Target className="h-8 w-8 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🎯 Retos Semanales
                      </h2>
                      <p className="text-purple-200 text-sm">Completa retos y gana puntos extra</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => navigate('/pinpanclub/challenges')}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Ver Todos
                  </Button>
                </div>
                
                {/* Compact Weekly Challenges Preview */}
                <WeeklyChallengesPreview playerId={currentUserId} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Live Matches */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              Partidos en Vivo
            </h2>
            {activeMatches.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub/live')}>
                Ver todos
              </Button>
            )}
          </div>
          
          {activeMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No hay partidos en vivo</p>
              <Button className="mt-4" onClick={() => navigate('/pinpanclub/match/new')}>
                Iniciar un Partido
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatches.map((match) => (
                <div key={match.match_id} className="relative">
                  <ScoreBoard match={match} size="medium" showStats={false} />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => navigate(`/pinpanclub/live/${match.match_id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/pinpanclub/arbiter/${match.match_id}`)}
                    >
                      <Gavel className="h-4 w-4 mr-1" />
                      Arbitrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rankings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" />
              Ranking
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub/rankings')}>
              Ver completo
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {rankings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No players in the ranking yet aún
                </div>
              ) : (
                <div className="divide-y">
                  {rankings.slice(0, 5).map((player, idx) => (
                    <div 
                      key={player.player_id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/pingpong/player/${player.player_id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </div>
                        {player.foto_url ? (
                          <img 
                            src={player.foto_url} 
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-lg">🏓</span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">
                            {player.nickname || player.name} {player.apellido}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.matches_won}V - {player.matches_lost}D
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{player.elo_rating}</div>
                        <div className="text-xs text-muted-foreground">ELO</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Upcoming Tournaments */}
        {upcomingTournaments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Torneos Próximos
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub/arena')}>
                Ver todos
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTournaments.map((tournament) => (
                <Card 
                  key={tournament.torneo_id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/pingpong/tournament/${tournament.torneo_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge>{tournament.formato?.replace('_', ' ')}</Badge>
                      <Badge variant="outline">{tournament.tipo_partido}</Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{tournament.nombre}</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(tournament.start_date).toLocaleDateString('es-PA', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {tournament.participantes?.length || 0} / {tournament.max_participantes || '∞'} inscritos
                      </div>
                    </div>
                    <Button className="w-full mt-4" size="sm">
                      Inscribirse
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Partidos Recientes
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub/matches')}>
                Ver historial
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0 divide-y">
                {recentMatches.map((match) => {
                  const playerA = match.player_a_info;
                  const playerB = match.player_b_info;
                  const ganadorA = match.winner_id === match.player_a_id;
                  
                  return (
                    <div 
                      key={match.match_id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/pingpong/match/${match.match_id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`font-semibold ${ganadorA ? 'text-green-600' : ''}`}>
                          {playerA?.nickname || playerA?.nombre || 'Jugador A'}
                          {ganadorA && ' 🏆'}
                        </div>
                        <div className="text-muted-foreground">vs</div>
                        <div className={`font-semibold ${!ganadorA ? 'text-green-600' : ''}`}>
                          {!ganadorA && '🏆 '}
                          {playerB?.nickname || playerB?.nombre || 'Jugador B'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">
                          {match.sets_player_a} - {match.sets_player_b}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(match.end_date || match.created_at).toLocaleDateString('es-PA')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

// Compact Weekly Challenges Preview for Dashboard
function WeeklyChallengesPreview({ playerId }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/pinpanclub/challenges/weekly`);
        if (response.data) {
          setChallenges(response.data.challenges?.slice(0, 3) || []);
        }
      } catch (error) {
        console.error('Error fetching challenges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-4 text-purple-200">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay retos esta semana</p>
      </div>
    );
  }

  const difficultyColors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-orange-500',
    extreme: 'bg-red-500'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {challenges.map((challenge) => (
        <div 
          key={challenge.challenge_id}
          className="bg-white/10 rounded-lg p-3 hover:bg-white/15 transition-colors cursor-pointer"
          onClick={() => navigate('/pinpanclub/challenges')}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{challenge.icon || '🎯'}</span>
            <div className={`w-2 h-2 rounded-full ${difficultyColors[challenge.difficulty] || 'bg-gray-500'}`} />
          </div>
          <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">
            {challenge.name}
          </h4>
          <p className="text-purple-200 text-xs line-clamp-2">
            {challenge.description}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-yellow-400 text-xs font-bold">
              +{challenge.points_reward} pts
            </span>
            <Badge variant="outline" className="text-purple-200 border-purple-500/30 text-xs">
              {challenge.target_value} objetivo
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
