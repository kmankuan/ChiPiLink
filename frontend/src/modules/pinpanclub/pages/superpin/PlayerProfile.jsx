/**
 * Player Profile / Statistics Dashboard
 * Vista detallada del perfil y estadísticas de un jugador
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Trophy, Target, TrendingUp, TrendingDown, Calendar,
  ArrowLeft, Medal, Award, Flame, BarChart3, History,
  ChevronRight, Loader2, Percent, Zap, UserPlus, UserMinus,
  Users, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import PlayerBadges from './PlayerBadges';
import { FollowButton, FollowStats, CommentsSection } from '../../components/SocialFeatures';
import AchievementShowcase from '../../components/AchievementShowcase';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PlayerProfile() {
  const { t } = useTranslation();
  const { jugadorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  
  // Current user ID for social features
  const currentUserId = user?.cliente_id || user?.user_id || null;

  useEffect(() => {
    if (jugadorId) {
      fetchStatistics();
      fetchFollowStats();
    }
  }, [jugadorId]);
  
  const fetchFollowStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/follow-stats/${jugadorId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowStats(data);
      }
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/players/${jugadorId}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRateColor = (rate) => {
    if (rate >= 70) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFormIcon = (result) => {
    return result === 'W' 
      ? <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">W</span>
      : <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">L</span>;
  };

  const getRarityStyle = (rarity) => {
    const styles = {
      common: 'bg-gray-100 border-gray-300',
      rare: 'bg-blue-100 border-blue-300',
      epic: 'bg-purple-100 border-purple-300',
      legendary: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300'
    };
    return styles[rarity] || styles.common;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <User className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500">{t('superpin.profile.notFound')}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const { player_info, overall_stats, league_rankings, match_history, badges, recent_form, badge_count } = stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.back')}
        </Button>

        {/* Profile Header */}
        <Card className="bg-white/10 border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {player_info.nombre?.[0] || '?'}
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-white">
                    {player_info.nombre} {player_info.apellido || ''}
                  </h1>
                  {player_info.apodo && (
                    <Badge className="bg-yellow-500/20 text-yellow-300">
                      "{player_info.apodo}"
                    </Badge>
                  )}
                  {/* Follow Button */}
                  {currentUserId && currentUserId !== jugadorId && (
                    <FollowButton 
                      currentUserId={currentUserId}
                      targetUserId={jugadorId}
                      onFollowChange={fetchFollowStats}
                    />
                  )}
                </div>
                
                {/* Follow Stats */}
                <div className="flex items-center gap-4 text-white/70 mb-2">
                  <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    <Users className="h-4 w-4" />
                    <strong className="text-white">{followStats.followers_count}</strong> seguidores
                  </span>
                  <span className="cursor-pointer hover:text-white transition-colors">
                    <strong className="text-white">{followStats.following_count}</strong> siguiendo
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-white/70">
                  <span className="flex items-center gap-1">
                    <Medal className="h-4 w-4" /> {player_info.nivel || 'Sin nivel'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" /> ELO: {player_info.elo_rating}
                  </span>
                  {player_info.fecha_registro && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> 
                      {t('superpin.profile.since')} {new Date(player_info.fecha_registro).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {/* Badges Preview */}
                {badges.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {badges.slice(0, 6).map((badge) => (
                      <span 
                        key={badge.badge_id} 
                        className={`text-2xl ${badge.rarity === 'legendary' ? 'animate-pulse' : ''}`}
                        title={badge.name}
                      >
                        {badge.icon}
                      </span>
                    ))}
                    {badges.length > 6 && (
                      <span className="text-white/50 text-sm">+{badges.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">{overall_stats.total_matches}</p>
                  <p className="text-xs text-white/60">{t('superpin.profile.matches')}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className={`text-2xl font-bold ${getWinRateColor(overall_stats.win_rate)}`}>
                    {overall_stats.win_rate}%
                  </p>
                  <p className="text-xs text-white/60">{t('superpin.profile.winRate')}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-2xl font-bold text-yellow-400">{badge_count.total}</p>
                  <p className="text-xs text-white/60">{t('superpin.badges.title')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            className={activeTab === 'overview' ? 'bg-green-600' : 'border-white/30 text-white'}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 className="h-4 w-4 mr-2" /> {t('superpin.profile.overview')}
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            className={activeTab === 'history' ? 'bg-green-600' : 'border-white/30 text-white'}
            onClick={() => setActiveTab('history')}
          >
            <History className="h-4 w-4 mr-2" /> {t('superpin.profile.history')}
          </Button>
          <Button
            variant={activeTab === 'badges' ? 'default' : 'outline'}
            className={activeTab === 'badges' ? 'bg-green-600' : 'border-white/30 text-white'}
            onClick={() => setActiveTab('badges')}
          >
            <Award className="h-4 w-4 mr-2" /> {t('superpin.badges.title')} ({badges.length})
          </Button>
          <Button
            variant={activeTab === 'social' ? 'default' : 'outline'}
            className={activeTab === 'social' ? 'bg-green-600' : 'border-white/30 text-white'}
            onClick={() => setActiveTab('social')}
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Social
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stats Card */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  {t('superpin.profile.statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">{t('superpin.profile.wins')}</span>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{overall_stats.wins}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm">{t('superpin.profile.losses')}</span>
                    </div>
                    <p className="text-3xl font-bold text-red-700">{overall_stats.losses}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">{t('superpin.profile.setsWon')}</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{overall_stats.sets_won}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm">{t('superpin.profile.bestStreak')}</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-700">{overall_stats.best_streak}</p>
                  </div>
                </div>
                
                {/* Win Rate Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('superpin.profile.winRate')}</span>
                    <span className={`font-bold ${getWinRateColor(overall_stats.win_rate)}`}>
                      {overall_stats.win_rate}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${overall_stats.win_rate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Form */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {t('superpin.profile.recentForm')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  {recent_form.map((result, idx) => (
                    <div key={idx}>{getFormIcon(result)}</div>
                  ))}
                  {recent_form.length === 0 && (
                    <p className="text-gray-400">{t('superpin.profile.noMatches')}</p>
                  )}
                </div>
                
                {/* League Rankings */}
                {league_rankings.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">{t('superpin.profile.leaguePositions')}</h4>
                    <div className="space-y-2">
                      {league_rankings.map((ranking) => (
                        <div 
                          key={ranking.liga_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{ranking.liga_nombre || ranking.liga_id}</p>
                            <p className="text-sm text-gray-500">
                              {ranking.partidos_jugados} {t('superpin.profile.matchesPlayed')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">#{ranking.posicion}</p>
                            <p className="text-sm text-yellow-600">{ranking.puntos_totales} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('superpin.profile.matchHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {match_history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('superpin.profile.noMatchHistory')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {match_history.map((match) => (
                    <div 
                      key={match.partido_id}
                      className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                        match.is_winner 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          match.is_winner ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {match.is_winner ? 'W' : 'L'}
                        </div>
                        <div>
                          <p className="font-medium">
                            vs {match.opponent.nombre}
                            {match.opponent.apodo && <span className="text-gray-500"> "{match.opponent.apodo}"</span>}
                          </p>
                          <p className="text-sm text-gray-500">
                            {match.fecha && new Date(match.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{match.resultado}</p>
                        {match.elo_change !== undefined && match.elo_change !== null && (
                          <p className={`text-sm ${match.elo_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {match.elo_change >= 0 ? '+' : ''}{match.elo_change} ELO
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                {t('superpin.badges.title')} ({badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Badge Summary */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-yellow-50 rounded-lg text-center border-2 border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-600">{badge_count.legendary}</p>
                  <p className="text-xs text-yellow-700">{t('superpin.badges.rarity.legendary')}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center border-2 border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">{badge_count.epic}</p>
                  <p className="text-xs text-purple-700">{t('superpin.badges.rarity.epic')}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center border-2 border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">{badge_count.rare}</p>
                  <p className="text-xs text-blue-700">{t('superpin.badges.rarity.rare')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center border-2 border-gray-200">
                  <p className="text-2xl font-bold text-gray-600">{badge_count.common}</p>
                  <p className="text-xs text-gray-700">{t('superpin.badges.rarity.common')}</p>
                </div>
              </div>
              
              {/* Badges Grid */}
              {badges.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('superpin.badges.noBadges')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badges.map((badge) => (
                    <div 
                      key={badge.badge_id}
                      className={`p-4 rounded-xl border-2 ${getRarityStyle(badge.rarity)} transition-transform hover:scale-105`}
                    >
                      <div className="text-center">
                        <span className={`text-4xl ${badge.rarity === 'legendary' ? 'animate-bounce' : ''}`}>
                          {badge.icon}
                        </span>
                        <p className="font-bold mt-2">{badge.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                        {badge.temporada && (
                          <Badge className="mt-2" variant="outline">{badge.temporada}</Badge>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(badge.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            {/* Comments Section */}
            <CommentsSection
              targetId={jugadorId}
              targetType="player"
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
