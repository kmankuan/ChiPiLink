/**
 * Live Referee Panel — Tap to score, undo, track sets
 * Big buttons for phone use at the table
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Undo2, X, Radio, Eye } from 'lucide-react';
import MomentumGraph from './components/MomentumGraph';
import EmotionOverlay from './components/EmotionOverlay';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LiveRefPanel() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [session, setSession] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchSession = useCallback(async () => {
    const r = await fetch(`${API}/api/sport/live/${sessionId}`);
    if (r.ok) setSession(await r.json());
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // WebSocket
  useEffect(() => {
    if (!sessionId) return;
    const wsUrl = `${API.replace('http', 'ws')}/api/sport/ws/live/${sessionId}`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point' || msg.type === 'undo') fetchSession();
      };
      wsRef.current = ws;
      return () => ws.close();
    } catch { /* WebSocket not available, use polling */ }
  }, [sessionId, fetchSession]);

  const scorePoint = async (side) => {
    try {
      const res = await fetch(`${API}/api/sport/live/${sessionId}/point`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scored_by: side }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(prev => ({ ...prev, score: data.score, sets: data.sets, sets_won: data.sets_won, server: data.server, current_set: data.current_set, status: data.status }));
        if (data.emotions?.length > 0) {
          setEmotion(data.emotions[0]);
          setTimeout(() => setEmotion(null), 3000);
        }
        if (data.status === 'finished') {
          toast.success(t('sport.emotions.winner'));
        }
      }
    } catch { toast.error('Error'); }
  };

  const undoPoint = async () => {
    try {
      await fetch(`${API}/api/sport/live/${sessionId}/undo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      fetchSession();
    } catch {}
  };

  const endMatch = async () => {
    if (!confirm('End this match?')) return;
    await fetch(`${API}/api/sport/live/${sessionId}/end`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    navigate('/sport');
  };

  if (loading || !session) return <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a2e' }}><Radio className="h-8 w-8 text-red-500 animate-pulse" /></div>;

  const s = session;
  const pa = s.player_a || {};
  const pb = s.player_b || {};
  const isFinished = s.status === 'finished';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <EmotionOverlay emotion={emotion} settings={s} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <Badge className="bg-red-600 text-white animate-pulse text-xs"><Radio className="h-3 w-3 mr-1" /> LIVE</Badge>
        <span className="text-white/50 text-xs">Set {s.current_set}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-white/50 h-7" onClick={() => navigate(`/sport/live/${sessionId}/spectator`)}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={endMatch}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sets won */}
      <div className="flex justify-center gap-8 px-4 pb-2">
        <div className="flex gap-1">
          {Array.from({length: s.settings?.sets_to_win * 2 - 1 || 3}).map((_, i) => (
            <div key={`a${i}`} className={`w-3 h-3 rounded-full ${i < (s.sets_won?.a || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
        <span className="text-white/30 text-xs">{t('sport.live.setsWon')}</span>
        <div className="flex gap-1">
          {Array.from({length: s.settings?.sets_to_win * 2 - 1 || 3}).map((_, i) => (
            <div key={`b${i}`} className={`w-3 h-3 rounded-full ${i < (s.sets_won?.b || 0) ? 'bg-yellow-400' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      {/* Main Score + Tap Areas */}
      <div className="flex-1 flex">
        {/* Player A side */}
        <button
          className="flex-1 flex flex-col items-center justify-center active:bg-white/5 transition-colors"
          onClick={() => !isFinished && scorePoint('a')}
          disabled={isFinished}
          data-testid="score-a"
        >
          <span className="text-white/70 text-sm font-medium mb-2">{pa.nickname}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>{s.score?.a || 0}</span>
          {s.server === 'a' && <span className="mt-2 text-yellow-400 text-xs">🏓 {t('sport.live.service')}</span>}
          <span className="mt-1 text-white/30 text-[10px]">{t('sport.elo')}: {pa.elo}</span>
        </button>

        {/* Divider */}
        <div className="w-px bg-white/10 self-stretch" />

        {/* Player B side */}
        <button
          className="flex-1 flex flex-col items-center justify-center active:bg-white/5 transition-colors"
          onClick={() => !isFinished && scorePoint('b')}
          disabled={isFinished}
          data-testid="score-b"
        >
          <span className="text-white/70 text-sm font-medium mb-2">{pb.nickname}</span>
          <span className="text-7xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>{s.score?.b || 0}</span>
          {s.server === 'b' && <span className="mt-2 text-yellow-400 text-xs">🏓 {t('sport.live.service')}</span>}
          <span className="mt-1 text-white/30 text-[10px]">{t('sport.elo')}: {pb.elo}</span>
        </button>
      </div>

      {/* Momentum Graph */}
      <div className="px-4 py-2">
        <MomentumGraph points={s.points || []} height={50} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 bg-black/30">
        <Button variant="outline" size="sm" className="border-white/20 text-white/70" onClick={undoPoint}>
          <Undo2 className="h-4 w-4 mr-1" /> {t('sport.live.undo')}
        </Button>
        <span className="text-white/30 text-xs">⚖️ {s.referee?.nickname}</span>
      </div>
    </div>
  );
}
