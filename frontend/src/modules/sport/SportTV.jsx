/**
 * Sport TV — Full broadcast display
 * Handles: game view, intro, break, cards, effects, timers, battle path
 * Reads ALL display state from server for perfect sync with referee
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Trophy } from 'lucide-react';
import PointFlow from './components/PointFlow';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const EFFECT_MAP = {
  tense: '😱', fire: '🔥', clap: '👏', funny: '😂', strong: '💪', fast: '⚡', precise: '🎯', insane: '🤯',
};

function formatTimer(startIso) {
  if (!startIso) return '0:00';
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  return `${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`;
}

function PlayerColumn({ player, score, setsWon, totalSets, isServing, side, points, sets, swapped }) {
  const myPoints = (points || []).filter(p => p.scored_by === side);
  const recent = (points || []).slice(-15);
  const myRecent = recent.filter(p => p.scored_by === side).length;
  const momentum = recent.length > 0 ? myRecent / recent.length : 0.5;

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative px-4">
      {/* Photo */}
      {player?.photo_url ? (
        <img src={player.photo_url} className="w-28 h-28 rounded-full object-cover border-4 border-white/15 mb-3 shadow-xl" alt="" />
      ) : (
        <div className="w-28 h-28 rounded-full bg-white/5 flex items-center justify-center mb-3 border-4 border-white/10">
          <span className="text-5xl text-white/20">{(player?.nickname || '?')[0]}</span>
        </div>
      )}
      
      {/* Name */}
      <p className="text-white/70 text-3xl font-bold mb-2">{player?.nickname || '?'}</p>
      
      {/* Score */}
      <p className="text-[14rem] font-black text-white leading-none" style={{ textShadow: '0 0 80px rgba(255,255,255,0.08)' }}>{score}</p>
      
      {/* Service */}
      {isServing && <p className="text-yellow-400 text-2xl mt-2">🏓</p>}
      
      {/* Set dots with scores */}
      <div className="flex gap-3 mt-3">
        {Array.from({ length: totalSets }).map((_, i) => {
          const won = i < (setsWon || 0);
          const setData = sets?.[i];
          return (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full transition-all ${won ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-white/10'}`} />
              {setData && <span className="text-[9px] text-white/25 mt-0.5">{side === 'a' ? `${setData.score_a}-${setData.score_b}` : `${setData.score_b}-${setData.score_a}`}</span>}
            </div>
          );
        })}
      </div>
      
      {/* Momentum */}
      <div className="w-40 h-2 rounded-full bg-white/5 mt-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${momentum * 100}%`, background: momentum > 0.6 ? '#22c55e' : momentum > 0.4 ? '#eab308' : '#ef4444' }} />
      </div>
      
      <p className="text-white/15 text-xs mt-1">ELO {player?.elo || '?'}</p>
    </div>
  );
}

function CardOverlay({ card, playerA, playerB }) {
  if (!card) return null;
  const isYellow = card.card_type === 'yellow';
  const playerName = card.target === 'a' ? playerA?.nickname : playerB?.nickname;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce">
      <div className={`text-center p-8 rounded-3xl ${isYellow ? 'bg-yellow-500/30' : 'bg-red-500/30'}`} style={{ backdropFilter: 'blur(10px)' }}>
        <div className="text-9xl mb-4">{isYellow ? '🟨' : '🟥'}</div>
        <p className="text-4xl font-black text-white">{isYellow ? 'WARNING' : 'FOUL'}</p>
        <p className="text-2xl text-white/70 mt-2">{playerName}</p>
      </div>
    </div>
  );
}

function CallOverlay({ call, playerA, playerB }) {
  if (!call) return null;
  if (call.call_type === 'let') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div className="text-center p-6 rounded-2xl bg-white/10" style={{ backdropFilter: 'blur(10px)' }}>
          <p className="text-6xl font-black text-white animate-pulse">LET</p>
          <p className="text-white/50 text-lg mt-1">Net touch — replay service</p>
        </div>
      </div>
    );
  }
  if (call.call_type === 'timeout') {
    const name = call.target === 'a' ? playerA?.nickname : playerB?.nickname;
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div className="text-center p-8 rounded-2xl bg-blue-500/20" style={{ backdropFilter: 'blur(10px)' }}>
          <p className="text-6xl mb-2">⏸️</p>
          <p className="text-4xl font-black text-white">TIMEOUT</p>
          <p className="text-xl text-white/60 mt-2">{name}</p>
        </div>
      </div>
    );
  }
  return null;
}

