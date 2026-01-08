/**
 * Ping Pong Dashboard - Página principal del módulo
 * Muestra partidos en vivo, rankings, torneos
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  CalendarDays
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ScoreBoard from '../components/ScoreBoard';
import { PINPANCLUB_API } from '../config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeMatches, setActiveMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  
  // Detectar si estamos dentro del admin panel
  const isInsideAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    fetchDashboardData();
    
    // Poll for active matches every 5 seconds
    const interval = setInterval(fetchActiveMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [matchesRes, rankingsRes, tournamentsRes, recentRes] = await Promise.all([
        axios.get(PINPANCLUB_API.activeMatchesAll),
        axios.get(`${PINPANCLUB_API.rankings}?limit=10`),
        axios.get(`${PINPANCLUB_API.tournaments}?estado=inscripcion&limit=5`),
        axios.get(`${PINPANCLUB_API.matches}?estado=finalizado&limit=5`)
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
      const response = await axios.get(`${API_URL}/api/pingpong/matches/active/all`);
      setActiveMatches(response.data);
    } catch (error) {
      console.error('Error fetching active matches:', error);
    }
  };

  // Quick Stats
  const QuickStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 text-center">
          <Play className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold">{activeMatches.length}</div>
          <div className="text-sm text-muted-foreground">Partidos en Vivo</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold">{rankings.length}</div>
          <div className="text-sm text-muted-foreground">Jugadores Activos</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <div className="text-2xl font-bold">{upcomingTournaments.length}</div>
          <div className="text-sm text-muted-foreground">Torneos Próximos</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold">{recentMatches.length}</div>
          <div className="text-sm text-muted-foreground">Partidos Recientes</div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={isInsideAdmin ? "" : "min-h-screen bg-background"}>
      {/* Header - Solo mostrar si NO estamos dentro del admin */}
      {!isInsideAdmin && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/" className="text-muted-foreground hover:text-foreground">
                  ← Inicio
                </Link>
                <span className="text-2xl">🏓</span>
                <h1 className="font-bold text-xl">PinpanClub</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/players')}>
                  <Users className="h-4 w-4 mr-2" />
                  Jugadores
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/tournaments')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Torneos
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configuración
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/pingpong/monday')}>
                      <img 
                        src="https://cdn.monday.com/images/logos/monday_logo_icon.png" 
                        alt="Monday.com" 
                        className="h-4 w-4 mr-2"
                      />
                      Monday.com
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pingpong/sponsors')}>
                      <Image className="h-4 w-4 mr-2" />
                      Patrocinadores
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/tv/pingpong')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Vista TV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/canvas')}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Canvas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={() => navigate('/pingpong/match/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Partido
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Quick Actions Bar - Solo dentro del admin */}
      {isInsideAdmin && (
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b">
          <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/players')}>
            <Users className="h-4 w-4 mr-2" />
            Jugadores
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/tournaments')}>
            <Trophy className="h-4 w-4 mr-2" />
            Torneos
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/monday')}>
            <img 
              src="https://cdn.monday.com/images/logos/monday_logo_icon.png" 
              alt="Monday.com" 
              className="h-4 w-4 mr-2"
            />
            Monday.com
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pingpong/sponsors')}>
            <Image className="h-4 w-4 mr-2" />
            Patrocinadores
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/tv/pingpong', '_blank')}>
            <Eye className="h-4 w-4 mr-2" />
            Vista TV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/canvas', '_blank')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Canvas
          </Button>
          <Button size="sm" onClick={() => navigate('/pingpong/match/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Partido
          </Button>
        </div>
      )}

      <main className={isInsideAdmin ? "space-y-6" : "container mx-auto px-4 py-8 space-y-8"}>
        {/* Quick Stats */}
        <QuickStats />

        {/* Live Matches */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              Partidos en Vivo
            </h2>
            {activeMatches.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/pingpong/live')}>
                Ver todos
              </Button>
            )}
          </div>
          
          {activeMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No hay partidos en vivo</p>
              <Button className="mt-4" onClick={() => navigate('/pingpong/match/new')}>
                Iniciar un Partido
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatches.map((match) => (
                <div key={match.partido_id} className="relative">
                  <ScoreBoard match={match} size="medium" showStats={false} />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => navigate(`/pingpong/spectator/${match.partido_id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/pingpong/arbiter/${match.partido_id}`)}
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/pingpong/rankings')}>
              Ver completo
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {rankings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay jugadores en el ranking aún
                </div>
              ) : (
                <div className="divide-y">
                  {rankings.slice(0, 5).map((player, idx) => (
                    <div 
                      key={player.jugador_id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/pingpong/player/${player.jugador_id}`)}
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
                            alt={player.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-lg">🏓</span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">
                            {player.apodo || player.nombre} {player.apellido}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.partidos_ganados}V - {player.partidos_perdidos}D
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/pingpong/tournaments')}>
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
                        {new Date(tournament.fecha_inicio).toLocaleDateString('es-PA', {
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/pingpong/matches')}>
                Ver historial
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0 divide-y">
                {recentMatches.map((match) => {
                  const playerA = match.jugador_a_info;
                  const playerB = match.jugador_b_info;
                  const ganadorA = match.ganador_id === match.jugador_a_id;
                  
                  return (
                    <div 
                      key={match.partido_id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/pingpong/match/${match.partido_id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`font-semibold ${ganadorA ? 'text-green-600' : ''}`}>
                          {playerA?.apodo || playerA?.nombre || 'Jugador A'}
                          {ganadorA && ' 🏆'}
                        </div>
                        <div className="text-muted-foreground">vs</div>
                        <div className={`font-semibold ${!ganadorA ? 'text-green-600' : ''}`}>
                          {!ganadorA && '🏆 '}
                          {playerB?.apodo || playerB?.nombre || 'Jugador B'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">
                          {match.sets_jugador_a} - {match.sets_jugador_b}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(match.fecha_fin || match.fecha_creacion).toLocaleDateString('es-PA')}
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
