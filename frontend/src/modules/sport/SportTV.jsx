/**
 * Sport TV — Fighting Game Theme v2
 * Fixes: sticker side, stars above photos, dynamic score following HP bar,
 * set-win celebration, configurable center icon, bigger referee+timer, referee change
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Trophy, Star } from 'lucide-react';
// EmotionOverlay removed — stickers now shown inline beside player photos
import { AblyChatProvider, useAblyChannel } from '@/modules/ably/AblyProvider';
import LiveChat from '@/modules/ably/LiveChat';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const EFFECT_MAP = { tense:'😱', fire:'🔥', clap:'👏', funny:'😂', strong:'💪', fast:'⚡', precise:'🎯', insane:'🤯' };
const TECH_EMOJI = { forehand:'💥', backhand:'🔄', smash:'⚡', serve_ace:'🎯', drop_shot:'🪶', block:'🛡️', lob:'🌙', error:'💫' };
const EMOTION_EMOJI = { streak_3:'🔥', streak_5:'🐉', streak_break:'💥', deuce:'⚡', match_point:'🏮', winner:'🏆', comeback:'🌊', perfect_set:'🏯', upset:'😱' };

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

// ═══ OVERLAYS ═══
function CardOverlay({ card, playerA, playerB }) {
  if (!card) return null;
  const name = card.target === 'a' ? playerA?.nickname : playerB?.nickname;
  return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce"><div className={`text-center p-8 rounded-3xl ${card.card_type==='yellow'?'bg-yellow-500/30':'bg-red-500/30'}`} style={{backdropFilter:'blur(10px)'}}><div className="text-9xl mb-4">{card.card_type==='yellow'?'🟨':'🟥'}</div><p className="text-4xl font-black text-white">{card.card_type==='yellow'?'WARNING':'FOUL'}</p><p className="text-2xl text-white/70 mt-2">{name}</p></div></div>;
}
function CallOverlay({ call, playerA, playerB }) {
  if (!call) return null;
  if (call.call_type === 'let') return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"><div className="p-6 rounded-2xl bg-white/10" style={{backdropFilter:'blur(10px)'}}><p className="text-6xl font-black text-white animate-pulse">LET</p></div></div>;
  if (call.call_type === 'timeout') { const n = call.target === 'a' ? playerA?.nickname : playerB?.nickname; return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"><div className="text-center p-8 rounded-2xl bg-blue-500/20" style={{backdropFilter:'blur(10px)'}}><p className="text-5xl mb-2">⏸️</p><p className="text-3xl font-black text-white">TIMEOUT</p><p className="text-xl text-white/60 mt-2">{n}</p></div></div>; }
  return null;
}
function EffectOverlay({ effectId }) { return <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce"><span className="text-[10rem]">{EFFECT_MAP[effectId]||'✨'}</span></div>; }

// ═══ SET WIN CELEBRATION ═══
function SetWinCelebration({ winner, message }) {
  if (!winner) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="text-center animate-bounce">
        <div className="text-[8rem] mb-4">🎆</div>
        <p className="text-5xl font-black text-yellow-400" style={{textShadow:'0 0 40px rgba(234,179,8,0.5)'}}>{winner}</p>
        <p className="text-2xl text-white/80 mt-4">{message}</p>
      </div>
    </div>
  );
}

// ═══ INTRO / BREAK SCREENS ═══
function IntroScreen({ playerA, playerB, referee, colorA, colorB }) {
  return <div className="min-h-screen flex flex-col items-center justify-center" style={{background:'linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%)'}}><p className="text-white/40 text-lg mb-8 tracking-widest animate-pulse">⚡ NEXT FIGHT ⚡</p><div className="flex items-center gap-16">{[{p:playerA,c:colorA},{p:playerB,c:colorB}].map(({p,c},i)=><div key={i} className="text-center">{p?.photo_url?<img src={p.photo_url} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" style={{border:`4px solid ${c}`}} alt="" />:<div className="w-32 h-32 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-5xl text-white/20">{(p?.nickname||'?')[0]}</div>}<p className="text-3xl font-bold" style={{color:c}}>{p?.nickname}</p><p className="text-white/40">ELO {p?.elo}</p></div>)}</div><p className="text-white/20 text-sm mt-8">⚖️ {referee?.nickname}</p></div>;
}
function BreakScreen({ timer }) { return <div className="min-h-screen flex flex-col items-center justify-center" style={{background:'linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%)'}}><p className="text-6xl mb-4">⏸️</p><p className="text-3xl font-bold text-white mb-2">BREAK</p><p className="text-white/40">Resuming shortly · {timer}</p></div>; }

// ═══ MAIN TV ═══
export default function SportTV() {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [cardOvl, setCardOvl] = useState(null);
  const [callOvl, setCallOvl] = useState(null);
  const [effectOvl, setEffectOvl] = useState(null);
  const [setWinOvl, setSetWinOvl] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [timer, setTimer] = useState('0:00');
  const [tvSettings, setTvSettings] = useState({});
  // Ably handles real-time sync (no WebSocket needed)
  const prevEmoRef = useRef(null);
  const prevCardRef = useRef(null);
  const prevCallRef = useRef(null);
  const prevEffectRef = useRef(null);
  const prevSetsRef = useRef(0);

  const findLive = useCallback(async () => {
    try {
      const lr = await fetch(`${API}/api/sport/live`);
      if (!lr.ok) return;
      const sessions = await lr.json();
      if (!sessions.length) { setSession(null); setState(null); return; }
      const latest = sessions[0];
      setSession(latest);
      // Use the session data directly — it already has score, sets, display
      // Only fetch /state if we need extra fields
      const st = latest;
      setState(st);
      const d = st.display || {};
      // Emotion — use last_emotion_side and account for swapped sides
      if (d.last_emotion_at && d.last_emotion_at !== prevEmoRef.current) {
        const side = d.last_emotion_side; // 'left', 'right', 'a', 'b'
        const swapped = st.display?.swapped || false;
        const mappedSide = swapped
          ? (side === 'a' ? 'right' : side === 'b' ? 'left' : side || 'center')
          : (side === 'a' ? 'left' : side === 'b' ? 'right' : side || 'center');
        setEmotion({ type: d.last_emotion, side: mappedSide });
        setTimeout(() => setEmotion(null), 3000);
        prevEmoRef.current = d.last_emotion_at;
      }
      if (d.last_card?.time && d.last_card.time !== prevCardRef.current) { setCardOvl(d.last_card); setTimeout(()=>setCardOvl(null),4000); prevCardRef.current=d.last_card.time; }
      if (d.last_call?.time && d.last_call.time !== prevCallRef.current) { setCallOvl(d.last_call); setTimeout(()=>setCallOvl(null),4000); prevCallRef.current=d.last_call.time; }
      if (d.last_effect_at && d.last_effect_at !== prevEffectRef.current) { setEffectOvl(d.last_effect); setTimeout(()=>setEffectOvl(null),3000); prevEffectRef.current=d.last_effect_at; }
      // Check broadcast data for sticker effects
      if (d.broadcast_data?.sticker && d.broadcast_data.timestamp && d.broadcast_data.timestamp !== prevEffectRef.current) {
        setEffectOvl(d.broadcast_data.sticker);
        setTimeout(() => setEffectOvl(null), 3000);
        prevEffectRef.current = d.broadcast_data.timestamp;
      }
      // Set win detection
      const totalSets = (st.sets_won?.a||0) + (st.sets_won?.b||0);
      if (totalSets > prevSetsRef.current && prevSetsRef.current >= 0 && st.sets?.length > 0) {
        const lastSet = st.sets[st.sets.length-1];
        const winnerSide = lastSet.winner; // 'a' or 'b'
        // winner is always relative to the original player assignment (not swapped display)
        const winnerName = winnerSide === 'a' ? (st.player_a||latest.player_a)?.nickname : (st.player_b||latest.player_b)?.nickname;
        const msg = tvSettings.set_win_messages?.en || `Congratulations ${winnerName}! This set is yours!`;
        setSetWinOvl({ winner: winnerName, message: msg.replace('{winner}', winnerName) });
        setTimeout(()=>setSetWinOvl(null), 5000);
      }
      prevSetsRef.current = totalSets;
    } catch {}
  }, [tvSettings]);

  useEffect(() => {
    findLive();
    fetch(`${API}/api/sport/rankings?limit=10`).then(r=>r.ok?r.json():[]).then(setRankings).catch(()=>{});
    fetch(`${API}/api/sport/settings`).then(r=>r.ok?r.json():null).then(s=>setTvSettings(s?.tv||{})).catch(()=>{});
    // Fast polling as reliable backup — ensures 100% sync even if Ably drops
    const iv = setInterval(findLive, 3000);
    return () => clearInterval(iv);
  }, [findLive]);

  useEffect(() => {
    const iv = setInterval(()=>{ if(state?.timers?.match_start) setTimer(formatTimer(state.timers.match_start)); }, 1000);
    return ()=>clearInterval(iv);
  }, [state?.timers?.match_start]);

  // Ably real-time: instant updates when referee scores
  // NOTE: This hook needs AblyChatProvider — handled by AblyScoreSync below
  const ablyChannelName = session?.session_id ? `sport:live:${session.session_id}` : null;

  const cfg = tvSettings;
  const colorA = cfg.accent_a || '#ef4444';
  const colorB = cfg.accent_b || '#3b82f6';
  const bg = cfg.background || 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)';
  const showChat = cfg.show_chat !== false;
  const centerIcon = cfg.center_icon_url;

  // IDLE
  if (!session || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{background:bg}}>
        <span className="text-7xl mb-4">🏓</span>
        <h1 className="text-5xl font-black text-white mb-2">ChiPi Sport</h1>
        <p className="text-white/30 text-xl">Waiting for next fight...</p>
        {rankings.length > 0 && <div className="w-full max-w-3xl px-8 mt-12"><div className="grid grid-cols-2 gap-3">{rankings.slice(0,10).map((p,i)=><div key={p.player_id} className="flex items-center justify-between px-5 py-3 rounded-xl bg-white/5"><div className="flex items-center gap-3"><span className="text-lg font-bold w-8">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span><span className="text-white text-lg">{p.nickname}</span></div><span className="text-white font-mono font-bold text-lg">{p.elo}</span></div>)}</div></div>}
      </div>
    );
  }

  const bm = state.display?.broadcast_mode;
  if (bm === 'intro') return <IntroScreen playerA={state.player_a||session.player_a} playerB={state.player_b||session.player_b} referee={state.referee||session.referee} colorA={colorA} colorB={colorB} />;
  if (bm === 'break') return <BreakScreen timer={timer} />;

  const swapped = state.display?.swapped || false;
  const lp = swapped ? (state.player_b||session.player_b) : (state.player_a||session.player_a);
  const rp = swapped ? (state.player_a||session.player_a) : (state.player_b||session.player_b);
  const ls = swapped ? 'b' : 'a';
  const rs = swapped ? 'a' : 'b';
  const sc = state.score || {a:0,b:0};
  const sw = state.sets_won || {a:0,b:0};
  const max = state.settings?.points_to_win || 11;
  const totalSetsToWin = state.settings?.sets_to_win || 2;
  const streakL = _getStreak(state.points, ls);
  const streakR = _getStreak(state.points, rs);
  const pctL = Math.min(sc[ls] / Math.max(max, 1), 1) * 100;
  const pctR = Math.min(sc[rs] / Math.max(max, 1), 1) * 100;
  const ref = state.referee || session.referee;

  // Determine which side has the latest emotion
  const emotionSide = emotion?.side; // 'left' or 'right'
  const currentSetPoints = (state.points || []).filter(p => p.set === state.current_set);
  const totalSlots = Math.max(max, currentSetPoints.length + 1);

  // Helper: get emoji for a point (technique or streak-based)
  const getPointEmoji = (pt, idx) => {
    if (!pt) return '·';
    if (pt.technique && TECH_EMOJI[pt.technique]) return TECH_EMOJI[pt.technique];
    // Streak-based fallback
    const streak = pt.streak || 1;
    if (streak >= 5) return '🐉';
    if (streak >= 3) return '🔥';
    return ['💪','😤','⚡','🎯','👊'][idx % 5];
  };

  return (
    <div className="min-h-screen flex flex-col" style={{background:bg}}>
      {cardOvl && <CardOverlay card={cardOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {callOvl && <CallOverlay call={callOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {effectOvl && <EffectOverlay effectId={effectOvl} />}
      {setWinOvl && <SetWinCelebration winner={setWinOvl.winner} message={setWinOvl.message} />}

      <div className="flex-1 flex min-h-0">
        {/* GAME AREA */}
        <div className="flex-1 flex flex-col">
          {/* Header — referee photo + name + timer */}
          <div className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-3">
              {ref?.photo_url ? (
                <img src={ref.photo_url} className="w-9 h-9 rounded-full object-cover border-2 border-white/20" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xl font-bold">{(ref?.nickname||'?')[0]}</div>
              )}
              <span className="text-white/60 text-xl font-bold">⚖️ {ref?.nickname}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-white/30 text-xl">Set {state.current_set} · Bo{totalSetsToWin * 2 - 1}</span>
              <span className="text-white font-mono text-3xl font-bold" style={{textShadow:'0 0 20px rgba(255,255,255,0.1)'}}>{timer}</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/50 text-xl font-bold">LIVE</span>
              </div>
            </div>
          </div>

          {/* Set History Ribbon — moved above main area, bigger */}
          {state.sets?.length > 0 && (
            <div className="flex items-center justify-center gap-4 py-3 px-8 bg-black/20">
              {state.sets.map((set,i) => {
                const aScore = swapped ? set.score_b : set.score_a;
                const bScore = swapped ? set.score_a : set.score_b;
                const aWon = set.winner === (swapped?'b':'a');
                const winnerColor = aWon ? colorA : colorB;
                return (
                  <div key={i} className="px-6 py-3 rounded-full text-2xl font-bold transition-all" 
                    style={{
                      background: `${winnerColor}20`,
                      border: `2px solid ${winnerColor}40`, 
                      color: winnerColor,
                      boxShadow: `0 0 15px ${winnerColor}20`
                    }}>
                    R{i+1}: <strong>{aScore}-{bScore}</strong>
                  </div>
                );
              })}
              {state.current_set > 1 && (
                <div className="px-6 py-3 rounded-full text-2xl font-bold bg-white/10 border-2 border-white/20 text-white animate-pulse">
                  R{state.current_set}: <strong>playing</strong>
                </div>
              )}
            </div>
          )}

          {/* MAIN — Players + Sticker Zones + Battle Bar */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="flex items-center w-full max-w-7xl">

              {/* LEFT PLAYER — Hexagonal photo */}
              <div className="flex flex-col items-center" style={{width: '200px'}}>
                {(lp?.photo_url || lp?.photo_thumb || lp?.photo_base64) ? (
                  <img src={lp.photo_url || lp.photo_thumb || lp.photo_base64} 
                    className="w-[140px] h-[140px] object-cover" 
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      border: `4px solid ${colorA}`,
                      boxShadow: `0 0 30px ${colorA}40`
                    }} 
                    alt="" />
                ) : (
                  <div className="w-[140px] h-[140px] bg-white/5 flex items-center justify-center text-6xl font-bold" 
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      border: `4px solid ${colorA}`,
                      color: colorA,
                      boxShadow: `0 0 30px ${colorA}40`
                    }}>
                    {(lp?.nickname||'?')[0]}
                  </div>
                )}
                
                {/* Player name BELOW photo */}
                <p className="text-2xl font-black mt-4" style={{color:colorA}}>{lp?.nickname}</p>
                
                {/* Stars below name */}
                <div className="flex gap-1 mt-2">
                  {Array.from({length: totalSetsToWin}).map((_,i) => (
                    <Star key={i} className={`h-7 w-7 transition-all ${i < (sw[ls]||0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`}
                      style={i < (sw[ls]||0) ? {filter:'drop-shadow(0 0 6px rgba(234,179,8,0.5))'} : {}} />
                  ))}
                </div>
                
                {/* Score BELOW stars */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10rem] font-black text-white leading-none" style={{textShadow:`0 0 30px ${colorA}50`}}>{sc[ls]}</span>
                  {state.server === ls && <span className="text-yellow-400 text-3xl">🏓</span>}
                </div>
                
                <p className="text-white/20 text-lg mt-2">ELO {lp?.elo}</p>
              </div>

              {/* LEFT STICKER ZONE — Per-point stickers */}
              <div className="flex-1 flex items-center justify-center min-h-[200px] px-4">
                {(emotion && emotionSide === 'left') ? (
                  <div className="text-center animate-bounce">
                    <span className="text-[6rem] leading-none" style={{filter:`drop-shadow(0 0 30px ${colorA}60)`}}>{EMOTION_EMOJI[emotion.type] || '✨'}</span>
                  </div>
                ) : streakL >= 3 ? (
                  <div className="text-center">
                    <span className="text-[5rem] leading-none" style={{filter:`drop-shadow(0 0 20px ${colorA}40)`}}>🔥</span>
                    <p className="text-2xl font-black mt-1" style={{color:colorA}}>{streakL}x COMBO</p>
                  </div>
                ) : streakL >= 2 ? (
                  <div className="text-center">
                    <span className="text-[4rem] leading-none" style={{filter:`drop-shadow(0 0 15px ${colorA}30)`}}>⚡</span>
                    <p className="text-base font-black mt-1" style={{color:colorA}}>streak</p>
                  </div>
                ) : null}
              </div>

              {/* CENTER — Battle Bar with 2-point blocks, bottom to top */}
              <div className="flex flex-col items-center shrink-0" style={{width: '120px'}}>
                {/* Center icon/trophy */}
                <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/10 flex items-center justify-center mb-3 shrink-0">
                  {centerIcon ? (
                    <img src={centerIcon} className="w-10 h-10 rounded-full object-contain" alt="" />
                  ) : (
                    <span className="text-2xl">🏓</span>
                  )}
                </div>
                
                {/* Battle bar with 2-point paired blocks */}
                <div className="flex flex-col-reverse items-center gap-1 w-full rounded-xl overflow-hidden bg-white/[0.02] p-2" style={{height: '320px'}}>
                  {(() => {
                    // Group points into pairs for 2-point blocks
                    const pairs = [];
                    for (let i = 0; i < currentSetPoints.length; i += 2) {
                      pairs.push([currentSetPoints[i], currentSetPoints[i+1] || null]);
                    }
                    
                    // Add empty pairs to fill the battle bar
                    const totalPairs = Math.ceil(Math.max(max, currentSetPoints.length + 1) / 2);
                    while (pairs.length < totalPairs) {
                      pairs.push([null, null]);
                    }
                    
                    return pairs.map((pair, pairIndex) => {
                      const [pt1, pt2] = pair;
                      const hasPt1 = !!pt1;
                      const hasPt2 = !!pt2;
                      const pt1Left = pt1?.scored_by === ls;
                      const pt2Left = pt2?.scored_by === ls;
                      const pt1Color = hasPt1 ? (pt1Left ? colorA : colorB) : 'transparent';
                      const pt2Color = hasPt2 ? (pt2Left ? colorA : colorB) : 'transparent';
                      
                      // Check if both points are same color (combo effect)
                      const isCombo = hasPt1 && hasPt2 && pt1?.scored_by === pt2?.scored_by;
                      const isLatestPair = pairIndex === Math.floor(currentSetPoints.length / 2);
                      
                      return (
                        <div key={pairIndex} className="w-full rounded-lg overflow-hidden transition-all duration-300" 
                          style={{
                            height: '24px',
                            transform: isLatestPair && (hasPt1 || hasPt2) ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isLatestPair && (hasPt1 || hasPt2) ? `0 0 10px ${pt1Color || pt2Color}60` : 'none'
                          }}>
                          <div className="flex h-full">
                            {/* Left half - first point */}
                            <div className="flex-1 flex items-center justify-center text-sm"
                              style={{
                                background: hasPt1 ? (isCombo ? `linear-gradient(45deg, ${pt1Color}, ${pt1Color}dd)` : pt1Color) : 'rgba(255,255,255,0.02)',
                                border: !hasPt1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                              }}>
                              {hasPt1 ? getPointEmoji(pt1, pairIndex * 2) : '·'}
                            </div>
                            {/* Right half - second point */}
                            <div className="flex-1 flex items-center justify-center text-sm"
                              style={{
                                background: hasPt2 ? (isCombo ? `linear-gradient(45deg, ${pt2Color}dd, ${pt2Color})` : pt2Color) : 'rgba(255,255,255,0.02)',
                                border: !hasPt2 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                              }}>
                              {hasPt2 ? getPointEmoji(pt2, pairIndex * 2 + 1) : '·'}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <span className="text-white/10 text-lg font-black mt-2">VS</span>
                
                {/* CENTER ZONE for set celebrations */}
                {(emotion && emotionSide === 'center') && (
                  <div className="mt-4 text-center animate-bounce">
                    <span className="text-[4rem]">🏆</span>
                    <p className="text-xl font-black text-yellow-400">Congratulations!</p>
                  </div>
                )}
              </div>

              {/* RIGHT STICKER ZONE — Per-point stickers */}
              <div className="flex-1 flex items-center justify-center min-h-[200px] px-4">
                {(emotion && emotionSide === 'right') ? (
                  <div className="text-center animate-bounce">
                    <span className="text-[6rem] leading-none" style={{filter:`drop-shadow(0 0 30px ${colorB}60)`}}>{EMOTION_EMOJI[emotion.type] || '✨'}</span>
                  </div>
                ) : streakR >= 3 ? (
                  <div className="text-center">
                    <span className="text-[5rem] leading-none" style={{filter:`drop-shadow(0 0 20px ${colorB}40)`}}>🔥</span>
                    <p className="text-2xl font-black mt-1" style={{color:colorA}}>{streakL}x COMBO</p>
                  </div>
                ) : streakR >= 2 ? (
                  <div className="text-center">
                    <span className="text-[4rem] leading-none" style={{filter:`drop-shadow(0 0 15px ${colorB}30)`}}>⚡</span>
                    <p className="text-base font-black mt-1" style={{color:colorB}}>streak</p>
                  </div>
                ) : null}
              </div>

              {/* RIGHT PLAYER — Hexagonal photo */}
              <div className="flex flex-col items-center" style={{width: '200px'}}>
                {(rp?.photo_url || rp?.photo_thumb || rp?.photo_base64) ? (
                  <img src={rp.photo_url || rp.photo_thumb || rp.photo_base64} 
                    className="w-[140px] h-[140px] object-cover" 
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      border: `4px solid ${colorB}`,
                      boxShadow: `0 0 30px ${colorB}40`
                    }} 
                    alt="" />
                ) : (
                  <div className="w-[140px] h-[140px] bg-white/5 flex items-center justify-center text-6xl font-bold" 
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      border: `4px solid ${colorB}`,
                      color: colorB,
                      boxShadow: `0 0 30px ${colorB}40`
                    }}>
                    {(rp?.nickname||'?')[0]}
                  </div>
                )}
                
                {/* Player name BELOW photo */}
                <p className="text-2xl font-black mt-4" style={{color:colorB}}>{rp?.nickname}</p>
                
                {/* Stars below name */}
                <div className="flex gap-1 mt-2">
                  {Array.from({length: totalSetsToWin}).map((_,i) => (
                    <Star key={i} className={`h-7 w-7 transition-all ${i < (sw[rs]||0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`}
                      style={i < (sw[rs]||0) ? {filter:'drop-shadow(0 0 6px rgba(234,179,8,0.5))'} : {}} />
                  ))}
                </div>
                
                {/* Score BELOW stars */}
                <div className="mt-3 flex items-center gap-2">
                  {state.server === rs && <span className="text-yellow-400 text-3xl">🏓</span>}
                  <span className="text-[10rem] font-black text-white leading-none" style={{textShadow:`0 0 30px ${colorB}50`}}>{sc[rs]}</span>
                </div>
                
                <p className="text-white/20 text-lg mt-2">ELO {rp?.elo}</p>
              </div>
            </div>
          </div>

          {/* Match finished celebration */}
          {state.status === 'finished' && (
            <div className="flex flex-col items-center px-8 py-4">
              <div className="text-center animate-bounce">
                <span className="text-6xl">🏆</span>
                <p className="text-4xl font-black text-yellow-400 mt-2">{state.winner===ls?lp?.nickname:rp?.nickname} WINS!</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-2 bg-black/20 flex items-center justify-between">
            <span className="text-white/15 text-sm">🏓 ChiPi Sport</span>
            <span className="text-white/15 text-sm">Bo{totalSetsToWin * 2 - 1} · {max} pts</span>
          </div>
        </div>

        {/* Chat sidebar + Ably score sync */}
        {session?.session_id && (
          <AblyChatProvider clientId={`tv_${session.session_id}`}>
            {/* Ably score sync — triggers findLive on every score update */}
            <AblyScoreSync channelName={ablyChannelName} onUpdate={findLive} />
            {showChat && (
              <div className="w-60 shrink-0 flex flex-col border-l border-white/5 bg-black/30">
                <LiveChat roomId={`live:${session.session_id}`} userName="TV" compact={false} />
              </div>
            )}
          </AblyChatProvider>
        )}
      </div>
    </div>
  );
}

// Inner component that subscribes to Ably — must be inside AblyChatProvider
function AblyScoreSync({ channelName, onUpdate }) {
  const cb = useCallback(() => { if (onUpdate) onUpdate(); }, [onUpdate]);
  useAblyChannel(channelName, cb);
  return null;
}