function EffectOverlay({ effectId }) {
  const emoji = EFFECT_MAP[effectId] || '✨';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce">
      <span className="text-[10rem]">{emoji}</span>
    </div>
  );
}

function IntroScreen({ playerA, playerB, referee }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
      <p className="text-white/40 text-lg mb-8 tracking-widest">⚡ COMING UP NEXT ⚡</p>
      <div className="flex items-center gap-16">
        <div className="text-center">
          {playerA?.photo_url ? <img src={playerA.photo_url} className="w-32 h-32 rounded-full object-cover border-4 border-white/20 mx-auto mb-4" alt="" /> : <div className="w-32 h-32 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-5xl text-white/20">{(playerA?.nickname||'?')[0]}</div>}
          <p className="text-3xl font-bold text-white">{playerA?.nickname}</p>
          <p className="text-white/40">ELO {playerA?.elo}</p>
        </div>
        <div className="text-5xl font-black text-white/20">VS</div>
        <div className="text-center">
          {playerB?.photo_url ? <img src={playerB.photo_url} className="w-32 h-32 rounded-full object-cover border-4 border-white/20 mx-auto mb-4" alt="" /> : <div className="w-32 h-32 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-5xl text-white/20">{(playerB?.nickname||'?')[0]}</div>}
          <p className="text-3xl font-bold text-white">{playerB?.nickname}</p>
          <p className="text-white/40">ELO {playerB?.elo}</p>
        </div>
      </div>
      <p className="text-white/20 text-sm mt-8">⚖️ Referee: {referee?.nickname}</p>
    </div>
  );
}

function BreakScreen({ session, timer }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
      <p className="text-5xl mb-4">⏸️</p>
      <p className="text-3xl font-bold text-white mb-2">BREAK</p>
      <p className="text-white/40 text-lg">Match will resume shortly</p>
      <p className="text-white/20 text-sm mt-4">Time elapsed: {timer}</p>
      {session?.sets?.length > 0 && (
        <div className="flex gap-4 mt-6">{session.sets.map((s, i) => <span key={i} className="text-white/30 text-sm">Set {i+1}: {s.score_a}-{s.score_b}</span>)}</div>
      )}
    </div>
  );
}

