/**
 * PinPan Live - Real-time Match Spectator
 * Uses WebSocket for live updates with polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { ArrowLeft, Loader2, Maximize2, Wifi, WifiOff } from 'lucide-react';
import ScoreBoard from '../components/ScoreBoard';
import { PINPANCLUB_WS } from '../config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongSpectator() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const pollRef = useRef(null);
  const attemptsRef = useRef(0);

  // Initial HTTP fetch
  const fetchMatch = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pinpanclub/matches/${matchId}/live`);
      setMatch(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // WebSocket connection
  const connectWS = useCallback(() => {
    if (!matchId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = PINPANCLUB_WS.spectator(matchId);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setWsConnected(true);
        attemptsRef.current = 0;
        // Stop polling when WS connected
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'match_state' || data.type === 'point_scored' || data.type === 'point_undone') {
            setMatch(data.match);
            setLastUpdate(new Date());
          } else if (data.type === 'ping') {
            wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
        // Reconnect with backoff
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 15000);
        reconnectRef.current = setTimeout(() => {
          attemptsRef.current += 1;
          connectWS();
        }, delay);
        // Start polling as fallback
        if (!pollRef.current) {
          pollRef.current = setInterval(fetchMatch, 3000);
        }
      };

      wsRef.current.onerror = () => {
        // Will trigger onclose
      };
    } catch (e) {
      console.error('WS connection error:', e);
      // Fallback to polling
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchMatch, 3000);
      }
    }
  }, [matchId, fetchMatch]);

  useEffect(() => {
    if (matchId) {
      fetchMatch();
      connectWS();
    }
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [matchId, fetchMatch, connectWS]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Match not found</p>
        <Button onClick={() => navigate('/pinpanclub')}>Back to Dashboard</Button>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          <ScoreBoard match={match} size="tv" showStats={true} className="bg-gray-800/50 backdrop-blur border-gray-700" />
          <div className="text-center mt-4 text-gray-500 text-sm">
            Press ESC to exit fullscreen
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/pinpanclub')} data-testid="live-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-bold text-xl" data-testid="live-title">PinPan Live</h1>
              {match.estado === 'en_curso' && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600" data-testid="ws-status">
                  <Wifi className="h-3 w-3" /> Real-time
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-500" data-testid="ws-status-fallback">
                  <WifiOff className="h-3 w-3" /> Polling
                </span>
              )}
              <Button size="sm" variant="outline" onClick={toggleFullscreen} data-testid="fullscreen-btn">
                <Maximize2 className="h-4 w-4 mr-1" />
                Fullscreen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ScoreBoard match={match} size="large" showStats={true} />
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Last update: {lastUpdate?.toLocaleTimeString()}
            <span className="mx-2">·</span>
            {wsConnected ? 'Real-time via WebSocket' : 'Auto-refresh every 3s'}
          </div>
        </div>

        {match.ronda && (
          <div className="text-center mt-6">
            <span className="text-lg text-muted-foreground">{match.ronda}</span>
          </div>
        )}
      </main>
    </div>
  );
}
