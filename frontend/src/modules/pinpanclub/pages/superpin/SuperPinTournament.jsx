/**
 * Super Pin Tournament Bracket View
 * Visualización de brackets para torneos de eliminación
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy, ArrowLeft, Users, Play, CheckCircle,
  Medal, Crown, Award, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinTournament() {
  const { t } = useTranslation();
  const { torneoId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    fetchTournament();
  }, [torneoId]);

  const fetchTournament = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/tournaments/${torneoId}/brackets`);
      if (response.ok) {
        const data = await response.json();
        setTournament(data);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBrackets = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/tournaments/${torneoId}/generate-brackets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchTournament();
      }
    } catch (error) {
      console.error('Error generating brackets:', error);
    } finally {
      setGenerating(false);
    }
  };

  const updateMatchResult = async (matchId, winnerId, scoreA, scoreB) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const params = new URLSearchParams({
        winner_id: winnerId,
        score_a: scoreA,
        score_b: scoreB
      });
      const response = await fetch(
        `${API_URL}/api/pinpanclub/superpin/tournaments/${torneoId}/matches/${matchId}/result?${params}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        await fetchTournament();
        setShowResultModal(false);
        setSelectedMatch(null);
      }
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const getStatusBadge = (estado) => {
    const styles = {
      pendiente: 'bg-gray-100 text-gray-800',
      en_curso: 'bg-blue-100 text-blue-800',
      finalizado: 'bg-green-100 text-green-800',
      bye: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={styles[estado] || styles.pendiente}>{t(`superpin.tournaments.status.${estado}`)}</Badge>;
  };

  const getPositionIcon = (position) => {
    if (position === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t('superpin.tournaments.notFound')}</p>
      </div>
    );
  }

  const brackets = tournament.brackets || [];
  const hasStarted = brackets.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              {tournament.nombre}
            </h1>
            <p className="text-gray-600 mt-1">
              {tournament.participantes?.length || 0} {t('superpin.tournaments.participants')} • {getStatusBadge(tournament.estado)}
            </p>
          </div>
          {!hasStarted && (
            <Button 
              onClick={generateBrackets} 
              disabled={generating}
              className="bg-green-600 hover:bg-green-700"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t('superpin.tournaments.startTournament')}
            </Button>
          )}
        </div>
      </div>

      {/* Participants */}
      {!hasStarted && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> {t('superpin.tournaments.participants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {tournament.participantes?.map((p, idx) => (
                <div key={p.jugador_id} className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-green-700">
                    {p.posicion_ranking}
                  </div>
                  <p className="text-sm font-medium truncate">{p.jugador_info?.nombre || t('superpin.ranking.player')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bracket View */}
      {hasStarted && (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-8 min-w-max">
            {brackets.filter(b => b.name !== "Tercer Lugar").map((bracket, roundIdx) => (
              <div key={bracket.round} className="flex-shrink-0" style={{ width: '220px' }}>
                <h3 className="text-center font-bold text-gray-700 mb-4 pb-2 border-b">
                  {bracket.name}
                </h3>
                <div 
                  className="flex flex-col justify-around"
                  style={{ 
                    gap: `${Math.pow(2, roundIdx) * 20}px`,
                    marginTop: `${Math.pow(2, roundIdx) * 10}px`
                  }}
                >
                  {bracket.matches.map((match, matchIdx) => (
                    <div
                      key={match.match_id}
                      className={`bg-white rounded-lg shadow-sm border-2 ${
                        match.estado === 'finalizado' ? 'border-green-200' :
                        match.estado === 'bye' ? 'border-yellow-200' :
                        'border-gray-200 hover:border-green-400 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (match.estado === 'pendiente' && match.player_a && match.player_b) {
                          setSelectedMatch(match);
                          setShowResultModal(true);
                        }
                      }}
                    >
                      {/* Player A */}
                      <div className={`p-3 border-b flex items-center justify-between ${
                        match.winner === match.player_a?.jugador_id ? 'bg-green-50' : ''
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                            {match.player_a?.posicion_ranking || '?'}
                          </span>
                          <span className={`text-sm ${match.winner === match.player_a?.jugador_id ? 'font-bold' : ''}`}>
                            {match.player_a?.jugador_info?.nombre || (match.estado === 'bye' ? t('superpin.tournaments.bye') : t('superpin.tournaments.tbd'))}
                          </span>
                        </div>
                        {match.estado === 'finalizado' && (
                          <span className="text-sm font-bold">{match.score_a}</span>
                        )}
                        {match.winner === match.player_a?.jugador_id && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      {/* Player B */}
                      <div className={`p-3 flex items-center justify-between ${
                        match.winner === match.player_b?.jugador_id ? 'bg-green-50' : ''
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                            {match.player_b?.posicion_ranking || '?'}
                          </span>
                          <span className={`text-sm ${match.winner === match.player_b?.jugador_id ? 'font-bold' : ''}`}>
                            {match.player_b?.jugador_info?.nombre || t('superpin.tournaments.tbd')}
                          </span>
                        </div>
                        {match.estado === 'finalizado' && (
                          <span className="text-sm font-bold">{match.score_b}</span>
                        )}
                        {match.winner === match.player_b?.jugador_id && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Third Place Match */}
          {brackets.find(b => b.name === "Tercer Lugar") && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-bold text-gray-700 mb-4">{t('superpin.tournaments.thirdPlace')}</h3>
              {brackets.find(b => b.name === "Tercer Lugar").matches.map(match => (
                <div
                  key={match.match_id}
                  className={`bg-white rounded-lg shadow-sm border-2 w-56 ${
                    match.estado === 'finalizado' ? 'border-amber-200' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    if (match.estado === 'pendiente' && match.player_a && match.player_b) {
                      setSelectedMatch(match);
                      setShowResultModal(true);
                    }
                  }}
                >
                  <div className={`p-3 border-b ${match.winner === match.player_a?.jugador_id ? 'bg-amber-50' : ''}`}>
                    <span className="text-sm">
                      {match.player_a?.jugador_info?.nombre || t('superpin.tournaments.semifinalLoser')}
                    </span>
                  </div>
                  <div className={`p-3 ${match.winner === match.player_b?.jugador_id ? 'bg-amber-50' : ''}`}>
                    <span className="text-sm">
                      {match.player_b?.jugador_info?.nombre || t('superpin.tournaments.semifinalLoser')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Final Results */}
      {tournament.estado === 'finalizado' && tournament.resultados_finales?.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> {t('superpin.tournaments.results')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8">
              {tournament.resultados_finales.sort((a, b) => a.posicion - b.posicion).map(result => {
                const player = tournament.participantes?.find(p => p.jugador_id === result.jugador_id);
                return (
                  <div key={result.posicion} className="text-center">
                    {getPositionIcon(result.posicion)}
                    <p className="mt-2 font-bold text-lg">
                      {player?.jugador_info?.nombre || t('superpin.ranking.player')}
                    </p>
                    <p className="text-gray-500">
                      {result.posicion === 1 && '🥇 ' + t('superpin.tournaments.champion')}
                      {result.posicion === 2 && '🥈 ' + t('superpin.tournaments.runnerUp')}
                      {result.posicion === 3 && '🥉 ' + t('superpin.tournaments.thirdPlace')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Modal */}
      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">{t('superpin.tournaments.enterResult')}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <p className="font-medium">{selectedMatch.player_a?.jugador_info?.nombre}</p>
                  <input
                    type="number"
                    min="0"
                    className="w-20 mt-2 px-3 py-2 border rounded-lg text-center text-2xl"
                    defaultValue={0}
                    id="score_a"
                  />
                </div>
                <div className="text-center text-gray-400 font-bold">VS</div>
                <div className="text-center">
                  <p className="font-medium">{selectedMatch.player_b?.jugador_info?.nombre}</p>
                  <input
                    type="number"
                    min="0"
                    className="w-20 mt-2 px-3 py-2 border rounded-lg text-center text-2xl"
                    defaultValue={0}
                    id="score_b"
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{t('superpin.tournaments.selectWinner')}:</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const scoreA = parseInt(document.getElementById('score_a').value) || 0;
                      const scoreB = parseInt(document.getElementById('score_b').value) || 0;
                      updateMatchResult(selectedMatch.match_id, selectedMatch.player_a.jugador_id, scoreA, scoreB);
                    }}
                  >
                    {selectedMatch.player_a?.jugador_info?.nombre}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const scoreA = parseInt(document.getElementById('score_a').value) || 0;
                      const scoreB = parseInt(document.getElementById('score_b').value) || 0;
                      updateMatchResult(selectedMatch.match_id, selectedMatch.player_b.jugador_id, scoreA, scoreB);
                    }}
                  >
                    {selectedMatch.player_b?.jugador_info?.nombre}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => {
                setShowResultModal(false);
                setSelectedMatch(null);
              }}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
