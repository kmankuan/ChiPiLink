/**
 * Hall of Fame - All-Time Global Leaderboard
 * Aggregates player stats across Arena, League, RapidPin + Referee contributions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Trophy, Crown, Medal, Star, ArrowLeft, RefreshCw,
  Swords, Zap, Shield, Users, Award, TrendingUp, ChevronRight
} from 'lucide-react';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RANK_STYLES = [
  { bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-white', icon: Crown, size: 'text-2xl' },
  { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-white', icon: Medal, size: 'text-xl' },
  { bg: 'bg-gradient-to-r from-orange-400 to-orange-500', text: 'text-white', icon: Medal, size: 'text-lg' },
];

function RankBadge({ rank }) {
  if (rank <= 3) {
    const style = RANK_STYLES[rank - 1];
    const Icon = style.icon;
    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bg} ${style.text} font-bold ${style.size} shadow-lg`}>
        {rank === 1 ? <Icon className="h-5 w-5" /> : rank}
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-sm">
      {rank}
    </div>
  );
}

function StatPill({ label, value, icon: Icon, color = 'text-muted-foreground' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}

function PlayerRow({ entry, rank }) {
  const navigate = useNavigate();
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer ${rank <= 3 ? 'bg-muted/30' : ''}`}
      onClick={() => navigate(`/pinpanclub/superpin/player/${entry.player_id}`)}
      data-testid={`hof-player-${entry.player_id}`}
    >
      <RankBadge rank={rank} />

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        {entry.player_avatar ? (
          <img src={entry.player_avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-bold text-sm">
            {(entry.player_name || '?')[0]?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{entry.player_name || 'Unknown Player'}</div>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {entry.arena_wins > 0 && (
            <StatPill label="titles" value={entry.arena_wins} icon={Trophy} color="text-yellow-500" />
          )}
          <StatPill label="wins" value={entry.total_wins || 0} icon={TrendingUp} color="text-green-500" />
          <StatPill label="matches" value={entry.total_matches || 0} icon={Swords} color="text-blue-500" />
          {entry.referee_matches > 0 && (
            <StatPill label="refereed" value={entry.referee_matches} icon={Shield} color="text-purple-500" />
          )}
        </div>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-bold text-primary">{entry.total_points || 0}</div>
        <div className="text-xs text-muted-foreground">pts</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

function RefereeRow({ entry, rank }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${rank <= 3 ? 'bg-muted/30' : ''}`}
      data-testid={`hof-referee-${entry.player_id}`}
    >
      <RankBadge rank={rank} />

      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {entry.player_avatar ? (
          <img src={entry.player_avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Shield className="h-5 w-5 text-purple-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{entry.player_name || 'Unknown'}</div>
        <div className="flex flex-wrap gap-2 mt-0.5">
          <StatPill label="officiated" value={entry.referee_matches || 0} icon={Shield} color="text-purple-500" />
          {entry.referee_rating > 0 && (
            <StatPill label="rating" value={`${entry.referee_rating.toFixed(1)}/5`} icon={Star} color="text-yellow-500" />
          )}
          {(entry.referee_badges || []).length > 0 && (
            <StatPill label="badges" value={(entry.referee_badges || []).length} icon={Award} color="text-amber-500" />
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-lg font-bold text-purple-600">{entry.referee_points || 0}</div>
        <div className="text-xs text-muted-foreground">pts</div>
      </div>
    </div>
  );
}

export default function HallOfFame() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('combined');

  useEffect(() => {
    fetchData(activeTab === 'combined' ? null : activeTab);
  }, [activeTab]);

  const fetchData = async (mode) => {
    try {
      setLoading(true);
      const params = mode ? `?mode=${mode}&limit=50` : '?limit=50';
      const res = await axios.get(`${API_URL}/api/pinpanclub/referee/hall-of-fame${params}`);
      setEntries(res.data || []);
    } catch (err) {
      console.error('Error fetching Hall of Fame:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/pinpanclub/referee/hall-of-fame/refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Hall of Fame refreshed!');
      fetchData(activeTab === 'combined' ? null : activeTab);
    } catch (err) {
      toast.error('Failed to refresh: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRefreshing(false);
    }
  };

  const isRefTab = activeTab === 'referee';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10 mb-4"
            onClick={() => navigate('/pinpanclub')}
            data-testid="hof-back-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            PinPanClub
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-8 w-8" />
                <h1 className="text-3xl font-bold tracking-tight">Hall of Fame</h1>
              </div>
              <p className="text-white/80 text-sm max-w-md">
                All-time player rankings across Arena, League, RapidPin & Referee contributions.
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                data-testid="hof-refresh-btn"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Rebuild'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6 overflow-x-auto" data-testid="hof-tabs">
            <TabsTrigger value="combined" className="gap-1.5">
              <Trophy className="h-4 w-4" /> All
            </TabsTrigger>
            <TabsTrigger value="arena" className="gap-1.5">
              <Swords className="h-4 w-4" /> Arena
            </TabsTrigger>
            <TabsTrigger value="league" className="gap-1.5">
              <Crown className="h-4 w-4" /> League
            </TabsTrigger>
            <TabsTrigger value="rapidpin" className="gap-1.5">
              <Zap className="h-4 w-4" /> RapidPin
            </TabsTrigger>
            <TabsTrigger value="referee" className="gap-1.5">
              <Shield className="h-4 w-4" /> Referees
            </TabsTrigger>
          </TabsList>

          {/* All tabs share the same rendering logic */}
          {['combined', 'arena', 'league', 'rapidpin', 'referee'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No entries yet</p>
                      <p className="text-sm mt-1">
                        {isAdmin
                          ? 'Click "Rebuild" to aggregate player data from all game modes.'
                          : 'Play matches to appear on the leaderboard!'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {entries.map((entry, idx) => (
                        isRefTab ? (
                          <RefereeRow key={entry.player_id} entry={entry} rank={entry.rank || idx + 1} />
                        ) : (
                          <PlayerRow key={entry.player_id} entry={entry} rank={entry.rank || idx + 1} />
                        )
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
