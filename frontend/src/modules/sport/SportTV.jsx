/**
 * Sport TV Display — Full sync with referee panel
 * Reads display state (swapped, emotions, photos) from server
 * Merged set dots + scores in one component
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Radio, Trophy } from 'lucide-react';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function PlayerSide({ player, score, setsWon, totalSets, isServing, points = [], side }) {
  // Point flow for this player's side
  const myPoints = points.filter(p => p.scored_by === side);
  const recentPoints = points.slice(-20);
  const myRecent = recentPoints.filter(p => p.scored_by === side).length;
  const momentum = recentPoints.length > 0 ? myRecent / recentPoints.length : 0.5;

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      {/* Photo */}
      {player?.photo_url ? (
        <img src={player.photo_url} alt={player.nickname} className="w-24 h-24 rounded-full object-cover border-4 border-white/10 mb-3" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-3 border-4 border-white/10">
          <span className="text-4xl text-white/30">{(player?.nickname || '?')[0]}</span>
        </div>
      )}
      
      {/* Name */}
      <p className="text-white/60 text-2xl font-bold mb-2">{player?.nickname || '?'}</p>
      
      {/* Score */}
      <p className="text-[10rem] font-black text-white leading-none" style={{ textShadow: '0 0 60px rgba(255,255,255,0.1)' }}>
        {score}
      </p>
      
      {/* Service */}
      {isServing && <p className="text-yellow-400 text-xl mt-2">🏓</p>}
      
      {/* ELO */}
      <p className="text-white/15 text-sm mt-1">ELO {player?.elo || '?'}</p>
      
      {/* Momentum bar */}
      <div className="w-32 h-1.5 rounded-full bg-white/5 mt-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" 
          style={{ width: `${momentum * 100}%`, background: momentum > 0.6 ? '#22c55e' : momentum > 0.4 ? '#eab308' : '#ef4444' }} />
      </div>
      
      {/* Point flow dots */}
      <div className="flex items-center gap-[2px] mt-2 max-w-[200px] justify-center flex-wrap">
        {recentPoints.map((pt, i) => {
          const isMine = pt.scored_by === side;
          const streak = pt.streak || 1;
          return (
            <div key={i}
              className={`rounded-full transition-all ${isMine ? 'bg-green-400' : 'bg-red-400/40'}`}
              style={{ width: isMine ? Math.min(6 + streak, 12) : 4, height: isMine ? Math.min(6 + streak, 12) : 4, opacity: isMine ? 0.5 + streak * 0.1 : 0.2 }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SetDots({ setsWon, totalSets, sets, side }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-2">
        {Array.from({ length: totalSets }).map((_, i) => {
          const won = i < (setsWon || 0);
          const setData = sets?.[i]; // Actual set score if available
          return (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full transition-all ${won ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-white/10'}`} />
              {setData && (
                <span className="text-[8px] text-white/30 mt-0.5">
                  {side === 'a' ? `${setData.score_a}-${setData.score_b}` : `${setData.score_b}-${setData.score_a}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SportTV() {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [rankings, setRankings] = useState([]);
  const prevEmotionRef = useRef(null);
  const pollRef = useRef(null);
  const wsRef = useRef(null);

  const findLiveMatch = useCallback(async () => {
    try {
      const [livesRes, rankRes] = await Promise.all([
        fetch(`${API}/api/sport/live`),
        rankings.length === 0 ? fetch(`${API}/api/sport/rankings?limit=10`) : Promise.resolve(null),
      ]);
      
      if (rankRes?.ok) setRankings(await rankRes.json());
      
      if (livesRes.ok) {
        const sessions = await livesRes.json();
        if (sessions.length > 0) {
          const latest = sessions[0];
          setSession(latest);
          const sr = await fetch(`${API}/api/sport/live/${latest.session_id}/state`);
          if (sr.ok) {
            const st = await sr.json();
            // Check for new emotion from display state
            const newEmo = st.display?.last_emotion;
            if (newEmo && newEmo !== prevEmotionRef.current) {
              setEmotion({ type: newEmo, side: st.display?.last_emotion_side || 'center' });
              setTimeout(() => setEmotion(null), 3000);
              prevEmotionRef.current = newEmo;
            }
            setState(st);
          }
          return;
        }
      }
      setSession(null);
      setState(null);
    } catch {}
  }, [rankings.length]);

  useEffect(() => {
    findLiveMatch();
    pollRef.current = setInterval(findLiveMatch, 1500);
    return () => clearInterval(pollRef.current);
  }, [findLiveMatch]);

  // WebSocket for faster updates
  useEffect(() => {
    if (!session?.session_id) return;
    try {
      const ws = new WebSocket(`${API.replace('http', 'ws')}/api/sport/ws/live/${session.session_id}`);
      ws.onmessage = () => findLiveMatch();
      wsRef.current = ws;
      return () => ws.close();
    } catch {}
  }, [session?.session_id, findLiveMatch]);

  // IDLE SCREEN
  if (!session || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
        <div className="text-center mb-12">
          <span className="text-6xl mb-4 block">🏓</span>
          <h1 className="text-4xl font-black text-white mb-2">ChiPi Sport</h1>
          <p className="text-white/40 text-lg">Waiting for live match...</p>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse mx-auto mt-4" />
        </div>
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

  // LIVE MATCH — read display state for swap
  const swapped = state.display?.swapped || false;
  const leftPlayer = swapped ? (state.player_b || session.player_b) : (state.player_a || session.player_a);
  const rightPlayer = swapped ? (state.player_a || session.player_a) : (state.player_b || session.player_b);
  const leftSide = swapped ? 'b' : 'a';
  const rightSide = swapped ? 'a' : 'b';
  const score = state.score || { a: 0, b: 0 };
  const setsWon = state.sets_won || { a: 0, b: 0 };
  const totalSets = state.settings?.sets_to_win || 2;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
      <EmotionOverlay emotion={emotion} settings={{}} side={emotion?.side} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-3">
        <Badge className="bg-red-600 text-white animate-pulse text-sm px-3 py-1">
          <Radio className="h-4 w-4 mr-2" /> LIVE
        </Badge>
        <span className="text-white/30 text-sm">Set {state.current_set} · Bo{totalSets * 2 - 1}</span>
        <span className="text-white/20 text-sm">⚖️ {(state.referee || session.referee)?.nickname}</span>
      </div>

      {/* Set dots with scores — merged */}
      <div className="flex justify-center gap-16 px-8 pb-2">
        <SetDots setsWon={setsWon[leftSide]} totalSets={totalSets} sets={state.sets} side={leftSide} />
        <span className="text-white/15 text-[10px] self-center">SETS</span>
        <SetDots setsWon={setsWon[rightSide]} totalSets={totalSets} sets={state.sets} side={rightSide} />
      </div>

      {/* Main Score — Player sides */}
      <div className="flex-1 flex items-center px-8">
        <PlayerSide player={leftPlayer} score={score[leftSide]} setsWon={setsWon[leftSide]} totalSets={totalSets} isServing={state.server === leftSide} points={state.points || []} side={leftSide} />
        
        {/* VS Divider */}
        <div className="flex flex-col items-center px-6">
          <div className="w-px h-20 bg-white/10" />
          <span className="text-white/15 text-lg my-2">vs</span>
          <div className="w-px h-20 bg-white/10" />
        </div>
        
        <PlayerSide player={rightPlayer} score={score[rightSide]} setsWon={setsWon[rightSide]} totalSets={totalSets} isServing={state.server === rightSide} points={state.points || []} side={rightSide} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-8 py-3 bg-black/30">
        <span className="text-white/15 text-xs">🏓 ChiPi Sport</span>
      </div>
    </div>
  );
}
