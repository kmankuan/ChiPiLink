/**
 * Super Pin League Detail
 * Detalle de una liga con ranking, partidos y configuración
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Target, ArrowLeft, Settings, Play,
  Plus, Medal, TrendingUp, TrendingDown, Minus, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinLeagueDetail() {
  const { ligaId } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [matches, setMatches] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ranking');
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatch, setNewMatch] = useState({ jugador_a_id: '', jugador_b_id: '' });

  useEffect(() => {
    fetchData();
  }, [ligaId]);

  const fetchData = async () => {
    try {
      const [leagueRes, rankingRes, matchesRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}`),
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/ranking`),
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/matches?limit=20`),
        fetch(`${API_URL}/api/pinpanclub/players`)
      ]);

      const leagueData = await leagueRes.json();
      const rankingData = await rankingRes.json();
      const matchesData = await matchesRes.json();
      const playersData = await playersRes.json();

      setLeague(leagueData);
      setRanking(rankingData);
      setMatches(matchesData);
      setAvailablePlayers(playersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMatch = async () => {
    if (!newMatch.jugador_a_id || !newMatch.jugador_b_id) return;
    if (newMatch.jugador_a_id === newMatch.jugador_b_id) {
      alert('Los jugadores deben ser diferentes');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liga_id: ligaId,
          jugador_a_id: newMatch.jugador_a_id,
          jugador_b_id: newMatch.jugador_b_id,
          match_type: 'ranked'
        })
      });

      if (response.ok) {
        const match = await response.json();
        setShowNewMatchModal(false);
        setNewMatch({ jugador_a_id: '', jugador_b_id: '' });
        navigate(`/pingpong/superpin/match/${match.partido_id}`);
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
        <p className="text-gray-500">Liga no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/pinpanclub/superpin/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              {league.nombre}
            </h1>
            <p className="text-gray-600 mt-1">Temporada {league.temporada} • {league.scoring_config?.system === 'elo' ? 'Sistema ELO' : 'Puntos Simples'}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowNewMatchModal(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Partido
            </Button>
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
              <p className="text-sm text-gray-600">Jugadores</p>
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
              <p className="text-sm text-gray-600">Partidos</p>
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
              <p className="text-sm text-gray-600">Estado</p>
              <Badge className={league.estado === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {league.estado === 'active' ? 'Activa' : league.estado}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'ranking' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ranking')}
        >
          <Medal className="h-4 w-4 mr-2" /> Ranking
        </Button>
        <Button
          variant={activeTab === 'matches' ? 'default' : 'outline'}
          onClick={() => setActiveTab('matches')}
        >
          <Target className="h-4 w-4 mr-2" /> Partidos
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'ranking' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" /> Tabla de Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking?.entries?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay jugadores en el ranking todavía</p>
                <p className="text-sm text-gray-400 mt-2">Los jugadores aparecerán cuando jueguen su primer partido</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Jugador</th>
                      <th className="text-center p-3">Puntos</th>
                      {league.scoring_config?.system === 'elo' && <th className="text-center p-3">ELO</th>}
                      <th className="text-center p-3">PJ</th>
                      <th className="text-center p-3">PG</th>
                      <th className="text-center p-3">PP</th>
                      <th className="text-center p-3">Racha</th>
                      <th className="text-center p-3">Cambio</th>
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
                              <p className="font-medium">{entry.jugador_info?.nombre || 'Jugador'}</p>
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
              <Target className="h-5 w-5" /> Partidos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay partidos todavía</p>
                <Button onClick={() => setShowNewMatchModal(true)} className="mt-4">
                  Crear primer partido
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <div
                    key={match.partido_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/pingpong/superpin/match/${match.partido_id}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center flex-1">
                        <p className="font-medium">{match.jugador_a_info?.nombre || 'Jugador A'}</p>
                        <p className="text-2xl font-bold">{match.sets_jugador_a}</p>
                      </div>
                      <div className="text-gray-400 font-bold">VS</div>
                      <div className="text-center flex-1">
                        <p className="font-medium">{match.jugador_b_info?.nombre || 'Jugador B'}</p>
                        <p className="text-2xl font-bold">{match.sets_jugador_b}</p>
                      </div>
                    </div>
                    <Badge className={{
                      pendiente: 'bg-gray-100 text-gray-800',
                      en_curso: 'bg-blue-100 text-blue-800',
                      finalizado: 'bg-green-100 text-green-800'
                    }[match.estado]}>
                      {match.estado === 'pendiente' ? 'Pendiente' : match.estado === 'en_curso' ? 'En Curso' : 'Finalizado'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Match Modal */}
      {showNewMatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nuevo Partido
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jugador A</label>
                <select
                  value={newMatch.jugador_a_id}
                  onChange={(e) => setNewMatch({ ...newMatch, jugador_a_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar jugador</option>
                  {availablePlayers.map((player) => (
                    <option key={player.jugador_id} value={player.jugador_id}>
                      {player.nombre} {player.apodo ? `"${player.apodo}"` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jugador B</label>
                <select
                  value={newMatch.jugador_b_id}
                  onChange={(e) => setNewMatch({ ...newMatch, jugador_b_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar jugador</option>
                  {availablePlayers.filter(p => p.jugador_id !== newMatch.jugador_a_id).map((player) => (
                    <option key={player.jugador_id} value={player.jugador_id}>
                      {player.nombre} {player.apodo ? `"${player.apodo}"` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewMatchModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createMatch} className="bg-green-600 hover:bg-green-700">
                Crear Partido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
