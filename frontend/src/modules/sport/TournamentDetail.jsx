/**
 * Tournament Detail — Bracket view, participants, match management
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Users, Plus, Play, Shuffle, Swords } from 'lucide-react';
import BracketView from './components/BracketView';
import RoundRobinMatrix from './components/RoundRobinMatrix';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function TournamentDetail() {
  const { tid } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');
  const isAdmin = user?.is_admin || user?.role === 'moderator';
  const [tournament, setTournament] = useState(null);
  const [tab, setTab] = useState('bracket');
  const [regName, setRegName] = useState('');
  const [reportMatch, setReportMatch] = useState(null);
  const [reportData, setReportData] = useState({ winner_id: '', score: '' });
  const [loading, setLoading] = useState(true);

  const fetchTournament = useCallback(async () => {
    const r = await fetch(`${API}/api/sport/tournaments/${tid}`);
    if (r.ok) setTournament(await r.json());
    setLoading(false);
  }, [tid]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  const handleRegister = async () => {
    if (!regName.trim()) return;
    try {
      const r = await fetch(`${API}/api/sport/tournaments/${tid}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: regName.trim() }),
      });
      if (r.ok) { toast.success('Registered!'); setRegName(''); fetchTournament(); }
      else { const e = await r.json(); toast.error(e.detail); }
    } catch { toast.error('Error'); }
  };

  const handleSeed = async () => {
    await fetch(`${API}/api/sport/tournaments/${tid}/seed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    fetchTournament();
    toast.success('Seeded by ELO');
  };

  const handleGenerate = async () => {
    const r = await fetch(`${API}/api/sport/tournaments/${tid}/generate`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) { fetchTournament(); toast.success('Brackets generated!'); }
    else { const e = await r.json(); toast.error(e.detail); }
  };

  const handleReportResult = async () => {
    if (!reportData.winner_id) { toast.error('Select winner'); return; }
    const r = await fetch(`${API}/api/sport/tournaments/${tid}/matches/${reportMatch.match_id}/result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(reportData),
    });
    if (r.ok) { toast.success('Result reported!'); setReportMatch(null); fetchTournament(); }
    else { const e = await r.json(); toast.error(e.detail); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}><span className="text-white/50">Loading...</span></div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}><span className="text-white/50">Not found</span></div>;

  const to = tournament;
  const isRR = to.format === 'round_robin';
  const isRegistration = to.status === 'registration' || to.status === 'seeding';
  const isActive = to.status === 'in_progress';

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-white truncate">{to.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white text-[9px]">{to.format.replace('_', ' ')}</Badge>
                <Badge className={`text-[9px] ${to.status === 'in_progress' ? 'bg-green-500/30 text-green-300' : to.status === 'finished' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-blue-500/30 text-blue-300'}`}>{to.status}</Badge>
                <span className="text-white/40 text-[9px]">{to.participants?.length || 0}/{to.max_participants}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Admin actions */}
        {isAdmin && isRegistration && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-purple-600 text-white text-xs" onClick={handleSeed}>
              <Shuffle className="h-3 w-3 mr-1" /> Seed
            </Button>
            <Button size="sm" className="bg-green-600 text-white text-xs" onClick={handleGenerate} disabled={to.participants?.length < 2}>
              <Play className="h-3 w-3 mr-1" /> Generate Brackets
            </Button>
          </div>
        )}

        {/* Registration */}
        {isRegistration && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-3">
              <h3 className="text-sm font-bold text-white mb-2"><Users className="h-4 w-4 inline mr-1" /> Participants ({to.participants?.length || 0})</h3>
              <div className="flex gap-2 mb-3">
                <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Player name..." className="h-9 bg-white/5 border-white/10 text-white text-xs" />
                <Button size="sm" className="bg-purple-600 text-white" onClick={handleRegister}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {to.participants?.map(p => (
                  <Badge key={p.player_id} className="bg-white/10 text-white/70 text-[10px]">
                    #{p.seed} {p.nickname} ({p.elo})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bracket / Matches */}
        {isActive && to.brackets?.length > 0 && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-white/5">
              <TabsTrigger value="bracket" className="text-xs">{isRR ? 'Matrix' : 'Bracket'}</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs">Players ({to.participants?.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="bracket">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-3">
                  {isRR ? (
                    <RoundRobinMatrix rounds={to.brackets} participants={to.participants} />
                  ) : (
                    <BracketView rounds={to.brackets} isAdmin={isAdmin} onReport={m => { setReportMatch(m); setReportData({ winner_id: '', score: '' }); }} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-2">
                  {to.participants?.map((p, i) => (
                    <div key={p.player_id} className="flex items-center justify-between py-1.5 px-2 text-xs text-white/70">
                      <span>#{p.seed} {p.nickname}</span>
                      <span className="text-white/40">ELO {p.elo}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Winner */}
        {to.status === 'finished' && to.winner_id && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-xl font-black text-yellow-400">
                {to.participants?.find(p => p.player_id === to.winner_id)?.nickname || 'Champion'}
              </h3>
              <p className="text-white/40 text-xs mt-1">Tournament Winner</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Result Dialog */}
      <Dialog open={!!reportMatch} onOpenChange={() => setReportMatch(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white">Report Match Result</DialogTitle>
          </DialogHeader>
          {reportMatch && (
            <div className="space-y-3">
              <div className="text-center text-sm">
                {reportMatch.player_a?.nickname} vs {reportMatch.player_b?.nickname}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={reportData.winner_id === reportMatch.player_a?.player_id ? 'default' : 'outline'}
                  className={reportData.winner_id === reportMatch.player_a?.player_id ? 'bg-green-600' : 'border-white/20 text-white'}
                  onClick={() => setReportData(p => ({ ...p, winner_id: reportMatch.player_a?.player_id }))}>
                  <Trophy className="h-3 w-3 mr-1" /> {reportMatch.player_a?.nickname}
                </Button>
                <Button variant={reportData.winner_id === reportMatch.player_b?.player_id ? 'default' : 'outline'}
                  className={reportData.winner_id === reportMatch.player_b?.player_id ? 'bg-green-600' : 'border-white/20 text-white'}
                  onClick={() => setReportData(p => ({ ...p, winner_id: reportMatch.player_b?.player_id }))}>
                  <Trophy className="h-3 w-3 mr-1" /> {reportMatch.player_b?.nickname}
                </Button>
              </div>
              <Input value={reportData.score} onChange={e => setReportData(p => ({ ...p, score: e.target.value }))}
                placeholder="Score (e.g. 11-8)" className="bg-white/5 border-white/10 text-white text-center" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-white/50" onClick={() => setReportMatch(null)}>Cancel</Button>
            <Button className="bg-green-600" onClick={handleReportResult}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
