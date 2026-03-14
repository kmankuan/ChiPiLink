/**
 * Live Referee Panel — Tap to score, undo, track sets
 * Features: swap sides, technique tagging, manual set entry, end-game flow
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Undo2, X, Radio, Eye, ArrowLeftRight, Save, Plus, Trophy, ChevronRight, Zap, Settings } from 'lucide-react';
import PointFlow from './components/PointFlow';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const TECHNIQUES = [
  { id: 'forehand', label: 'Forehand', emoji: '💥' },
  { id: 'backhand', label: 'Backhand', emoji: '🔄' },
  { id: 'smash', label: 'Smash', emoji: '⚡' },
  { id: 'serve_ace', label: 'Ace', emoji: '🎯' },
  { id: 'drop_shot', label: 'Drop', emoji: '🪶' },
  { id: 'block', label: 'Block', emoji: '🛡️' },
  { id: 'lob', label: 'Lob', emoji: '🌙' },
  { id: 'net', label: 'Net', emoji: '🕸️' },
  { id: 'error', label: 'Error', emoji: '💫' },
];

export default function LiveRefPanel() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [session, setSession] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swapped, setSwapped] = useState(false); // Swap display sides
  const [showTechnique, setShowTechnique] = useState(null); // 'a' or 'b' — show technique picker
  const [showEndGame, setShowEndGame] = useState(false);
  const [showManualSet, setShowManualSet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [manualSet, setManualSet] = useState({ score_a: 0, score_b: 0 });
  const [showTechPanel, setShowTechPanel] = useState(false); // Toggle technique mode
  const [endGameForm, setEndGameForm] = useState({ league_id: '', notes: '' });
  const [leagues, setLeagues] = useState([]);
  const wsRef = useRef(null);
  const prevSetRef = useRef(0);

  const fetchSession = useCallback(async () => {
    const r = await fetch(`${API}/api/sport/live/${sessionId}`);
    if (r.ok) {
      const data = await r.json();
      setSession(data);
      // Auto-swap sides after set change
      if (data.current_set !== prevSetRef.current && prevSetRef.current > 0) {
        const newSwapped = !swapped;
        setSwapped(newSwapped);
        // Sync to server so TV sees the swap
        fetch(`${API}/api/sport/live/${sessionId}/display`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ swapped: newSwapped }),
        }).catch(() => {});
        toast.info('Sides swapped for new set');
      }
      prevSetRef.current = data.current_set;
      // Show end game panel when finished
      if (data.status === 'finished') setShowEndGame(true);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);
  useEffect(() => {
    fetch(`${API}/api/sport/leagues`).then(r => r.ok ? r.json() : []).then(setLeagues).catch(() => {});
  }, []);

  // WebSocket
  useEffect(() => {
    if (!sessionId) return;
    try {
      const wsUrl = `${API.replace('http', 'ws')}/api/sport/ws/live/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point' || msg.type === 'undo') fetchSession();
      };
      wsRef.current = ws;
      return () => ws.close();
    } catch {}
  }, [sessionId, fetchSession]);

  const scorePoint = async (side, technique = null) => {
    setShowTechnique(null);
    try {
      const res = await fetch(`${API}/api/sport/live/${sessionId}/point`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scored_by: side, technique }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(prev => ({ ...prev, score: data.score, sets: data.sets, sets_won: data.sets_won, server: data.server, current_set: data.current_set, status: data.status, points: [...(prev?.points || []), data.point] }));
        if (data.emotions?.length > 0) {
          const emoSide = side === leftSide ? 'left' : 'right';
          setEmotion({ ...data.emotions[0], side: emoSide });
          setTimeout(() => setEmotion(null), 3000);
          // Sync emotion to TV
          fetch(`${API}/api/sport/live/${sessionId}/display`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ last_emotion: data.emotions[0].type, last_emotion_side: emoSide }),
          }).catch(() => {});
        }
        if (data.status === 'finished') {
          setTimeout(() => setShowEndGame(true), 1500);
        }
      }
    } catch { toast.error('Error'); }
  };

  const undoPoint = async () => {
    try {
      await fetch(`${API}/api/sport/live/${sessionId}/undo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      fetchSession();
    } catch {}
  };

  const handleAddManualSet = async () => {
    // Add a completed set directly (for games already in progress)
    try {
      const winner = manualSet.score_a > manualSet.score_b ? 'a' : 'b';
      const res = await fetch(`${API}/api/sport/live/${sessionId}/manual-set`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score_a: manualSet.score_a, score_b: manualSet.score_b, winner }),
      });
      if (res.ok) {
        toast.success('Set added');
        setShowManualSet(false);
        setManualSet({ score_a: 0, score_b: 0 });
        fetchSession();
      } else {
        toast.error('Failed to add set');
      }
    } catch { toast.error('Error'); }
  };

  const endMatch = async () => {
    await fetch(`${API}/api/sport/live/${sessionId}/end`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    navigate('/sport');
  };

  const updateSettings = async (key, value) => {
    try {
      await fetch(`${API}/api/sport/live/${sessionId}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      fetchSession();
      toast.success('Settings updated');
    } catch {}
  };


  if (loading || !session) return <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a2e' }}><Radio className="h-8 w-8 text-red-500 animate-pulse" /></div>;

  const s = session;
  // Swap display based on side swap state
  const left = swapped ? s.player_b : s.player_a;
  const right = swapped ? s.player_a : s.player_b;
  const leftSide = swapped ? 'b' : 'a';
  const rightSide = swapped ? 'a' : 'b';
  const leftScore = s.score?.[leftSide] || 0;
  const rightScore = s.score?.[rightSide] || 0;
  const isFinished = s.status === 'finished';

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* Emotion overlay — positioned on the scoring player's side */}
      <EmotionOverlay emotion={emotion} settings={s} side={emotion?.side === leftSide ? 'left' : 'right'}
        playerPhoto={emotion?.side === leftSide ? left?.photo_url : right?.photo_url} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <button 
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
            s.display?.is_public !== false ? 'bg-green-600 text-white' : 'bg-white/10 text-white/40'
          }`}
          onClick={() => {
            const newPublic = s.display?.is_public === false;
            fetch(`${API}/api/sport/live/${sessionId}/display`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ is_public: newPublic }),
            }).then(() => fetchSession()).catch(() => {});
          }}
        >
          <Radio className="h-3 w-3 inline mr-0.5" /> {s.display?.is_public !== false ? 'LIVE' : 'PRIVATE'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[10px]">Set {s.current_set}</span>
          <button onClick={() => {
            const newSwapped = !swapped;
            setSwapped(newSwapped);
            fetch(`${API}/api/sport/live/${sessionId}/display`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ swapped: newSwapped }),
            }).catch(() => {});
          }} className="text-white/40 hover:text-white p-1" title="Swap sides">
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-white/40 h-6 text-[10px] px-1" onClick={() => navigate(`/sport/live/${sessionId}/spectator`)}>
            <Eye className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/40 h-6 text-[10px] px-1" onClick={() => setShowManualSet(true)}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400/60 h-6 text-[10px] px-1" onClick={endMatch}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sets won indicator */}
      <div className="flex justify-center gap-6 px-4 pb-1">
        <div className="flex gap-1">
          {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`l${i}`} className={`w-2.5 h-2.5 rounded-full ${i < (s.sets_won?.[leftSide] || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
        <span className="text-white/20 text-[9px]">SETS</span>
        <div className="flex gap-1">
          {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`r${i}`} className={`w-2.5 h-2.5 rounded-full ${i < (s.sets_won?.[rightSide] || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      {/* Main Score + Tap Areas */}
      <div className="flex-1 flex min-h-0">
        {/* Left player */}
        <button
          className="flex-1 flex flex-col items-center justify-center active:bg-white/5 transition-colors relative"
          onClick={() => !isFinished && (showTechPanel ? setShowTechnique(leftSide) : scorePoint(leftSide))}
          disabled={isFinished}
          data-testid="score-left"
        >
          <span className="text-white/60 text-xs font-medium mb-1">{left?.nickname || '?'}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>{leftScore}</span>
          {s.server === leftSide && <span className="mt-1 text-yellow-400 text-[10px]">🏓</span>}
          <span className="mt-0.5 text-white/20 text-[9px]">ELO {left?.elo || '?'}</span>
        </button>

        {/* Divider */}
        <div className="w-px bg-white/10 self-stretch" />

        {/* Right player */}
        <button
          className="flex-1 flex flex-col items-center justify-center active:bg-white/5 transition-colors relative"
          onClick={() => !isFinished && (showTechPanel ? setShowTechnique(rightSide) : scorePoint(rightSide))}
          disabled={isFinished}
          data-testid="score-right"
        >
          <span className="text-white/60 text-xs font-medium mb-1">{right?.nickname || '?'}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>{rightScore}</span>
          {s.server === rightSide && <span className="mt-1 text-yellow-400 text-[10px]">🏓</span>}
          <span className="mt-0.5 text-white/20 text-[9px]">ELO {right?.elo || '?'}</span>
        </button>
      </div>

      {/* Point Flow + Set History */}
      <div className="px-3 py-1 space-y-1">
        {/* Set scores (live scoreboard) */}
        {(s.sets?.length > 0 || s.score?.a > 0 || s.score?.b > 0) && (
          <div className="flex items-center justify-center gap-1 text-[9px]">
            {s.sets?.map((set, i) => (
              <span key={i} className={`px-1.5 py-0.5 rounded ${set.winner === (swapped ? 'b' : 'a') ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {swapped ? `${set.score_b}-${set.score_a}` : `${set.score_a}-${set.score_b}`}
              </span>
            ))}
            {s.status === 'live' && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 animate-pulse">
                {swapped ? `${s.score?.b || 0}-${s.score?.a || 0}` : `${s.score?.a || 0}-${s.score?.b || 0}`}*
              </span>
            )}
          </div>
        )}
        {/* Point flow dots */}
        <PointFlow points={s.points || []} playerA={left?.nickname} playerB={right?.nickname} swapped={swapped} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40">
        <Button variant="ghost" size="sm" className="text-white/50 h-8 text-xs" onClick={undoPoint}>
          <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-[9px]">⚖️ {s.referee?.nickname}</span>
          <button className="text-yellow-400/60 hover:text-yellow-400 text-[9px]"
            onClick={() => {
              const newServer = s.server === 'a' ? 'b' : 'a';
              fetch(`${API}/api/sport/live/${sessionId}/server`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ server: newServer }),
              }).then(() => fetchSession()).catch(() => {});
            }}
            title="Toggle service"
          >🏓 switch</button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className={`h-8 text-xs ${showTechPanel ? 'text-yellow-400' : 'text-white/50'}`}
            onClick={() => setShowTechPanel(!showTechPanel)}>
            <Zap className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white/50 h-8 text-xs" onClick={() => setShowSettings(true)}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Technique Picker */}
      {showTechnique && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowTechnique(null)}>
          <div className="w-full bg-[#1a1a2e] border-t border-white/10 p-3 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <p className="text-white/60 text-xs mb-2 text-center">
              Point for <strong className="text-white">{showTechnique === leftSide ? left?.nickname : right?.nickname}</strong> — how?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TECHNIQUES.map(tech => (
                <button key={tech.id}
                  className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15"
                  onClick={() => scorePoint(showTechnique, tech.id)}>
                  <span className="text-lg">{tech.emoji}</span>
                  <span className="text-[9px] text-white/60">{tech.label}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-2 text-white/40 text-xs" onClick={() => scorePoint(showTechnique)}>
              Just count the point (skip technique)
            </Button>
          </div>
        </div>
      )}

      {/* Manual Set Entry Dialog */}
      <Dialog open={showManualSet} onOpenChange={setShowManualSet}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Add Previous Set</DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-xs">Enter scores for a set that already happened before you started refereeing.</p>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-white/60 text-xs">{s.player_a?.nickname}</Label>
              <Input type="number" value={manualSet.score_a} onChange={e => setManualSet(p => ({ ...p, score_a: parseInt(e.target.value) || 0 }))}
                className="h-12 text-center text-2xl font-bold bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">{s.player_b?.nickname}</Label>
              <Input type="number" value={manualSet.score_b} onChange={e => setManualSet(p => ({ ...p, score_b: parseInt(e.target.value) || 0 }))}
                className="h-12 text-center text-2xl font-bold bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-white/50" onClick={() => setShowManualSet(false)}>Cancel</Button>
            <Button className="bg-yellow-500 text-black" onClick={handleAddManualSet}>
              <Plus className="h-4 w-4 mr-1" /> Add Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Game Results Dialog */}
      <Dialog open={showEndGame} onOpenChange={setShowEndGame}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> Match Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Score Summary */}
            <div className="text-center py-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-center gap-4">
                <div>
                  <p className={`text-lg font-bold ${s.winner === 'a' || (swapped && s.winner === 'b') ? 'text-yellow-400' : 'text-white/60'}`}>
                    {s.player_a?.nickname}
                  </p>
                  <p className="text-2xl font-black text-white">{s.sets_won?.a || 0}</p>
                </div>
                <span className="text-white/30">—</span>
                <div>
                  <p className={`text-lg font-bold ${s.winner === 'b' || (swapped && s.winner === 'a') ? 'text-yellow-400' : 'text-white/60'}`}>
                    {s.player_b?.nickname}
                  </p>
                  <p className="text-2xl font-black text-white">{s.sets_won?.b || 0}</p>
                </div>
              </div>
              {s.sets?.map((set, i) => (
                <p key={i} className="text-white/30 text-xs">Set {i + 1}: {set.score_a}-{set.score_b}</p>
              ))}
            </div>

            {/* Add to League */}
            {leagues.length > 0 && (
              <div>
                <Label className="text-white/60 text-xs">Add to League (optional)</Label>
                <Select value={endGameForm.league_id} onValueChange={v => setEndGameForm(p => ({ ...p, league_id: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                    <SelectValue placeholder="No league" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No league</SelectItem>
                    {leagues.filter(l => l.status === 'active').map(l => (
                      <SelectItem key={l.league_id} value={l.league_id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-white/60 text-xs">Notes (optional)</Label>
              <Input value={endGameForm.notes} onChange={e => setEndGameForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Match notes..." className="bg-white/5 border-white/10 text-white h-9" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-white/50" onClick={() => navigate('/sport')}>
              Skip & Close
            </Button>
            <Button className="bg-yellow-500 text-black" onClick={() => { toast.success('Match saved'); navigate('/sport'); }}>
              <Save className="h-4 w-4 mr-1" /> Save & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Settings className="h-4 w-4" /> Match Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs">Best of</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[{v: 1, label: '1 set'}, {v: 2, label: 'Bo3'}, {v: 3, label: 'Bo5'}, {v: 4, label: 'Bo7'}].map(opt => (
                  <Button key={opt.v} variant="ghost" size="sm"
                    className={`h-10 ${(s.settings?.sets_to_win || 2) === opt.v ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/50'}`}
                    onClick={() => { updateSettings('sets_to_win', opt.v); }}>
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Points per set</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[11, 21].map(pts => (
                  <Button key={pts} variant="ghost" size="sm"
                    className={`h-10 ${(s.settings?.points_to_win || 11) === pts ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/50'}`}
                    onClick={() => { updateSettings('points_to_win', pts); }}>
                    {pts} pts
                  </Button>
                ))}
              </div>
            </div>
            <div className="text-white/20 text-[10px] text-center">
              Current: Best of {(s.settings?.sets_to_win || 2) * 2 - 1} · {s.settings?.points_to_win || 11} pts/set
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
