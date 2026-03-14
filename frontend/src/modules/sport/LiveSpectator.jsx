/**
 * Live Spectator View — Watch live match with momentum, reactions, optional video embed
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MomentumGraph from './components/MomentumGraph';
import PointFlow from './components/PointFlow';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const REACTIONS = [
  { id: 'clap', emoji: '👏' }, { id: 'fire', emoji: '🔥' },
  { id: 'wow', emoji: '😱' }, { id: 'dragon', emoji: '🐉' },
  { id: 'lantern', emoji: '🏮' }, { id: 'strong', emoji: '💪' },
];

export default function LiveSpectator() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [reactions, setReactions] = useState({});
  const [fullSession, setFullSession] = useState(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/sport/live/${sessionId}/state`);
      if (r.ok) {
        const data = await r.json();
        setState(data);
        setReactions(data.reactions || {});
      }
    } catch {}
  }, [sessionId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Fetch full session for player names
  useEffect(() => {
    fetch(`${API}/api/sport/live/${sessionId}`).then(r => r.ok ? r.json() : null).then(setFullSession).catch(() => {});
  }, [sessionId]);

  // WebSocket with polling fallback
  useEffect(() => {
    if (!sessionId) return;
    let wsConnected = false;
    try {
      const wsUrl = `${API.replace('http', 'ws')}/api/sport/ws/live/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => { wsConnected = true; };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point') {
          setState(prev => ({ ...prev, ...msg.data }));
          if (msg.data.emotions?.length > 0) {
            setEmotion(msg.data.emotions[0]);
            setTimeout(() => setEmotion(null), 3000);
          }
        }
        if (msg.type === 'reaction') setReactions(msg.data);
        if (msg.type === 'undo' || msg.type === 'ended') fetchState();
      };
      wsRef.current = ws;
    } catch {}
    // Polling fallback
    pollRef.current = setInterval(() => { if (!wsConnected) fetchState(); }, 2000);
    return () => { wsRef.current?.close(); clearInterval(pollRef.current); };
  }, [sessionId, fetchState]);

  const sendReaction = async (id) => {
    fetch(`${API}/api/sport/live/${sessionId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_id: id }),
    }).catch(() => {});
    setReactions(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  if (!state) return <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a2e' }}><span className="text-white/50">Loading...</span></div>;

  const session = state;
  const pa = fullSession?.player_a || { nickname: 'Player A' };
  const pb = fullSession?.player_b || { nickname: 'Player B' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <EmotionOverlay emotion={emotion} settings={{}} />

      {/* Stream embed */}
      {session.stream_url && (
        <div className="aspect-video bg-black">
          <iframe src={session.stream_url} className="w-full h-full" allowFullScreen />
        </div>
      )}

      {/* Score */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <Badge className="bg-red-600 text-white animate-pulse text-xs mb-4">LIVE</Badge>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-white/70 text-sm font-medium mb-1">{pa.nickname}</p>
            <p className="text-6xl font-black text-white">{session.score?.a || 0}</p>
            {session.server === 'a' && <p className="text-yellow-400 text-xs mt-1">🏓</p>}
          </div>
          <div className="text-white/30 text-lg">vs</div>
          <div className="text-center">
            <p className="text-white/70 text-sm font-medium mb-1">{pb.nickname}</p>
            <p className="text-6xl font-black text-white">{session.score?.b || 0}</p>
            {session.server === 'b' && <p className="text-yellow-400 text-xs mt-1">🏓</p>}
          </div>
        </div>

        <p className="text-white/30 text-xs mt-3">Set {session.current_set} — {(session.sets_won?.a || 0)}-{(session.sets_won?.b || 0)}</p>
      </div>

      {/* Set History + Point Flow */}
      <div className="px-4 py-2 space-y-1">
        {/* Set scores */}
        <div className="flex items-center justify-center gap-2">
          {session.sets?.map((set, i) => (
            <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${set.winner === 'a' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
              {set.score_a}-{set.score_b}
            </span>
          ))}
          {session.status === 'live' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-yellow-500/15 text-yellow-400 animate-pulse">
              {session.score?.a}-{session.score?.b}*
            </span>
          )}
        </div>
        <PointFlow points={session.points || []} playerA={pa.nickname} playerB={pb.nickname} />
      </div>

      {/* Reactions */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-black/30">
        {REACTIONS.map(r => (
          <button key={r.id} onClick={() => sendReaction(r.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
            <span className="text-lg">{r.emoji}</span>
            <span className="text-[9px] text-white/40">{reactions[r.id] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
