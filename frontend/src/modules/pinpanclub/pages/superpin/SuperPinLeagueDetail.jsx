/**
 * Super Pin League Detail
 * Detalle de una liga con ranking, partidos y configuración
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy, Users, Target, ArrowLeft, Settings, Play,
  Plus, Medal, TrendingUp, TrendingDown, Minus, Clock, UserPlus, RefreshCw, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import SuperPinCheckIn from './SuperPinCheckIn';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinLeagueDetail() {
  const { t } = useTranslation();
  const { ligaId } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [matches, setMatches] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mondayPlayers, setMondayPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ranking');
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [showCreateTournamentModal, setShowCreateTournamentModal] = useState(false);
  const [playerSource, setPlayerSource] = useState('pinpanclub');
  const [newMatch, setNewMatch] = useState({ player_a_id: '', player_b_id: '' });
  const [loadingMonday, setLoadingMonday] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [newTournament, setNewTournament] = useState({ nombre: '', fecha_inicio: '' });

  useEffect(() => {
    fetchData();
  }, [ligaId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const [leagueRes, rankingRes, matchesRes, playersRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}`),
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/ranking`),
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/matches?limit=20`),
        fetch(`${API_URL}/api/pinpanclub/players`),
        fetch(`${API_URL}/api/auth-v2/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false }))
      ]);

      const leagueData = await leagueRes.json();
      const rankingData = await rankingRes.json();
      const matchesData = await matchesRes.json();
      const playersData = await playersRes.json();
      const usersData = usersRes.ok ? await usersRes.json() : [];

      setLeague(leagueData);
      setRanking(rankingData);
      setMatches(matchesData);
      setAvailablePlayers(playersData);
      setRegisteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMondayPlayers = async () => {
    setLoadingMonday(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pinpanclub/monday/players`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMondayPlayers(data.players || data || []);
      }
    } catch (error) {
      console.error('Error fetching Monday players:', error);
    } finally {
      setLoadingMonday(false);
    }
  };

  const convertUserToPlayer = async (user) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pinpanclub/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: `${user.name} ${user.last_name || ''}`.trim(),
          email: user.email,
          user_id: user.user_id,
          nivel: 'principiante'
        })
      });
      if (response.ok) {
        const newPlayer = await response.json();
        setAvailablePlayers([...availablePlayers, newPlayer]);
        alert(t('superpin.players.addedSuccess', { name: user.name }));
      }
    } catch (error) {
      console.error('Error converting user to player:', error);
    }
  };

  const createMatch = async () => {
    if (!newMatch.player_a_id || !newMatch.player_b_id) return;
    if (newMatch.player_a_id === newMatch.player_b_id) {
      alert(t('superpin.matches.differentPlayers'));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liga_id: ligaId,
          player_a_id: newMatch.player_a_id,
          player_b_id: newMatch.player_b_id,
          match_type: 'ranked'
        })
      });

      if (response.ok) {
        const match = await response.json();
        setShowNewMatchModal(false);
        setNewMatch({ player_a_id: '', player_b_id: '' });
        navigate(`/pinpanclub/superpin/match/${match.partido_id}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  const getPositionChange = (change) => {
    if (change > 0) return <span className="text-green-600 flex items-center"><TrendingUp className="h-4 w-4" /> +{change}</span>;
    if (change < 0) return <span className="text-red-600 flex items-center"><TrendingDown className="h-4 w-4" /> {change}</span>;
    return <span className="text-gray-400 flex items-center"><Minus className="h-4 w-4" /> 0</span>;
  };

  const getStreakBadge = (streak) => {
    if (streak > 0) return <Badge className="bg-green-100 text-green-800">🔥 {streak}W</Badge>;
    if (streak < 0) return <Badge className="bg-red-100 text-red-800">❄️ {Math.abs(streak)}L</Badge>;
    return null;
  };

  const getStatusLabel = (estado) => {
    const statusMap = {
      pendiente: t('superpin.matches.status.pending'),
      en_curso: t('superpin.matches.status.inProgress'),
      finalizado: t('superpin.matches.status.finished')
    };
    return statusMap[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t('superpin.leagues.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              {league.nombre}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('superpin.tournaments.season')} {league.temporada} • {league.scoring_config?.system === 'elo' ? t('superpin.leagues.scoringElo') : t('superpin.leagues.scoringSimple')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowNewMatchModal(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" /> {t('superpin.matches.new')}
            </Button>
            {league.estado === 'active' && ranking?.entries?.length >= 2 && (
              <Button 
                variant="outline" 
                onClick={() => setShowCreateTournamentModal(true)}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                <Trophy className="h-4 w-4 mr-2" /> {t('superpin.tournaments.createTournament')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.players.title')}</p>
              <p className="text-2xl font-bold">{ranking?.total_jugadores || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.matches.title')}</p>
              <p className="text-2xl font-bold">{ranking?.total_partidos || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('status.active')}</p>
              <Badge className={league.estado === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {t(`superpin.leagues.status.${league.estado}`)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={activeTab === 'ranking' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ranking')}
        >
          <Medal className="h-4 w-4 mr-2" /> {t('superpin.ranking.title')}
        </Button>
        <Button
          variant={activeTab === 'matches' ? 'default' : 'outline'}
          onClick={() => setActiveTab('matches')}
        >
          <Target className="h-4 w-4 mr-2" /> {t('superpin.matches.title')}
        </Button>
        {league.estado === 'active' && (
          <Button
            variant={activeTab === 'checkin' ? 'default' : 'outline'}
            onClick={() => setActiveTab('checkin')}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> {t('superpin.checkin.title')}
          </Button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'ranking' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" /> {t('superpin.ranking.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking?.entries?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('superpin.players.noPlayers')}</p>
                <p className="text-sm text-gray-400 mt-2">{t('superpin.players.noPlayersDesc')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">{t('superpin.ranking.player')}</th>
                      <th className="text-center p-3">{t('superpin.ranking.points')}</th>
                      {league.scoring_config?.system === 'elo' && <th className="text-center p-3">{t('superpin.ranking.elo')}</th>}
                      <th className="text-center p-3">{t('superpin.ranking.played')}</th>
                      <th className="text-center p-3">{t('superpin.ranking.won')}</th>
                      <th className="text-center p-3">{t('superpin.ranking.lost')}</th>
                      <th className="text-center p-3">{t('superpin.ranking.streak')}</th>
                      <th className="text-center p-3">{t('superpin.ranking.change')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking?.entries?.map((entry, index) => (
                      <tr key={entry.ranking_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className={`font-bold ${index < 3 ? 'text-yellow-600' : ''}`}>
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                            {index > 2 && entry.posicion}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {entry.jugador_info?.nombre?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{entry.jugador_info?.nombre || t('superpin.ranking.player')}</p>
                              {entry.jugador_info?.apodo && (
                                <p className="text-sm text-gray-500">"{entry.jugador_info.apodo}"</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-lg">{entry.puntos_totales}</td>
                        {league.scoring_config?.system === 'elo' && (
                          <td className="p-3 text-center font-mono">{entry.elo_rating}</td>
                        )}
                        <td className="p-3 text-center">{entry.partidos_jugados}</td>
                        <td className="p-3 text-center text-green-600">{entry.partidos_ganados}</td>
                        <td className="p-3 text-center text-red-600">{entry.partidos_perdidos}</td>
                        <td className="p-3 text-center">{getStreakBadge(entry.racha_actual)}</td>
                        <td className="p-3 text-center">{getPositionChange(entry.cambio_posicion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'matches' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> {t('superpin.matches.recent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('superpin.matches.noMatches')}</p>
                <Button onClick={() => setShowNewMatchModal(true)} className="mt-4">
                  {t('superpin.matches.createFirst')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <div
                    key={match.partido_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/pinpanclub/superpin/match/${match.partido_id}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center flex-1">
                        <p className="font-medium">{match.player_a_info?.nombre || t('superpin.players.playerA')}</p>
                        <p className="text-2xl font-bold">{match.sets_player_a}</p>
                      </div>
                      <div className="text-gray-400 font-bold">VS</div>
                      <div className="text-center flex-1">
                        <p className="font-medium">{match.player_b_info?.nombre || t('superpin.players.playerB')}</p>
                        <p className="text-2xl font-bold">{match.sets_player_b}</p>
                      </div>
                    </div>
                    <Badge className={{
                      pendiente: 'bg-gray-100 text-gray-800',
                      en_curso: 'bg-blue-100 text-blue-800',
                      finalizado: 'bg-green-100 text-green-800'
                    }[match.estado]}>
                      {getStatusLabel(match.estado)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check-in Tab */}
      {activeTab === 'checkin' && league.estado === 'active' && (
        <SuperPinCheckIn 
          ligaId={ligaId} 
          leagueConfig={league}
          onCheckInComplete={fetchData}
        />
      )}

      {/* New Match Modal */}
      {showNewMatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" /> {t('superpin.matches.new')}
            </h2>
            
            {/* Player Source Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('superpin.players.source')}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={playerSource === 'pinpanclub' ? 'default' : 'outline'}
                  onClick={() => setPlayerSource('pinpanclub')}
                >
                  🏓 PinpanClub
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={playerSource === 'users' ? 'default' : 'outline'}
                  onClick={() => setPlayerSource('users')}
                >
                  👤 {t('superpin.players.appUsers')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={playerSource === 'monday' ? 'default' : 'outline'}
                  onClick={() => {
                    setPlayerSource('monday');
                    if (mondayPlayers.length === 0) fetchMondayPlayers();
                  }}
                >
                  <img src="https://cdn.monday.com/images/logos/monday_logo_icon.png" alt="Monday" className="h-4 w-4 mr-1" />
                  Monday.com
                </Button>
              </div>
            </div>

            {/* Players List Based on Source */}
            <div className="space-y-4">
              {playerSource === 'pinpanclub' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superpin.players.playerA')}</label>
                    <select
                      value={newMatch.player_a_id}
                      onChange={(e) => setNewMatch({ ...newMatch, player_a_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">{t('superpin.players.selectPlayer')}</option>
                      {availablePlayers.map((player) => (
                        <option key={player.jugador_id} value={player.jugador_id}>
                          {player.name} {player.apodo ? `"${player.apodo}"` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superpin.players.playerB')}</label>
                    <select
                      value={newMatch.player_b_id}
                      onChange={(e) => setNewMatch({ ...newMatch, player_b_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">{t('superpin.players.selectPlayer')}</option>
                      {availablePlayers.filter(p => p.jugador_id !== newMatch.player_a_id).map((player) => (
                        <option key={player.jugador_id} value={player.jugador_id}>
                          {player.name} {player.apodo ? `"${player.apodo}"` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {playerSource === 'users' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    {t('superpin.players.selectUsersDesc')}
                  </p>
                  {registeredUsers.length === 0 ? (
                    <p className="text-center py-4 text-gray-400">{t('superpin.players.noUsers')}</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {registeredUsers.map((user) => {
                        const isAlreadyPlayer = availablePlayers.some(p => p.email === user.email || p.user_id === user.user_id);
                        return (
                          <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{user.name} {user.last_name || ''}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            {isAlreadyPlayer ? (
                              <Badge className="bg-green-100 text-green-800">{t('superpin.players.alreadyPlayer')}</Badge>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => convertUserToPlayer(user)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> {t('common.add')}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {t('superpin.players.afterAddingSelect')}
                  </p>
                </div>
              )}

              {playerSource === 'monday' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {t('superpin.players.mondayPlayers')}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={fetchMondayPlayers}
                      disabled={loadingMonday}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loadingMonday ? 'animate-spin' : ''}`} />
                      {t('superpin.players.sync')}
                    </Button>
                  </div>
                  {loadingMonday ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">{t('superpin.players.loadingMonday')}</p>
                    </div>
                  ) : mondayPlayers.length === 0 ? (
                    <p className="text-center py-4 text-gray-400">
                      {t('superpin.players.noMondayPlayers')}
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {mondayPlayers.map((player, idx) => {
                        const isAlreadyPlayer = availablePlayers.some(p => p.monday_id === player.id || p.email === player.email);
                        return (
                          <div key={player.id || idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{player.name || player.name}</p>
                              {player.email && <p className="text-sm text-gray-500">{player.email}</p>}
                            </div>
                            {isAlreadyPlayer ? (
                              <Badge className="bg-green-100 text-green-800">{t('superpin.players.alreadySynced')}</Badge>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  alert(t('superpin.players.syncComingSoon'));
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> {t('superpin.players.sync')}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowNewMatchModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="button" 
                onClick={createMatch} 
                className="bg-green-600 hover:bg-green-700"
                disabled={playerSource !== 'pinpanclub' || !newMatch.player_a_id || !newMatch.player_b_id}
              >
                {t('superpin.matches.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateTournamentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> {t('superpin.tournaments.createTournament')}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('superpin.tournaments.tournamentName')}
                </label>
                <input
                  type="text"
                  value={newTournament.nombre}
                  onChange={(e) => setNewTournament({ ...newTournament, nombre: e.target.value })}
                  placeholder={`Torneo ${league?.temporada}`}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('superpin.tournaments.startDate')}
                </label>
                <input
                  type="date"
                  value={newTournament.fecha_inicio}
                  onChange={(e) => setNewTournament({ ...newTournament, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>{t('superpin.tournaments.participants')}:</strong> Top {Math.min(ranking?.entries?.length || 0, 8)} jugadores del ranking actual
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCreateTournamentModal(false);
                  setNewTournament({ nombre: '', fecha_inicio: '' });
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="button" 
                onClick={async () => {
                  if (!newTournament.nombre || !newTournament.fecha_inicio) {
                    alert('Por favor completa todos los campos');
                    return;
                  }
                  try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                    const response = await fetch(`${API_URL}/api/pinpanclub/superpin/tournaments`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        liga_id: ligaId,
                        nombre: newTournament.nombre,
                        fecha_inicio: newTournament.fecha_inicio
                      })
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setShowCreateTournamentModal(false);
                      setNewTournament({ nombre: '', fecha_inicio: '' });
                      navigate(`/pinpanclub/superpin/tournament/${data.torneo_id}`);
                    }
                  } catch (error) {
                    console.error('Error creating tournament:', error);
                  }
                }}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {t('superpin.tournaments.createTournament')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
