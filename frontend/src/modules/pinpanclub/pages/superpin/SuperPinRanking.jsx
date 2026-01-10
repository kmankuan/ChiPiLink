/**
 * Super Pin Ranking - Vista Pública
 * Vista del ranking para jugadores y espectadores
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy, Medal, TrendingUp, TrendingDown, Minus,
  Users, Target, Calendar, ArrowLeft, RefreshCw, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import PlayerBadges, { BadgeFeed } from './PlayerBadges';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinRanking() {
  const { t } = useTranslation();
  const { ligaId } = useParams();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(ligaId || null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      fetchRanking();
    }
  }, [selectedLeague]);

  const fetchLeagues = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/leagues?active_only=true`);
      const data = await response.json();
      setLeagues(data);
      if (!selectedLeague && data.length > 0) {
        setSelectedLeague(data[0].liga_id);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${selectedLeague}/ranking`);
      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getPositionIcon = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return position;
  };

  const getPositionChange = (change) => {
    if (change > 0) return <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-4 w-4" />+{change}</span>;
    if (change < 0) return <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-4 w-4" />{change}</span>;
    return <span className="text-gray-400"><Minus className="h-4 w-4" /></span>;
  };

  const getStreakDisplay = (streak) => {
    if (streak > 0) return <span className="text-green-600">🔥 {streak}W</span>;
    if (streak < 0) return <span className="text-blue-600">❄️ {Math.abs(streak)}L</span>;
    return <span className="text-gray-400">-</span>;
  };

  const getWinRate = (won, total) => {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-white hover:text-gray-300"
              onClick={() => navigate('/pinpanclub')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
                Super Pin Ranking
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
            onClick={fetchRanking}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* League Selector */}
      {leagues.length > 1 && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {leagues.map((league) => (
              <Button
                key={league.liga_id}
                variant={selectedLeague === league.liga_id ? 'default' : 'outline'}
                className={selectedLeague === league.liga_id 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                  : 'border-white/30 text-white hover:bg-white/10'
                }
                onClick={() => setSelectedLeague(league.liga_id)}
              >
                {league.nombre}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* League Info */}
      {ranking && (
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{ranking.liga_nombre}</h2>
                  <p className="text-green-200">Temporada {ranking.temporada}</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-green-200 text-sm">Jugadores</p>
                    <p className="text-2xl font-bold text-white">{ranking.total_jugadores}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-200 text-sm">Partidos</p>
                    <p className="text-2xl font-bold text-white">{ranking.total_partidos}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-200 text-sm">Sistema</p>
                    <Badge className="bg-yellow-500/20 text-yellow-300">
                      {ranking.scoring_system === 'elo' ? 'ELO' : 'Puntos'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking Table */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/10 border-white/20 overflow-hidden">
          <CardHeader className="bg-white/5">
            <CardTitle className="text-white flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-400" /> Clasificación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!ranking || ranking.entries?.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No hay jugadores en el ranking todavía</p>
                <p className="text-white/40 text-sm mt-2">Los jugadores aparecerán cuando jueguen su primer partido</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-white/60 text-sm">
                      <th className="text-left p-4">#</th>
                      <th className="text-left p-4">Jugador</th>
                      <th className="text-center p-4">Pts</th>
                      {ranking.scoring_system === 'elo' && <th className="text-center p-4">ELO</th>}
                      <th className="text-center p-4 hidden md:table-cell">PJ</th>
                      <th className="text-center p-4 hidden md:table-cell">Win%</th>
                      <th className="text-center p-4">Racha</th>
                      <th className="text-center p-4">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.entries.map((entry, index) => (
                      <tr
                        key={entry.ranking_id}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                          index < 3 ? 'bg-yellow-500/5' : ''
                        }`}
                      >
                        <td className="p-4">
                          <span className={`text-xl ${index < 3 ? 'font-bold' : 'text-white/60'}`}>
                            {getPositionIcon(entry.posicion)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-700' :
                              'bg-green-700'
                            }`}>
                              {entry.jugador_info?.nombre?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{entry.jugador_info?.nombre || 'Jugador'}</p>
                              {entry.jugador_info?.apodo && (
                                <p className="text-sm text-white/50">"{entry.jugador_info.apodo}"</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xl font-bold text-yellow-400">{entry.puntos_totales}</span>
                        </td>
                        {ranking.scoring_system === 'elo' && (
                          <td className="p-4 text-center text-white font-mono">{entry.elo_rating}</td>
                        )}
                        <td className="p-4 text-center text-white/80 hidden md:table-cell">
                          {entry.partidos_jugados}
                        </td>
                        <td className="p-4 text-center hidden md:table-cell">
                          <span className="text-green-400">
                            {getWinRate(entry.partidos_ganados, entry.partidos_jugados)}
                          </span>
                        </td>
                        <td className="p-4 text-center text-white">
                          {getStreakDisplay(entry.racha_actual)}
                        </td>
                        <td className="p-4 text-center">
                          {getPositionChange(entry.cambio_posicion)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      {ranking?.last_updated && (
        <div className="max-w-4xl mx-auto mt-4 text-center">
          <p className="text-white/40 text-sm">
            Última actualización: {new Date(ranking.last_updated).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
