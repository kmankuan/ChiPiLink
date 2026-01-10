/**
 * Rapid Pin - Vista de Temporada
 * Muestra ranking, partidos pendientes y permite registrar partidos
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Zap, ArrowLeft, Plus, Trophy, Users, Clock, Check, 
  AlertCircle, ChevronDown, Calendar, Award, Scale, Lock, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API_BASE } from '../../config/api';

export default function RapidPinSeason() {
  const { t } = useTranslation();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  
  const [season, setSeason] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [refereeRanking, setRefereeRanking] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [showCloseSeason, setShowCloseSeason] = useState(false);
  const [closingResults, setClosingResults] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [newMatch, setNewMatch] = useState({
    jugador_a_id: '',
    jugador_b_id: '',
    arbitro_id: '',
    ganador_id: '',
    score_ganador: 11,
    score_perdedor: 0
  });

  useEffect(() => {
    // Get current user from localStorage
    const authData = localStorage.getItem('chipi_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setCurrentUserId(parsed.user?.user_id);
    }
    
    fetchData();
  }, [seasonId]);

  const fetchData = async () => {
    try {
      // Fetch season info
      const seasonRes = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}`);
      if (seasonRes.ok) {
        const seasonData = await seasonRes.json();
        setSeason(seasonData);
      }

      // Fetch ranking
      const rankingRes = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}/ranking`);
      if (rankingRes.ok) {
        const rankingData = await rankingRes.json();
        setRanking(rankingData.entries || []);
      }

      // Fetch referee ranking
      const refRankingRes = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}/ranking/referees`);
      if (refRankingRes.ok) {
        const refData = await refRankingRes.json();
        setRefereeRanking(refData || []);
      }

      // Fetch matches
      const matchesRes = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}/matches?limit=30`);
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setMatches(matchesData || []);
      }

      // Fetch players for selection
      const playersRes = await fetch(`${API_BASE}/players`);
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData || []);
      }

      // Fetch pending matches for current user
      if (currentUserId) {
        const pendingRes = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}/pending/${currentUserId}`);
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingMatches(pendingData.pending_matches || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const registerMatch = async () => {
    // Validations
    if (!newMatch.jugador_a_id || !newMatch.jugador_b_id || !newMatch.arbitro_id || !newMatch.ganador_id) {
      toast.error(t('rapidpin.matches.fieldsRequired'));
      return;
    }

    const participants = new Set([newMatch.jugador_a_id, newMatch.jugador_b_id, newMatch.arbitro_id]);
    if (participants.size !== 3) {
      toast.error(t('rapidpin.matches.differentParticipants'));
      return;
    }

    if (newMatch.ganador_id !== newMatch.jugador_a_id && newMatch.ganador_id !== newMatch.jugador_b_id) {
      toast.error(t('rapidpin.matches.winnerMustBePlayer'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/rapidpin/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: seasonId,
          ...newMatch,
          registrado_por_id: currentUserId || newMatch.jugador_a_id
        })
      });

      if (response.ok) {
        toast.success(t('rapidpin.matches.registered'));
        setShowNewMatch(false);
        setNewMatch({
          jugador_a_id: '',
          jugador_b_id: '',
          arbitro_id: '',
          ganador_id: '',
          score_ganador: 11,
          score_perdedor: 0
        });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || t('common.error'));
      }
    } catch (error) {
      console.error('Error registering match:', error);
      toast.error(t('common.error'));
    }
  };

  const confirmMatch = async (matchId) => {
    try {
      const response = await fetch(`${API_BASE}/rapidpin/matches/${matchId}/confirm?confirmado_por_id=${currentUserId}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success(t('rapidpin.matches.confirmed'));
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || t('common.error'));
      }
    } catch (error) {
      console.error('Error confirming match:', error);
      toast.error(t('common.error'));
    }
  };

  const getPlayerName = (info) => {
    if (!info) return '?';
    return info.apodo || info.nombre || '?';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p>{t('rapidpin.seasons.notFound')}</p>
          <Button className="mt-4" onClick={() => navigate('/pinpanclub/rapidpin')}>
            {t('common.back')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/pinpanclub/rapidpin')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{season.nombre}</h1>
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(season.fecha_inicio)} - {formatDate(season.fecha_fin)}
                  </span>
                  <Badge variant={season.estado === 'active' ? 'default' : 'secondary'} className="bg-white/20">
                    {t(`rapidpin.seasons.status.${season.estado}`)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {season.estado === 'active' && (
              <Dialog open={showNewMatch} onOpenChange={setShowNewMatch}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-orange-600 hover:bg-white/90" data-testid="new-match-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('rapidpin.matches.register')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('rapidpin.matches.register')}</DialogTitle>
                    <DialogDescription>{t('rapidpin.matches.registerDesc')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('rapidpin.matches.playerA')}</Label>
                        <Select
                          value={newMatch.jugador_a_id}
                          onValueChange={(v) => setNewMatch({ ...newMatch, jugador_a_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('rapidpin.matches.selectPlayer')} />
                          </SelectTrigger>
                          <SelectContent>
                            {players.map((p) => (
                              <SelectItem key={p.jugador_id} value={p.jugador_id}>
                                {p.apodo || p.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('rapidpin.matches.playerB')}</Label>
                        <Select
                          value={newMatch.jugador_b_id}
                          onValueChange={(v) => setNewMatch({ ...newMatch, jugador_b_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('rapidpin.matches.selectPlayer')} />
                          </SelectTrigger>
                          <SelectContent>
                            {players.map((p) => (
                              <SelectItem key={p.jugador_id} value={p.jugador_id}>
                                {p.apodo || p.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>{t('rapidpin.matches.referee')}</Label>
                      <Select
                        value={newMatch.arbitro_id}
                        onValueChange={(v) => setNewMatch({ ...newMatch, arbitro_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('rapidpin.matches.selectReferee')} />
                        </SelectTrigger>
                        <SelectContent>
                          {players.map((p) => (
                            <SelectItem key={p.jugador_id} value={p.jugador_id}>
                              {p.apodo || p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('rapidpin.matches.winner')}</Label>
                      <Select
                        value={newMatch.ganador_id}
                        onValueChange={(v) => setNewMatch({ ...newMatch, ganador_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('rapidpin.matches.selectWinner')} />
                        </SelectTrigger>
                        <SelectContent>
                          {newMatch.jugador_a_id && (
                            <SelectItem value={newMatch.jugador_a_id}>
                              {players.find(p => p.jugador_id === newMatch.jugador_a_id)?.apodo || 
                               players.find(p => p.jugador_id === newMatch.jugador_a_id)?.nombre || 
                               t('rapidpin.matches.playerA')}
                            </SelectItem>
                          )}
                          {newMatch.jugador_b_id && (
                            <SelectItem value={newMatch.jugador_b_id}>
                              {players.find(p => p.jugador_id === newMatch.jugador_b_id)?.apodo || 
                               players.find(p => p.jugador_id === newMatch.jugador_b_id)?.nombre || 
                               t('rapidpin.matches.playerB')}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('rapidpin.matches.winnerScore')}</Label>
                        <Input
                          type="number"
                          value={newMatch.score_ganador}
                          onChange={(e) => setNewMatch({ ...newMatch, score_ganador: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>{t('rapidpin.matches.loserScore')}</Label>
                        <Input
                          type="number"
                          value={newMatch.score_perdedor}
                          onChange={(e) => setNewMatch({ ...newMatch, score_perdedor: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                      <p className="text-yellow-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {t('rapidpin.matches.pendingNote')}
                      </p>
                    </div>

                    <Button onClick={registerMatch} className="w-full" data-testid="submit-match-btn">
                      {t('rapidpin.matches.register')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{season.total_matches || 0}</p>
              <p className="text-xs text-muted-foreground">{t('rapidpin.stats.matches')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{season.total_players || 0}</p>
              <p className="text-xs text-muted-foreground">{t('rapidpin.stats.players')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Scale className="w-6 h-6 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{season.total_referees || 0}</p>
              <p className="text-xs text-muted-foreground">{t('rapidpin.stats.referees')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{pendingMatches.length}</p>
              <p className="text-xs text-muted-foreground">{t('rapidpin.stats.pending')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Confirmations Alert */}
        {pendingMatches.length > 0 && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                {t('rapidpin.matches.pendingConfirmations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingMatches.map((match) => (
                  <div 
                    key={match.match_id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium">{getPlayerName(match.jugador_a_info)}</span>
                        <span className="text-muted-foreground"> vs </span>
                        <span className="font-medium">{getPlayerName(match.jugador_b_info)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Scale className="w-3 h-3 mr-1" />
                        {getPlayerName(match.arbitro_info)}
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => confirmMatch(match.match_id)}
                      data-testid={`confirm-match-${match.match_id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t('rapidpin.matches.confirm')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Rankings & Matches */}
        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranking" data-testid="tab-ranking">
              <Trophy className="w-4 h-4 mr-2" />
              {t('rapidpin.ranking.title')}
            </TabsTrigger>
            <TabsTrigger value="referees" data-testid="tab-referees">
              <Scale className="w-4 h-4 mr-2" />
              {t('rapidpin.ranking.referees')}
            </TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">
              <Zap className="w-4 h-4 mr-2" />
              {t('rapidpin.matches.title')}
            </TabsTrigger>
          </TabsList>

          {/* Player Ranking Tab */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>{t('rapidpin.ranking.players')}</CardTitle>
                <CardDescription>{t('rapidpin.ranking.playersDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {ranking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('rapidpin.ranking.noPlayers')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-muted-foreground">
                          <th className="pb-2 w-12">#</th>
                          <th className="pb-2">{t('rapidpin.ranking.player')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.points')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.played')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.won')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.lost')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.refereed')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((entry, idx) => (
                          <tr key={entry.ranking_id} className="border-b last:border-0">
                            <td className="py-3">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </td>
                            <td className="py-3 font-medium">
                              {getPlayerName(entry.jugador_info)}
                            </td>
                            <td className="py-3 text-center">
                              <span className="font-bold text-yellow-500">{entry.puntos_totales}</span>
                            </td>
                            <td className="py-3 text-center text-muted-foreground">{entry.partidos_jugados}</td>
                            <td className="py-3 text-center text-green-500">{entry.partidos_ganados}</td>
                            <td className="py-3 text-center text-red-500">{entry.partidos_perdidos}</td>
                            <td className="py-3 text-center text-purple-500">{entry.partidos_arbitrados}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referee Ranking Tab */}
          <TabsContent value="referees">
            <Card>
              <CardHeader>
                <CardTitle>{t('rapidpin.ranking.referees')}</CardTitle>
                <CardDescription>{t('rapidpin.ranking.refereesDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {refereeRanking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('rapidpin.ranking.noReferees')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-muted-foreground">
                          <th className="pb-2 w-12">#</th>
                          <th className="pb-2">{t('rapidpin.ranking.referee')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.matchesRefereed')}</th>
                          <th className="pb-2 text-center">{t('rapidpin.ranking.refPoints')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refereeRanking.map((entry, idx) => (
                          <tr key={entry.ranking_id} className="border-b last:border-0">
                            <td className="py-3">
                              {idx === 0 ? '⚖️' : idx + 1}
                            </td>
                            <td className="py-3 font-medium">
                              {getPlayerName(entry.jugador_info)}
                            </td>
                            <td className="py-3 text-center font-bold text-purple-500">
                              {entry.partidos_arbitrados}
                            </td>
                            <td className="py-3 text-center text-muted-foreground">
                              +{entry.puntos_como_arbitro}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>{t('rapidpin.matches.recent')}</CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('rapidpin.matches.noMatches')}</p>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div 
                        key={match.match_id}
                        className={`p-4 rounded-lg border ${
                          match.estado === 'validated' 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : 'bg-yellow-500/5 border-yellow-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className={`font-medium ${match.ganador_id === match.jugador_a_id ? 'text-green-500' : ''}`}>
                                {getPlayerName(match.jugador_a_info)}
                              </span>
                              <span className="text-muted-foreground mx-2">vs</span>
                              <span className={`font-medium ${match.ganador_id === match.jugador_b_id ? 'text-green-500' : ''}`}>
                                {getPlayerName(match.jugador_b_info)}
                              </span>
                            </div>
                            <span className="text-lg font-mono">
                              {match.ganador_id === match.jugador_a_id 
                                ? `${match.score_ganador}-${match.score_perdedor}`
                                : `${match.score_perdedor}-${match.score_ganador}`
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              <Scale className="w-3 h-3 mr-1" />
                              {getPlayerName(match.arbitro_info)}
                            </Badge>
                            <Badge variant={match.estado === 'validated' ? 'default' : 'secondary'}>
                              {match.estado === 'validated' ? (
                                <Check className="w-3 h-3 mr-1" />
                              ) : (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {t(`rapidpin.matches.status.${match.estado}`)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatDate(match.fecha_partido)} {formatTime(match.fecha_partido)}
                        </div>
                      </div>
                    ))}
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
