/**
 * Analytics Dashboard - Unified statistics across all PinPanClub game modes
 * Arena tournaments, League, RapidPin, Referee activity
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
import RESOLVED_API_URL from '@/config/apiUrl';
  BarChart3, Users, Trophy, TrendingUp, ArrowLeft, Zap, Shield,
  Activity, Crown, Swords, ChevronUp, ChevronDown, Award, Star
} from 'lucide-react';

const API_URL = RESOLVED_API_URL;

// Color map for game modes
const MODE_COLORS = {
  rapidpin: { bg: 'bg-orange-500', text: 'text-orange-400', bar: 'bg-orange-500' },
  league: { bg: 'bg-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  arena: { bg: 'bg-indigo-500', text: 'text-indigo-400', bar: 'bg-indigo-500' },
};

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/pinpanclub/analytics/dashboard`);
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={() => navigate('/pinpanclub')} data-testid="analytics-back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            <h1 className="text-lg font-bold">Analytics Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="analytics-kpi-cards">
          <KpiCard icon={Users} label="Total Players" value={stats?.total_players || 0} color="blue" />
          <KpiCard icon={Swords} label="Matches This Week" value={stats?.total_matches_week || 0} change={stats?.matches_change} color="green" />
          <KpiCard icon={Trophy} label="Arena Tournaments" value={stats?.arena_tournaments_total || 0} sub={`${stats?.arena_tournaments_active || 0} active`} color="indigo" />
          <KpiCard icon={Shield} label="Active Referees" value={stats?.total_referees || 0} color="purple" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10" data-testid="analytics-tabs">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/60">
              <Activity className="h-4 w-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="arena" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/60">
              <Swords className="h-4 w-4 mr-1.5" /> Arena
            </TabsTrigger>
            <TabsTrigger value="modes" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/60">
              <BarChart3 className="h-4 w-4 mr-1.5" /> Game Modes
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/60">
              <Users className="h-4 w-4 mr-1.5" /> Players
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Weekly Activity Chart */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" /> Weekly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StackedBarChart data={stats?.weekly_activity || []} />
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" /> 4-Week Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StackedBarChart data={stats?.monthly_trend || []} labelKey="week" />
                </CardContent>
              </Card>
            </div>

            {/* Game Mode Breakdown + Top Referee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/5 border-white/10 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Game Mode Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ModeDistribution data={stats?.mode_distribution} />
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" /> Top Referee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TopRefereeCard referee={stats?.top_referee} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ARENA TAB */}
          <TabsContent value="arena" className="space-y-6 mt-4">
            {/* Arena KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Trophy} label="Total Tournaments" value={stats?.arena_tournaments_total || 0} color="indigo" />
              <KpiCard icon={Swords} label="Active" value={stats?.arena_tournaments_active || 0} color="green" />
              <KpiCard icon={Award} label="Completed" value={stats?.arena_tournaments_completed || 0} color="amber" />
              <KpiCard icon={Activity} label="Arena Matches" value={stats?.arena_matches_total || 0} change={stats?.arena_change} color="blue" />
            </div>

            {/* Recent Tournaments */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">Recent Tournaments</CardTitle>
                  <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300" onClick={() => navigate('/pinpanclub/arena')} data-testid="view-all-tournaments-btn">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TournamentList tournaments={stats?.recent_tournaments || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* GAME MODES TAB */}
          <TabsContent value="modes" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModeCard mode="rapidpin" label="RapidPin" icon={Zap} matches={stats?.rapidpin_matches_week || 0} change={stats?.rapidpin_change} total={stats?.mode_distribution?.rapidpin || 0} />
              <ModeCard mode="league" label="PinPan League" icon={Crown} matches={stats?.league_matches_week || 0} change={stats?.league_change} total={stats?.mode_distribution?.league || 0} />
              <ModeCard mode="arena" label="PinPan Arena" icon={Swords} matches={stats?.arena_matches_week || 0} change={stats?.arena_change} total={stats?.mode_distribution?.arena || 0} />
            </div>

            {/* Weekly by mode */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Weekly Matches by Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <StackedBarChart data={stats?.weekly_activity || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLAYERS TAB */}
          <TabsContent value="players" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Active */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-400" /> Most Active This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerList players={stats?.top_active_players || []} valueKey="matches_count" valueLabel="matches" />
                </CardContent>
              </Card>

              {/* Hall of Fame Top */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" /> Hall of Fame Top 5
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300" onClick={() => navigate('/pinpanclub/hall-of-fame')} data-testid="view-hof-btn">
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <HofList entries={stats?.hall_of_fame_top || []} />
                </CardContent>
              </Card>
            </div>

            {/* New Players */}
            {(stats?.new_players || []).length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">New Players This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.new_players.map((p, i) => (
                      <Badge key={i} variant="outline" className="border-emerald-500/50 text-emerald-400">
                        {p.nickname || p.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function KpiCard({ icon: Icon, label, value, change, sub, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-emerald-600 to-emerald-700',
    indigo: 'from-indigo-600 to-indigo-700',
    purple: 'from-purple-600 to-purple-700',
    amber: 'from-amber-600 to-amber-700',
  };
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {change !== undefined && change !== null && (
            <Badge variant="outline" className={`text-xs ${change > 0 ? 'border-emerald-500/50 text-emerald-400' : change < 0 ? 'border-red-500/50 text-red-400' : 'border-white/20 text-white/40'}`}>
              {change > 0 ? <ChevronUp className="h-3 w-3" /> : change < 0 ? <ChevronDown className="h-3 w-3" /> : null}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold">{(value || 0).toLocaleString()}</p>
        <p className="text-xs text-white/50 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-indigo-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StackedBarChart({ data, labelKey = 'label' }) {
  const maxVal = Math.max(...data.map(d => d.total || 0), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-36">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.rapidpin || 0}+{d.league || 0}+{d.arena || 0}={d.total || 0}
            </div>
            <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${((d.total || 0) / maxVal) * 100}%`, minHeight: d.total > 0 ? '4px' : '0' }}>
              {d.rapidpin > 0 && <div className="bg-orange-500" style={{ height: `${(d.rapidpin / (d.total || 1)) * 100}%`, minHeight: '2px' }} />}
              {d.league > 0 && <div className="bg-emerald-500" style={{ height: `${(d.league / (d.total || 1)) * 100}%`, minHeight: '2px' }} />}
              {d.arena > 0 && <div className="bg-indigo-500" style={{ height: `${(d.arena / (d.total || 1)) * 100}%`, minHeight: '2px' }} />}
            </div>
            <span className="text-[10px] text-white/40">{d[labelKey]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 justify-center text-[10px] text-white/50">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500" />RapidPin</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />League</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500" />Arena</span>
      </div>
    </div>
  );
}

function ModeDistribution({ data }) {
  if (!data || data.total === 0) return <p className="text-white/40 text-center py-6">No match data yet</p>;
  const modes = [
    { key: 'rapidpin', label: 'RapidPin', color: MODE_COLORS.rapidpin },
    { key: 'league', label: 'League', color: MODE_COLORS.league },
    { key: 'arena', label: 'Arena', color: MODE_COLORS.arena },
  ];
  return (
    <div className="space-y-3">
      {modes.map(m => {
        const val = data[m.key] || 0;
        const pct = ((val / data.total) * 100).toFixed(0);
        return (
          <div key={m.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className={`${m.color.text} font-medium`}>{m.label}</span>
              <span className="text-white/70">{val} ({pct}%)</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${m.color.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopRefereeCard({ referee }) {
  if (!referee || referee.name === 'N/A') return <p className="text-white/40 text-center py-6">No referee data</p>;
  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
        <Shield className="h-7 w-7 text-purple-400" />
      </div>
      <p className="font-semibold text-white">{referee.name}</p>
      <p className="text-xs text-white/50">{referee.matches} matches officiated</p>
      {referee.rating > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm text-yellow-400">{referee.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function ModeCard({ mode, label, icon: Icon, matches, change, total }) {
  const c = MODE_COLORS[mode];
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-lg ${c.bg}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{label}</p>
            <p className="text-xs text-white/40">{total} total matches</p>
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-3xl font-bold">{matches}</p>
            <p className="text-xs text-white/50">this week</p>
          </div>
          {change !== undefined && change !== null && (
            <Badge variant="outline" className={`${change > 0 ? 'border-emerald-500/50 text-emerald-400' : change < 0 ? 'border-red-500/50 text-red-400' : 'border-white/20 text-white/40'}`}>
              {change > 0 ? '+' : ''}{change}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentList({ tournaments }) {
  const navigate = useNavigate();
  if (tournaments.length === 0) return <p className="text-white/40 text-center py-6">No tournaments yet</p>;
  const statusColors = {
    draft: 'bg-gray-500', registration_open: 'bg-emerald-500', in_progress: 'bg-blue-500', completed: 'bg-amber-500',
  };
  return (
    <div className="space-y-2">
      {tournaments.map(t => (
        <div key={t.tournament_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" onClick={() => navigate(`/pinpanclub/arena/${t.tournament_id}`)} data-testid={`tournament-${t.tournament_id}`}>
          <div className="flex items-center gap-3">
            <Swords className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="font-medium text-sm">{t.name}</p>
              <p className="text-xs text-white/40">{t.format}</p>
            </div>
          </div>
          <Badge className={`${statusColors[t.status] || 'bg-gray-500'} text-white text-xs`}>
            {t.status?.replace('_', ' ')}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PlayerList({ players, valueKey, valueLabel }) {
  if (players.length === 0) return <p className="text-white/40 text-center py-6">No data yet</p>;
  return (
    <div className="space-y-2">
      {players.slice(0, 8).map((p, i) => (
        <div key={p.player_id || i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50'}`}>{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white/50">{(p.nickname || p.name || '?')[0]}</span>}
            </div>
            <span className="text-sm font-medium">{p.nickname || p.name}</span>
          </div>
          <span className="text-xs text-white/50">{p[valueKey]} {valueLabel}</span>
        </div>
      ))}
    </div>
  );
}

function HofList({ entries }) {
  if (entries.length === 0) return <p className="text-white/40 text-center py-6">No Hall of Fame entries</p>;
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={e.player_id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50'}`}>{e.rank || i + 1}</span>
            <span className="text-sm font-medium text-white">{e.player_name || 'Unknown'}</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-yellow-400">{e.total_points} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
