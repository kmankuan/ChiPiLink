/**
 * Live Overlay — Transparent overlay for OBS/streaming
 * Shows only score bar + momentum on transparent background
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import MomentumGraph from './components/MomentumGraph';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LiveOverlay() {
  const { sessionId } = useParams();
  const [state, setState] = useState(null);
  const [session, setSession] = useState(null);

  const fetchState = useCallback(async () => {
    try {
      const [stateRes, sessionRes] = await Promise.all([
        fetch(`${API}/api/sport/live/${sessionId}/state`),
        fetch(`${API}/api/sport/live/${sessionId}`),
      ]);
      if (stateRes.ok) setState(await stateRes.json());
      if (sessionRes.ok) setSession(await sessionRes.json());
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  if (!state || !session) return null;

  const pa = session.player_a || { nickname: 'A' };
  const pb = session.player_b || { nickname: 'B' };

  return (
    <div className="fixed bottom-0 left-0 right-0" style={{ background: 'transparent' }}>
      {/* Score Bar */}
      <div className="flex items-center justify-between px-6 py-3 mx-4 mb-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">{pa.nickname}</span>
          {state.server === 'a' && <span className="text-yellow-400 text-xs">🏓</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-4xl font-black text-white">{state.score?.a || 0}</span>
          <span className="text-white/30 text-lg">:</span>
          <span className="text-4xl font-black text-white">{state.score?.b || 0}</span>
        </div>
        <div className="flex items-center gap-3">
          {state.server === 'b' && <span className="text-yellow-400 text-xs">🏓</span>}
          <span className="text-white font-bold text-lg">{pb.nickname}</span>
        </div>
      </div>

      {/* Mini Momentum */}
      <div className="mx-4 mb-4">
        <MomentumGraph points={state.points || []} height={30} />
      </div>
    </div>
  );
}
