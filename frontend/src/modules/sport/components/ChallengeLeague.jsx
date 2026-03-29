/**
 * ChallengeLeague — UI for "challenge mode" leagues.
 * 
 * Rules: Lower-ranked player challenges higher-ranked one.
 * Win N consecutive matches → swap positions.
 * Lose 1 match → challenge fails, must restart.
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Swords, Trophy, X, CheckCircle2, AlertTriangle, Plus, ChevronRight, RefreshCw, ArrowUpDown } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function ChallengeStatusBadge({ status, consec, required }) {
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1">
        <Badge variant="outline" className="border-blue-400 text-blue-600 gap-1">
          <Swords className="h-3 w-3" /> Active
        </Badge>
        <span className="text-xs font-mono text-blue-600 font-bold">{consec}/{required}</span>
      </span>
    );
  }
  if (status === 'won') return <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Won</Badge>;
  if (status === 'failed') return <Badge className="bg-red-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> Failed</Badge>;
  if (status === 'cancelled') return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
  return null;
}

export default function ChallengeLeague({ league, onLeagueUpdate }) {
  const token = localStorage.getItem('auth_token');
  const leagueId = league.league_id;
  const rules = league.rules || {};
  const winsRequired = rules.consecutive_wins_required || 2;
  const posLabels = league.position_labels || [];
  const positions = [...(league.player_positions || [])].sort((a, b) => a.position - b.position);

  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // New challenge dialog
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [challengerName, setChallengerName] = useState('');
  const [challengedName, setChallengedName] = useState('');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Record match dialog
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [winnerName, setWinnerName] = useState('');
  const [scoreWinner, setScoreWinner] = useState(11);
  const [scoreLoser, setScoreLoser] = useState(0);
  const [refName, setRefName] = useState('');
  const [recording, setRecording] = useState(false);

  const loadChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const res = await fetch(`${API}/api/sport/leagues/${leagueId}/challenges`);
      if (res.ok) setChallenges(await res.json());
    } catch (e) {}
    finally { setLoadingChallenges(false); }
  };

  useEffect(() => { loadChallenges(); }, [leagueId]);

  const getPosLabel = (i) => {
    if (posLabels[i - 1]) return posLabels[i - 1];
    return `#${i}`;
  };

  const handleStartChallenge = async () => {
    if (!challengerName || !challengedName) { toast.error('Enter both player names'); return; }
    setCreatingChallenge(true);
    try {
      const res = await fetch(`${API}/api/sport/leagues/${leagueId}/challenges`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenger_name: challengerName, challenged_name: challengedName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'Failed'); return; }
      toast.success(`Challenge started: ${challengerName} → ${challengedName}`);
      setShowNewChallenge(false);
      setChallengerName(''); setChallengedName('');
      loadChallenges();
    } finally { setCreatingChallenge(false); }
  };

  const handleRecordMatch = async () => {
    if (!winnerName || !refName) { toast.error('Enter winner and referee'); return; }
    setRecording(true);
    try {
      const res = await fetch(`${API}/api/sport/leagues/${leagueId}/challenges/${activeChallenge.challenge_id}/match`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_name: winnerName, score_winner: scoreWinner, score_loser: scoreLoser, referee_name: refName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'Failed'); return; }

      if (data.status === 'won') {
        toast.success(`${data.challenger_nickname} won the challenge and takes position ${getPosLabel(data.challenged_position)}!`);
        onLeagueUpdate?.();  // reload league to get new positions
      } else if (data.status === 'failed') {
        toast.error(`Challenge failed — ${data.challenged_nickname} won. Restart required.`);
      } else {
        toast.success(`Match recorded. ${data.consecutive_wins}/${data.wins_required} consecutive wins.`);
      }

      setActiveChallenge(null);
      setWinnerName(''); setRefName('');
      setScoreWinner(11); setScoreLoser(0);
      loadChallenges();
    } finally { setRecording(false); }
  };

  const handleCancel = async (challenge) => {
    if (!confirm('Cancel this challenge? Positions will not change.')) return;
    await fetch(`${API}/api/sport/leagues/${leagueId}/challenges/${challenge.challenge_id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    toast.info('Challenge cancelled');
    loadChallenges();
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status !== 'active');

  return (
    <div className="space-y-4">
      {/* Rule description */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 space-y-0.5">
        <p className="font-semibold flex items-center gap-1.5"><Swords className="h-3.5 w-3.5" /> Challenge Rules</p>
        <p>{rules.description || `Lower-ranked player can challenge a higher-ranked player. Win ${winsRequired} consecutive matches to take their position. One loss resets the challenge.`}</p>
      </div>

      {/* Current Standings (position order) */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Current Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm px-3">No players assigned yet. Use the ⚙️ settings to add players.</p>
          ) : (
            <div className="divide-y">
              {positions.map((p, i) => {
                const label = getPosLabel(p.position);
                const activeChal = activeChallenges.find(
                  c => c.challenged_id === p.player_id || c.challenger_id === p.player_id
                );
                return (
                  <div key={p.player_id} className={`flex items-center gap-3 px-3 py-2.5 ${i === 0 ? 'bg-amber-50/50' : ''}`} data-testid={`pos-${p.position}`}>
                    <span className={`font-bold text-base min-w-[40px] ${i === 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{label}</span>
                    <span className="flex-1 font-medium text-sm">{p.nickname}</span>
                    {activeChal && (
                      <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
                        {activeChal.challenger_id === p.player_id ? '⚔️ challenging' : '🛡️ being challenged'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Challenges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Swords className="h-4 w-4 text-blue-500" /> Active Challenges</h3>
          {token && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewChallenge(true)} data-testid="new-challenge-btn">
              <Plus className="h-3.5 w-3.5" /> New Challenge
            </Button>
          )}
        </div>

        {loadingChallenges ? (
          <p className="text-xs text-muted-foreground text-center py-4"><RefreshCw className="h-4 w-4 animate-spin inline mr-1" /> Loading...</p>
        ) : activeChallenges.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active challenges</p>
        ) : activeChallenges.map(c => (
          <Card key={c.challenge_id} className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold">{c.challenger_nickname}</span>
                <span className="text-[10px] text-muted-foreground">({getPosLabel(c.challenger_position)})</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold">{c.challenged_nickname}</span>
                <span className="text-[10px] text-muted-foreground">({getPosLabel(c.challenged_position)})</span>
                <div className="ml-auto">
                  <ChallengeStatusBadge status={c.status} consec={c.consecutive_wins} required={c.wins_required} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(c.consecutive_wins / c.wins_required) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{c.consecutive_wins}/{c.wins_required} consecutive wins needed</p>

              {token && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => { setActiveChallenge(c); setWinnerName(''); setRefName(''); }}
                    data-testid={`record-match-${c.challenge_id}`}>
                    <Swords className="h-3 w-3" /> Record Match
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                    onClick={() => handleCancel(c)} data-testid={`cancel-challenge-${c.challenge_id}`}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Challenge History */}
      {pastChallenges.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
          {pastChallenges.map(c => (
            <div key={c.challenge_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border text-sm">
              <span className="text-xs font-medium">{c.challenger_nickname} → {c.challenged_nickname}</span>
              <div className="ml-auto"><ChallengeStatusBadge status={c.status} consec={c.consecutive_wins} required={c.wins_required} /></div>
              {c.outcome && <p className="text-[10px] text-muted-foreground w-full mt-0.5">{c.outcome}</p>}
            </div>
          ))}
        </div>
      )}

      {/* New Challenge Dialog */}
      <Dialog open={showNewChallenge} onOpenChange={setShowNewChallenge}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Swords className="h-4 w-4" /> Start Challenge</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">The challenger must be ranked LOWER than the challenged player.</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Challenger (lower position)</label>
              <select value={challengerName} onChange={e => setChallengerName(e.target.value)} className="w-full border rounded h-9 text-sm px-2" data-testid="challenger-select">
                <option value="">Select player...</option>
                {positions.map(p => <option key={p.player_id} value={p.nickname}>{getPosLabel(p.position)} — {p.nickname}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Challenged (higher position)</label>
              <select value={challengedName} onChange={e => setChallengedName(e.target.value)} className="w-full border rounded h-9 text-sm px-2" data-testid="challenged-select">
                <option value="">Select player...</option>
                {positions.map(p => <option key={p.player_id} value={p.nickname}>{getPosLabel(p.position)} — {p.nickname}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewChallenge(false)}>Cancel</Button>
            <Button onClick={handleStartChallenge} disabled={creatingChallenge} className="gap-1" data-testid="confirm-challenge-btn">
              {creatingChallenge ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Match Dialog */}
      {activeChallenge && (
        <Dialog open={!!activeChallenge} onOpenChange={() => setActiveChallenge(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="h-4 w-4" /> Record Match
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {activeChallenge.challenger_nickname} ({getPosLabel(activeChallenge.challenger_position)}) vs {activeChallenge.challenged_nickname} ({getPosLabel(activeChallenge.challenged_position)})
                · {activeChallenge.consecutive_wins}/{activeChallenge.wins_required} wins
              </p>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Winner</label>
                <div className="grid grid-cols-2 gap-2">
                  {[activeChallenge.challenger_nickname, activeChallenge.challenged_nickname].map(name => (
                    <button key={name}
                      onClick={() => setWinnerName(name)}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${winnerName === name ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted/50'}`}
                      data-testid={`winner-${name}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Winner score</label>
                  <Input type="number" value={scoreWinner} onChange={e => setScoreWinner(+e.target.value)} min={0} className="h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Loser score</label>
                  <Input type="number" value={scoreLoser} onChange={e => setScoreLoser(+e.target.value)} min={0} className="h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Referee name</label>
                <Input value={refName} onChange={e => setRefName(e.target.value)} placeholder="Referee..." className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setActiveChallenge(null)}>Cancel</Button>
              <Button onClick={handleRecordMatch} disabled={recording || !winnerName || !refName} data-testid="confirm-match-btn">
                {recording ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
