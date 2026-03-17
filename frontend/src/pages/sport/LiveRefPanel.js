import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi, createLiveWebSocket } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Undo2, StopCircle, Wifi, WifiOff } from 'lucide-react';

export default function LiveRefPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await sportApi.getLiveSession(id);
      setSession(res.data);
    } catch (e) {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // WebSocket connection
  useEffect(() => {
    if (!id) return;
    const ws = createLiveWebSocket(id);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point_scored' || msg.type === 'point_undone') {
          loadSession();
        }
      } catch {}
    };
    return () => ws.close();
  }, [id, loadSession]);

  const scorePoint = async (side) => {
    if (scoring) return;
    setScoring(true);
    try {
      const res = await sportApi.scorePoint(id, { scored_by: side });
      // Optimistic update
      setSession(prev => ({
        ...prev,
        score: res.data.score,
        sets_won: res.data.sets_won,
        status: res.data.status
      }));
      if (res.data.emotions?.length > 0) {
        const em = res.data.emotions[res.data.emotions.length - 1];
        toast(em.replace('_', ' ').toUpperCase(), { duration: 2000 });
      }
      if (res.data.status === 'completed') {
        toast.success('Match completed!');
      }
    } catch (e) {
      toast.error('Failed to score point');
      loadSession();
    } finally {
      setScoring(false);
    }
  };

  const undoPoint = async () => {
    try {
      const res = await sportApi.undoPoint(id);
      setSession(prev => ({
        ...prev,
        score: res.data.score,
        sets_won: res.data.sets_won,
        status: res.data.status
      }));
      toast.info('Point undone');
    } catch (e) {
      toast.error('Failed to undo');
    }
  };

  const endMatch = async () => {
    if (!window.confirm('End this match?')) return;
    try {
      await sportApi.endSession(id);
      toast.success('Match ended');
      navigate('/sport');
    } catch (e) {
      toast.error('Failed to end match');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Skeleton className="h-96 w-full max-w-lg rounded-2xl" />
      </div>
    );
  }

  if (!session) {
    return <div className="text-center py-12 text-gray-400">Session not found</div>;
  }

  const isCompleted = session.status === 'completed';

  return (
    <div className="max-w-lg mx-auto space-y-4" data-testid="live-ref-panel">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <Badge variant={connected ? 'default' : 'destructive'} className="gap-1">
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
        <Badge variant="outline">Set {session.current_set}</Badge>
      </div>

      {/* Sets Won */}
      <div className="flex justify-center gap-8 py-2">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase">{t('sets')}</p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: session.sets_won?.a || 0 }).map((_, i) => (
              <span key={i} className="text-amber-500 text-lg">★</span>
            ))}
            {Array.from({ length: (session.settings?.sets_to_win || 2) - (session.sets_won?.a || 0) }).map((_, i) => (
              <span key={i} className="text-gray-200 text-lg">☆</span>
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase">{t('sets')}</p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: session.sets_won?.b || 0 }).map((_, i) => (
              <span key={i} className="text-amber-500 text-lg">★</span>
            ))}
            {Array.from({ length: (session.settings?.sets_to_win || 2) - (session.sets_won?.b || 0) }).map((_, i) => (
              <span key={i} className="text-gray-200 text-lg">☆</span>
            ))}
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="grid grid-cols-3 items-center gap-2">
        {/* Player A Button */}
        <button
          data-testid="score-a"
          onClick={() => scorePoint('a')}
          disabled={isCompleted || scoring}
          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-white font-bold transition-all active:scale-95 shadow-xl ${
            isCompleted ? 'bg-gray-300 cursor-not-allowed' :
            session.server === 'a'
              ? 'bg-gradient-to-br from-red-500 to-red-700 ring-4 ring-red-300'
              : 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800'
          }`}
        >
          <span className="text-5xl md:text-6xl">{session.score?.a || 0}</span>
          <span className="text-sm mt-1 opacity-80 truncate max-w-full px-2">
            {session.player_a?.nickname}
          </span>
          {session.server === 'a' && (
            <span className="absolute top-2 right-2 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          )}
        </button>

        {/* Center - VS */}
        <div className="flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-gray-200">VS</p>
          <p className="text-xs text-gray-400 mt-1">
            {session.referee?.nickname && `Ref: ${session.referee.nickname}`}
          </p>
        </div>

        {/* Player B Button */}
        <button
          data-testid="score-b"
          onClick={() => scorePoint('b')}
          disabled={isCompleted || scoring}
          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-white font-bold transition-all active:scale-95 shadow-xl ${
            isCompleted ? 'bg-gray-300 cursor-not-allowed' :
            session.server === 'b'
              ? 'bg-gradient-to-br from-blue-500 to-blue-700 ring-4 ring-blue-300'
              : 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800'
          }`}
        >
          <span className="text-5xl md:text-6xl">{session.score?.b || 0}</span>
          <span className="text-sm mt-1 opacity-80 truncate max-w-full px-2">
            {session.player_b?.nickname}
          </span>
          {session.server === 'b' && (
            <span className="absolute top-2 right-2 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          data-testid="undo-btn"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={undoPoint}
          disabled={isCompleted}
        >
          <Undo2 size={18} className="mr-2" /> {t('undo')}
        </Button>
        <Button
          data-testid="end-match-btn"
          variant="destructive"
          size="lg"
          className="flex-1"
          onClick={endMatch}
        >
          <StopCircle size={18} className="mr-2" /> {t('end_match')}
        </Button>
      </div>

      {isCompleted && (
        <div className="text-center py-6">
          <p className="text-2xl font-bold text-amber-600">🏆 {t('winner')}!</p>
          <p className="text-lg">
            {(session.sets_won?.a || 0) > (session.sets_won?.b || 0)
              ? session.player_a?.nickname
              : session.player_b?.nickname}
          </p>
        </div>
      )}
    </div>
  );
}
