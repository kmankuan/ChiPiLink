/**
 * Super Pin Match
 * Pantalla de partido con marcador y registro de puntos
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Play, CheckCircle, Trophy, Plus, Minus,
  Zap, Target, RotateCcw
} from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinMatch() {
  const { t } = useTranslation();
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

        if (result.match_finished) {
          setTimeout(() => {
            const winnerName = result.match_winner === 'a' ? match.player_a_info?.name : match.player_b_info?.name;
            alert(t('superpin.matches.matchFinished') + ' ' + t('superpin.matches.winner') + ': ' + winnerName);
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
        <p className="text-white">{t('superpin.matches.notFound')}</p>
      </div>
    );
  }

  const isFinished = match.status === 'finished';
  const isInProgress = match.status === 'in_progress';
  const isPending = match.status === 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        <Badge className={{
          pending: 'bg-gray-600',
          in_progress: 'bg-green-600',
          finished: 'bg-blue-600'
        }[match.status]}>
          {isPending && t('superpin.matches.status.pending')}
          {isInProgress && '🔴 ' + t('superpin.matches.status.live')}
          {isFinished && '✅ ' + t('superpin.matches.status.finished')}
        </Badge>
      </div>

      {/* Scoreboard */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-6">
          {/* Sets */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">{t('superpin.matches.sets')}</p>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-white">{match.sets_player_a}</span>
                <span className="text-2xl text-gray-500">-</span>
                <span className="text-5xl font-bold text-white">{match.sets_player_b}</span>
              </div>
            </div>
          </div>

          {/* Players & Current Score */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player A */}
            <div className={`p-6 rounded-xl ${match.winner_id === match.player_a_id ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-700/50'}`}>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white">
                  {match.player_a_info?.name?.[0] || 'A'}
                </div>
                <h3 className="text-xl font-bold text-white">{match.player_a_info?.name || t('superpin.players.playerA')}</h3>
                {match.player_a_info?.nickname && (
                  <p className="text-gray-400">"{match.player_a_info.nickname}"</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">{t('superpin.matches.point')} {t('superpin.matches.set')} {match.current_set}</p>
                <p className="text-6xl font-bold text-white">{match.points_player_a}</p>
              </div>
              {isInProgress && (
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-16 text-xl"
                    onClick={() => recordPoint('a')}
                    disabled={recording}
                  >
                    <Plus className="h-6 w-6 mr-2" /> {t('superpin.matches.point')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => recordPoint('a', { ace: true })}
                    disabled={recording}
                  >
                    <Zap className="h-4 w-4 mr-2" /> {t('superpin.matches.ace')}
                  </Button>
                </div>
              )}
            </div>

            {/* Player B */}
            <div className={`p-6 rounded-xl ${match.winner_id === match.player_b_id ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-700/50'}`}>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white">
                  {match.player_b_info?.name?.[0] || 'B'}
                </div>
                <h3 className="text-xl font-bold text-white">{match.player_b_info?.name || t('superpin.players.playerB')}</h3>
                {match.player_b_info?.nickname && (
                  <p className="text-gray-400">"{match.player_b_info.nickname}"</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">{t('superpin.matches.point')} {t('superpin.matches.set')} {match.current_set}</p>
                <p className="text-6xl font-bold text-white">{match.points_player_b}</p>
              </div>
              {isInProgress && (
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 h-16 text-xl"
                    onClick={() => recordPoint('b')}
                    disabled={recording}
                  >
                    <Plus className="h-6 w-6 mr-2" /> {t('superpin.matches.point')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => recordPoint('b', { ace: true })}
                    disabled={recording}
                  >
                    <Zap className="h-4 w-4 mr-2" /> {t('superpin.matches.ace')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Match Info */}
          <div className="mt-6 text-center text-gray-400">
            <p>{t('superpin.matches.bestOf')} {match.best_of} • {match.points_per_set} {t('superpin.matches.pointsPerSet')}</p>
          </div>

          {/* Set History */}
          {match.set_history?.length > 0 && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-2 text-center">{t('superpin.matches.setHistory')}</p>
              <div className="flex justify-center gap-4">
                {match.set_history.map((set, i) => (
                  <div key={i} className="bg-gray-700 px-4 py-2 rounded-lg text-center">
                    <p className="text-xs text-gray-400">{t('superpin.matches.set')} {set.set}</p>
                    <p className="text-white font-bold">{set.points_a} - {set.points_b}</p>
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
            <Play className="h-6 w-6 mr-2" /> {t('superpin.matches.start')}
          </Button>
        </div>
      )}

      {isFinished && (
        <Card className="bg-green-900/20 border-green-700">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">{t('superpin.matches.matchFinished')}</h3>
            <p className="text-green-400 text-lg">
              {t('superpin.matches.winner')}: {match.winner_id === match.player_a_id ? match.player_a_info?.name : match.player_b_info?.name}
            </p>
            {(match.elo_change_a || match.winner_points) && (
              <div className="mt-4 flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">{t('superpin.stats.points')}</p>
                  <p className="text-white">+{match.winner_points} / +{match.loser_points}</p>
                </div>
                {match.elo_change_a !== undefined && (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">{t('superpin.stats.eloChange')}</p>
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
