/**
 * Weekly Challenges Component
 * Shows weekly challenges and player progress
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, Trophy, Flame, Users, Calendar, Clock,
  ChevronRight, Play, Check, Star, Loader2, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const difficultyConfig = {
  easy: { color: 'bg-green-500', label: 'Easy', icon: '🟢' },
  medium: { color: 'bg-yellow-500', label: 'Medium', icon: '🟡' },
  hard: { color: 'bg-orange-500', label: 'Hard', icon: '🟠' },
  extreme: { color: 'bg-red-500', label: 'Extreme', icon: '🔴' }
};

export default function WeeklyChallenges({ playerId }) {
  const { t } = useTranslation();
  const [weeklyChallenges, setWeeklyChallenges] = useState([]);
  const [playerChallenges, setPlayerChallenges] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    try {
      // Fetch weekly challenges
      const weeklyRes = await fetch(`${API_URL}/api/pinpanclub/challenges/weekly`);
      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setWeeklyChallenges(data.challenges || []);
      }

      // Fetch player challenges if logged in
      if (playerId) {
        const playerRes = await fetch(`${API_URL}/api/pinpanclub/challenges/player/${playerId}`);
        if (playerRes.ok) {
          const data = await playerRes.json();
          setPlayerChallenges(data.challenges || []);
          setPlayerStats(data.stats);
        }
      }

      // Fetch leaderboard
      const lbRes = await fetch(`${API_URL}/api/pinpanclub/challenges/leaderboard?limit=10`);
      if (lbRes.ok) {
        const data = await lbRes.json();
        setLeaderboard(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async (challengeId) => {
    if (!playerId) {
      toast.error(t('challenges.loginRequired'));
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/challenges/start/${challengeId}?player_id=${playerIdToUse}`,
        { method: 'POST' }
      );

      if (response.ok) {
        toast.success(t('challenges.started'));
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || t('challenges.errorStarting'));
      }
    } catch (error) {
      toast.error(t('challenges.errorStarting'));
    }
  };

  const isParticipating = (challengeId) => {
    return playerChallenges.some(pc => 
      pc.challenge_id === challengeId && 
      ['in_progress', 'available'].includes(pc.status)
    );
  };

  const getProgress = (challengeId) => {
    return playerChallenges.find(pc => pc.challenge_id === challengeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('challenges.weeklyTitle')}</h2>
            <p className="text-muted-foreground">{t('challenges.subtitle')}</p>
          </div>
        </div>

        {playerStats && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">{playerStats.challenges_completed}</p>
              <p className="text-xs text-muted-foreground">{t('challenges.completed')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{playerStats.total_points}</p>
              <p className="text-xs text-muted-foreground">{t('challenges.points')}</p>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">
            <Calendar className="w-4 h-4 mr-2" />
            {t('challenges.thisWeek')}
          </TabsTrigger>
          <TabsTrigger value="my-challenges">
            <Target className="w-4 h-4 mr-2" />
            {t('challenges.myChallenges')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            {t('challenges.ranking')}
          </TabsTrigger>
        </TabsList>

        {/* Weekly Challenges Tab */}
        <TabsContent value="weekly">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weeklyChallenges.map((challenge) => {
              const diff = difficultyConfig[challenge.difficulty] || difficultyConfig.medium;
              const progress = getProgress(challenge.challenge_id);
              const participating = isParticipating(challenge.challenge_id);

              return (
                <Card 
                  key={challenge.challenge_id}
                  className={`transition-all ${participating ? 'border-purple-500/50 bg-purple-50/50' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{challenge.icon}</span>
                      <Badge className={`${diff.color} text-white`}>
                        {diff.icon} {diff.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{challenge.name}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recompensa</span>
                        <span className="font-bold text-yellow-500 flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {challenge.points_reward} pts
                        </span>
                      </div>

                      {progress && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progreso</span>
                            <span>{progress.current_value}/{progress.target_value}</span>
                          </div>
                          <Progress value={progress.progress_percent} className="h-2" />
                        </div>
                      )}

                      {participating ? (
                        progress?.status === 'completed' ? (
                          <Badge className="w-full justify-center bg-green-500">
                            <Check className="w-4 h-4 mr-1" />
                            ¡Completado!
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="w-full justify-center">
                            <Clock className="w-4 h-4 mr-1" />
                            En Progreso
                          </Badge>
                        )
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => startChallenge(challenge.challenge_id)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Participar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {weeklyChallenges.length === 0 && (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay retos esta semana</p>
            </Card>
          )}
        </TabsContent>

        {/* My Challenges Tab */}
        <TabsContent value="my-challenges">
          {playerChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No has iniciado ningún reto</p>
              <Button variant="outline" onClick={() => document.querySelector('[value="weekly"]')?.click()}>
                Ver Retos Disponibles
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {playerChallenges.map((pc) => (
                <Card key={pc.progress_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{pc.challenge_info?.icon || '🎯'}</span>
                      <div>
                        <h4 className="font-medium">{pc.challenge_info?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pc.current_value}/{pc.target_value} completado
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress value={pc.progress_percent} className="h-2" />
                      </div>
                      <Badge variant={pc.status === 'completed' ? 'default' : 'secondary'}>
                        {pc.status === 'completed' ? '✓ Completado' : 'En Progreso'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Top Retadores</CardTitle>
              <CardDescription>Jugadores con más puntos en retos</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aún no hay participantes
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div 
                      key={entry.jugador_id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        idx < 3 ? 'bg-yellow-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xl w-8">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                        </span>
                        <span className="font-medium">
                          {entry.jugador_info?.apodo || entry.jugador_info?.nombre || 'Jugador'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-purple-500 font-bold">
                          {entry.challenges_completed} retos
                        </span>
                        <span className="text-yellow-500 font-bold">
                          {entry.total_points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
