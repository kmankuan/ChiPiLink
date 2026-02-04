/**
 * RankingSeasons - Components for ranking seasons system
 * Includes: SeasonBanner, SeasonLeaderboard, SeasonRewardsPreview, PastSeasons
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy, Calendar, Users, Target, Clock, ChevronRight,
  Crown, Medal, Star, Award, Gift, Flame, TrendingUp,
  Timer, Sparkles, History, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============== SEASON BANNER ==============

export function SeasonBanner({ onViewLeaderboard }) {
  const { t, i18n } = useTranslation();
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  
  const lang = i18n.language || 'es';
  
  useEffect(() => {
    fetchCurrentSeason();
  }, [lang]);
  
  useEffect(() => {
    if (!season?.end_date) return;
    
    const updateTimer = () => {
      const end = new Date(season.end_date);
      const now = new Date();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft({ days, hours, minutes });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [season]);
  
  const fetchCurrentSeason = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/seasons/current?lang=${lang}`);
      if (response.ok) {
        const data = await response.json();
        setSeason(data.season);
      }
    } catch (error) {
      console.error('Error fetching season:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-32 bg-gradient-to-r from-purple-100 to-indigo-100" />
      </Card>
    );
  }
  
  if (!season) {
    return null;
  }
  
  const themeColors = season.theme?.colors || { primary: '#8b5cf6', secondary: '#a78bfa' };
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div 
        className="relative p-6"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Season Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <span className="text-4xl">{season.theme?.icon || '🏆'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">
                  {season.localized_name || season.name?.es}
                </h2>
                <Badge className="bg-white/20 text-white border-0">
                  {t('seasons.active')}
                </Badge>
              </div>
              <p className="text-white/80 text-sm mt-1">
                {season.localized_description || season.description?.es}
              </p>
            </div>
          </div>
          
          {/* Time Left */}
          {timeLeft && (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  <p className="text-2xl font-bold text-white">{timeLeft.days}</p>
                  <p className="text-xs text-white/70">{t('seasons.days')}</p>
                </div>
              </div>
              <span className="text-white/50 text-xl">:</span>
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  <p className="text-2xl font-bold text-white">{timeLeft.hours}</p>
                  <p className="text-xs text-white/70">{t('seasons.hours')}</p>
                </div>
              </div>
              <span className="text-white/50 text-xl">:</span>
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  <p className="text-2xl font-bold text-white">{timeLeft.minutes}</p>
                  <p className="text-xs text-white/70">{t('seasons.minutes')}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* View Leaderboard Button */}
          <Button 
            onClick={onViewLeaderboard}
            className="bg-white text-purple-700 hover:bg-white/90"
          >
            <Trophy className="w-4 h-4 mr-2" />
            {t('seasons.viewLeaderboard')}
          </Button>
        </div>
        
        {/* Stats */}
        <div className="relative flex items-center gap-6 mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80">
            <Users className="w-4 h-4" />
            <span>{season.total_participants || 0} {t('seasons.participants')}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Target className="w-4 h-4" />
            <span>{season.total_challenges_completed || 0} {t('seasons.challengesCompleted')}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Flame className="w-4 h-4" />
            <span>{season.total_points_earned || 0} {t('seasons.pointsEarned')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============== SEASON LEADERBOARD ==============

export function SeasonLeaderboard({ seasonId, limit = 10, showFull = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [seasonId]);
  
  const fetchLeaderboard = async () => {
    try {
      const endpoint = seasonId 
        ? `${API_URL}/api/pinpanclub/seasons/${seasonId}/leaderboard?limit=${limit}`
        : `${API_URL}/api/pinpanclub/seasons/current/leaderboard?limit=${limit}`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getPositionStyle = (position) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getPositionIcon = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t('seasons.leaderboard')}
        </CardTitle>
        {!showFull && leaderboard.length >= limit && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub/seasons')}>
            {t('seasons.viewAll')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{t('seasons.noParticipants')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.player_id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all
                  ${entry.position <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'hover:bg-gray-50'}
                `}
              >
                {/* Position */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold
                  ${getPositionStyle(entry.position)}
                `}>
                  {getPositionIcon(entry.position) || entry.position}
                </div>
                
                {/* Player Info */}
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/pinpanclub/superpin/player/${entry.player_id}`)}
                >
                  <p className="font-medium">
                    {entry.player_info?.nickname || entry.player_info?.name || 'Player'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.challenges_completed} {t('seasons.challenges')}
                  </p>
                </div>
                
                {/* Points */}
                <div className="text-right">
                  <p className="font-bold text-purple-600">{entry.season_points}</p>
                  <p className="text-xs text-gray-400">{t('seasons.points')}</p>
                </div>
                
                {/* Trend indicator for top positions */}
                {entry.position <= 3 && (
                  <div className="w-8">
                    {entry.position === 1 && <Crown className="w-6 h-6 text-yellow-500 animate-bounce" />}
                    {entry.position === 2 && <Medal className="w-6 h-6 text-gray-400" />}
                    {entry.position === 3 && <Award className="w-6 h-6 text-orange-500" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== SEASON REWARDS PREVIEW ==============

export function SeasonRewardsPreview({ seasonId }) {
  const { t, i18n } = useTranslation();
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const lang = i18n.language || 'es';
  
  useEffect(() => {
    fetchSeason();
  }, [seasonId, lang]);
  
  const fetchSeason = async () => {
    try {
      const endpoint = seasonId 
        ? `${API_URL}/api/pinpanclub/seasons/${seasonId}?lang=${lang}`
        : `${API_URL}/api/pinpanclub/seasons/current?lang=${lang}`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setSeason(data.season);
      }
    } catch (error) {
      console.error('Error fetching season:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !season) {
    return null;
  }
  
  const rewardTiers = season.reward_tiers || [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-500" />
          {t('seasons.rewards')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {rewardTiers.slice(0, 4).map((tier, idx) => (
            <div
              key={tier.tier_name}
              className={`
                p-4 rounded-xl border-2 text-center
                ${idx === 0 
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' 
                  : idx === 1 
                    ? 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
                    : idx === 2
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              {/* Position range */}
              <p className="text-sm text-gray-500 mb-2">
                {tier.position_start === tier.position_end 
                  ? `#${tier.position_start}`
                  : `#${tier.position_start} - #${tier.position_end}`
                }
              </p>
              
              {/* Badge icon */}
              {tier.badge && (
                <span className="text-3xl">{tier.badge.icon}</span>
              )}
              
              {/* Tier name */}
              <p className="font-bold mt-2">
                {tier.badge?.name?.[lang] || tier.tier_name}
              </p>
              
              {/* Points */}
              <Badge variant="secondary" className="mt-2">
                +{tier.bonus_points} pts
              </Badge>
              
              {/* Perks preview */}
              {tier.perks && tier.perks.length > 0 && (
                <p className="text-xs text-purple-600 mt-2">
                  +{tier.perks.length} {t('seasons.perks')}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== PLAYER SEASON CARD ==============

export function PlayerSeasonCard({ playerId }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (playerId) {
      fetchStats();
    }
  }, [playerId]);
  
  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/seasons/player/${playerId}/current`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching season stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-24" />
      </Card>
    );
  }
  
  if (!stats || !stats.participating) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">{t('seasons.notParticipating')}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t('seasons.completeChallengesToJoin')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              #{stats.current_position || '?'}
            </div>
            <div>
              <p className="font-medium">{t('seasons.yourPosition')}</p>
              <p className="text-sm text-gray-500">
                {stats.season_points} {t('seasons.points')} • {stats.challenges_completed} {t('seasons.challenges')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-purple-600">
              <Flame className="w-4 h-4" />
              <span className="font-bold">{stats.current_streak || 0}</span>
            </div>
            <p className="text-xs text-gray-400">{t('seasons.streak')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============== PAST SEASONS ==============

export function PastSeasons({ limit = 5 }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const lang = i18n.language || 'es';
  
  useEffect(() => {
    fetchPastSeasons();
  }, [lang]);
  
  const fetchPastSeasons = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/seasons/past?limit=${limit}&lang=${lang}`);
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
      }
    } catch (error) {
      console.error('Error fetching past seasons:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || seasons.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          {t('seasons.pastSeasons')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {seasons.map((season) => (
            <div
              key={season.season_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => navigate(`/pinpanclub/seasons/${season.season_id}`)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{season.theme?.icon || '🏆'}</span>
                <div>
                  <p className="font-medium">{season.localized_name}</p>
                  <p className="text-xs text-gray-500">
                    {season.total_participants} {t('seasons.participants')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Export default combined component
export default function RankingSeasons({ playerId }) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <SeasonBanner onViewLeaderboard={() => navigate('/pinpanclub/seasons')} />
      
      {playerId && <PlayerSeasonCard playerId={playerId} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeasonLeaderboard limit={10} />
        <SeasonRewardsPreview />
      </div>
      
      <PastSeasons limit={3} />
    </div>
  );
}
