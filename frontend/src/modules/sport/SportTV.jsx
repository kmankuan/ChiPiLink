/**
 * Sport TV — Fighting Game Theme
 * HP bars, combo counter, round history, configurable layout
 * All elements positionable and themeable via admin settings
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Trophy } from 'lucide-react';
import EmotionOverlay from './components/EmotionOverlay';
import { AblyChatProvider } from '@/modules/ably/AblyProvider';
import LiveChat from '@/modules/ably/LiveChat';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const EFFECT_MAP = { tense:'😱', fire:'🔥', clap:'👏', funny:'😂', strong:'💪', fast:'⚡', precise:'🎯', insane:'🤯' };

function formatTimer(startIso) {
  if (!startIso) return '0:00';
  const d = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  return `${Math.floor(d/60)}:${(d%60).toString().padStart(2,'0')}`;
}

function _getStreak(points, side) {
  if (!points?.length) return 0;
  let s = 0;
  for (let i = points.length-1; i >= 0; i--) { if (points[i].scored_by === side) s++; else break; }
  return s;
}

// ═══ HP BAR — Fighting game health bar ═══
function HPBar({ score, maxScore, color, side, streak }) {
  const pct = Math.min(score / Math.max(maxScore, 1), 1) * 100;
  const isLeft = side === 'left';
  const glow = streak >= 5 ? `0 0 20px ${color}80` : streak >= 3 ? `0 0 10px ${color}40` : 'none';
  
  return (
    <div className={`h-6 rounded-full overflow-hidden bg-white/5 flex-1 ${isLeft ? '' : 'flex justify-end'}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{
        width: `${pct}%`,
        background: `linear-gradient(${isLeft ? '90deg' : '270deg'}, ${color}40, ${color})`,
        boxShadow: glow,
      }} />
    </div>
  );
}

// ═══ COMBO COUNTER ═══
function ComboCounter({ streak, color }) {
  if (streak < 2) return null;
  return (
    <div className={`text-center ${streak >= 5 ? 'animate-pulse' : ''}`}>
      <span className="text-xs font-black" style={{ color }}>
        {streak >= 5 ? '🐉' : streak >= 3 ? '🔥' : '⚡'} {streak}x COMBO
      </span>
    </div>
  );
}

// ═══ BATTLE TIMELINE — Point-by-point story ═══
function BattleTimeline({ points = [], side, color, maxVisible = 30 }) {
  const visible = points.slice(-maxVisible);
  return (
    <div className="flex items-center gap-[2px]">
      {visible.map((pt, i) => {
        const isMine = pt.scored_by === side;
        const streak = pt.streak || 1;
        const size = isMine ? Math.min(4 + streak, 10) : 3;
        return (
          <div key={i} className="rounded-full transition-all" style={{
            width: size, height: size,
            backgroundColor: isMine ? color : 'rgba(255,255,255,0.08)',
            opacity: isMine ? 0.5 + streak * 0.1 : 0.3,
            boxShadow: isMine && streak >= 3 ? `0 0 ${streak*2}px ${color}50` : 'none',
          }} />
        );
      })}
    </div>
  );
}

// ═══ SET HISTORY (Round History in fighting game terms) ═══
function RoundHistory({ sets = [], swapped, colorA, colorB }) {
  if (!sets.length) return null;
  return (
    <div className="flex items-center gap-3 justify-center">
      {sets.map((set, i) => {
        const aScore = swapped ? set.score_b : set.score_a;
        const bScore = swapped ? set.score_a : set.score_b;
        const aWon = set.winner === (swapped ? 'b' : 'a');
        return (
          <div key={i} className="text-center px-3 py-1 rounded" style={{ background: aWon ? `${colorA}15` : `${colorB}15`, border: `1px solid ${aWon ? colorA : colorB}30` }}>
            <span className="text-[9px] text-white/30">R{i+1}</span>
            <span className="text-xs font-mono font-bold ml-1" style={{ color: aWon ? colorA : colorB }}>{aScore}-{bScore}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══ CARD/CALL/EFFECT OVERLAYS ═══
function CardOverlay({ card, playerA, playerB }) {
  if (!card) return null;
  const name = card.target === 'a' ? playerA?.nickname : playerB?.nickname;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce">
      <div className={`text-center p-8 rounded-3xl ${card.card_type==='yellow'?'bg-yellow-500/30':'bg-red-500/30'}`} style={{backdropFilter:'blur(10px)'}}>
        <div className="text-9xl mb-4">{card.card_type==='yellow'?'🟨':'🟥'}</div>
        <p className="text-4xl font-black text-white">{card.card_type==='yellow'?'WARNING':'FOUL'}</p>
        <p className="text-2xl text-white/70 mt-2">{name}</p>
      </div>
    </div>
  );
}
function CallOverlay({ call, playerA, playerB }) {
  if (!call) return null;
  if (call.call_type === 'let') return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"><div className="text-center p-6 rounded-2xl bg-white/10" style={{backdropFilter:'blur(10px)'}}><p className="text-6xl font-black text-white animate-pulse">LET</p></div></div>;
  if (call.call_type === 'timeout') {
    const name = call.target === 'a' ? playerA?.nickname : playerB?.nickname;
    return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"><div className="text-center p-8 rounded-2xl bg-blue-500/20" style={{backdropFilter:'blur(10px)'}}><p className="text-5xl mb-2">⏸️</p><p className="text-3xl font-black text-white">TIMEOUT</p><p className="text-xl text-white/60 mt-2">{name}</p></div></div>;
  }
  return null;
}
function EffectOverlay({ effectId }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce"><span className="text-[10rem]">{EFFECT_MAP[effectId]||'✨'}</span></div>;
}

// ═══ PRE-GAME / BREAK SCREENS ═══
function IntroScreen({ playerA, playerB, referee, colorA, colorB }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{background:'linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%)'}}>
      <p className="text-white/40 text-lg mb-8 tracking-widest animate-pulse">⚡ NEXT FIGHT ⚡</p>
      <div className="flex items-center gap-16">
        <div className="text-center">
          {playerA?.photo_url ? <img src={playerA.photo_url} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" style={{border:`4px solid ${colorA}`}} alt="" /> : <div className="w-32 h-32 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-5xl text-white/20">{(playerA?.nickname||'?')[0]}</div>}
          <p className="text-3xl font-bold" style={{color:colorA}}>{playerA?.nickname}</p>
          <p className="text-white/40">ELO {playerA?.elo}</p>
        </div>
        <div className="text-6xl font-black text-white/20">VS</div>
        <div className="text-center">
          {playerB?.photo_url ? <img src={playerB.photo_url} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" style={{border:`4px solid ${colorB}`}} alt="" /> : <div className="w-32 h-32 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-5xl text-white/20">{(playerB?.nickname||'?')[0]}</div>}
          <p className="text-3xl font-bold" style={{color:colorB}}>{playerB?.nickname}</p>
          <p className="text-white/40">ELO {playerB?.elo}</p>
        </div>
      </div>
      <p className="text-white/20 text-sm mt-8">⚖️ {referee?.nickname}</p>
    </div>
  );
}
function BreakScreen({ timer }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{background:'linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%)'}}>
      <p className="text-6xl mb-4">⏸️</p><p className="text-3xl font-bold text-white mb-2">BREAK</p>
      <p className="text-white/40">Resuming shortly · {timer}</p>
    </div>
  );
}

// ═══ MAIN TV COMPONENT ═══
export default function SportTV() {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [cardOvl, setCardOvl] = useState(null);
  const [callOvl, setCallOvl] = useState(null);
  const [effectOvl, setEffectOvl] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [timer, setTimer] = useState('0:00');
  const [tvSettings, setTvSettings] = useState(null);
  const prevEmoRef = useRef(null);
  const prevCardRef = useRef(null);
  const prevCallRef = useRef(null);
  const prevEffectRef = useRef(null);

  const findLive = useCallback(async () => {
    try {
      const lr = await fetch(`${API}/api/sport/live`);
      if (!lr.ok) return;
      const sessions = await lr.json();
      if (!sessions.length) { setSession(null); setState(null); return; }
      const latest = sessions[0];
      setSession(latest);
      const sr = await fetch(`${API}/api/sport/live/${latest.session_id}/state`);
      if (!sr.ok) return;
      const st = await sr.json();
      setState(st);
      // Detect overlays
      const d = st.display || {};
      if (d.last_emotion_at && d.last_emotion_at !== prevEmoRef.current) {
        setEmotion({ type: d.last_emotion, side: d.last_emotion_side === 'a' ? 'left' : d.last_emotion_side === 'b' ? 'right' : d.last_emotion_side || 'center' });
        setTimeout(() => setEmotion(null), 3000);
        prevEmoRef.current = d.last_emotion_at;
      }
      if (d.last_card?.time && d.last_card.time !== prevCardRef.current) { setCardOvl(d.last_card); setTimeout(() => setCardOvl(null), 4000); prevCardRef.current = d.last_card.time; }
      if (d.last_call?.time && d.last_call.time !== prevCallRef.current) { setCallOvl(d.last_call); setTimeout(() => setCallOvl(null), 4000); prevCallRef.current = d.last_call.time; }
      if (d.last_effect_at && d.last_effect_at !== prevEffectRef.current) { setEffectOvl(d.last_effect); setTimeout(() => setEffectOvl(null), 3000); prevEffectRef.current = d.last_effect_at; }
    } catch {}
  }, []);

  useEffect(() => {
    findLive();
    fetch(`${API}/api/sport/rankings?limit=10`).then(r => r.ok ? r.json() : []).then(setRankings).catch(() => {});
    // Load TV settings
    fetch(`${API}/api/sport/settings`).then(r => r.ok ? r.json() : null).then(s => setTvSettings(s?.tv || {})).catch(() => {});
    const iv = setInterval(findLive, 1500);
    return () => clearInterval(iv);
  }, [findLive]);

  useEffect(() => {
    const iv = setInterval(() => { if (state?.timers?.match_start) setTimer(formatTimer(state.timers.match_start)); }, 1000);
    return () => clearInterval(iv);
  }, [state?.timers?.match_start]);

  // WebSocket
  useEffect(() => {
    if (!session?.session_id) return;
    try { const ws = new WebSocket(`${API.replace('http','ws')}/api/sport/ws/live/${session.session_id}`); ws.onmessage = () => findLive(); return () => ws.close(); } catch {}
  }, [session?.session_id, findLive]);

  // Theme config
  const cfg = tvSettings || {};
  const colorA = cfg.accent_a || '#ef4444';
  const colorB = cfg.accent_b || '#3b82f6';
  const bg = cfg.background || 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)';
  const showChat = cfg.show_chat !== false;

  // IDLE
  if (!session || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{background:bg}}>
        <span className="text-7xl mb-4">🏓</span>
        <h1 className="text-5xl font-black text-white mb-2">ChiPi Sport</h1>
        <p className="text-white/30 text-xl">Waiting for next fight...</p>
        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse mx-auto mt-6" />
        {rankings.length > 0 && (
          <div className="w-full max-w-3xl px-8 mt-12">
            <h2 className="text-white/40 text-sm font-bold mb-3"><Trophy className="h-4 w-4 inline mr-1 text-yellow-400" /> Rankings</h2>
            <div className="grid grid-cols-2 gap-3">{rankings.slice(0,10).map((p,i) => (
              <div key={p.player_id} className="flex items-center justify-between px-5 py-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3"><span className="text-lg font-bold w-8">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span><span className="text-white text-lg">{p.nickname}</span></div>
                <span className="text-white font-mono font-bold text-lg">{p.elo}</span>
              </div>
            ))}</div>
          </div>
        )}
      </div>
    );
  }

  // Broadcast modes
  const bm = state.display?.broadcast_mode;
  if (bm === 'intro') return <IntroScreen playerA={state.player_a||session.player_a} playerB={state.player_b||session.player_b} referee={state.referee||session.referee} colorA={colorA} colorB={colorB} />;
  if (bm === 'break') return <BreakScreen timer={timer} />;

  // LIVE — Fighting Game Layout
  const swapped = state.display?.swapped || false;
  const lp = swapped ? (state.player_b||session.player_b) : (state.player_a||session.player_a);
  const rp = swapped ? (state.player_a||session.player_a) : (state.player_b||session.player_b);
  const ls = swapped ? 'b' : 'a';
  const rs = swapped ? 'a' : 'b';
  const sc = state.score || {a:0,b:0};
  const sw = state.sets_won || {a:0,b:0};
  const max = state.settings?.points_to_win || 11;
  const streakL = _getStreak(state.points, ls);
  const streakR = _getStreak(state.points, rs);
  const allPts = state.all_points || state.points || [];
  const isFinished = state.status === 'finished';

  return (
    <div className="min-h-screen flex flex-col" style={{background:bg}}>
      <EmotionOverlay emotion={emotion} settings={{}} side={emotion?.side} playerPhoto={emotion?.side==='left'?lp?.photo_url:rp?.photo_url} />
      {cardOvl && <CardOverlay card={cardOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {callOvl && <CallOverlay call={callOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {effectOvl && <EffectOverlay effectId={effectOvl} />}

      <div className="flex-1 flex min-h-0">
        {/* GAME AREA */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/40 text-sm font-bold">LIVE</span>
            </div>
            <span className="text-white/20 text-sm font-mono">Round {state.current_set} · {timer}</span>
            <span className="text-white/15 text-sm">⚖️ {(state.referee||session.referee)?.nickname} · Bo{(state.settings?.sets_to_win||2)*2-1}</span>
          </div>

          {/* FIGHTER CARDS + HP BARS + SCORE */}
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Player photos + names */}
            <div className="flex items-center justify-between w-full max-w-4xl mb-4">
              <div className="flex items-center gap-4">
                {lp?.photo_url ? <img src={lp.photo_url} className="w-20 h-20 rounded-full object-cover" style={{border:`3px solid ${colorA}`,boxShadow:`0 0 20px ${colorA}30`}} alt="" /> : <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-3xl" style={{border:`3px solid ${colorA}`,color:colorA}}>{(lp?.nickname||'?')[0]}</div>}
                <div>
                  <p className="text-2xl font-black" style={{color:colorA}}>{lp?.nickname}</p>
                  <p className="text-white/20 text-xs">ELO {lp?.elo}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-black" style={{color:colorB}}>{rp?.nickname}</p>
                  <p className="text-white/20 text-xs">ELO {rp?.elo}</p>
                </div>
                {rp?.photo_url ? <img src={rp.photo_url} className="w-20 h-20 rounded-full object-cover" style={{border:`3px solid ${colorB}`,boxShadow:`0 0 20px ${colorB}30`}} alt="" /> : <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-3xl" style={{border:`3px solid ${colorB}`,color:colorB}}>{(rp?.nickname||'?')[0]}</div>}
              </div>
            </div>

            {/* HP Bars */}
            <div className="flex items-center gap-4 w-full max-w-4xl mb-2">
              <HPBar score={sc[ls]} maxScore={max} color={colorA} side="left" streak={streakL} />
              <span className="text-white/20 text-xs shrink-0">HP</span>
              <HPBar score={sc[rs]} maxScore={max} color={colorB} side="right" streak={streakR} />
            </div>

            {/* SCORE — big numbers with service */}
            <div className="flex items-center justify-center gap-8 my-4">
              <div className="text-center">
                <span className="text-[8rem] font-black leading-none" style={{color:colorA,textShadow:`0 0 40px ${colorA}30`}}>{sc[ls]}</span>
                {state.server === ls && <p className="text-yellow-400 text-sm">🏓 serving</p>}
              </div>
              <span className="text-white/10 text-4xl">⚡</span>
              <div className="text-center">
                <span className="text-[8rem] font-black leading-none" style={{color:colorB,textShadow:`0 0 40px ${colorB}30`}}>{sc[rs]}</span>
                {state.server === rs && <p className="text-yellow-400 text-sm">🏓 serving</p>}
              </div>
            </div>

            {/* Combo counters */}
            <div className="flex justify-between w-full max-w-4xl">
              <ComboCounter streak={streakL} color={colorA} />
              <ComboCounter streak={streakR} color={colorB} />
            </div>

            {/* Winner celebration */}
            {isFinished && (
              <div className="text-center animate-bounce mt-4">
                <span className="text-6xl">🏆</span>
                <p className="text-3xl font-black text-yellow-400 mt-2">
                  {state.winner === ls ? lp?.nickname : rp?.nickname} WINS!
                </p>
              </div>
            )}
          </div>

          {/* BOTTOM — Round history + Battle timeline */}
          <div className="px-8 py-3 space-y-2 bg-black/20">
            {/* Round history */}
            <RoundHistory sets={state.sets || []} swapped={swapped} colorA={colorA} colorB={colorB} />
            
            {/* Battle timelines per player */}
            <div className="flex items-center gap-4">
              <span className="text-[9px] w-12 text-right shrink-0" style={{color:colorA}}>{lp?.nickname?.substring(0,5)}</span>
              <BattleTimeline points={allPts} side={ls} color={colorA} maxVisible={40} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] w-12 text-right shrink-0" style={{color:colorB}}>{rp?.nickname?.substring(0,5)}</span>
              <BattleTimeline points={allPts} side={rs} color={colorB} maxVisible={40} />
            </div>

            {/* Sets won indicators */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex gap-1.5">{Array.from({length:state.settings?.sets_to_win||2}).map((_,i) => <div key={i} className={`w-4 h-4 rounded-full ${i<(sw[ls]||0)?'':'bg-white/10'}`} style={i<(sw[ls]||0)?{background:colorA,boxShadow:`0 0 8px ${colorA}50`}:{}} />)}</div>
              <span className="text-white/15 text-[10px]">SETS {sw[ls]||0} — {sw[rs]||0}</span>
              <div className="flex gap-1.5">{Array.from({length:state.settings?.sets_to_win||2}).map((_,i) => <div key={i} className={`w-4 h-4 rounded-full ${i<(sw[rs]||0)?'':'bg-white/10'}`} style={i<(sw[rs]||0)?{background:colorB,boxShadow:`0 0 8px ${colorB}50`}:{}} />)}</div>
            </div>
          </div>
        </div>

        {/* CHAT SIDEBAR */}
        {showChat && session?.session_id && (
          <div className="w-60 shrink-0 flex flex-col border-l border-white/5 bg-black/30">
            <AblyChatProvider clientId={`tv_${session.session_id}`}>
              <LiveChat roomId={`live:${session.session_id}`} userName="TV" compact={false} />
            </AblyChatProvider>
          </div>
        )}
      </div>
    </div>
  );
}
