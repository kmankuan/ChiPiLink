/**
 * Analytics Dashboard Page
 * Dashboard con visualización de tendencias y estadísticas de la comunidad
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, Users, Trophy, TrendingUp, Calendar, 
  ArrowLeft, Zap, Target, Award, Activity, Flame,
  ChevronUp, ChevronDown, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/analytics/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-indigo-200 text-sm">Estadísticas y tendencias de la comunidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Jugadores Activos"
            value={stats?.total_active_players || 0}
            change={stats?.players_change || 0}
            color="blue"
          />
          <StatCard
            icon={<Trophy className="w-6 h-6" />}
            label="Partidos Esta Semana"
            value={stats?.matches_this_week || 0}
            change={stats?.matches_change || 0}
            color="green"
          />
          <StatCard
            icon={<Zap className="w-6 h-6" />}
            label="Rapid Pin Activos"
            value={stats?.rapid_pin_matches || 0}
            change={stats?.rapidpin_change || 0}
            color="orange"
          />
          <StatCard
            icon={<Target className="w-6 h-6" />}
            label="Retos Completados"
            value={stats?.challenges_completed || 0}
            change={stats?.challenges_change || 0}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              <Activity className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              Jugadores
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-white/20">
              <Trophy className="w-4 h-4 mr-2" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="challenges" className="data-[state=active]:bg-white/20">
              <Target className="w-4 h-4 mr-2" />
              Retos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Actividad Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityChart data={stats?.weekly_activity || []} />
                </CardContent>
              </Card>

              {/* Distribution */}
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Distribución de Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DistributionChart
                    superpin={stats?.superpin_matches || 0}
                    rapidpin={stats?.rapid_pin_matches || 0}
                    challenges={stats?.challenges_completed || 0}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Top Players & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    Jugadores Más Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TopPlayersList players={stats?.top_active_players || []} />
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Logros Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentAchievements achievements={stats?.recent_achievements || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white/10 border-white/20 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Ranking de Actividad</CardTitle>
                  <CardDescription className="text-white/60">
                    Jugadores ordenados por partidos jugados esta semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityRanking players={stats?.activity_ranking || []} />
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Nuevos Jugadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <NewPlayersList players={stats?.new_players || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Super Pin vs Rapid Pin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ComparisonChart
                    label1="Super Pin"
                    value1={stats?.superpin_matches || 0}
                    label2="Rapid Pin"
                    value2={stats?.rapid_pin_matches || 0}
                  />
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Partidos por Día</CardTitle>
                </CardHeader>
                <CardContent>
                  <DailyMatchesChart data={stats?.daily_matches || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Top Retadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChallengeLeaderboard entries={stats?.challenge_leaderboard || []} />
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Retos Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <PopularChallenges challenges={stats?.popular_challenges || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============== SUB COMPONENTS ==============

function StatCard({ icon, label, value, change, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            {icon}
          </div>
          {change !== 0 && (
            <Badge 
              variant="outline" 
              className={`${isPositive ? 'border-green-500 text-green-400' : isNegative ? 'border-red-500 text-red-400' : 'border-gray-500 text-gray-400'}`}
            >
              {isPositive ? <ChevronUp className="w-3 h-3" /> : isNegative ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-sm text-white/60">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityChart({ data }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-white/60 text-center py-8">No hay datos disponibles</p>
      ) : (
        <div className="flex items-end gap-2 h-40">
          {data.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all duration-500 hover:from-indigo-400 hover:to-purple-400"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? '8px' : '0'
                }}
              />
              <span className="text-xs text-white/60">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DistributionChart({ superpin, rapidpin, challenges }) {
  const total = superpin + rapidpin + challenges || 1;
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <ProgressBar label="Super Pin" value={superpin} total={total} color="from-green-500 to-green-600" />
        <ProgressBar label="Rapid Pin" value={rapidpin} total={total} color="from-orange-500 to-orange-600" />
        <ProgressBar label="Retos" value={challenges} total={total} color="from-purple-500 to-purple-600" />
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }) {
  const percent = ((value / total) * 100).toFixed(0);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-white/80">{label}</span>
        <span className="text-white font-medium">{value} ({percent}%)</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function TopPlayersList({ players }) {
  if (players.length === 0) {
    return <p className="text-white/60 text-center py-8">No hay datos</p>;
  }

  return (
    <div className="space-y-3">
      {players.slice(0, 5).map((player, idx) => (
        <div key={player.jugador_id || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-white/60'}`}>
              #{idx + 1}
            </span>
            <span className="text-white font-medium">
              {player.apodo || player.name || 'Jugador'}
            </span>
          </div>
          <Badge variant="outline" className="border-indigo-500 text-indigo-300">
            {player.matches_count || 0} partidos
          </Badge>
        </div>
      ))}
    </div>
  );
}

function RecentAchievements({ achievements }) {
  if (achievements.length === 0) {
    return <p className="text-white/60 text-center py-8">No hay logros recientes</p>;
  }

  return (
    <div className="space-y-3">
      {achievements.slice(0, 5).map((achievement, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <span className="text-2xl">{achievement.icon || '🏆'}</span>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{achievement.name}</p>
            <p className="text-white/60 text-xs">{achievement.player_name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRanking({ players }) {
  return (
    <div className="space-y-2">
      {players.length === 0 ? (
        <p className="text-white/60 text-center py-8">No hay datos</p>
      ) : (
        players.map((player, idx) => (
          <div key={player.jugador_id || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {idx + 1}
              </span>
              <div>
                <p className="text-white font-medium">{player.apodo || player.name}</p>
                <p className="text-white/60 text-xs">ELO: {player.elo_rating || 1000}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{player.matches_this_week || 0}</p>
              <p className="text-white/60 text-xs">partidos</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NewPlayersList({ players }) {
  return (
    <div className="space-y-2">
      {players.length === 0 ? (
        <p className="text-white/60 text-center py-4">No hay nuevos jugadores</p>
      ) : (
        players.map((player, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm">{player.name}</p>
              <p className="text-white/60 text-xs">Nuevo</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ComparisonChart({ label1, value1, label2, value2 }) {
  const total = value1 + value2 || 1;
  const percent1 = ((value1 / total) * 100).toFixed(0);
  const percent2 = ((value2 / total) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">{value1}</p>
          <p className="text-white/60 text-sm">{label1}</p>
        </div>
        <div className="text-white/40 text-2xl">vs</div>
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-400">{value2}</p>
          <p className="text-white/60 text-sm">{label2}</p>
        </div>
      </div>
      <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{ width: `${percent1}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
          style={{ width: `${percent2}%` }}
        />
      </div>
      <div className="flex justify-between text-sm text-white/60">
        <span>{percent1}%</span>
        <span>{percent2}%</span>
      </div>
    </div>
  );
}

function DailyMatchesChart({ data }) {
  const maxValue = Math.max(...data.map(d => d.count), 1);
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {days.map((day, idx) => {
        const dayData = data.find(d => d.day === idx) || { count: 0 };
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-2">
            <div 
              className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all duration-300 hover:from-blue-400 hover:to-cyan-300"
              style={{ 
                height: `${(dayData.count / maxValue) * 100}%`,
                minHeight: dayData.count > 0 ? '4px' : '0'
              }}
            />
            <span className="text-xs text-white/60">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeLeaderboard({ entries }) {
  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-white/60 text-center py-8">No hay datos</p>
      ) : (
        entries.slice(0, 5).map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`text-lg ${idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}`}>
                {idx < 3 ? ['👑', '🥈', '🥉'][idx] : `#${idx + 1}`}
              </span>
              <span className="text-white">{entry.jugador_info?.apodo || entry.jugador_info?.nombre || 'Jugador'}</span>
            </div>
            <div className="text-right">
              <p className="text-purple-400 font-bold">{entry.total_points} pts</p>
              <p className="text-white/60 text-xs">{entry.challenges_completed} retos</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PopularChallenges({ challenges }) {
  return (
    <div className="space-y-2">
      {challenges.length === 0 ? (
        <p className="text-white/60 text-center py-8">No hay datos</p>
      ) : (
        challenges.slice(0, 5).map((challenge, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-2xl">{challenge.icon || '🎯'}</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{challenge.name}</p>
              <p className="text-white/60 text-xs">{challenge.completions || 0} completados</p>
            </div>
            <Badge variant="outline" className="border-purple-500 text-purple-300">
              +{challenge.points_reward} pts
            </Badge>
          </div>
        ))
      )}
    </div>
  );
}
