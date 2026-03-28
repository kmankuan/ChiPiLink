/**
 * Live Referee Panel — Complete Broadcast Control Center
 * Score, cards, calls, effects, broadcast modes, timers, battle path
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
import { Undo2, X, Radio, Eye, ArrowLeftRight, Save, Plus, Trophy, Zap, Settings, Tv, Square, AlertTriangle } from 'lucide-react';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function _getStreak(points, side) {
  if (!points || points.length === 0) return 0;
  let streak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].scored_by === side) streak++;
    else break;
  }
  return streak;
}

const QUICK_EFFECTS = [
  { id: 'tense', emoji: '😱', label: 'Tense' },
  { id: 'fire', emoji: '🔥', label: 'Hot' },
  { id: 'clap', emoji: '👏', label: 'Wow' },
  { id: 'funny', emoji: '😂', label: 'Fun' },
  { id: 'strong', emoji: '💪', label: 'Strong' },
  { id: 'fast', emoji: '⚡', label: 'Fast' },
  { id: 'precise', emoji: '🎯', label: 'Precise' },
  { id: 'insane', emoji: '🤯', label: 'Insane' },
];

const TECHNIQUES = [
  { id: 'forehand', emoji: '💥' }, { id: 'backhand', emoji: '🔄' },
  { id: 'smash', emoji: '⚡' }, { id: 'serve_ace', emoji: '🎯' },
  { id: 'drop_shot', emoji: '🪶' }, { id: 'block', emoji: '🛡️' },
  { id: 'lob', emoji: '🌙' }, { id: 'error', emoji: '💫' },
];

function formatTimer(startIso) {
  if (!startIso) return '0:00';
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveRefPanel() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const [session, setSession] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [swapped, setSwapped] = useState(false);
  const [showTechnique, setShowTechnique] = useState(null);
  const [showEndGame, setShowEndGame] = useState(false);
  const [showManualSet, setShowManualSet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTechPanel, setShowTechPanel] = useState(false);
  const [showControls, setShowControls] = useState(false); // Toggle referee controls panel
  const [showChangeRef, setShowChangeRef] = useState(false); // Referee change dialog
  const [newRefName, setNewRefName] = useState('');
  const [changingRef, setChangingRef] = useState(false);
  const [showSetConfirm, setShowSetConfirm] = useState(false);
  const [pendingSetSide, setPendingSetSide] = useState(null);
  const [setConfirmScores, setSetConfirmScores] = useState({ a: 0, b: 0 });
  const [confirmingSet, setConfirmingSet] = useState(false);
  const [endGameForm, setEndGameForm] = useState({ league_id: '', notes: '' });
  const [leagues, setLeagues] = useState([]);
  const [timer, setTimer] = useState('0:00');
  const [loading, setLoading] = useState(true);
  const prevSetRef = useRef(0);

  const fetchSession = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/sport/live/${sessionId}`);
      if (r.ok) {
        const data = await r.json();
        setSession(data);
        setSwapped(data.display?.swapped || false);
        if (data.current_set !== prevSetRef.current && prevSetRef.current > 0 && data.settings?.auto_swap_sides) {
          setSwapped(prev => !prev);
          syncDisplay({ swapped: !swapped });
          toast.info('Sides swapped');
        }
        prevSetRef.current = data.current_set;
        if (data.status === 'finished') setShowEndGame(true);
      }
    } catch (e) {
      console.error('fetchSession error:', e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);
  useEffect(() => { fetch(`${API}/api/sport/leagues`).then(r => r.ok ? r.json() : []).then(setLeagues).catch(() => {}); }, []);
  
  // Timer tick
  useEffect(() => {
    const iv = setInterval(() => {
      if (session?.timers?.match_start) setTimer(formatTimer(session.timers.match_start));
    }, 1000);
    return () => clearInterval(iv);
  }, [session?.timers?.match_start]);

  // WebSocket
  useEffect(() => {
    if (!sessionId) return;
    try {
      const ws = new WebSocket(`${API.replace('http', 'ws')}/api/sport/ws/live/${sessionId}`);
      ws.onmessage = () => fetchSession();
      return () => ws.close();
    } catch {}
  }, [sessionId, fetchSession]);

  const syncDisplay = (data) => {
    fetch(`${API}/api/sport/live/${sessionId}/display`, { method: 'PUT', headers, body: JSON.stringify(data) }).catch(() => {});
  };

  // ── Set-win detection ─────────────────────────────────────────
  const wouldWinSet = (side, sess = session) => {
    if (!sess) return false;
    const ptw = sess.settings?.points_to_win || 11;
    const myNew = (sess.score?.[side] || 0) + 1;
    const opp   = sess.score?.[side === 'a' ? 'b' : 'a'] || 0;
    return myNew >= ptw && (myNew - opp) >= 2;
  };

  // Tap handler — intercepts set-winning point for confirmation dialog
  const handleSideScore = (side) => {
    if (isFinished) return;
    if (showTechPanel) { setShowTechnique(side); return; }
    if (wouldWinSet(side)) {
      setPendingSetSide(side);
      setSetConfirmScores({
        a: side === 'a' ? (session.score?.a || 0) + 1 : (session.score?.a || 0),
        b: side === 'b' ? (session.score?.b || 0) + 1 : (session.score?.b || 0),
      });
      setShowSetConfirm(true);
      return;
    }
    scorePoint(side);
  };

  // Confirm set (with optional score correction)
  const handleConfirmSet = async () => {
    if (!pendingSetSide || confirmingSet) return;
    setConfirmingSet(true);
    const side    = pendingSetSide;
    const oppSide = side === 'a' ? 'b' : 'a';
    const proposed = {
      a: side === 'a' ? (session.score?.a || 0) + 1 : (session.score?.a || 0),
      b: side === 'b' ? (session.score?.b || 0) + 1 : (session.score?.b || 0),
    };
    const edited = setConfirmScores.a !== proposed.a || setConfirmScores.b !== proposed.b;
    setShowSetConfirm(false);
    setPendingSetSide(null);
    try {
      if (edited) {
        const winner = setConfirmScores[side] > setConfirmScores[oppSide] ? side : oppSide;
        const res = await fetch(`${API}/api/sport/live/${sessionId}/manual-set`, {
          method: 'POST', headers,
          body: JSON.stringify({ score_a: setConfirmScores.a, score_b: setConfirmScores.b, winner }),
        });
        if (res.ok) { toast.success('Set confirmed with corrected score'); fetchSession(); }
        else toast.error('Failed to record set');
      } else {
        scorePoint(side);
      }
    } finally {
      setConfirmingSet(false);
    }
  };

  const scorePoint = async (side, technique = null) => {
    setShowTechnique(null);
    // Optimistic update — show score change immediately
    setSession(prev => {
      if (!prev) return prev;
      const newScore = { ...prev.score };
      newScore[side] = (newScore[side] || 0) + 1;
      return { ...prev, score: newScore };
    });
    try {
      const res = await fetch(`${API}/api/sport/live/${sessionId}/point`, { method: 'POST', headers, body: JSON.stringify({ scored_by: side, technique }) });
      if (res.ok) {
        const data = await res.json();
        // Update with server response (authoritative)
        setSession(prev => prev ? { ...prev, score: data.score, sets_won: data.sets_won, current_set: data.current_set, server: data.server, status: data.status } : prev);
        if (data.emotions?.length > 0) {
          const emoSide = side === leftSide ? 'left' : 'right';
          // Only sync to TV display, don't show on referee panel
          syncDisplay({ last_emotion: data.emotions[0].type, last_emotion_side: emoSide });
        }
        // Full sync only if set changed or match ended
        if (data.current_set !== session?.current_set || data.status === 'finished') {
          fetchSession();
        }
      } else {
        // Revert optimistic update on error
        fetchSession();
      }
    } catch { toast.error('Error'); fetchSession(); }
  };

  const undoPoint = () => fetch(`${API}/api/sport/live/${sessionId}/undo`, { method: 'POST', headers }).then(() => fetchSession()).catch(() => {});
  
  const issueCard = (type, target) => {
    fetch(`${API}/api/sport/live/${sessionId}/card`, { method: 'POST', headers, body: JSON.stringify({ card_type: type, target }) }).then(() => { toast.success(`${type} card issued`); fetchSession(); }).catch(() => {});
  };
  
  const makeCall = (type, target) => {
    fetch(`${API}/api/sport/live/${sessionId}/call`, { method: 'POST', headers, body: JSON.stringify({ call_type: type, target }) }).then(() => { toast.success(type); fetchSession(); }).catch(() => {});
  };
  
  const sendEffect = (effectId) => {
    fetch(`${API}/api/sport/live/${sessionId}/effect`, { method: 'POST', headers, body: JSON.stringify({ effect_id: effectId }) }).then(() => toast.success('Sent to TV')).catch(() => {});
  };
  
  const setBroadcast = (mode, data = {}) => {
    fetch(`${API}/api/sport/live/${sessionId}/broadcast`, { method: 'POST', headers, body: JSON.stringify({ mode, data }) }).catch(() => {});
  };
  
  const switchServer = () => {
    const newServer = session?.server === 'a' ? 'b' : 'a';
    fetch(`${API}/api/sport/live/${sessionId}/server`, { method: 'PUT', headers, body: JSON.stringify({ server: newServer }) }).then(() => fetchSession()).catch(() => {});
  };

  const handleSwap = () => {
    const ns = !swapped;
    setSwapped(ns);
    syncDisplay({ swapped: ns });
  };

  const updateSettings = (key, value) => {
    fetch(`${API}/api/sport/live/${sessionId}/settings`, { method: 'PUT', headers, body: JSON.stringify({ [key]: value }) }).then(() => fetchSession()).catch(() => {});
  };

  const handleAddManualSet = async () => {
    const winner = manualSet.score_a > manualSet.score_b ? 'a' : 'b';
    const res = await fetch(`${API}/api/sport/live/${sessionId}/manual-set`, { method: 'POST', headers, body: JSON.stringify({ ...manualSet, winner }) });
    if (res.ok) { toast.success('Set added'); setShowManualSet(false); fetchSession(); }
  };

  const endMatch = async () => {
    if (!confirm('End match?')) return;
    await fetch(`${API}/api/sport/live/${sessionId}/end`, { method: 'POST', headers });
    navigate('/sport');
  };

  const changeReferee = async () => {
    if (!newRefName.trim()) { toast.error('Enter referee name'); return; }
    setChangingRef(true);
    try {
      const res = await fetch(`${API}/api/sport/live/${sessionId}/referee`, {
        method: 'PUT', headers, body: JSON.stringify({ name: newRefName.trim() })
      });
      if (res.ok) {
        toast.success(`Referee changed to ${newRefName.trim()}`);
        setShowChangeRef(false);
        setNewRefName('');
        fetchSession();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to change referee');
      }
    } catch { toast.error('Error changing referee'); }
    finally { setChangingRef(false); }
  };

  if (loading || !session) return <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a2e' }}><Radio className="h-8 w-8 text-red-500 animate-pulse" /></div>;

  const s = session;
  const left = swapped ? s.player_b : s.player_a;
  const right = swapped ? s.player_a : s.player_b;
  const leftSide = swapped ? 'b' : 'a';
  const rightSide = swapped ? 'a' : 'b';
  const isFinished = s.status === 'finished';

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <EmotionOverlay emotion={emotion} settings={s} side={emotion?.side} playerPhoto={emotion?.side === 'left' ? left?.photo_url : right?.photo_url} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30">
        <button className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.display?.is_public !== false ? 'bg-green-600 text-white' : 'bg-white/10 text-white/40'}`}
          onClick={() => syncDisplay({ is_public: s.display?.is_public === false })}>
          <Radio className="h-4 w-4 inline mr-0.5" /> {s.display?.is_public !== false ? 'LIVE' : 'PRIV'}
        </button>
        <span className="text-white/30 text-sm font-mono">{timer} · Set {s.current_set} · Bo{(s.settings?.sets_to_win || 2) * 2 - 1}</span>
        <div className="flex gap-1">
          <button onClick={handleSwap} className="text-white/40 hover:text-white p-1"><ArrowLeftRight className="h-5 w-5" /></button>
          <button onClick={() => setShowManualSet(true)} className="text-white/40 hover:text-white p-1"><Plus className="h-5 w-5" /></button>
          <button onClick={() => setShowSettings(true)} className="text-white/40 hover:text-white p-1"><Settings className="h-5 w-5" /></button>
          <button onClick={endMatch} className="text-red-400/60 hover:text-red-400 p-1"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Set dots */}
      <div className="flex justify-center gap-4 px-4 py-1">
        <div className="flex gap-1">
          {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`l${i}`} className={`w-4 h-4 rounded-full ${i < (s.sets_won?.[leftSide] || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`r${i}`} className={`w-4 h-4 rounded-full ${i < (s.sets_won?.[rightSide] || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      {/* Main Score Tap Areas */}
      <div className="flex-1 flex min-h-0">
        <button className="flex-1 flex flex-col items-center justify-center active:bg-white/5" onClick={() => handleSideScore(leftSide)} disabled={isFinished} data-testid="score-left">
          {left?.photo_url && <img src={left.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 mb-1" alt="" />}
          <span className="text-white/50 text-base font-semibold">{left?.nickname || '?'}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>{s.score?.[leftSide] || 0}</span>
          {s.server === leftSide && <span className="text-yellow-400 text-base">🏓</span>}
        </button>
        <div className="w-px bg-white/10 self-stretch" />
        <button className="flex-1 flex flex-col items-center justify-center active:bg-white/5" onClick={() => handleSideScore(rightSide)} disabled={isFinished} data-testid="score-right">
          {right?.photo_url && <img src={right.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 mb-1" alt="" />}
          <span className="text-white/50 text-base font-semibold">{right?.nickname || '?'}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>{s.score?.[rightSide] || 0}</span>
          {s.server === rightSide && <span className="text-yellow-400 text-base">🏓</span>}
        </button>
      </div>

      {/* Battle Path + Set scores + Point Flow */}
      <div className="px-3 py-1 space-y-1">
        {/* Set scores — compact inline */}
        {(s.sets?.length > 0) && (
          <div className="flex items-center justify-center gap-1 text-sm">
            {s.sets.map((set, i) => (
              <span key={i} className={`px-1.5 py-0.5 rounded ${set.winner === leftSide ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {swapped ? `${set.score_b}-${set.score_a}` : `${set.score_a}-${set.score_b}`}
              </span>
            ))}
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 animate-pulse">
              {s.score?.[leftSide] || 0}-{s.score?.[rightSide] || 0}*
            </span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/40">
        {/* Quick actions row */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
          <Button variant="ghost" size="sm" className="text-white/50 h-9 text-sm" onClick={undoPoint}><Undo2 className="h-4 w-4 mr-1" /> Undo</Button>
          <button className="text-yellow-400/50 text-base font-semibold" onClick={switchServer}>🏓 switch</button>
          <Button variant="ghost" size="sm" className={`h-9 text-sm ${showTechPanel ? 'text-yellow-400' : 'text-white/50'}`} onClick={() => setShowTechPanel(!showTechPanel)}><Zap className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className={`h-9 text-sm ${showControls ? 'text-purple-400' : 'text-white/50'}`} onClick={() => setShowControls(!showControls)}>
            <Tv className="h-4 w-4" />
          </Button>
        </div>

        {/* Expanded controls panel */}
        {showControls && (
          <div className="px-3 py-2 space-y-2 border-t border-white/5 animate-in slide-in-from-bottom">
            {/* Cards & Calls */}
            <div>
              <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Cards & Calls</p>
              <div className="flex gap-1 flex-wrap">
                <button className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-[10px]" onClick={() => issueCard('yellow', leftSide)}>🟨 {left?.nickname?.substring(0,4)}</button>
                <button className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-[10px]" onClick={() => issueCard('yellow', rightSide)}>🟨 {right?.nickname?.substring(0,4)}</button>
                <button className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px]" onClick={() => issueCard('red', leftSide)}>🟥 {left?.nickname?.substring(0,4)}</button>
                <button className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px]" onClick={() => issueCard('red', rightSide)}>🟥 {right?.nickname?.substring(0,4)}</button>
                <button className="px-2 py-1 rounded bg-white/10 text-white/50 text-[10px]" onClick={() => makeCall('let')}>🔄 Let</button>
                <button className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px]" onClick={() => makeCall('timeout', leftSide)}>⏸️ {left?.nickname?.substring(0,4)}</button>
                <button className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px]" onClick={() => makeCall('timeout', rightSide)}>⏸️ {right?.nickname?.substring(0,4)}</button>
              </div>
            </div>
            {/* Quick Effects */}
            <div>
              <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Effects → TV</p>
              <div className="flex gap-1 flex-wrap">
                {QUICK_EFFECTS.map(e => (
                  <button key={e.id} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px]" onClick={() => sendEffect(e.id)}>
                    {e.emoji}
                  </button>
                ))}
              </div>
            </div>
            {/* Broadcast Control */}
            <div>
              <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">TV Screen</p>
              <div className="flex gap-1 flex-wrap">
                <button className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px]" onClick={() => setBroadcast(null)}>🏓 Game</button>
                <button className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-[10px]" onClick={() => setBroadcast('intro')}>🏁 Intro</button>
                <button className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px]" onClick={() => setBroadcast('break')}>⏸️ Break</button>
                <button className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px]" onClick={() => setBroadcast('standings')}>🏆 Standings</button>
              </div>
            </div>
            {/* Referee & Match Actions */}
            <div>
              <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Match</p>
              <div className="flex gap-1 flex-wrap">
                <button className="px-2 py-1 rounded bg-white/10 text-white/60 text-[10px]" onClick={() => setShowChangeRef(true)}>⚖️ Change Ref</button>
                <button className="px-2 py-1 rounded bg-white/10 text-white/60 text-[10px]" onClick={() => setShowManualSet(true)}><Plus className="h-4 w-4 inline mr-0.5" />Add Set</button>
                <button className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px]" onClick={endMatch}><Square className="h-4 w-4 inline mr-0.5" />End</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technique picker */}
      {showTechnique && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowTechnique(null)}>
          <div className="w-full bg-[#1a1a2e] border-t border-white/10 p-3" onClick={e => e.stopPropagation()}>
            <p className="text-white/60 text-xs mb-2 text-center">Point for <strong className="text-white">{showTechnique === leftSide ? left?.nickname : right?.nickname}</strong></p>
            <div className="grid grid-cols-4 gap-2">
              {TECHNIQUES.map(tech => (
                <button key={tech.id} className="flex flex-col items-center py-2 rounded-lg bg-white/5 hover:bg-white/10" onClick={() => scorePoint(showTechnique, tech.id)}>
                  <span className="text-lg">{tech.emoji}</span>
                  <span className="text-[8px] text-white/50">{tech.id}</span>
                </button>
              ))}
            </div>
          <Button variant="ghost" className="w-full mt-2 text-white/40 text-xs" onClick={() => scorePoint(showTechnique)}>Skip</Button>
          </div>
        </div>
      )}

      {/* ── Set Confirmation Dialog ── */}
      <Dialog open={showSetConfirm} onOpenChange={(v) => { if (!v && !confirmingSet) { setShowSetConfirm(false); setPendingSetSide(null); } }}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm" data-testid="set-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Set {s.current_set} — Confirm Final Score
            </DialogTitle>
            <p className="text-white/40 text-xs mt-0.5">Edit scores if needed, then confirm to close the set</p>
          </DialogHeader>

          {/* Editable scores */}
          <div className="grid grid-cols-3 items-center gap-3 py-3">
            {/* Left player */}
            <div className="text-center space-y-1.5">
              {left?.photo_url && <img src={left.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 mx-auto" alt="" />}
              <p className="text-white/60 text-xs font-semibold truncate">{left?.nickname || '?'}</p>
              <Input
                type="number"
                min={0}
                max={99}
                value={setConfirmScores[leftSide]}
                onChange={e => setSetConfirmScores(p => ({ ...p, [leftSide]: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={`h-16 text-center text-3xl font-black bg-white/5 border-2 text-white ${
                  pendingSetSide === leftSide ? 'border-yellow-400/60' : 'border-white/10'
                }`}
                data-testid="confirm-score-left"
              />
              {pendingSetSide === leftSide && (
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Set Winner</span>
              )}
            </div>

            {/* VS divider */}
            <div className="text-center">
              <span className="text-white/20 text-xl font-black">—</span>
            </div>

            {/* Right player */}
            <div className="text-center space-y-1.5">
              {right?.photo_url && <img src={right.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 mx-auto" alt="" />}
              <p className="text-white/60 text-xs font-semibold truncate">{right?.nickname || '?'}</p>
              <Input
                type="number"
                min={0}
                max={99}
                value={setConfirmScores[rightSide]}
                onChange={e => setSetConfirmScores(p => ({ ...p, [rightSide]: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={`h-16 text-center text-3xl font-black bg-white/5 border-2 text-white ${
                  pendingSetSide === rightSide ? 'border-yellow-400/60' : 'border-white/10'
                }`}
                data-testid="confirm-score-right"
              />
              {pendingSetSide === rightSide && (
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Set Winner</span>
              )}
            </div>
          </div>

          {/* Sets so far */}
          {s.sets?.length > 0 && (
            <div className="flex items-center justify-center gap-1 pb-1">
              <span className="text-white/30 text-[10px] mr-1">Previous:</span>
              {s.sets.map((set, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${set.winner === leftSide ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {swapped ? `${set.score_b}-${set.score_a}` : `${set.score_a}-${set.score_b}`}
                </span>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 pt-1">
            <Button
              variant="ghost"
              className="text-white/40 border border-white/10"
              onClick={() => { setShowSetConfirm(false); setPendingSetSide(null); }}
              disabled={confirmingSet}
              data-testid="set-confirm-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm gap-2"
              onClick={handleConfirmSet}
              disabled={confirmingSet}
              data-testid="set-confirm-btn"
            >
              {confirmingSet ? (
                <span className="animate-pulse">Confirming…</span>
              ) : (
                <><Trophy className="h-4 w-4" /> Confirm Set</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Set Dialog */}
      <Dialog open={showManualSet} onOpenChange={setShowManualSet}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Add Previous Set</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label className="text-white/60 text-xs">{s.player_a?.nickname}</Label><Input type="number" value={manualSet.score_a} onChange={e => setManualSet(p => ({ ...p, score_a: parseInt(e.target.value) || 0 }))} className="h-12 text-center text-2xl font-bold bg-white/5 border-white/10 text-white" /></div>
            <div><Label className="text-white/60 text-xs">{s.player_b?.nickname}</Label><Input type="number" value={manualSet.score_b} onChange={e => setManualSet(p => ({ ...p, score_b: parseInt(e.target.value) || 0 }))} className="h-12 text-center text-2xl font-bold bg-white/5 border-white/10 text-white" /></div>
          </div>
          <DialogFooter><Button variant="ghost" className="text-white/50" onClick={() => setShowManualSet(false)}>Cancel</Button><Button className="bg-yellow-500 text-black" onClick={handleAddManualSet}><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xs">
          <DialogHeader><DialogTitle className="text-white">Settings</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/60 text-xs">Best of</Label><div className="grid grid-cols-4 gap-1 mt-1">{[{v:1,l:'1'},{v:2,l:'Bo3'},{v:3,l:'Bo5'},{v:4,l:'Bo7'}].map(o => (<Button key={o.v} size="sm" className={`h-9 ${(s.settings?.sets_to_win||2)===o.v?'bg-yellow-500/20 text-yellow-400':'bg-white/5 text-white/50'}`} onClick={()=>updateSettings('sets_to_win',o.v)}>{o.l}</Button>))}</div></div>
            <div><Label className="text-white/60 text-xs">Points</Label><div className="grid grid-cols-2 gap-1 mt-1">{[11,21].map(p => (<Button key={p} size="sm" className={`h-9 ${(s.settings?.points_to_win||11)===p?'bg-yellow-500/20 text-yellow-400':'bg-white/5 text-white/50'}`} onClick={()=>updateSettings('points_to_win',p)}>{p}</Button>))}</div></div>
            <div className="flex items-center justify-between"><Label className="text-white/60 text-xs">Auto-swap sides</Label><button className={`px-3 py-1 rounded text-xs ${s.settings?.auto_swap_sides?'bg-green-500/20 text-green-400':'bg-white/10 text-white/40'}`} onClick={()=>updateSettings('auto_swap_sides',!s.settings?.auto_swap_sides)}>{s.settings?.auto_swap_sides?'ON':'OFF'}</button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Game Dialog */}
      <Dialog open={showEndGame} onOpenChange={setShowEndGame}>

      {/* Change Referee Dialog */}
      <Dialog open={showChangeRef} onOpenChange={setShowChangeRef}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xs">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2">⚖️ Change Referee</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-white/40">Current: <strong className="text-white/70">{s.referee?.nickname || 'Unknown'}</strong></div>
            <div>
              <Label className="text-white/60 text-xs">New Referee Name</Label>
              <Input
                value={newRefName}
                onChange={e => setNewRefName(e.target.value)}
                placeholder="Enter referee name..."
                className="h-9 bg-white/5 border-white/10 text-white mt-1"
                onKeyDown={e => e.key === 'Enter' && changeReferee()}
                data-testid="input-new-referee"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-white/50" onClick={() => setShowChangeRef(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={changeReferee} disabled={changingRef || !newRefName.trim()}>
              {changingRef ? 'Changing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> Match Complete</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-center py-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-center gap-4">
                <div><p className={`font-bold ${s.winner==='a'?'text-yellow-400':'text-white/60'}`}>{s.player_a?.nickname}</p><p className="text-2xl font-black text-white">{s.sets_won?.a||0}</p></div>
                <span className="text-white/30">—</span>
                <div><p className={`font-bold ${s.winner==='b'?'text-yellow-400':'text-white/60'}`}>{s.player_b?.nickname}</p><p className="text-2xl font-black text-white">{s.sets_won?.b||0}</p></div>
              </div>
              <p className="text-white/30 text-xs mt-1">Time: {timer}</p>
            </div>
            {leagues.length > 0 && (<div><Label className="text-white/60 text-xs">League</Label><Select value={endGameForm.league_id} onValueChange={v=>setEndGameForm(p=>({...p,league_id:v}))}><SelectTrigger className="bg-white/5 border-white/10 text-white h-9"><SelectValue placeholder="No league" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{leagues.filter(l=>l.status==='active').map(l=><SelectItem key={l.league_id} value={l.league_id}>{l.name}</SelectItem>)}</SelectContent></Select></div>)}
          </div>
          <DialogFooter className="gap-2"><Button variant="ghost" className="text-white/50" onClick={()=>navigate('/sport')}>Close</Button><Button className="bg-yellow-500 text-black" onClick={()=>{toast.success('Saved');navigate('/sport');}}><Save className="h-4 w-4 mr-1" /> Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
