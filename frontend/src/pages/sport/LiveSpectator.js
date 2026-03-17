import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi, createLiveWebSocket } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, ExternalLink } from 'lucide-react';

export default function LiveSpectator() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emotion, setEmotion] = useState(null);
  const wsRef = useRef(null);

  const loadSession = useCallback(async () => {
    try {
      const res = await sportApi.getLiveSession(id);
      setSession(res.data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (!id) return;
    const ws = createLiveWebSocket(id);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'point_scored') {
          setSession(prev => prev ? { ...prev, ...msg.data } : prev);
          if (msg.data.emotions?.length > 0) {
            setEmotion(msg.data.emotions[msg.data.emotions.length - 1]);
            setTimeout(() => setEmotion(null), 3000);
          }
        }
        if (msg.type === 'point_undone' || msg.type === 'session_ended') {
          loadSession();
        }
      } catch {}
    };
    return () => ws.close();
  }, [id, loadSession]);

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!session) return <div className="text-center py-12 text-gray-400">Session not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4" data-testid="live-spectator">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="destructive" className="animate-pulse gap-1">
          <Radio size={12} /> LIVE
        </Badge>
        <Link to={`/sport/tv`} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
          {t('tv_display')} <ExternalLink size={14} />
        </Link>
      </div>

      {/* Emotion Overlay */}
      {emotion && (
        <div className="text-center py-4 animate-bounce">
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
            {emotion === 'streak_3' ? '🔥 ON FIRE!' :
             emotion === 'streak_5' ? '🐉 DRAGON MODE!' :
             emotion === 'streak_break' ? '💥 STREAK BROKEN!' :
             emotion === 'deuce' ? '⚡ DEUCE!' :
             emotion === 'match_point' ? '🎯 MATCH POINT!' :
             emotion === 'winner' ? '🏆 WINNER!' :
             emotion.toUpperCase()}
          </p>
        </div>
      )}

      {/* Score Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-gray-900 to-blue-600 p-6">
          <div className="grid grid-cols-3 items-center">
            {/* Player A */}
            <div className="text-center text-white">
              <p className="text-lg font-bold truncate">{session.player_a?.nickname}</p>
              <p className="text-xs opacity-60">ELO {session.player_a?.elo}</p>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: session.sets_won?.a || 0 }).map((_, i) => (
                  <span key={i} className="text-amber-400">★</span>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-black text-white">{session.score?.a || 0}</span>
                <span className="text-2xl text-gray-400">:</span>
                <span className="text-5xl font-black text-white">{session.score?.b || 0}</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">Set {session.current_set}</p>
            </div>

            {/* Player B */}
            <div className="text-center text-white">
              <p className="text-lg font-bold truncate">{session.player_b?.nickname}</p>
              <p className="text-xs opacity-60">ELO {session.player_b?.elo}</p>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: session.sets_won?.b || 0 }).map((_, i) => (
                  <span key={i} className="text-amber-400">★</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{t('referee')}: {session.referee?.nickname || 'None'}</span>
            <span>{session.server === 'a' ? session.player_a?.nickname : session.player_b?.nickname} {t('serving')}</span>
          </div>
        </CardContent>
      </Card>

      {session.status === 'completed' && (
        <div className="text-center py-8">
          <p className="text-3xl font-bold text-amber-600">🏆 Match Complete!</p>
        </div>
      )}
    </div>
  );
}
