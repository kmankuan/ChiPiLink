/**
 * Ping Pong Mobile Arbiter - Match control from mobile device
 * Touch-optimized interface for referees
 * Uses WebSocket for real-time sync with all screens
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Wifi, WifiOff, Play, Pause, RotateCcw, 
  Volume2, VolumeX, Clock, AlertTriangle, Check, X,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { PINPANCLUB_API, PINPANCLUB_WS } from '../config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export default function PingPongMobileArbiter() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // WebSocket
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Match state
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  
  // Player info
  const playerA = match?.player_a_info || {};
  const playerB = match?.player_b_info || {};

  // ============== WEBSOCKET ==============
  
  const connectWebSocket = useCallback(() => {
    if (!matchId) return;
    
    const wsUrl = PINPANCLUB_WS.arbiter(matchId);
    console.log('Arbiter connecting to:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Arbiter WebSocket connected');
        setWsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('Arbiter WebSocket disconnected');
        setWsConnected(false);
        // Fallback to HTTP polling
        startHttpPolling();
      };
      
      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        // Fallback to HTTP
        startHttpPolling();
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      // Fallback to HTTP
      startHttpPolling();
    }
  }, [matchId]);

  // HTTP Polling fallback when WebSocket doesn't work
  const pollingRef = useRef(null);
  
  const startHttpPolling = useCallback(() => {
    if (pollingRef.current) return; // Already polling
    
    console.log('Starting HTTP polling fallback');
    
    const poll = async () => {
      try {
        const response = await fetch(PINPANCLUB_API.matchLive(matchId));
        if (response.ok) {
          const data = await response.json();
          setMatch(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    
    // Initial fetch
    poll();
    
    // Poll every 2 seconds
    pollingRef.current = setInterval(poll, 2000);
  }, [matchId]);

  const stopHttpPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleMessage = (data) => {
    console.log('Arbiter received:', data.type);
    
    switch (data.type) {
      case 'connected':
        console.log('Connected as arbiter:', data.client_id);
        break;
        
      case 'match_state':
        setMatch(data.match);
        setLoading(false);
        break;
        
      case 'point_scored':
      case 'point_undone':
      case 'match_started':
        setMatch(data.match);
        break;
        
      case 'error':
        setError(data.message);
        setTimeout(() => setError(null), 3000);
        break;
        
      default:
        break;
    }
  };

  const sendAction = async (action, data = {}) => {
    // Try WebSocket first
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...data }));
    } else {
      // Fallback to HTTP
      try {
        let response;
        if (action === 'point') {
          response = await fetch(PINPANCLUB_API.matchPoint(matchId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jugador: data.jugador, tipo: data.tipo || 'normal' })
          });
        } else if (action === 'undo') {
          response = await fetch(PINPANCLUB_API.matchUndo(matchId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (action === 'start') {
          response = await fetch(PINPANCLUB_API.matchStart(matchId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (action === 'pause') {
          response = await fetch(PINPANCLUB_API.matchPause(matchId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (response?.ok) {
          const result = await response.json();
          if (result.match) {
            setMatch(result.match);
          }
        }
      } catch (err) {
        setError('Error al enviar acción');
      }
    }
    
    // Haptic feedback
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setLastAction({ action, time: Date.now() });
  };

  // ============== EFFECTS ==============
  
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopHttpPolling();
    };
  }, [connectWebSocket]);

  // ============== ACTIONS ==============
  
  const addPoint = (jugador) => {
    sendAction('point', { jugador, tipo: 'normal' });
  };

  const undoPoint = () => {
    setConfirmAction({
      title: '¿Deshacer último punto?',
      action: () => {
        sendAction('undo');
        setConfirmAction(null);
      }
    });
  };

  const startMatch = () => {
    sendAction('start');
  };

  const pauseMatch = () => {
    sendAction('pause');
  };

  const callTimeout = (jugador) => {
    sendAction('timeout', { jugador, duracion: 60 });
  };

  // ============== RENDER ==============
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p>Conectando...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-bold mb-2">Partido no encontrado</h2>
          <button
            onClick={() => navigate('/pinpanclub')}
            className="mt-4 bg-white/20 px-6 py-2 rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const isLive = match.estado === 'en_curso';
  const isPending = match.estado === 'pendiente';
  const isFinished = match.estado === 'finalizado';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-black/50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/pinpanclub')} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          <div className="font-bold">🏓 Árbitro</div>
          <div className="text-xs text-white/60">{match.mesa ? `Mesa ${match.mesa}` : 'Partido'}</div>
        </div>
        
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? 'LIVE' : 'OFF'}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500 text-white text-center py-2 text-sm">
          {error}
        </div>
      )}

      {/* Score Display */}
      <div className="bg-black/30 p-4">
        {/* Sets */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-4xl font-black text-blue-400">{match.sets_player_a}</div>
            <div className="text-xs text-white/60">SETS</div>
          </div>
          <div className="text-2xl text-white/40 self-center">-</div>
          <div className="text-center">
            <div className="text-4xl font-black text-red-400">{match.sets_player_b}</div>
            <div className="text-xs text-white/60">SETS</div>
          </div>
        </div>

        {/* Current Set Score */}
        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <div className={`text-7xl font-black ${match.saque === 'a' ? 'text-yellow-400' : 'text-white'}`}>
              {match.puntos_player_a}
            </div>
            {match.saque === 'a' && <div className="text-yellow-400 text-xs mt-1">● SAQUE</div>}
          </div>
          <div className="text-3xl text-white/40">:</div>
          <div className="text-center">
            <div className={`text-7xl font-black ${match.saque === 'b' ? 'text-yellow-400' : 'text-white'}`}>
              {match.puntos_player_b}
            </div>
            {match.saque === 'b' && <div className="text-yellow-400 text-xs mt-1">● SAQUE</div>}
          </div>
        </div>

        {/* Set Info */}
        <div className="text-center mt-2 text-white/60 text-sm">
          Set {match.set_actual} • {match.tipo_partido.replace('_', ' ')}
        </div>
      </div>

      {/* Main Scoring Buttons */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Player A Button */}
        <button
          onClick={() => isLive && addPoint('a')}
          disabled={!isLive}
          className={`flex-1 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 ${
            isLive 
              ? 'bg-gradient-to-br from-blue-500 to-blue-700 active:from-blue-600 active:to-blue-800' 
              : 'bg-gray-700 opacity-50'
          }`}
        >
          {playerA.foto_url ? (
            <img src={playerA.foto_url} className="w-20 h-20 rounded-full mb-3 border-4 border-white/30" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-full mb-3 bg-white/20 flex items-center justify-center text-4xl font-bold">
              {playerA.nombre?.[0] || 'A'}
            </div>
          )}
          <div className="text-2xl font-bold">{playerA.apodo || playerA.nombre || 'Jugador A'}</div>
          <div className="text-white/60 mt-1">Toca para anotar punto</div>
          <ChevronUp className="w-8 h-8 mt-2 animate-bounce" />
        </button>

        {/* Player B Button */}
        <button
          onClick={() => isLive && addPoint('b')}
          disabled={!isLive}
          className={`flex-1 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 ${
            isLive 
              ? 'bg-gradient-to-br from-red-500 to-red-700 active:from-red-600 active:to-red-800' 
              : 'bg-gray-700 opacity-50'
          }`}
        >
          <ChevronDown className="w-8 h-8 mb-2 animate-bounce" />
          <div className="text-white/60 mb-1">Toca para anotar punto</div>
          <div className="text-2xl font-bold">{playerB.apodo || playerB.nombre || 'Jugador B'}</div>
          {playerB.foto_url ? (
            <img src={playerB.foto_url} className="w-20 h-20 rounded-full mt-3 border-4 border-white/30" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-full mt-3 bg-white/20 flex items-center justify-center text-4xl font-bold">
              {playerB.nombre?.[0] || 'B'}
            </div>
          )}
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-black/50 p-4">
        <div className="flex justify-around items-center">
          {/* Start/Pause */}
          {isPending ? (
            <button
              onClick={startMatch}
              className="flex flex-col items-center gap-1 text-green-400"
            >
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <Play className="w-7 h-7" />
              </div>
              <span className="text-xs">Iniciar</span>
            </button>
          ) : isLive ? (
            <button
              onClick={pauseMatch}
              className="flex flex-col items-center gap-1 text-yellow-400"
            >
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Pause className="w-7 h-7" />
              </div>
              <span className="text-xs">Pausar</span>
            </button>
          ) : (
            <button
              onClick={startMatch}
              className="flex flex-col items-center gap-1 text-green-400"
            >
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <Play className="w-7 h-7" />
              </div>
              <span className="text-xs">Reanudar</span>
            </button>
          )}

          {/* Undo */}
          <button
            onClick={undoPoint}
            disabled={!isLive}
            className={`flex flex-col items-center gap-1 ${isLive ? 'text-white' : 'text-white/30'}`}
          >
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <RotateCcw className="w-7 h-7" />
            </div>
            <span className="text-xs">Deshacer</span>
          </button>

          {/* Timeout A */}
          <button
            onClick={() => callTimeout('a')}
            disabled={!isLive}
            className={`flex flex-col items-center gap-1 ${isLive ? 'text-blue-400' : 'text-white/30'}`}
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-xs">Tiempo A</span>
          </button>

          {/* Timeout B */}
          <button
            onClick={() => callTimeout('b')}
            disabled={!isLive}
            className={`flex flex-col items-center gap-1 ${isLive ? 'text-red-400' : 'text-white/30'}`}
          >
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-xs">Tiempo B</span>
          </button>
        </div>
      </div>

      {/* Match Finished Overlay */}
      {isFinished && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">Partido Finalizado</h2>
            <p className="text-xl text-white/60 mb-6">
              {match.winner_id === match.player_a_id 
                ? `¡${playerA.nombre || 'Jugador A'} GANA!`
                : `¡${playerB.nombre || 'Jugador B'} GANA!`
              }
            </p>
            <div className="text-4xl font-bold mb-8">
              {match.sets_player_a} - {match.sets_player_b}
            </div>
            <button
              onClick={() => navigate('/pinpanclub')}
              className="bg-white text-black px-8 py-3 rounded-full font-bold"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">{confirmAction.title}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-700 py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
              <button
                onClick={confirmAction.action}
                className="flex-1 bg-red-500 py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
