/**
 * PinPanClubFeedBlock - Club activity block for Landing Page
 * Shows matches, ranking, challenges, achievements, and tournaments
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trophy, Swords, Target, Medal, Users, Calendar, 
  ArrowRight, ChevronRight, Flame, Star, Crown,
  Settings, Eye, EyeOff, RefreshCw, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getLocalizedText } from '@/components/admin/MultilingualInput';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to check visibility based on user role
const checkVisibility = (visibilityConfig, user) => {
  if (!visibilityConfig) return true;
  
  // Public access
  if (!user && visibilityConfig.public) return true;
  if (!user) return false;
  
  // Specific user access
  if (visibilityConfig.specific_users?.includes(user.id)) return true;
  
  // Role-based access
  const role = user.role || user.rol || 'registered';
  
  if (role === 'super_admin' && visibilityConfig.super_admin) return true;
  if (role === 'admin' && visibilityConfig.admin) return true;
  if (role === 'moderator' && visibilityConfig.moderator) return true;
  if (visibilityConfig.registered) return true;
  
  return false;
};

// Difficulty badge colors
const difficultyColors = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  extreme: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

// Rarity colors for achievements
const rarityColors = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-400 bg-blue-50',
  epic: 'border-purple-400 bg-purple-50',
  legendary: 'border-yellow-400 bg-yellow-50 animate-pulse'
};

export default function PinPanClubFeedBlock({ config, isEditMode, onUpdateConfig }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Default to Spanish if language not properly detected
  const detectedLang = i18n.language?.split('-')[0];
  const lang = ['es', 'en', 'zh'].includes(detectedLang) ? detectedLang : 'es';
  const L = (value) => getLocalizedText(value, lang);

  // Use centralized i18n translations directly via t() function
  // No intermediate txt object needed - use t() calls inline for cleaner code

  useEffect(() => {
    fetchFeedData();
  }, [config]);

  const fetchFeedData = async () => {
    setLoading(true);
    try {
      const sections = config?.sections || {};
      const params = new URLSearchParams({
        lang,
        include_matches: sections.recent_matches?.enabled ?? true,
        include_leaderboard: sections.leaderboard?.enabled ?? true,
        include_challenges: sections.active_challenges?.enabled ?? true,
        include_achievements: sections.recent_achievements?.enabled ?? true,
        include_stats: sections.active_players?.enabled ?? true,
        include_tournaments: sections.upcoming_tournaments?.enabled ?? true,
        matches_limit: sections.recent_matches?.limit || 5,
        leaderboard_limit: sections.leaderboard?.limit || 10,
        challenges_limit: sections.active_challenges?.limit || 4,
        achievements_limit: sections.recent_achievements?.limit || 6,
        tournaments_limit: sections.upcoming_tournaments?.limit || 3
      });

      const res = await fetch(`${API_URL}/api/pinpanclub/public/activity-feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFeedData(data);
      }
    } catch (error) {
      console.error('Error fetching PinPanClub feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSectionConfig = (sectionKey, field, value) => {
    const newSections = {
      ...config.sections,
      [sectionKey]: {
        ...config.sections?.[sectionKey],
        [field]: value
      }
    };
    onUpdateConfig({ sections: newSections });
  };

  const updateSectionVisibility = (sectionKey, visKey, value) => {
    const newSections = {
      ...config.sections,
      [sectionKey]: {
        ...config.sections?.[sectionKey],
        visibility: {
          ...config.sections?.[sectionKey]?.visibility,
          [visKey]: value
        }
      }
    };
    onUpdateConfig({ sections: newSections });
  };

  // Check if block should be visible to current user
  if (!checkVisibility(config?.visibility, user)) {
    return null;
  }

  if (loading) {
    return (
      <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">{t('pinpanclub.loading')}</span>
        </div>
      </section>
    );
  }

  const sections = config?.sections || {};
  const hasTitle = config?.titulo && (L(config.titulo) || '').trim().length > 0;

  return (
    <section className="px-4 md:px-8 lg:px-12 py-8 max-w-7xl mx-auto" data-testid="pinpanclub-feed-block">
      {/* Header - Only show if title is configured */}
      {(hasTitle || isEditMode) && (
        <div className="flex items-center justify-between mb-8">
          <div>
            {hasTitle && (
              <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
                {L(config.titulo)}
              </h2>
            )}
            {config?.subtitulo && L(config.subtitulo) && (
              <p className="text-muted-foreground mt-2">{L(config.subtitulo)}</p>
            )}
          </div>
          
          {/* Admin Settings */}
          {isEditMode && (
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('admin.settings')}
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t('admin.settings')}</SheetTitle>
                <SheetDescription>{t('pinpanclub.settingsDesc')}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                {Object.entries(sections).map(([key, section]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium capitalize">
                        {L(section.title) || key.replace(/_/g, ' ')}
                      </Label>
                      <Switch
                        checked={section.enabled ?? true}
                        onCheckedChange={(v) => updateSectionConfig(key, 'enabled', v)}
                      />
                    </div>
                    
                    {section.enabled !== false && (
                      <div className="space-y-3 pl-4 border-l-2 border-muted">
                        <p className="text-sm font-medium text-muted-foreground">{t('pinpanclub.visibility')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['public', 'registered', 'moderator', 'admin', 'super_admin'].map((role) => (
                            <div key={role} className="flex items-center gap-2">
                              <Switch
                                id={`${key}-${role}`}
                                checked={section.visibility?.[role] ?? true}
                                onCheckedChange={(v) => updateSectionVisibility(key, role, v)}
                                className="scale-75"
                              />
                              <Label htmlFor={`${key}-${role}`} className="text-xs">
                                {t(`pinpanclub.roles.${role}`, role)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
        </div>
      )}

      {/* Stats Summary */}
      {sections.active_players?.enabled !== false && 
       checkVisibility(sections.active_players?.visibility, user) && 
       feedData?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200">
            <CardContent className="pt-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold text-green-700">{feedData.stats.active_players}</p>
              <p className="text-sm text-green-600">{t('pinpanclub.activePlayers')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200">
            <CardContent className="pt-4 text-center">
              <Swords className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold text-blue-700">{feedData.stats.superpin_matches}</p>
              <p className="text-sm text-blue-600">{t('pinpanclub.superpin')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200">
            <CardContent className="pt-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-3xl font-bold text-orange-700">{feedData.stats.rapidpin_matches}</p>
              <p className="text-sm text-orange-600">{t('pinpanclub.rapidpin')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200">
            <CardContent className="pt-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold text-purple-700">{feedData.stats.total_matches}</p>
              <p className="text-sm text-purple-600">{t('common.total')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Matches & Challenges */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Matches - Tabs for Super Pin and Rapid Pin */}
          {sections.recent_matches?.enabled !== false && 
           checkVisibility(sections.recent_matches?.visibility, user) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  {L(sections.recent_matches?.title) || t('pinpanclub.recentMatches')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="superpin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="superpin" className="gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      {t('pinpanclub.superPinMatches')}
                    </TabsTrigger>
                    <TabsTrigger value="rapidpin" className="gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      {t('pinpanclub.rapidPinMatches')}
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Super Pin Matches */}
                  <TabsContent value="superpin">
                    {feedData?.recent_matches?.filter(m => m.type === 'superpin').length > 0 ? (
                      <div className="space-y-3">
                        {feedData.recent_matches.filter(m => m.type === 'superpin').slice(0, 5).map((match, idx) => (
                          <div 
                            key={match.match_id || idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20 hover:from-yellow-100 dark:hover:from-yellow-950/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-8 w-8 ring-2 ring-yellow-400">
                                <AvatarImage src={match.player1?.avatar} />
                                <AvatarFallback>{match.player1?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${match.winner_id === match.player1?.id ? 'text-green-600' : ''}`}>
                                  {match.player1?.nickname || match.player1?.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3">
                              <Badge className="bg-yellow-500 text-white text-xs">
                                {match.result}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <div className="flex-1 min-w-0 text-right">
                                <p className={`text-sm font-medium truncate ${match.winner_id === match.player2?.id ? 'text-green-600' : ''}`}>
                                  {match.player2?.nickname || match.player2?.name}
                                </p>
                              </div>
                              <Avatar className="h-8 w-8 ring-2 ring-yellow-400">
                                <AvatarImage src={match.player2?.avatar} />
                                <AvatarFallback>{match.player2?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => navigate('/pinpanclub/superpin/ranking')}
                        >
                          {t('pinpanclub.viewAll')} Super Pin
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">{t('pinpanclub.noData')}</p>
                    )}
                  </TabsContent>
                  
                  {/* Rapid Pin Matches */}
                  <TabsContent value="rapidpin">
                    {feedData?.recent_matches?.filter(m => m.type === 'rapidpin').length > 0 ? (
                      <div className="space-y-3">
                        {feedData.recent_matches.filter(m => m.type === 'rapidpin').slice(0, 5).map((match, idx) => (
                          <div 
                            key={match.match_id || idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 hover:from-orange-100 dark:hover:from-orange-950/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-8 w-8 ring-2 ring-orange-400">
                                <AvatarImage src={match.player1?.avatar} />
                                <AvatarFallback>{match.player1?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${match.winner_id === match.player1?.id ? 'text-green-600' : ''}`}>
                                  {match.player1?.nickname || match.player1?.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3">
                              <Badge className="bg-orange-500 text-white text-xs">
                                {match.result}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <div className="flex-1 min-w-0 text-right">
                                <p className={`text-sm font-medium truncate ${match.winner_id === match.player2?.id ? 'text-green-600' : ''}`}>
                                  {match.player2?.nickname || match.player2?.name}
                                </p>
                              </div>
                              <Avatar className="h-8 w-8 ring-2 ring-orange-400">
                                <AvatarImage src={match.player2?.avatar} />
                                <AvatarFallback>{match.player2?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => navigate('/pinpanclub/rapidpin')}
                        >
                          {t('pinpanclub.viewAll')} Rapid Pin
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">{t('pinpanclub.noData')}</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Active Challenges */}
          {sections.active_challenges?.enabled !== false && 
           checkVisibility(sections.active_challenges?.visibility, user) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {L(sections.active_challenges?.title) || t('pinpanclub.activeChallenges')}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/pinpanclub/challenges')}
                >
                  {t('pinpanclub.viewAll')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {feedData?.active_challenges?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedData.active_challenges.map((challenge, idx) => (
                      <div 
                        key={challenge.challenge_id || idx}
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{challenge.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium">{challenge.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={difficultyColors[challenge.difficulty] || difficultyColors.normal}>
                                {challenge.difficulty}
                              </Badge>
                              <Badge variant="outline">+{challenge.points} {t('pinpanclub.points')}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">{t('pinpanclub.noData')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Leaderboard, Achievements, Tournaments */}
        <div className="space-y-6">
          {/* Leaderboard */}
          {sections.leaderboard?.enabled !== false && 
           checkVisibility(sections.leaderboard?.visibility, user) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {L(sections.leaderboard?.title) || t('pinpanclub.leaderboard')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedData?.leaderboard?.length > 0 ? (
                  <div className="space-y-2">
                    {feedData.leaderboard.slice(0, 10).map((player, idx) => (
                      <div 
                        key={player.player_id || idx}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          idx < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20' : ''
                        }`}
                      >
                        <div className="w-6 text-center font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {player.nickname || player.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {player.wins}{t('pinpanclub.wins')} - {player.losses}{t('pinpanclub.losses')}
                          </p>
                        </div>
                        <div className="font-bold text-primary">
                          {player.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">{t('pinpanclub.noData')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Achievements */}
          {sections.recent_achievements?.enabled !== false && 
           checkVisibility(sections.recent_achievements?.visibility, user) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-purple-500" />
                  {L(sections.recent_achievements?.title) || t('pinpanclub.recentAchievements')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedData?.recent_achievements?.length > 0 ? (
                  <div className="space-y-3">
                    {feedData.recent_achievements.map((achievement, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-3 p-2 rounded-lg border ${rarityColors[achievement.rarity] || rarityColors.common}`}
                      >
                        <span className="text-xl">{achievement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{achievement.name}</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={achievement.player?.avatar} />
                              <AvatarFallback className="text-xs">{achievement.player?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {achievement.player?.nickname || achievement.player?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">{t('pinpanclub.noData')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Tournaments */}
          {sections.upcoming_tournaments?.enabled !== false && 
           checkVisibility(sections.upcoming_tournaments?.visibility, user) &&
           feedData?.upcoming_tournaments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  {L(sections.upcoming_tournaments?.title) || t('pinpanclub.upcomingTournaments')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedData.upcoming_tournaments.map((tournament, idx) => (
                    <div 
                      key={tournament.tournament_id || idx}
                      className="p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{tournament.name}</p>
                        <Badge variant="outline">{tournament.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tournament.current_participants}/{tournament.max_participants} {t('pinpanclub.participants')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* CTA Button */}
      {config?.style?.show_cta !== false && (
        <div className="text-center mt-8">
          <Button 
            size="lg"
            onClick={() => navigate(config?.style?.cta_url || '/pinpanclub/superpin/ranking')}
            className="rounded-full px-8"
          >
            {L(config?.style?.cta_text) || t('pinpanclub.viewAll')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}
    </section>
  );
}
