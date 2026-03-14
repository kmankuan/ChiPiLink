/**
 * Sport TV Display — Auto-shows current live match on TV/projector
 * URL: /sport/tv — no login needed, auto-refreshes, big display
 * If multiple live matches, shows the most recent one
 * If no live match, shows "Waiting for match..." with rankings
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Radio, Trophy } from 'lucide-react';
import MomentumGraph from './components/MomentumGraph';
import PointFlow from './components/PointFlow';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportTV() {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [rankings, setRankings] = useState([]);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const prevPoints = useRef(0);

  // Find active live session
  const findLiveMatch = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/sport/live`);
      if (r.ok) {
        const sessions = await r.json();
        if (sessions.length > 0) {
          const latest = sessions[0];
          setSession(latest);
          // Fetch full state
          const sr = await fetch(`${API}/api/sport/live/${latest.session_id}/state`);
          if (sr.ok) {
            const st = await sr.json();
            // Detect new points for emotion
            if (st.points?.length > prevPoints.current && prevPoints.current > 0) {
              const lastPoint = st.points[st.points.length - 1];
              if (lastPoint.emotions?.length > 0) {
                setEmotion({ ...{ type: lastPoint.emotions[0] }, side: lastPoint.scored_by === 'a' ? 'left' : 'right' });
                setTimeout(() => setEmotion(null), 3000);
              }
            }
            prevPoints.current = st.points?.length || 0;
            setState(st);
          }
          return latest;
        }
      }
      setSession(null);
      setState(null);
    } catch {}
    return null;
  }, []);

  // Load rankings for idle screen
  useEffect(() => {
    fetch(`${API}/api/sport/rankings?limit=10`).then(r => r.ok ? r.json() : []).then(setRankings).catch(() => {});
  }, []);

  // Poll for live match every 2 seconds
  useEffect(() => {
    findLiveMatch();
    pollRef.current = setInterval(findLiveMatch, 2000);
    return () => clearInterval(pollRef.current);
  }, [findLiveMatch]);

  // Try WebSocket for faster updates
  useEffect(() => {
    if (!session?.session_id) return;
    try {
      const wsUrl = `${API.replace('http', 'ws')}/api/sport/ws/live/${session.session_id}`;
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point') {
          findLiveMatch();
        }
      };
      wsRef.current = ws;
      return () => ws.close();
    } catch {}
  }, [session?.session_id, findLiveMatch]);

  // IDLE SCREEN — no live match
  if (!session || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
        <div className="text-center mb-12">
          <span className="text-6xl mb-4 block">🏓</span>
          <h1 className="text-4xl font-black text-white mb-2">ChiPi Sport</h1>
          <p className="text-white/40 text-lg">Waiting for live match...</p>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse mx-auto mt-4" />
        </div>

        {/* Show rankings while waiting */}
        {rankings.length > 0 && (
          <div className="w-full max-w-2xl px-8">
            <h2 className="text-white/50 text-sm font-bold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> ELO Rankings
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {rankings.slice(0, 10).map((p, i) => (
                <div key={p.player_id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-sm font-bold w-6">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                    <span className="text-white text-sm font-medium">{p.nickname}</span>
                  </div>
                  <span className="text-white font-mono font-bold">{p.elo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIVE MATCH DISPLAY
  const pa = session.player_a || { nickname: '?' };
  const pb = session.player_b || { nickname: '?' };
  const score = state.score || { a: 0, b: 0 };
  const setsWon = state.sets_won || { a: 0, b: 0 };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
      <EmotionOverlay emotion={emotion} settings={{}} side={emotion?.side} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-600 text-white animate-pulse text-sm px-3 py-1">
            <Radio className="h-4 w-4 mr-2" /> LIVE
          </Badge>
          <span className="text-white/30 text-sm">Set {state.current_set}</span>
        </div>
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <span>⚖️ {session.referee?.nickname}</span>
        </div>
      </div>

      {/* Sets won */}
      <div className="flex justify-center gap-12 px-8 pb-4">
        <div className="flex gap-2">
          {Array.from({ length: session.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`a${i}`} className={`w-5 h-5 rounded-full transition-all ${i < setsWon.a ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-white/10'}`} />
          ))}
        </div>
        <span className="text-white/20 text-xs self-center">SETS</span>
        <div className="flex gap-2">
          {Array.from({ length: session.settings?.sets_to_win || 2 }).map((_, i) => (
            <div key={`b${i}`} className={`w-5 h-5 rounded-full transition-all ${i < setsWon.b ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      {/* Main Score */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="flex items-center gap-12 w-full max-w-4xl">
          {/* Player A */}
          <div className="flex-1 text-center">
            <p className="text-white/60 text-2xl font-bold mb-4">{pa.nickname}</p>
            <p className="text-[12rem] font-black text-white leading-none" style={{ textShadow: '0 0 60px rgba(255,255,255,0.1)' }}>
              {score.a}
            </p>
            {state.server === 'a' && <p className="text-yellow-400 text-xl mt-2">🏓 Service</p>}
            <p className="text-white/20 text-sm mt-1">ELO {pa.elo}</p>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <div className="w-px h-32 bg-white/10" />
            <span className="text-white/20 text-xl my-4">vs</span>
            <div className="w-px h-32 bg-white/10" />
          </div>

          {/* Player B */}
          <div className="flex-1 text-center">
            <p className="text-white/60 text-2xl font-bold mb-4">{pb.nickname}</p>
            <p className="text-[12rem] font-black text-white leading-none" style={{ textShadow: '0 0 60px rgba(255,255,255,0.1)' }}>
              {score.b}
            </p>
            {state.server === 'b' && <p className="text-yellow-400 text-xl mt-2">🏓 Service</p>}
            <p className="text-white/20 text-sm mt-1">ELO {pb.elo}</p>
          </div>
        </div>
      </div>

      {/* Point Flow + Set History */}
      <div className="px-8 py-3 space-y-2">
        {/* Set-by-set scores */}
        <div className="flex items-center justify-center gap-3">
          {state.sets?.map((set, i) => (
            <div key={i} className={`px-3 py-1 rounded-lg text-sm font-mono ${set.winner === 'a' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
              Set {i + 1}: <strong>{set.score_a}-{set.score_b}</strong>
            </div>
          ))}
          {state.status === 'live' && (score.a > 0 || score.b > 0) && (
            <div className="px-3 py-1 rounded-lg text-sm font-mono bg-yellow-500/15 text-yellow-400 animate-pulse">
              Set {state.current_set}: <strong>{score.a}-{score.b}</strong>*
            </div>
          )}
        </div>
        {/* Point flow visualization */}
        <PointFlow points={state.points || []} playerA={pa.nickname} playerB={pb.nickname} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-3 bg-black/30">
        <span className="text-white/20 text-xs">🏓 ChiPi Sport</span>
        <span className="text-white/20 text-xs">Best of {(session.settings?.sets_to_win || 2) * 2 - 1} · {session.settings?.points_to_win || 11} pts</span>
      </div>
    </div>
  );
}
