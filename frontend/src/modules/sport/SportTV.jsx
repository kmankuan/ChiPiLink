/**
 * Sport TV — Fighting Game Theme v2
 * Fixes: sticker side, stars above photos, dynamic score following HP bar,
 * set-win celebration, configurable center icon, bigger referee+timer, referee change
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Trophy, Star } from 'lucide-react';
// EmotionOverlay removed — stickers now shown inline beside player photos
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
      const sr = await fetch(`${API}/api/sport/live/${latest.session_id}/state`);
      if (!sr.ok) return;
      const st = await sr.json();
      setState(st);
      const d = st.display || {};
      // Emotion — use last_emotion_side directly (already 'left'/'right' from referee)
      if (d.last_emotion_at && d.last_emotion_at !== prevEmoRef.current) {
        const side = d.last_emotion_side; // 'left', 'right', 'a', 'b'
        const mappedSide = side === 'a' ? 'left' : side === 'b' ? 'right' : side || 'center';
        setEmotion({ type: d.last_emotion, side: mappedSide });
        setTimeout(() => setEmotion(null), 3000);
        prevEmoRef.current = d.last_emotion_at;
      }
      if (d.last_card?.time && d.last_card.time !== prevCardRef.current) { setCardOvl(d.last_card); setTimeout(()=>setCardOvl(null),4000); prevCardRef.current=d.last_card.time; }
      if (d.last_call?.time && d.last_call.time !== prevCallRef.current) { setCallOvl(d.last_call); setTimeout(()=>setCallOvl(null),4000); prevCallRef.current=d.last_call.time; }
      if (d.last_effect_at && d.last_effect_at !== prevEffectRef.current) { setEffectOvl(d.last_effect); setTimeout(()=>setEffectOvl(null),3000); prevEffectRef.current=d.last_effect_at; }
      // Set win detection
      const totalSets = (st.sets_won?.a||0) + (st.sets_won?.b||0);
      if (totalSets > prevSetsRef.current && prevSetsRef.current >= 0 && st.sets?.length > 0) {
        const lastSet = st.sets[st.sets.length-1];
        const winnerSide = lastSet.winner;
        const swapped = st.display?.swapped || false;
        const winnerName = winnerSide === (swapped?'b':'a') ? (st.player_a||latest.player_a)?.nickname : (st.player_b||latest.player_b)?.nickname;
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
    const iv = setInterval(findLive, 1500);
    return () => clearInterval(iv);
  }, [findLive]);

  useEffect(() => {
    const iv = setInterval(()=>{ if(state?.timers?.match_start) setTimer(formatTimer(state.timers.match_start)); }, 1000);
    return ()=>clearInterval(iv);
  }, [state?.timers?.match_start]);

  useEffect(() => {
    if (!session?.session_id) return;
    try { const ws = new WebSocket(`${API.replace('http','ws')}/api/sport/ws/live/${session.session_id}`); ws.onmessage=()=>findLive(); return ()=>ws.close(); } catch {}
  }, [session?.session_id, findLive]);

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

  // Determine which side has the latest emotion (for inline sticker beside photo)
  const emotionSide = emotion?.side; // 'left' or 'right'
  const EMOTION_EMOJI = { streak_3:'🔥', streak_5:'🐉', streak_break:'💥', deuce:'⚡', match_point:'🏮', winner:'🏆', comeback:'🌊', perfect_set:'🏯', upset:'😱' };

  return (
    <div className="min-h-screen flex flex-col" style={{background:bg}}>
      {/* Remove full-screen EmotionOverlay — stickers now inline beside player photos */}
      {cardOvl && <CardOverlay card={cardOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {callOvl && <CallOverlay call={callOvl} playerA={swapped?state.player_b:state.player_a} playerB={swapped?state.player_a:state.player_b} />}
      {effectOvl && <EffectOverlay effectId={effectOvl} />}
      {setWinOvl && <SetWinCelebration winner={setWinOvl.winner} message={setWinOvl.message} />}

      <div className="flex-1 flex min-h-0">
        {/* GAME AREA */}
        <div className="flex-1 flex flex-col">
          {/* Header — referee big + timer big */}
          <div className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/50 text-base font-bold">LIVE</span>
              <span className="text-white/30 text-base">Round {state.current_set}</span>
            </div>
            <span className="text-white font-mono text-3xl font-bold" style={{textShadow:'0 0 20px rgba(255,255,255,0.1)'}}>{timer}</span>
            <div className="flex items-center gap-3">
              {ref?.photo_url ? (
                <img src={ref.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-sm font-bold">{(ref?.nickname||'?')[0]}</div>
              )}
              <div>
                <span className="text-white/60 text-sm font-bold">⚖️ {ref?.nickname}</span>
                <span className="text-white/20 text-xs block">Referee</span>
              </div>
            </div>
          </div>

          {/* MAIN — Players + Vertical Bar + Scores */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="flex items-end gap-6 w-full max-w-5xl">

              {/* LEFT PLAYER column */}
              <div className="flex-1 flex flex-col items-center">
                {/* Stars */}
                <div className="flex gap-1 mb-2 h-8">
                  {Array.from({length: totalSetsToWin}).map((_,i) => (
                    <Star key={i} className={`h-6 w-6 transition-all ${i < (sw[ls]||0) ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' : 'text-white/10'}`}
                      style={i < (sw[ls]||0) ? {filter:'drop-shadow(0 0 8px rgba(234,179,8,0.5))'} : {}} />
                  ))}
                </div>
                {/* Photo + inline sticker */}
                <div className="relative">
                  {lp?.photo_url ? (
                    <img src={lp.photo_url} className="w-24 h-24 rounded-full object-cover" style={{border:`4px solid ${colorA}`,boxShadow:`0 0 25px ${colorA}30`}} alt="" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-4xl" style={{border:`4px solid ${colorA}`,color:colorA}}>{(lp?.nickname||'?')[0]}</div>
                  )}
                  {/* Inline emotion sticker — beside photo */}
                  {emotion && emotionSide === 'left' && (
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 animate-bounce" style={{filter:`drop-shadow(0 0 8px ${colorA}60)`}}>
                      <span className="text-4xl">{EMOTION_EMOJI[emotion.type] || '✨'}</span>
                    </div>
                  )}
                </div>
                <p className="text-2xl font-black mt-2" style={{color:colorA}}>{lp?.nickname}</p>
                <p className="text-white/20 text-xs">ELO {lp?.elo}</p>
                {/* Score */}
                <div className="mt-3 flex items-center gap-1">
                  <span className="text-6xl font-black text-white" style={{textShadow:`0 0 20px ${colorA}50`}}>{sc[ls]}</span>
                  {state.server === ls && <span className="text-yellow-400 text-lg">🏓</span>}
                </div>
                {/* Combo */}
                {streakL >= 2 && <span className="text-xs font-black mt-1" style={{color:colorA}}>{streakL >= 5 ? '🐉' : streakL >= 3 ? '🔥' : '⚡'} {streakL}x COMBO</span>}
              </div>

              {/* CENTER — Vertical Battle Bar (bottom to top) + Trophy on top */}
              <div className="flex flex-col items-center" style={{width: '160px'}}>
                {/* Configurable trophy/gift icon on top */}
                <div className="w-16 h-16 rounded-full bg-black/60 border-2 border-white/10 flex items-center justify-center mb-3 shrink-0">
                  {centerIcon ? (
                    <img src={centerIcon} className="w-12 h-12 rounded-full object-contain" alt="" />
                  ) : (
                    <span className="text-3xl">🏓</span>
                  )}
                </div>

                {/* Vertical bar — bottom to top, each segment = 1 point */}
                {(() => {
                  const currentSetPoints = (state.points || []).filter(p => p.set === state.current_set);
                  const totalSlots = Math.max(max, currentSetPoints.length + 1);
                  return (
                    <div className="flex flex-col-reverse items-center gap-[2px] w-full rounded-lg overflow-hidden bg-white/[0.03] px-2 py-2" style={{height: '280px'}}>
                      {Array.from({length: totalSlots}).map((_, i) => {
                        const pt = currentSetPoints[i];
                        const scorer = pt?.scored_by;
                        const isLeft = scorer === ls;
                        const isRight = scorer === rs;
                        const isFilled = !!scorer;
                        const isLatest = i === currentSetPoints.length - 1 && isFilled;
                        const fillColor = isLeft ? colorA : isRight ? colorB : 'transparent';

                        return (
                          <div
                            key={i}
                            className="w-full transition-all duration-300"
                            style={{
                              flex: 1,
                              clipPath: 'polygon(0 100%, 0 20%, 50% 0%, 100% 20%, 100% 100%, 50% 80%)',
                              background: isFilled
                                ? `linear-gradient(90deg, ${fillColor}cc, ${fillColor})`
                                : 'rgba(255,255,255,0.03)',
                              boxShadow: isLatest ? `0 0 12px ${fillColor}80` : 'none',
                              transform: isLatest ? 'scaleX(1.15)' : 'scaleX(1)',
                              opacity: isFilled ? 1 : 0.3,
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })()}

                {/* VS label */}
                <span className="text-white/10 text-sm font-black mt-2">VS</span>
              </div>

              {/* RIGHT PLAYER column */}
              <div className="flex-1 flex flex-col items-center">
                {/* Stars */}
                <div className="flex gap-1 mb-2 h-8">
                  {Array.from({length: totalSetsToWin}).map((_,i) => (
                    <Star key={i} className={`h-6 w-6 transition-all ${i < (sw[rs]||0) ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' : 'text-white/10'}`}
                      style={i < (sw[rs]||0) ? {filter:'drop-shadow(0 0 8px rgba(234,179,8,0.5))'} : {}} />
                  ))}
                </div>
                {/* Photo + inline sticker */}
                <div className="relative">
                  {rp?.photo_url ? (
                    <img src={rp.photo_url} className="w-24 h-24 rounded-full object-cover" style={{border:`4px solid ${colorB}`,boxShadow:`0 0 25px ${colorB}30`}} alt="" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-4xl" style={{border:`4px solid ${colorB}`,color:colorB}}>{(rp?.nickname||'?')[0]}</div>
                  )}
                  {/* Inline emotion sticker — beside photo */}
                  {emotion && emotionSide === 'right' && (
                    <div className="absolute -left-10 top-1/2 -translate-y-1/2 animate-bounce" style={{filter:`drop-shadow(0 0 8px ${colorB}60)`}}>
                      <span className="text-4xl">{EMOTION_EMOJI[emotion.type] || '✨'}</span>
                    </div>
                  )}
                </div>
                <p className="text-2xl font-black mt-2" style={{color:colorB}}>{rp?.nickname}</p>
                <p className="text-white/20 text-xs">ELO {rp?.elo}</p>
                {/* Score */}
                <div className="mt-3 flex items-center gap-1">
                  {state.server === rs && <span className="text-yellow-400 text-lg">🏓</span>}
                  <span className="text-6xl font-black text-white" style={{textShadow:`0 0 20px ${colorB}50`}}>{sc[rs]}</span>
                </div>
                {/* Combo */}
                {streakR >= 2 && <span className="text-xs font-black mt-1" style={{color:colorB}}>{streakR >= 5 ? '🐉' : streakR >= 3 ? '🔥' : '⚡'} {streakR}x COMBO</span>}
              </div>
            </div>
          </div>

          {/* Set scores + Match finished */}
          <div className="flex flex-col items-center px-8 pb-2">
            {state.sets?.length > 0 && (
              <div className="flex items-center gap-3 mb-2">
                {state.sets.map((set,i) => {
                  const aScore = swapped ? set.score_b : set.score_a;
                  const bScore = swapped ? set.score_a : set.score_b;
                  const aWon = set.winner === (swapped?'b':'a');
                  return <div key={i} className="px-3 py-1 rounded-lg text-sm font-mono" style={{background:aWon?`${colorA}15`:`${colorB}15`, border:`1px solid ${aWon?colorA:colorB}30`, color:aWon?colorA:colorB}}>R{i+1}: <strong>{aScore}-{bScore}</strong></div>;
                })}
              </div>
            )}
            {state.status === 'finished' && (
              <div className="text-center mt-2 animate-bounce">
                <span className="text-6xl">🏆</span>
                <p className="text-4xl font-black text-yellow-400 mt-2">{state.winner===ls?lp?.nickname:rp?.nickname} WINS!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-2 bg-black/20 flex items-center justify-between">
            <span className="text-white/15 text-sm">🏓 ChiPi Sport</span>
            <span className="text-white/15 text-sm">Bo{totalSetsToWin * 2 - 1} · {max} pts</span>
          </div>
        </div>

        {/* Chat sidebar */}
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
