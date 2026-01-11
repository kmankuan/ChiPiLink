/**
 * Rapid Pin - Página Pública Exclusiva
 * Feed de actividad, partidos en cola esperando árbitro, ranking
 * Sistema de desafíos jugador vs jugador
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, Trophy, Users, Clock, ChevronRight, Play, 
  RefreshCw, AlertCircle, CheckCircle2, Scale,
  ArrowRight, Loader2, Hand, Swords, Search, X,
  Send, Inbox, Check, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

export default function RapidPinPublicPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedData, setFeedData] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  
  // Challenge system state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [players, setPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [sendingChallenge, setSendingChallenge] = useState(false);
  
  // My challenges state
  const [myChallenges, setMyChallenges] = useState({ sent: [], received: [], total: 0 });
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [processingChallengeId, setProcessingChallengeId] = useState(null);

  // Get current user's player ID
  const currentPlayerId = user?.cliente_id || user?.user_id;

  useEffect(() => {
    fetchFeed();
    if (isAuthenticated && currentPlayerId) {
      fetchMyChallenges();
    }
  }, [isAuthenticated, currentPlayerId]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/pinpanclub/rapidpin/public/feed`);
      if (response.ok) {
        const data = await response.json();
        setFeedData(data);
      }
    } catch (error) {
      console.error('Error fetching Rapid Pin feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyChallenges = async () => {
    if (!currentPlayerId) return;
    
    try {
      setLoadingChallenges(true);
      const response = await fetch(`${API_BASE}/api/pinpanclub/rapidpin/my-challenges/${currentPlayerId}`);
      if (response.ok) {
        const data = await response.json();
        setMyChallenges(data);
      }
    } catch (error) {
      console.error('Error fetching my challenges:', error);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const fetchPlayers = async (search = '') => {
    try {
      setLoadingPlayers(true);
      const url = search 
        ? `${API_BASE}/api/pinpanclub/players?search=${encodeURIComponent(search)}&limit=50`
        : `${API_BASE}/api/pinpanclub/players?limit=50`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user - normalize player fields
        const normalizedPlayers = data.map(p => ({
          ...p,
          player_id: p.jugador_id || p.player_id,
          nickname: p.apodo || p.nickname,
          avatar: p.foto_url || p.avatar,
          elo: p.elo_rating || p.elo
        }));
        setPlayers(normalizedPlayers.filter(p => p.player_id !== currentPlayerId));
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleOpenChallengeModal = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para desafiar');
      navigate('/login');
      return;
    }
    setShowChallengeModal(true);
    fetchPlayers();
  };

  const handleSendChallenge = async () => {
    if (!selectedOpponent || !feedData?.active_season?.season_id) {
      toast.error('Selecciona un oponente');
      return;
    }

    setSendingChallenge(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/pinpanclub/rapidpin/challenge?season_id=${feedData.active_season.season_id}&challenger_id=${currentPlayerId}&opponent_id=${selectedOpponent.player_id}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        toast.success(`¡Desafío enviado a ${selectedOpponent.nickname || selectedOpponent.nombre}!`);
        setShowChallengeModal(false);
        setSelectedOpponent(null);
        setSearchQuery('');
        fetchMyChallenges();
        fetchFeed();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al enviar desafío');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSendingChallenge(false);
    }
  };

  const handleAcceptChallenge = async (queueId) => {
    setProcessingChallengeId(queueId);
    try {
      const response = await fetch(
        `${API_BASE}/api/pinpanclub/rapidpin/challenge/${queueId}/accept?user_id=${currentPlayerId}&user_role=player`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        toast.success('¡Desafío aceptado! Esperando árbitro...');
        fetchMyChallenges();
        fetchFeed();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al aceptar desafío');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setProcessingChallengeId(null);
    }
  };

  const handleDeclineChallenge = async (queueId) => {
    setProcessingChallengeId(queueId);
    try {
      const response = await fetch(
        `${API_BASE}/api/pinpanclub/rapidpin/challenge/${queueId}/decline?user_id=${currentPlayerId}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        toast.success('Desafío rechazado');
        fetchMyChallenges();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al rechazar desafío');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setProcessingChallengeId(null);
    }
  };

  const handleAssignReferee = async (queueId) => {
    if (!isAuthenticated || !user) {
      toast.error('Debes iniciar sesión para ser árbitro');
      navigate('/login');
      return;
    }

    const userId = user.cliente_id || user.user_id;
    if (!userId) {
      toast.error('Error al obtener tu ID de usuario');
      return;
    }

    setAssigningId(queueId);
    try {
      const response = await fetch(
        `${API_BASE}/api/pinpanclub/rapidpin/queue/${queueId}/assign?referee_id=${userId}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        toast.success('¡Te has asignado como árbitro!');
        fetchFeed(); // Refresh
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al asignarse como árbitro');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setAssigningId(null);
    }
  };

  // Filtered players for search - must be before conditional returns
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(p => 
      (p.nombre?.toLowerCase().includes(query)) ||
      (p.nickname?.toLowerCase().includes(query))
    );
  }, [players, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const { stats, active_season, recent_matches, top_players, waiting_for_referee, in_progress, pending_challenges, scoring_rules } = feedData || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background dark:from-orange-950/20 dark:to-background">
        {/* Challenge Modal */}
        <Dialog open={showChallengeModal} onOpenChange={setShowChallengeModal}>
          <DialogContent className="sm:max-w-md" data-testid="challenge-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-orange-500" />
                我要挑战 - Desafiar
              </DialogTitle>
              <DialogDescription>
                Selecciona un oponente para desafiarlo a un partido Rapid Pin
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar jugador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="player-search-input"
                />
              </div>

              {/* Selected opponent */}
              {selectedOpponent && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-300">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-orange-500">
                      <AvatarImage src={selectedOpponent.avatar} />
                      <AvatarFallback>{selectedOpponent.nombre?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedOpponent.nickname || selectedOpponent.nombre}</p>
                      {selectedOpponent.nickname && (
                        <p className="text-xs text-muted-foreground">{selectedOpponent.nombre}</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedOpponent(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Player list */}
              {!selectedOpponent && (
                <ScrollArea className="h-[250px] border rounded-lg">
                  {loadingPlayers ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                  ) : filteredPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                      <Users className="h-8 w-8 mb-2 opacity-50" />
                      <p>No se encontraron jugadores</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredPlayers.map((player) => (
                        <button
                          key={player.player_id}
                          onClick={() => setSelectedOpponent(player)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                          data-testid={`player-option-${player.player_id}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={player.avatar} />
                            <AvatarFallback>{player.nombre?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {player.nickname || player.nombre}
                            </p>
                            {player.nickname && (
                              <p className="text-xs text-muted-foreground">{player.nombre}</p>
                            )}
                          </div>
                          {player.elo && (
                            <Badge variant="outline" className="ml-auto">
                              ELO {player.elo}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowChallengeModal(false);
                  setSelectedOpponent(null);
                  setSearchQuery('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendChallenge}
                disabled={!selectedOpponent || sendingChallenge}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="send-challenge-btn"
              >
                {sendingChallenge ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Desafío
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-10 w-10" />
                  <h1 className="text-4xl font-bold">Rapid Pin</h1>
                </div>
                <p className="text-orange-100 text-lg">
                  Partidos relámpago • 2 jugadores + 1 árbitro
                </p>
              </div>
              
              {/* Main Challenge Button */}
              {isAuthenticated && active_season && (
                <Button
                  onClick={handleOpenChallengeModal}
                  size="lg"
                  className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg text-lg px-6 py-6"
                  data-testid="main-challenge-btn"
                >
                  <Swords className="h-6 w-6 mr-2" />
                  我要挑战
                </Button>
              )}

              <div className="hidden md:flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats?.total_matches || 0}</p>
                  <p className="text-orange-100 text-sm">Partidos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{top_players?.length || 0}</p>
                  <p className="text-orange-100 text-sm">Jugadores</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{waiting_for_referee?.length || 0}</p>
                  <p className="text-orange-100 text-sm">En cola</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* My Challenges Section - Only for authenticated users */}
          {isAuthenticated && (myChallenges.sent.length > 0 || myChallenges.received.length > 0) && (
            <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800" data-testid="my-challenges-section">
              <CardHeader className="bg-purple-50 dark:bg-purple-950/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <Swords className="h-5 w-5" />
                    Mis Desafíos
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchMyChallenges} disabled={loadingChallenges}>
                    <RefreshCw className={`h-4 w-4 ${loadingChallenges ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs defaultValue="received" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="received" className="flex items-center gap-2">
                      <Inbox className="h-4 w-4" />
                      Recibidos ({myChallenges.received.length})
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviados ({myChallenges.sent.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Received Challenges */}
                  <TabsContent value="received">
                    {myChallenges.received.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No tienes desafíos pendientes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myChallenges.received.map((challenge) => (
                          <div 
                            key={challenge.queue_id}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-800"
                            data-testid={`received-challenge-${challenge.queue_id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-purple-400">
                                <AvatarImage src={challenge.player1_info?.avatar} />
                                <AvatarFallback>{challenge.player1_info?.nombre?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {challenge.player1_info?.nickname || challenge.player1_info?.nombre || 'Retador'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Te ha desafiado
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDeclineChallenge(challenge.queue_id)}
                                disabled={processingChallengeId === challenge.queue_id}
                                data-testid={`decline-btn-${challenge.queue_id}`}
                              >
                                {processingChallengeId === challenge.queue_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rechazar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleAcceptChallenge(challenge.queue_id)}
                                disabled={processingChallengeId === challenge.queue_id}
                                data-testid={`accept-btn-${challenge.queue_id}`}
                              >
                                {processingChallengeId === challenge.queue_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Aceptar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Sent Challenges */}
                  <TabsContent value="sent">
                    {myChallenges.sent.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No has enviado desafíos</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myChallenges.sent.map((challenge) => (
                          <div 
                            key={challenge.queue_id}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border border-blue-200 dark:border-blue-800"
                            data-testid={`sent-challenge-${challenge.queue_id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-blue-400">
                                <AvatarImage src={challenge.player2_info?.avatar} />
                                <AvatarFallback>{challenge.player2_info?.nombre?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {challenge.player2_info?.nickname || challenge.player2_info?.nombre || 'Oponente'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Esperando respuesta...
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Active Season Banner */}
          {active_season && (
            <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-orange-500">Temporada Activa</Badge>
                    <span className="font-semibold">{active_season.nombre}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/pinpanclub/rapidpin/season/${active_season.season_id}`)}
                  >
                    Ver detalles
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Queue & In Progress */}
            <div className="lg:col-span-2 space-y-6">
              {/* Waiting for Referee Section */}
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardHeader className="bg-orange-50 dark:bg-orange-950/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Hand className="h-5 w-5" />
                      Partidos Esperando Árbitro
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchFeed}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    ¡Ofrécete como árbitro y gana {scoring_rules?.referee || 2} puntos!
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {waiting_for_referee?.length > 0 ? (
                    <div className="space-y-3">
                      {waiting_for_referee.map((queue) => (
                        <div 
                          key={queue.queue_id}
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 border border-orange-200 dark:border-orange-800"
                        >
                          <div className="flex items-center gap-4">
                            {/* Player 1 */}
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10 ring-2 ring-orange-400">
                                <AvatarImage src={queue.player1_info?.avatar} />
                                <AvatarFallback>{queue.player1_info?.nombre?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {queue.player1_info?.nickname || queue.player1_info?.nombre || 'Jugador 1'}
                              </span>
                            </div>
                            
                            <span className="text-orange-500 font-bold">VS</span>
                            
                            {/* Player 2 */}
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10 ring-2 ring-orange-400">
                                <AvatarImage src={queue.player2_info?.avatar} />
                                <AvatarFallback>{queue.player2_info?.nombre?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {queue.player2_info?.nickname || queue.player2_info?.nombre || 'Jugador 2'}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleAssignReferee(queue.queue_id)}
                            disabled={assigningId === queue.queue_id}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {assigningId === queue.queue_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Scale className="h-4 w-4 mr-2" />
                                Ser Árbitro
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay partidos esperando árbitro</p>
                      {isAuthenticated && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate('/pinpanclub/rapidpin')}
                        >
                          Crear partido
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* In Progress Section */}
              {in_progress?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <Play className="h-5 w-5" />
                      Partidos en Progreso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {in_progress.map((queue) => (
                        <div 
                          key={queue.queue_id}
                          className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={queue.player1_info?.avatar} />
                              <AvatarFallback>{queue.player1_info?.nombre?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">vs</span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={queue.player2_info?.avatar} />
                              <AvatarFallback>{queue.player2_info?.nombre?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{queue.referee_info?.nickname || 'Árbitro'}</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              En juego
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Matches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-orange-500" />
                    Partidos Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recent_matches?.length > 0 ? (
                    <div className="space-y-3">
                      {recent_matches.map((match, idx) => (
                        <div 
                          key={match.match_id || idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={match.jugador_a_info?.avatar} />
                              <AvatarFallback>{match.jugador_a_info?.nombre?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className={`text-sm font-medium ${match.ganador_id === match.jugador_a_id ? 'text-green-600' : ''}`}>
                              {match.jugador_a_info?.nickname || match.jugador_a_info?.nombre}
                            </span>
                          </div>
                          <Badge className="bg-orange-500 text-white">
                            {match.score_ganador}-{match.score_perdedor}
                          </Badge>
                          <div className="flex items-center gap-3 flex-1 justify-end">
                            <span className={`text-sm font-medium ${match.ganador_id === match.jugador_b_id ? 'text-green-600' : ''}`}>
                              {match.jugador_b_info?.nickname || match.jugador_b_info?.nombre}
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={match.jugador_b_info?.avatar} />
                              <AvatarFallback>{match.jugador_b_info?.nombre?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No hay partidos recientes</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Ranking & Rules */}
            <div className="space-y-6">
              {/* Top Players */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    Top Jugadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {top_players?.length > 0 ? (
                    <div className="space-y-2">
                      {top_players.slice(0, 10).map((player, idx) => (
                        <div 
                          key={player.ranking_id || idx}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 text-center font-bold ${
                              idx === 0 ? 'text-yellow-500' :
                              idx === 1 ? 'text-gray-400' :
                              idx === 2 ? 'text-amber-600' : 'text-muted-foreground'
                            }`}>
                              {idx + 1}
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.jugador_info?.avatar} />
                              <AvatarFallback>{player.jugador_info?.nombre?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {player.jugador_info?.nickname || player.jugador_info?.nombre}
                            </span>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {player.puntos_totales} pts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">Sin datos de ranking</p>
                  )}
                  
                  {active_season && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4"
                      onClick={() => navigate(`/pinpanclub/rapidpin/season/${active_season.season_id}`)}
                    >
                      Ver ranking completo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Scoring Rules */}
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Zap className="h-5 w-5" />
                    Sistema de Puntos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Victoria</span>
                    </div>
                    <Badge className="bg-green-500">+{scoring_rules?.victory || 3} pts</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span>Derrota</span>
                    </div>
                    <Badge className="bg-red-500">+{scoring_rules?.defeat || 1} pt</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-blue-500" />
                      <span>Arbitrar</span>
                    </div>
                    <Badge className="bg-blue-500">+{scoring_rules?.referee || 2} pts</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              {isAuthenticated ? (
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  size="lg"
                  onClick={() => navigate('/pinpanclub/rapidpin')}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Ir a Rapid Pin Dashboard
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Iniciar sesión para participar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
