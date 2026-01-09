/**
 * Super Pin Match
 * Pantalla de partido con marcador y registro de puntos
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, CheckCircle, Trophy, Plus, Minus,
  Zap, Target, RotateCcw
} from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinMatch() {
  const { partidoId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [partidoId]);

  const fetchMatch = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/matches/${partidoId}`);
      const data = await response.json();
      setMatch(data);
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  const startMatch = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/matches/${partidoId}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchMatch();
      }
    } catch (error) {
      console.error('Error starting match:', error);
    }
  };

  const recordPoint = async (jugador, stats = {}) => {
    if (recording) return;
    setRecording(true);

    try {
      const params = new URLSearchParams({ jugador });
      if (stats.ace) params.append('ace', 'true');

      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/matches/${partidoId}/point?${params}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setMatch(result.match);

        if (result.partido_terminado) {
          // Mostrar mensaje de victoria
          setTimeout(() => {
            alert(`¡Partido terminado! Ganador: ${result.ganador_partido === 'a' ? match.jugador_a_info?.nombre : match.jugador_b_info?.nombre}`);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error recording point:', error);
    } finally {
      setRecording(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-white">Partido no encontrado</p>
      </div>
    );
  }

  const isFinished = match.estado === 'finalizado';
  const isInProgress = match.estado === 'en_curso';
  const isPending = match.estado === 'pendiente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          className="text-white hover:text-gray-300"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Volver
        </Button>
        <Badge className={{
          pendiente: 'bg-gray-600',
          en_curso: 'bg-green-600',
          finalizado: 'bg-blue-600'
        }[match.estado]}>
          {isPending && 'Pendiente'}
          {isInProgress && '🔴 En Vivo'}
          {isFinished && '✅ Finalizado'}
        </Badge>
      </div>

      {/* Scoreboard */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-6">
          {/* Sets */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Sets</p>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-white">{match.sets_jugador_a}</span>
                <span className="text-2xl text-gray-500">-</span>
                <span className="text-5xl font-bold text-white">{match.sets_jugador_b}</span>
              </div>
            </div>
          </div>

          {/* Players & Current Score */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player A */}
            <div className={`p-6 rounded-xl ${match.ganador_id === match.jugador_a_id ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-700/50'}`}>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white">
                  {match.jugador_a_info?.nombre?.[0] || 'A'}
                </div>
                <h3 className="text-xl font-bold text-white">{match.jugador_a_info?.nombre || 'Jugador A'}</h3>
                {match.jugador_a_info?.apodo && (
                  <p className="text-gray-400">"{match.jugador_a_info.apodo}"</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Puntos Set {match.set_actual}</p>
                <p className="text-6xl font-bold text-white">{match.puntos_jugador_a}</p>
              </div>
              {isInProgress && (
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-16 text-xl"
                    onClick={() => recordPoint('a')}
                    disabled={recording}
                  >
                    <Plus className="h-6 w-6 mr-2" /> Punto
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => recordPoint('a', { ace: true })}
                    disabled={recording}
                  >
                    <Zap className="h-4 w-4 mr-2" /> Ace
                  </Button>
                </div>
              )}
            </div>

            {/* Player B */}
            <div className={`p-6 rounded-xl ${match.ganador_id === match.jugador_b_id ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-700/50'}`}>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white">
                  {match.jugador_b_info?.nombre?.[0] || 'B'}
                </div>
                <h3 className="text-xl font-bold text-white">{match.jugador_b_info?.nombre || 'Jugador B'}</h3>
                {match.jugador_b_info?.apodo && (
                  <p className="text-gray-400">"{match.jugador_b_info.apodo}"</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Puntos Set {match.set_actual}</p>
                <p className="text-6xl font-bold text-white">{match.puntos_jugador_b}</p>
              </div>
              {isInProgress && (
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 h-16 text-xl"
                    onClick={() => recordPoint('b')}
                    disabled={recording}
                  >
                    <Plus className="h-6 w-6 mr-2" /> Punto
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => recordPoint('b', { ace: true })}
                    disabled={recording}
                  >
                    <Zap className="h-4 w-4 mr-2" /> Ace
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Match Info */}
          <div className="mt-6 text-center text-gray-400">
            <p>Mejor de {match.mejor_de} • {match.puntos_por_set} puntos por set</p>
          </div>

          {/* Set History */}
          {match.historial_sets?.length > 0 && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-2 text-center">Historial de Sets</p>
              <div className="flex justify-center gap-4">
                {match.historial_sets.map((set, i) => (
                  <div key={i} className="bg-gray-700 px-4 py-2 rounded-lg text-center">
                    <p className="text-xs text-gray-400">Set {set.set}</p>
                    <p className="text-white font-bold">{set.puntos_a} - {set.puntos_b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isPending && (
        <div className="text-center">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 px-12 py-6 text-xl"
            onClick={startMatch}
          >
            <Play className="h-6 w-6 mr-2" /> Iniciar Partido
          </Button>
        </div>
      )}

      {isFinished && (
        <Card className="bg-green-900/20 border-green-700">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">¡Partido Finalizado!</h3>
            <p className="text-green-400 text-lg">
              Ganador: {match.ganador_id === match.jugador_a_id ? match.jugador_a_info?.nombre : match.jugador_b_info?.nombre}
            </p>
            {(match.elo_change_a || match.puntos_ganador) && (
              <div className="mt-4 flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Puntos</p>
                  <p className="text-white">+{match.puntos_ganador} / +{match.puntos_perdedor}</p>
                </div>
                {match.elo_change_a !== undefined && (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">ELO Change</p>
                    <p className="text-white">
                      {match.elo_change_a > 0 ? '+' : ''}{match.elo_change_a} / {match.elo_change_b > 0 ? '+' : ''}{match.elo_change_b}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
