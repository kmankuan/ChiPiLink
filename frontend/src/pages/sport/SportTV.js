import { useState, useEffect, useRef, useCallback } from 'react';
import { sportApi, createLiveWebSocket } from '@/lib/api';

export default function SportTV() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [tvSettings, setTvSettings] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    sportApi.getTvSettings().then(res => setTvSettings(res.data)).catch(() => {});
    sportApi.getLiveSessions().then(res => {
      const data = res.data || [];
      setSessions(data);
      if (data.length > 0) setActiveSession(data[0]);
    }).catch(() => {});
  }, []);

  // WebSocket for active session
  useEffect(() => {
    if (!activeSession?.session_id) return;
    const ws = createLiveWebSocket(activeSession.session_id);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point_scored' || msg.type === 'point_undone') {
          sportApi.getLiveSession(activeSession.session_id).then(res => setActiveSession(res.data));
        }
      } catch {}
    };
    return () => ws.close();
  }, [activeSession?.session_id]);

  const bg = tvSettings?.background || 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)';
  const accentA = tvSettings?.accent_a || '#ef4444';
  const accentB = tvSettings?.accent_b || '#3b82f6';
  const s = activeSession;

  if (!s) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="text-center text-white">
          <p className="text-4xl mb-4">🏓</p>
          <p className="text-xl font-bold">No Live Matches</p>
          <p className="text-gray-400 mt-2">Waiting for a match to begin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg }} data-testid="sport-tv">
      {/* Battle Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="text-red-500 animate-pulse">●</span>
          <span className="text-white text-sm font-medium">LIVE</span>
        </div>
        <span className="text-gray-400 text-sm">Set {s.current_set}</span>
      </div>

      {/* Main Battle Area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-3 items-center gap-4 w-full max-w-5xl">
          {/* Player A - Totem */}
          <div className="text-center">
            <div className="relative">
              <div className="w-32 h-32 md:w-48 md:h-48 mx-auto rounded-2xl flex items-center justify-center text-6xl md:text-8xl font-black shadow-2xl"
                   style={{ background: `linear-gradient(135deg, ${accentA}, ${accentA}99)`, color: 'white' }}>
                {s.player_a?.nickname?.charAt(0)}
              </div>
              {/* Stars for sets won */}
              <div className="flex justify-center gap-1 mt-3">
                {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
                  <span key={i} className={`text-2xl ${i < (s.sets_won?.a || 0) ? 'text-amber-400' : 'text-gray-600'}`}>
                    {i < (s.sets_won?.a || 0) ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-white text-xl font-bold mt-3">{s.player_a?.nickname}</p>
            {tvSettings?.show_elo && <p className="text-gray-400 text-sm">ELO {s.player_a?.elo}</p>}
          </div>

          {/* Center Score */}
          <div className="text-center">
            {/* HP Bar style score */}
            <div className="relative">
              <div className="flex items-center justify-center gap-6">
                <span className="text-7xl md:text-9xl font-black text-white" style={{ textShadow: `0 0 40px ${accentA}` }}>
                  {s.score?.a || 0}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl text-gray-500">:</span>
                  {s.server && (
                    <span className={`text-xs mt-2 px-2 py-0.5 rounded ${s.server === 'a' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      🏓 {s.server === 'a' ? s.player_a?.nickname : s.player_b?.nickname}
                    </span>
                  )}
                </div>
                <span className="text-7xl md:text-9xl font-black text-white" style={{ textShadow: `0 0 40px ${accentB}` }}>
                  {s.score?.b || 0}
                </span>
              </div>
            </div>

            {/* Sticker/Emotion Zone */}
            {s.display?.last_emotion && (
              <div className="mt-4 animate-bounce">
                <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
                  {s.display.last_emotion === 'streak_3' ? '🔥 ON FIRE!' :
                   s.display.last_emotion === 'streak_5' ? '🐉 DRAGON!' :
                   s.display.last_emotion === 'streak_break' ? '💥 BROKEN!' :
                   s.display.last_emotion === 'deuce' ? '⚡ DEUCE!' :
                   s.display.last_emotion === 'match_point' ? '🎯 MATCH POINT!' :
                   s.display.last_emotion === 'winner' ? '🏆 WINNER!' :
                   s.display.last_emotion.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Player B - Totem */}
          <div className="text-center">
            <div className="relative">
              <div className="w-32 h-32 md:w-48 md:h-48 mx-auto rounded-2xl flex items-center justify-center text-6xl md:text-8xl font-black shadow-2xl"
                   style={{ background: `linear-gradient(135deg, ${accentB}, ${accentB}99)`, color: 'white' }}>
                {s.player_b?.nickname?.charAt(0)}
              </div>
              <div className="flex justify-center gap-1 mt-3">
                {Array.from({ length: s.settings?.sets_to_win || 2 }).map((_, i) => (
                  <span key={i} className={`text-2xl ${i < (s.sets_won?.b || 0) ? 'text-amber-400' : 'text-gray-600'}`}>
                    {i < (s.sets_won?.b || 0) ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-white text-xl font-bold mt-3">{s.player_b?.nickname}</p>
            {tvSettings?.show_elo && <p className="text-gray-400 text-sm">ELO {s.player_b?.elo}</p>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 flex items-center justify-between text-gray-500 text-xs">
        <span>ChiPi Sport Engine</span>
        <span>{s.referee?.nickname ? `Ref: ${s.referee.nickname}` : ''}</span>
      </div>
    </div>
  );
}
