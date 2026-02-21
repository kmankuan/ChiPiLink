/**
 * PinPan Arena - Tournament Detail
 * Shows bracket, participants, match results, and management controls
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Trophy, Users, Swords, Zap, Grid3X3, Crown,
  Play, CheckCircle, Clock, UserPlus, UserMinus, Shuffle,
  ChevronRight, Medal, Award, Loader2, Share2, Copy
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FORMAT_ICONS = { single_elimination: Swords, round_robin: Grid3X3, group_knockout: Crown, rapidpin: Zap };
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600', registration_open: 'bg-green-100 text-green-700',
  registration_closed: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-600',
};

export default function ArenaDetail() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [resultModal, setResultModal] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  const canManage = isAdmin || user?.role === 'moderator';
  const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : '';
  const currentPlayerId = user?.player_id || user?.user_id;

  const fetchData = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/pinpanclub/arena/tournaments/${tournamentId}`),
        fetch(`${API_URL}/api/pinpanclub/arena/tournaments/${tournamentId}/matches`),
      ]);
      if (tRes.ok) setTournament(await tRes.json());
      if (mRes.ok) setMatches(await mRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (url, method = 'POST') => {
    setActionLoading(url);
    try {
      const res = await fetch(`${API_URL}${url}`, { method, headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { toast.success('Done!'); await fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Network error'); }
    finally { setActionLoading(''); }
  };

  const submitResult = async () => {
    if (!resultModal) return;
    const url = `/api/pinpanclub/arena/tournaments/${tournamentId}/matches/${resultModal.match_id}/result?winner_id=${resultModal.winnerId}&score_a=${scoreA}&score_b=${scoreB}`;
    setActionLoading('result');
    try {
      const res = await fetch(`${API_URL}${url}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { toast.success('Result submitted!'); setResultModal(null); await fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Network error'); }
    finally { setActionLoading(''); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!tournament) return <div className="text-center py-12 text-muted-foreground">Tournament not found</div>;

  const FormatIcon = FORMAT_ICONS[tournament.format] || Swords;
  const isRegistered = tournament.participants?.some(p => p.player_id === currentPlayerId);
  const isRegistrationOpen = tournament.status === 'registration_open';
  const isInProgress = tournament.status === 'in_progress';
  const isCompleted = tournament.status === 'completed';

  // Group matches by round
  const matchesByRound = {};
  matches.forEach(m => {
    const key = m.group && m.group !== '__third_place__' && m.group !== '__knockout__'
      ? `group_${m.group}_R${m.round_num}`
      : `R${m.round_num}${m.group === '__third_place__' ? '_3rd' : ''}`;
    if (!matchesByRound[key]) matchesByRound[key] = [];
    matchesByRound[key].push(m);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/pinpanclub/arena')} data-testid="detail-back-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FormatIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                <h1 className="font-bold text-lg truncate" data-testid="detail-tournament-name">{tournament.name}</h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`${STATUS_COLORS[tournament.status]} text-xs`} variant="outline">
                  {tournament.status?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {tournament.total_participants}/{tournament.max_players} players
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Admin Actions */}
        {canManage && (
          <Card data-testid="admin-actions-card">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {tournament.status === 'draft' && (
                  <Button size="sm" variant="default" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/open-registration`)}
                    disabled={!!actionLoading} className="bg-green-600 hover:bg-green-700 text-white" data-testid="open-reg-btn">
                    <UserPlus className="h-4 w-4 mr-1" /> Open Registration
                  </Button>
                )}
                {isRegistrationOpen && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/close-registration`)}
                      disabled={!!actionLoading} data-testid="close-reg-btn">
                      Close Registration
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/apply-seeding`)}
                      disabled={!!actionLoading} data-testid="apply-seeding-btn">
                      <Shuffle className="h-4 w-4 mr-1" /> Apply Seeding
                    </Button>
                  </>
                )}
                {(isRegistrationOpen || tournament.status === 'registration_closed') && tournament.total_participants >= 2 && (
                  <Button size="sm" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/generate-brackets`)}
                    disabled={!!actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="generate-brackets-btn">
                    <Play className="h-4 w-4 mr-1" /> Generate Brackets & Start
                  </Button>
                )}
                {tournament.format === 'group_knockout' && isInProgress && (
                  <Button size="sm" variant="outline" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/generate-knockout`)}
                    disabled={!!actionLoading} data-testid="generate-knockout-btn">
                    <Crown className="h-4 w-4 mr-1" /> Generate Knockout
                  </Button>
                )}
                {isInProgress && (
                  <Button size="sm" variant="outline" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/complete`)}
                    disabled={!!actionLoading} data-testid="complete-btn">
                    <CheckCircle className="h-4 w-4 mr-1" /> Complete Tournament
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration for regular users */}
        {isRegistrationOpen && user && !canManage && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm">
                {isRegistered ? 'You are registered!' : 'Registration is open — join now!'}
              </span>
              {isRegistered ? (
                <Button size="sm" variant="destructive" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/withdraw`)}
                  disabled={!!actionLoading} data-testid="withdraw-btn">
                  <UserMinus className="h-4 w-4 mr-1" /> Withdraw
                </Button>
              ) : (
                <Button size="sm" onClick={() => doAction(`/api/pinpanclub/arena/tournaments/${tournamentId}/register`)}
                  disabled={!!actionLoading} className="bg-green-600 hover:bg-green-700 text-white" data-testid="register-btn">
                  <UserPlus className="h-4 w-4 mr-1" /> Register
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Champion Banner */}
        {isCompleted && tournament.champion_id && (
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="champion-banner">
            <CardContent className="p-4 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-amber-500" />
              <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Champion</p>
              <p className="text-xl font-bold text-amber-700">
                {tournament.participants?.find(p => p.player_id === tournament.champion_id)?.player_name || 'Unknown'}
              </p>
              <div className="flex justify-center gap-6 mt-2 text-sm text-muted-foreground">
                {tournament.runner_up_id && (
                  <span className="flex items-center gap-1">
                    <Medal className="h-4 w-4 text-gray-400" />
                    {tournament.participants?.find(p => p.player_id === tournament.runner_up_id)?.player_name}
                  </span>
                )}
                {tournament.third_place_id && (
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-orange-400" />
                    {tournament.participants?.find(p => p.player_id === tournament.third_place_id)?.player_name}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        <Card data-testid="participants-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({tournament.total_participants}/{tournament.max_players})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.participants?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tournament.participants.map((p, i) => (
                  <div key={p.player_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm" data-testid={`participant-${p.player_id}`}>
                    {p.seed && <span className="text-xs font-bold text-indigo-500">#{p.seed}</span>}
                    {p.group && <span className="text-xs font-semibold text-purple-500">[{p.group}]</span>}
                    <span>{p.player_name || p.player_id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No participants yet</p>
            )}
          </CardContent>
        </Card>

        {/* Group Standings */}
        {tournament.format === 'group_knockout' && Object.keys(tournament.group_standings || {}).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2" data-testid="group-standings">
            {Object.entries(tournament.group_standings).map(([group, standings]) => (
              <Card key={group}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Group {group}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">Player</th>
                        <th className="p-2 text-center">P</th>
                        <th className="p-2 text-center">W</th>
                        <th className="p-2 text-center">L</th>
                        <th className="p-2 text-center font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.player_id} className={`border-b last:border-0 ${i < (tournament.players_per_group_advance || 2) ? 'bg-green-50 dark:bg-green-950/10' : ''}`}>
                          <td className="p-2 font-medium truncate max-w-[120px]">{s.player_name || s.player_id}</td>
                          <td className="p-2 text-center">{s.played}</td>
                          <td className="p-2 text-center text-green-600">{s.won}</td>
                          <td className="p-2 text-center text-red-500">{s.lost}</td>
                          <td className="p-2 text-center font-bold">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Round Robin Standings */}
        {(tournament.format === 'round_robin' || tournament.format === 'rapidpin') &&
          tournament.group_standings?.__rr__?.length > 0 && (
          <Card data-testid="rr-standings">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Player</th>
                    <th className="p-2 text-center">P</th>
                    <th className="p-2 text-center">W</th>
                    <th className="p-2 text-center">L</th>
                    <th className="p-2 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.group_standings.__rr__.map((s, i) => (
                    <tr key={s.player_id} className="border-b last:border-0">
                      <td className="p-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{s.player_name || s.player_id}</td>
                      <td className="p-2 text-center">{s.played}</td>
                      <td className="p-2 text-center text-green-600">{s.won}</td>
                      <td className="p-2 text-center text-red-500">{s.lost}</td>
                      <td className="p-2 text-center font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Bracket / Matches */}
        {matches.length > 0 && (
          <Card data-testid="matches-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="h-4 w-4" /> Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.brackets?.map((bracket, bi) => {
                const roundMatches = matches.filter(m => {
                  if (bracket.name === 'Third Place') return m.group === '__third_place__';
                  if (m.group === '__third_place__') return false;
                  return m.round_num === bracket.round;
                });
                if (roundMatches.length === 0) return null;

                return (
                  <div key={bi}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{bracket.name}</h3>
                    <div className="space-y-2">
                      {roundMatches.map(m => (
                        <MatchCard
                          key={m.match_id}
                          match={m}
                          canManage={canManage && isInProgress}
                          onSubmitResult={(winnerId) => {
                            setResultModal({ ...m, winnerId });
                            setScoreA(0);
                            setScoreB(0);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result Modal */}
      <Dialog open={!!resultModal} onOpenChange={() => setResultModal(null)}>
        <DialogContent data-testid="result-modal">
          <DialogHeader>
            <DialogTitle>Submit Match Result</DialogTitle>
          </DialogHeader>
          {resultModal && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {resultModal.player_a_name || 'Player A'} vs {resultModal.player_b_name || 'Player B'}
                </p>
                <p className="text-sm font-medium">
                  Winner: <span className="text-indigo-600">
                    {resultModal.winnerId === resultModal.player_a_id ? resultModal.player_a_name : resultModal.player_b_name}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">{resultModal.player_a_name || 'Player A'} Score</label>
                  <Input type="number" value={scoreA} onChange={e => setScoreA(parseInt(e.target.value) || 0)} min={0} data-testid="score-a-input" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{resultModal.player_b_name || 'Player B'} Score</label>
                  <Input type="number" value={scoreB} onChange={e => setScoreB(parseInt(e.target.value) || 0)} min={0} data-testid="score-b-input" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultModal(null)}>Cancel</Button>
            <Button onClick={submitResult} disabled={actionLoading === 'result'} data-testid="confirm-result-btn">
              {actionLoading === 'result' ? 'Submitting...' : 'Confirm Result'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchCard({ match, canManage, onSubmitResult }) {
  const isDone = match.status === 'completed' || match.status === 'bye';
  const isPending = match.status === 'pending';
  const hasPlayers = match.player_a_id && match.player_b_id;

  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
        isDone ? 'bg-muted/30' : isPending && hasPlayers ? 'bg-background hover:bg-muted/20' : 'bg-muted/10'
      }`}
      data-testid={`match-card-${match.match_id}`}
    >
      {/* Player A */}
      <div className={`flex-1 text-right truncate ${match.winner_id === match.player_a_id ? 'font-bold text-green-600' : ''}`}>
        {match.player_a_name || (match.player_a_id ? match.player_a_id.slice(0, 10) : 'TBD')}
      </div>

      {/* Score / Status */}
      <div className="shrink-0 w-20 text-center">
        {isDone ? (
          <span className="font-mono font-bold text-xs">
            {match.score_a} - {match.score_b}
            {match.status === 'bye' && <span className="text-muted-foreground ml-1">(bye)</span>}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {hasPlayers ? 'vs' : 'TBD'}
          </span>
        )}
      </div>

      {/* Player B */}
      <div className={`flex-1 truncate ${match.winner_id === match.player_b_id ? 'font-bold text-green-600' : ''}`}>
        {match.player_b_name || (match.player_b_id ? match.player_b_id.slice(0, 10) : 'TBD')}
      </div>

      {/* Action buttons */}
      {canManage && isPending && hasPlayers && (
        <div className="shrink-0 flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onSubmitResult(match.player_a_id)} data-testid={`win-a-${match.match_id}`}>
            A wins
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onSubmitResult(match.player_b_id)} data-testid={`win-b-${match.match_id}`}>
            B wins
          </Button>
        </div>
      )}
    </div>
  );
}
