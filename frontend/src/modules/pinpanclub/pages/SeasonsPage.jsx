/**
 * SeasonsPage - Página dedicada a las temporadas de ranking
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Trophy, Calendar, Users, Target,
  Crown, Medal, Award, Gift, Flame, History,
  ChevronRight, Timer, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SeasonBanner,
  SeasonLeaderboard,
  SeasonRewardsPreview,
  PlayerSeasonCard,
  PastSeasons
} from '../components/RankingSeasons';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SeasonsPage() {
  const { t, i18n } = useTranslation();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSeason, setCurrentSeason] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);
  
  const lang = i18n.language || 'es';
  const currentUserId = user?.user_id || null;
  
  useEffect(() => {
    fetchSeasonData();
  }, [seasonId, lang]);
  
  const fetchSeasonData = async () => {
    try {
      // Fetch current season
      const currentResponse = await fetch(`${API_URL}/api/pinpanclub/seasons/current?lang=${lang}`);
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        setCurrentSeason(currentData.season);
      }
      
      // If seasonId provided, fetch that specific season
      if (seasonId) {
        const response = await fetch(`${API_URL}/api/pinpanclub/seasons/${seasonId}?lang=${lang}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedSeason(data.season);
        }
      }
    } catch (error) {
      console.error('Error fetching season:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const displaySeason = selectedSeason || currentSeason;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-white/10 rounded-2xl" />
            <div className="h-96 bg-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/pinpanclub')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
                {t('seasons.title')}
              </h1>
              <p className="text-white/60 mt-1">{t('seasons.subtitle')}</p>
            </div>
          </div>
        </div>
        
        {/* Season Banner */}
        {displaySeason && (
          <div className="mb-6">
            <SeasonBanner />
          </div>
        )}
        
        {/* Player Stats */}
        {currentUserId && currentSeason && !seasonId && (
          <div className="mb-6">
            <PlayerSeasonCard jugadorId={currentUserId} />
          </div>
        )}
        
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
              <Trophy className="w-4 h-4 mr-2" />
              {t('seasons.leaderboard')}
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
              <Gift className="w-4 h-4 mr-2" />
              {t('seasons.rewards')}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
              <History className="w-4 h-4 mr-2" />
              {t('seasons.history')}
            </TabsTrigger>
          </TabsList>
          
          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <SeasonLeaderboard 
              seasonId={seasonId} 
              limit={50} 
              showFull={true} 
            />
          </TabsContent>
          
          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <SeasonRewardsPreview seasonId={seasonId} />
            
            {/* Detailed rewards explanation */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('seasons.howRewardsWork')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-700">{t('seasons.champion')}</h4>
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• +1000 {t('seasons.bonusPoints')}</li>
                      <li>• 🏆 {t('seasons.legendaryBadge')}</li>
                      <li>• {t('seasons.championTitle')}</li>
                      <li>• {t('seasons.exclusivePerks')}</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Medal className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-700">{t('seasons.topPlayers')}</h4>
                    </div>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• #2-3: +500 pts + {t('seasons.epicBadge')}</li>
                      <li>• #4-10: +250 pts + {t('seasons.rareBadge')}</li>
                      <li>• #11-25: +100 pts + {t('seasons.commonBadge')}</li>
                      <li>• {t('seasons.allParticipants')}: +25 pts</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-blue-700 mb-2">{t('seasons.qualificationRequirements')}</h4>
                  <p className="text-sm text-blue-600">
                    {t('seasons.qualificationDesc', { 
                      minChallenges: displaySeason?.min_challenges_to_qualify || 5,
                      minPoints: displaySeason?.min_points_to_qualify || 50
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history">
            <PastSeasons limit={10} />
            
            {/* Player's season rewards history */}
            {currentUserId && (
              <PlayerSeasonRewardsHistory jugadorId={currentUserId} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Player's season rewards history component
function PlayerSeasonRewardsHistory({ jugadorId }) {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRewards();
  }, [jugadorId]);
  
  const fetchRewards = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/seasons/player/${jugadorId}/rewards`);
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="h-32 bg-white/10 rounded-xl animate-pulse mt-6" />;
  }
  
  if (rewards.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-center">
          <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">{t('seasons.noRewardsYet')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('seasons.participateToEarn')}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          {t('seasons.yourRewards')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rewards.map((reward) => (
            <div
              key={reward.reward_id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">{reward.badge_earned?.icon || '🏆'}</span>
                </div>
                <div>
                  <p className="font-medium">{reward.season_info?.name}</p>
                  <p className="text-sm text-gray-500">
                    #{reward.final_position} • {reward.tier_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-yellow-500 text-white">
                  +{reward.bonus_points} pts
                </Badge>
                {reward.badge_earned && (
                  <p className="text-xs text-purple-600 mt-1">
                    {reward.badge_earned.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
