/**
 * Player Comparison Tool
 * Herramienta para comparar múltiples jugadores lado a lado
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Plus, X, BarChart3, Trophy, Target, Flame,
  TrendingUp, Medal, ArrowLeft, RefreshCw, Download,
  ChevronDown, Check, Loader2, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import MatchPredictor from './MatchPredictor';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PlayerComparison() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPredictor, setShowPredictor] = useState(false);

  useEffect(() => {
    fetchAvailablePlayers();
  }, []);

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/players`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePlayers(data || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (jugadorId) => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/players/${jugadorId}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setPlayerStats(prev => ({ ...prev, [jugadorId]: data }));
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  const addPlayer = async (player) => {
    if (selectedPlayers.find(p => p.jugador_id === player.jugador_id)) return;
    
    setSelectedPlayers(prev => [...prev, player]);
    setShowPlayerSelector(false);
    setSearchQuery('');
    
    // Fetch stats if not already loaded
    if (!playerStats[player.jugador_id]) {
      setLoadingStats(true);
      await fetchPlayerStats(player.jugador_id);
      setLoadingStats(false);
    }
  };

  const removePlayer = (jugadorId) => {
    setSelectedPlayers(prev => prev.filter(p => p.jugador_id !== jugadorId));
  };

  const clearAll = () => {
    setSelectedPlayers([]);
  };

  const getStatValue = (jugadorId, path) => {
    const stats = playerStats[jugadorId];
    if (!stats) return '-';
    
    const parts = path.split('.');
    let value = stats;
    for (const part of parts) {
      value = value?.[part];
    }
    return value ?? '-';
  };

  const getWinRateColor = (rate) => {
    if (rate === '-') return 'text-gray-400';
    if (rate >= 70) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBestValue = (statPath, higherIsBetter = true) => {
    const values = selectedPlayers.map(p => {
      const val = getStatValue(p.jugador_id, statPath);
      return { jugadorId: p.jugador_id, value: typeof val === 'number' ? val : -Infinity };
    });
    
    if (values.length === 0) return null;
    
    const best = higherIsBetter 
      ? values.reduce((a, b) => a.value > b.value ? a : b)
      : values.reduce((a, b) => a.value < b.value ? a : b);
    
    return best.value !== -Infinity ? best.jugadorId : null;
  };

  const filteredPlayers = availablePlayers.filter(p => 
    !selectedPlayers.find(sp => sp.jugador_id === p.jugador_id) &&
    (p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.apodo?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats to compare
  const comparisonStats = [
    { key: 'overall_stats.total_matches', label: t('superpin.comparison.totalMatches'), icon: Target, higherIsBetter: true },
    { key: 'overall_stats.wins', label: t('superpin.comparison.wins'), icon: Trophy, higherIsBetter: true },
    { key: 'overall_stats.losses', label: t('superpin.comparison.losses'), icon: TrendingUp, higherIsBetter: false },
    { key: 'overall_stats.win_rate', label: t('superpin.comparison.winRate'), icon: BarChart3, higherIsBetter: true, suffix: '%' },
    { key: 'overall_stats.sets_won', label: t('superpin.comparison.setsWon'), icon: Target, higherIsBetter: true },
    { key: 'overall_stats.set_win_rate', label: t('superpin.comparison.setWinRate'), icon: BarChart3, higherIsBetter: true, suffix: '%' },
    { key: 'overall_stats.best_streak', label: t('superpin.comparison.bestStreak'), icon: Flame, higherIsBetter: true },
    { key: 'player_info.elo_rating', label: 'ELO', icon: Medal, higherIsBetter: true },
    { key: 'badge_count.total', label: t('superpin.badges.title'), icon: Medal, higherIsBetter: true },
    { key: 'badge_count.legendary', label: t('superpin.badges.rarity.legendary'), icon: Trophy, higherIsBetter: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                {t('superpin.comparison.title')}
              </h1>
              <p className="text-gray-500">{t('superpin.comparison.subtitle')}</p>
            </div>
          </div>
          
          {selectedPlayers.length > 0 && (
            <Button variant="outline" onClick={clearAll} className="text-red-600">
              <X className="h-4 w-4 mr-2" /> {t('superpin.comparison.clearAll')}
            </Button>
          )}
        </div>

        {/* Player Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Selected Players */}
              {selectedPlayers.map((player) => (
                <div
                  key={player.jugador_id}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-full"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {player.nombre?.[0]}
                  </div>
                  <span className="font-medium">{player.nombre}</span>
                  {player.apodo && <span className="text-gray-500 text-sm">"{player.apodo}"</span>}
                  <button
                    onClick={() => removePlayer(player.jugador_id)}
                    className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {/* Add Player Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowPlayerSelector(!showPlayerSelector)}
                  className="border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> {t('superpin.comparison.addPlayer')}
                </Button>
                
                {/* Player Selector Dropdown */}
                {showPlayerSelector && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border z-50">
                    <div className="p-3 border-b">
                      <input
                        type="text"
                        placeholder={t('superpin.comparison.searchPlayer')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredPlayers.length === 0 ? (
                        <p className="p-4 text-center text-gray-400">{t('superpin.comparison.noPlayers')}</p>
                      ) : (
                        filteredPlayers.map((player) => (
                          <button
                            key={player.jugador_id}
                            onClick={() => addPlayer(player)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">
                              {player.nombre?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">{player.nombre}</p>
                              {player.apodo && <p className="text-sm text-gray-500">"{player.apodo}"</p>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {selectedPlayers.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                {t('superpin.comparison.statsComparison')}
                {loadingStats && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 bg-gray-50 sticky left-0">{t('superpin.comparison.stat')}</th>
                      {selectedPlayers.map((player) => (
                        <th 
                          key={player.jugador_id} 
                          className="text-center p-3 min-w-[140px] cursor-pointer hover:bg-gray-50"
                          onClick={() => navigate(`/pinpanclub/superpin/player/${player.jugador_id}`)}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {player.nombre?.[0]}
                            </div>
                            <span className="font-medium">{player.nombre}</span>
                            {player.apodo && (
                              <span className="text-xs text-gray-400">"{player.apodo}"</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonStats.map((stat, idx) => {
                      const bestPlayerId = getBestValue(stat.key, stat.higherIsBetter);
                      const Icon = stat.icon;
                      
                      return (
                        <tr key={stat.key} className={idx % 2 === 0 ? 'bg-gray-50/50' : ''}>
                          <td className="p-3 sticky left-0 bg-inherit">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{stat.label}</span>
                            </div>
                          </td>
                          {selectedPlayers.map((player) => {
                            const value = getStatValue(player.jugador_id, stat.key);
                            const isBest = bestPlayerId === player.jugador_id && value !== '-';
                            
                            return (
                              <td 
                                key={player.jugador_id} 
                                className={`text-center p-3 ${isBest ? 'bg-green-100' : ''}`}
                              >
                                <span className={`text-lg font-bold ${
                                  stat.key.includes('win_rate') ? getWinRateColor(value) :
                                  isBest ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                  {value}{stat.suffix || ''}
                                </span>
                                {isBest && (
                                  <span className="ml-1 text-green-500">👑</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    
                    {/* Badges Row */}
                    <tr className="border-t-2">
                      <td className="p-3 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <Medal className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{t('superpin.comparison.recentBadges')}</span>
                        </div>
                      </td>
                      {selectedPlayers.map((player) => {
                        const badges = playerStats[player.jugador_id]?.badges || [];
                        return (
                          <td key={player.jugador_id} className="text-center p-3">
                            <div className="flex justify-center gap-1 flex-wrap">
                              {badges.slice(0, 5).map((badge) => (
                                <span 
                                  key={badge.badge_id} 
                                  className="text-xl"
                                  title={badge.name}
                                >
                                  {badge.icon}
                                </span>
                              ))}
                              {badges.length === 0 && (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Recent Form Row */}
                    <tr>
                      <td className="p-3 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{t('superpin.profile.recentForm')}</span>
                        </div>
                      </td>
                      {selectedPlayers.map((player) => {
                        const form = playerStats[player.jugador_id]?.recent_form || [];
                        return (
                          <td key={player.jugador_id} className="text-center p-3">
                            <div className="flex justify-center gap-1">
                              {form.slice(0, 5).map((result, i) => (
                                <span
                                  key={i}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                    result === 'W' ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                >
                                  {result}
                                </span>
                              ))}
                              {form.length === 0 && (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-green-100 rounded"></span>
                  {t('superpin.comparison.bestInCategory')}
                </span>
                <span>👑 = {t('superpin.comparison.leader')}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                {t('superpin.comparison.noPlayersSelected')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('superpin.comparison.selectToCompare')}
              </p>
              <Button onClick={() => setShowPlayerSelector(true)}>
                <Plus className="h-4 w-4 mr-2" /> {t('superpin.comparison.addFirstPlayer')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
