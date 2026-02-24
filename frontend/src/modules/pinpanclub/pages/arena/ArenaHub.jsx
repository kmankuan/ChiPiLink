/**
 * PinPan Arena - Tournament Hub
 * Main listing page for all Arena tournaments
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Trophy, Plus, Users, Calendar, Search, ArrowLeft,
  Swords, Zap, Grid3X3, Crown, Clock, CheckCircle, XCircle, Filter
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

const FORMAT_LABELS = {
  single_elimination: { label: 'Single Elimination', icon: Swords, color: 'bg-red-500/10 text-red-600 border-red-200' },
  round_robin: { label: 'Round Robin', icon: Grid3X3, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  group_knockout: { label: 'Group + Knockout', icon: Crown, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  rapidpin: { label: 'RapidPin Mode', icon: Zap, color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
};

const STATUS_STYLES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Clock },
  registration_open: { label: 'Registration Open', color: 'bg-green-100 text-green-700', icon: Users },
  registration_closed: { label: 'Registration Closed', color: 'bg-yellow-100 text-yellow-700', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Swords },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function ArenaHub() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canManage = isAdmin || user?.role === 'moderator';

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pinpanclub/arena/tournaments`);
      if (res.ok) setTournaments(await res.json());
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tournaments.filter(t => {
    const matchesSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const TournamentCard = ({ t }) => {
    const fmt = FORMAT_LABELS[t.format] || FORMAT_LABELS.single_elimination;
    const st = STATUS_STYLES[t.status] || STATUS_STYLES.draft;
    const FormatIcon = fmt.icon;
    const StatusIcon = st.icon;

    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-l-4"
        style={{ borderLeftColor: t.status === 'in_progress' ? '#3b82f6' : t.status === 'registration_open' ? '#22c55e' : t.status === 'completed' ? '#10b981' : '#d1d5db' }}
        onClick={() => navigate(`/pinpanclub/arena/${t.tournament_id}`)}
        data-testid={`arena-tournament-card-${t.tournament_id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate" data-testid="tournament-name">{t.name}</h3>
              {t.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
              )}
            </div>
            <Badge className={`ml-2 shrink-0 ${st.color} text-xs`} variant="outline">
              <StatusIcon className="h-3 w-3 mr-1" />
              {st.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${fmt.color}`}>
              <FormatIcon className="h-3 w-3" />
              {fmt.label}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t.total_participants}/{t.max_players}
            </span>
            {t.start_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(t.start_date).toLocaleDateString()}
              </span>
            )}
          </div>
          {/* Champion display for completed tournaments */}
          {t.status === 'completed' && t.champion_id && (
            <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Trophy className="h-3.5 w-3.5" />
              Champion: {t.participants?.find(p => p.player_id === t.champion_id)?.player_name || t.champion_id}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/pinpanclub')} data-testid="arena-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Swords className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight">PinPan Arena</h1>
                  <p className="text-xs text-muted-foreground">Tournament Hub</p>
                </div>
              </div>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => navigate('/pinpanclub/arena/create')}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                data-testid="create-tournament-btn"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Tournament
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="arena-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="arena-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="registration_open">Registration Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tournament List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tournaments...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Swords className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No tournaments found</p>
            {canManage && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigate('/pinpanclub/arena/create')}
                data-testid="empty-create-btn"
              >
                <Plus className="h-4 w-4 mr-1" /> Create First Tournament
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="arena-tournament-list">
            {filtered.map(t => <TournamentCard key={t.tournament_id} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