export default function SportTV() {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [cardOverlay, setCardOverlay] = useState(null);
  const [callOverlay, setCallOverlay] = useState(null);
  const [effectOverlay, setEffectOverlay] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [timer, setTimer] = useState('0:00');
  const prevEmotionRef = useRef(null);
  const prevCardRef = useRef(null);
  const prevCallRef = useRef(null);
  const prevEffectRef = useRef(null);

  const findLiveMatch = useCallback(async () => {
    try {
      const livesRes = await fetch(`${API}/api/sport/live`);
      if (!livesRes.ok) return;
      const sessions = await livesRes.json();
      if (sessions.length === 0) { setSession(null); setState(null); return; }
      
      const latest = sessions[0];
      setSession(latest);
      const sr = await fetch(`${API}/api/sport/live/${latest.session_id}/state`);
      if (!sr.ok) return;
      const st = await sr.json();
      setState(st);

      // Detect new overlays from display state
      const emo = st.display?.last_emotion;
      const emoAt = st.display?.last_emotion_at;
      if (emo && emoAt !== prevEmotionRef.current) {
        setEmotion({ type: emo, side: st.display?.last_emotion_side || 'center' });
        setTimeout(() => setEmotion(null), 3000);
        prevEmotionRef.current = emoAt;
      }

      const lastCard = st.display?.last_card;
      const lastCardAt = lastCard?.time;
      if (lastCard && lastCardAt !== prevCardRef.current) {
        setCardOverlay(lastCard);
        setTimeout(() => setCardOverlay(null), 4000);
        prevCardRef.current = lastCardAt;
      }

      const lastCall = st.display?.last_call;
      const lastCallAt = lastCall?.time;
      if (lastCall && lastCallAt !== prevCallRef.current) {
        setCallOverlay(lastCall);
        setTimeout(() => setCallOverlay(null), 4000);
        prevCallRef.current = lastCallAt;
      }

      const lastEffect = st.display?.last_effect;
      const lastEffectAt = st.display?.last_effect_at;
      if (lastEffect && lastEffectAt !== prevEffectRef.current) {
        setEffectOverlay(lastEffect);
        setTimeout(() => setEffectOverlay(null), 3000);
        prevEffectRef.current = lastEffectAt;
      }
    } catch {}
  }, []);

  useEffect(() => {
    findLiveMatch();
    fetch(`${API}/api/sport/rankings?limit=10`).then(r => r.ok ? r.json() : []).then(setRankings).catch(() => {});
    const iv = setInterval(findLiveMatch, 1500);
    return () => clearInterval(iv);
  }, [findLiveMatch]);

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      if (state?.timers?.match_start) setTimer(formatTimer(state.timers.match_start));
    }, 1000);
    return () => clearInterval(iv);
  }, [state?.timers?.match_start]);

  // WebSocket
  useEffect(() => {
    if (!session?.session_id) return;
    try {
      const ws = new WebSocket(`${API.replace('http', 'ws')}/api/sport/ws/live/${session.session_id}`);
      ws.onmessage = () => findLiveMatch();
      return () => ws.close();
    } catch {}
  }, [session?.session_id, findLiveMatch]);

  // IDLE
  if (!session || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
        <span className="text-7xl mb-4">🏓</span>
        <h1 className="text-5xl font-black text-white mb-2">ChiPi Sport</h1>
        <p className="text-white/30 text-xl">Waiting for live match...</p>
        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse mx-auto mt-6" />
        {rankings.length > 0 && (
          <div className="w-full max-w-3xl px-8 mt-12">
            <h2 className="text-white/40 text-sm font-bold mb-3"><Trophy className="h-4 w-4 inline mr-1 text-yellow-400" /> Rankings</h2>
            <div className="grid grid-cols-2 gap-3">
              {rankings.slice(0, 10).map((p, i) => (
                <div key={p.player_id} className="flex items-center justify-between px-5 py-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                    <span className="text-white text-lg">{p.nickname}</span>
                  </div>
                  <span className="text-white font-mono font-bold text-lg">{p.elo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // BROADCAST MODES
  const broadcastMode = state.display?.broadcast_mode;
  if (broadcastMode === 'intro') return <IntroScreen playerA={state.player_a || session.player_a} playerB={state.player_b || session.player_b} referee={state.referee || session.referee} />;
  if (broadcastMode === 'break') return <BreakScreen session={state} timer={timer} />;

  // LIVE GAME
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
      <EmotionOverlay emotion={emotion} settings={{}} side={emotion?.side} playerPhoto={emotion?.side === 'left' ? leftPlayer?.photo_url : rightPlayer?.photo_url} />
      {cardOverlay && <CardOverlay card={cardOverlay} playerA={swapped ? state.player_b : state.player_a} playerB={swapped ? state.player_a : state.player_b} />}
      {callOverlay && <CallOverlay call={callOverlay} playerA={swapped ? state.player_b : state.player_a} playerB={swapped ? state.player_a : state.player_b} />}
      {effectOverlay && <EffectOverlay effectId={effectOverlay} />}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white/40 text-sm font-bold">LIVE</span>
        </div>
        <span className="text-white/25 text-sm font-mono">{timer} · Set {state.current_set}</span>
        <span className="text-white/20 text-sm">⚖️ {(state.referee || session.referee)?.nickname}</span>
      </div>

      {/* Main — Player columns */}
      <div className="flex-1 flex items-center">
        <PlayerColumn player={leftPlayer} score={score[leftSide]} setsWon={setsWon[leftSide]} totalSets={totalSets} isServing={state.server === leftSide} side={leftSide} points={state.all_points || state.points} sets={state.sets} swapped={swapped} />
        <div className="flex flex-col items-center px-4">
          <div className="w-px h-24 bg-white/10" />
          <span className="text-white/10 text-2xl my-2">vs</span>
          <div className="w-px h-24 bg-white/10" />
        </div>
        <PlayerColumn player={rightPlayer} score={score[rightSide]} setsWon={setsWon[rightSide]} totalSets={totalSets} isServing={state.server === rightSide} side={rightSide} points={state.all_points || state.points} sets={state.sets} swapped={swapped} />
      </div>

      {/* Point flow (persistent all sets) */}
      <div className="px-8 py-2">
        <PointFlow points={state.all_points || state.points || []} playerA={leftPlayer?.nickname} playerB={rightPlayer?.nickname} swapped={swapped} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-8 py-2 bg-black/30">
        <span className="text-white/10 text-xs">🏓 ChiPi Sport</span>
      </div>
    </div>
  );
}
