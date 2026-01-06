/**
 * Ping Pong TV Display - Live Scoreboard System
 * Displays real-time match scores on TVs, with WebSocket synchronization
 * 
 * Modes:
 * - single: Single match view (large scoreboard)
 * - multi: Multiple matches grid view
 * - dashboard: Full dashboard with rankings, upcoming matches, etc.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Monitor, Grid3X3, LayoutDashboard, Maximize2, Minimize2, 
  Volume2, VolumeX, Settings, Wifi, WifiOff, RefreshCw,
  Trophy, Users, Clock, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Sound effects URLs (can be customized)
const SOUNDS = {
  point: '/sounds/point.mp3',
  setWin: '/sounds/set-win.mp3',
  matchPoint: '/sounds/match-point.mp3',
  deuce: '/sounds/deuce.mp3',
  gameOver: '/sounds/game-over.mp3',
};

export default function PingPongTV() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Display mode: single, multi, dashboard
  const [mode, setMode] = useState(searchParams.get('mode') || 'dashboard');
  const [matchId, setMatchId] = useState(searchParams.get('match'));
  
  // WebSocket state
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Data state
  const [currentMatch, setCurrentMatch] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  
  // Sponsors state
  const [sponsors, setSponsors] = useState({
    header_left: [],
    header_right: [],
    banner_top: [],
    banner_bottom: [],
    sidebar_left: [],
    sidebar_right: []
  });
  const [sponsorLayout, setSponsorLayout] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Animation states
  const [pointAnimation, setPointAnimation] = useState(null);
  const [specialEvent, setSpecialEvent] = useState(null);
  
  // Audio refs
  const audioRef = useRef(null);

  // ============== WEBSOCKET CONNECTION ==============
  
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = matchId 
      ? `${WS_URL}/api/pingpong/ws/live?type=tv&match_id=${matchId}`
      : `${WS_URL}/api/pingpong/ws/live?type=tv`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setConnectionAttempts(0);
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Attempt reconnection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [matchId, connectionAttempts]);

  const handleWebSocketMessage = useCallback((data) => {
    console.log('WS Message:', data.type);
    setLastUpdate(new Date());
    
    switch (data.type) {
      case 'connected':
        console.log('Connected as:', data.client_id);
        break;
        
      case 'match_state':
        setCurrentMatch(data.match);
        break;
        
      case 'active_matches':
        setActiveMatches(data.matches || []);
        break;
        
      case 'point_scored':
        handlePointScored(data);
        break;
        
      case 'point_undone':
        setCurrentMatch(data.match);
        if (mode === 'single') {
          triggerAnimation('undo');
        }
        break;
        
      case 'match_started':
        setCurrentMatch(data.match);
        triggerSpecialEvent('match_start');
        break;
        
      case 'match_paused':
        triggerSpecialEvent('pause');
        break;
        
      case 'timeout':
        triggerSpecialEvent('timeout', data);
        break;
        
      case 'ping':
        // Respond to keep connection alive
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
        }
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, [mode]);

  const handlePointScored = (data) => {
    setCurrentMatch(data.match);
    
    // Update in active matches list
    setActiveMatches(prev => prev.map(m => 
      m.partido_id === data.match.partido_id ? data.match : m
    ));
    
    // Trigger point animation
    triggerAnimation('point', data.point.jugador);
    
    // Play sound
    if (soundEnabled) {
      playSound('point');
    }
    
    // Check for special situations
    if (data.situacion?.length > 0) {
      const situation = data.situacion[0];
      
      if (situation.tipo === 'match_point') {
        triggerSpecialEvent('match_point', situation);
        if (soundEnabled) playSound('matchPoint');
      } else if (situation.tipo === 'deuce') {
        triggerSpecialEvent('deuce');
        if (soundEnabled) playSound('deuce');
      } else if (situation.tipo === 'set_point') {
        triggerSpecialEvent('set_point', situation);
      }
    }
    
    // Set won
    if (data.set_ganado) {
      triggerSpecialEvent('set_won', { ganador: data.ganador_set });
      if (soundEnabled) playSound('setWin');
    }
    
    // Match finished
    if (data.partido_terminado) {
      triggerSpecialEvent('match_won', { ganador: data.ganador_partido });
      if (soundEnabled) playSound('gameOver');
    }
  };

  // ============== ANIMATIONS ==============
  
  const triggerAnimation = (type, player = null) => {
    setPointAnimation({ type, player });
    setTimeout(() => setPointAnimation(null), 1500);
  };

  const triggerSpecialEvent = (event, data = null) => {
    setSpecialEvent({ event, data });
    setTimeout(() => setSpecialEvent(null), 3000);
  };

  const playSound = (soundKey) => {
    // For now, just log - actual sound implementation needs audio files
    console.log('Playing sound:', soundKey);
  };

  // ============== EFFECTS ==============
  
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    // Fetch initial data
    fetchRankings();
    fetchRecentResults();
    fetchSponsors();
    
    // Refresh rankings periodically
    const interval = setInterval(fetchRankings, 60000);
    // Refresh sponsors every 5 minutes
    const sponsorInterval = setInterval(fetchSponsors, 300000);
    
    return () => {
      clearInterval(interval);
      clearInterval(sponsorInterval);
    };
  }, []);

  // Banner rotation effect
  useEffect(() => {
    const bannerSponsors = sponsors.banner_bottom;
    if (bannerSponsors.length <= 1) return;
    
    const rotationInterval = sponsorLayout?.espacios?.find(e => e.space_id === 'banner_bottom')?.intervalo_rotacion || 10;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerSponsors.length);
    }, rotationInterval * 1000);
    
    return () => clearInterval(interval);
  }, [sponsors.banner_bottom, sponsorLayout]);

  useEffect(() => {
    // Update URL params when mode changes
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (matchId) params.set('match', matchId);
    setSearchParams(params, { replace: true });
  }, [mode, matchId, setSearchParams]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============== DATA FETCHING ==============
  
  const fetchRankings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pingpong/rankings?limit=10`);
      const data = await response.json();
      setRankings(data);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const fetchRecentResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pingpong/matches?estado=finalizado&limit=5`);
      const data = await response.json();
      setRecentResults(data);
    } catch (error) {
      console.error('Error fetching recent results:', error);
    }
  };

  // ============== UI HELPERS ==============
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const currentUrl = window.location.href;

  // ============== RENDER FUNCTIONS ==============
  
  const renderSingleMatch = () => {
    if (!currentMatch) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="text-6xl mb-4">🏓</div>
            <p className="text-2xl">Esperando partido...</p>
            <p className="mt-2">Selecciona un partido para mostrar</p>
          </div>
        </div>
      );
    }

    const playerA = currentMatch.jugador_a_info || {};
    const playerB = currentMatch.jugador_b_info || {};

    return (
      <div className="h-full flex flex-col p-8">
        {/* Match Header */}
        <div className="text-center mb-8">
          {currentMatch.ronda && (
            <div className="text-2xl text-yellow-400 font-bold mb-2">{currentMatch.ronda}</div>
          )}
          <div className="text-xl text-white/60">
            {currentMatch.tipo_partido.replace('_', ' ').toUpperCase()}
            {currentMatch.mesa && ` • Mesa ${currentMatch.mesa}`}
          </div>
        </div>

        {/* Main Scoreboard */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-3 gap-8 items-center">
              {/* Player A */}
              <div className={`text-center ${pointAnimation?.player === 'a' ? 'animate-pulse scale-110' : ''} transition-transform duration-300`}>
                {playerA.foto_url ? (
                  <img src={playerA.foto_url} alt={playerA.nombre} className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20" />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-5xl text-white font-bold">
                    {playerA.nombre?.[0] || 'A'}
                  </div>
                )}
                <h2 className="text-3xl font-bold text-white mb-1">
                  {playerA.apodo || playerA.nombre || 'Jugador A'}
                </h2>
                <p className="text-lg text-white/60">ELO: {playerA.elo_rating || 1000}</p>
                
                {/* Sets Won */}
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: currentMatch.sets_jugador_a }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-green-500" />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - currentMatch.sets_jugador_a) }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-white/20" />
                  ))}
                </div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="bg-black/50 rounded-3xl p-8 backdrop-blur">
                  {/* Current Set Score */}
                  <div className="flex items-center justify-center gap-8">
                    <span className={`text-[12rem] font-black leading-none ${pointAnimation?.player === 'a' ? 'text-green-400' : 'text-white'} transition-colors duration-300`}>
                      {currentMatch.puntos_jugador_a}
                    </span>
                    <span className="text-6xl text-white/40">:</span>
                    <span className={`text-[12rem] font-black leading-none ${pointAnimation?.player === 'b' ? 'text-green-400' : 'text-white'} transition-colors duration-300`}>
                      {currentMatch.puntos_jugador_b}
                    </span>
                  </div>

                  {/* Sets Score */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-5xl font-bold text-blue-400">{currentMatch.sets_jugador_a}</span>
                    <span className="text-2xl text-white/40">SETS</span>
                    <span className="text-5xl font-bold text-red-400">{currentMatch.sets_jugador_b}</span>
                  </div>

                  {/* Serve Indicator */}
                  <div className="mt-6 flex justify-center">
                    {currentMatch.saque === 'a' ? (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <span className="text-2xl">◀</span>
                        <span className="text-xl">SAQUE</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <span className="text-xl">SAQUE</span>
                        <span className="text-2xl">▶</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Set History */}
                {currentMatch.sets_detalle?.length > 0 && (
                  <div className="mt-6 flex justify-center gap-4">
                    {currentMatch.sets_detalle.map((set, i) => (
                      <div key={i} className="bg-white/10 rounded-lg px-4 py-2">
                        <div className="text-sm text-white/60">Set {set.set}</div>
                        <div className="text-xl font-bold text-white">
                          {set.puntos_a} - {set.puntos_b}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Player B */}
              <div className={`text-center ${pointAnimation?.player === 'b' ? 'animate-pulse scale-110' : ''} transition-transform duration-300`}>
                {playerB.foto_url ? (
                  <img src={playerB.foto_url} alt={playerB.nombre} className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20" />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-5xl text-white font-bold">
                    {playerB.nombre?.[0] || 'B'}
                  </div>
                )}
                <h2 className="text-3xl font-bold text-white mb-1">
                  {playerB.apodo || playerB.nombre || 'Jugador B'}
                </h2>
                <p className="text-lg text-white/60">ELO: {playerB.elo_rating || 1000}</p>
                
                {/* Sets Won */}
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: currentMatch.sets_jugador_b }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-green-500" />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - currentMatch.sets_jugador_b) }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-white/20" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Event Overlay */}
        {specialEvent && (
          <SpecialEventOverlay event={specialEvent} />
        )}
      </div>
    );
  };

  const renderMultiMatch = () => {
    const matches = activeMatches.filter(m => m.estado === 'en_curso');
    
    if (matches.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="text-6xl mb-4">🏓</div>
            <p className="text-2xl">No hay partidos en curso</p>
          </div>
        </div>
      );
    }

    const gridCols = matches.length <= 2 ? 'grid-cols-2' : matches.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
      <div className={`h-full grid ${gridCols} gap-4 p-4`}>
        {matches.map(match => (
          <MiniScoreboard 
            key={match.partido_id} 
            match={match}
            onClick={() => {
              setMatchId(match.partido_id);
              setMode('single');
            }}
          />
        ))}
      </div>
    );
  };

  const renderDashboard = () => {
    const liveMatches = activeMatches.filter(m => m.estado === 'en_curso');
    
    return (
      <div className="h-full grid grid-cols-3 gap-4 p-4">
        {/* Left Column - Live Matches */}
        <div className="col-span-2 space-y-4">
          <div className="bg-black/40 rounded-2xl p-4 backdrop-blur">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Partidos en Vivo
            </h2>
            
            {liveMatches.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <div className="text-4xl mb-2">🏓</div>
                <p>No hay partidos en curso</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {liveMatches.slice(0, 4).map(match => (
                  <MiniScoreboard 
                    key={match.partido_id} 
                    match={match}
                    onClick={() => {
                      setMatchId(match.partido_id);
                      setMode('single');
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="bg-black/40 rounded-2xl p-4 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Resultados Recientes
            </h2>
            <div className="space-y-2">
              {recentResults.slice(0, 5).map(match => (
                <div key={match.partido_id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${match.ganador_id === match.jugador_a_id ? 'text-green-400' : 'text-white/60'}`}>
                      {match.jugador_a_info?.nombre || 'Jugador A'}
                    </span>
                    <span className="text-white/40">vs</span>
                    <span className={`font-bold ${match.ganador_id === match.jugador_b_id ? 'text-green-400' : 'text-white/60'}`}>
                      {match.jugador_b_info?.nombre || 'Jugador B'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {match.sets_jugador_a} - {match.sets_jugador_b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Rankings & QR */}
        <div className="space-y-4">
          {/* Rankings */}
          <div className="bg-black/40 rounded-2xl p-4 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top 10 Ranking
            </h2>
            <div className="space-y-2">
              {rankings.slice(0, 10).map((player, index) => (
                <div key={player.jugador_id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-white/20 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {player.apodo || player.nombre}
                    </div>
                    <div className="text-xs text-white/60">
                      {player.partidos_ganados}W - {player.partidos_perdidos}L
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-400">
                    {player.elo_rating}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-black/40 rounded-2xl p-4 backdrop-blur text-center">
            <h2 className="text-lg font-bold text-white mb-3">📱 Escanea para ver en tu móvil</h2>
            <div className="bg-white rounded-xl p-3 inline-block">
              <QRCodeSVG value={currentUrl} size={150} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 ${isFullscreen ? '' : ''}`}>
      {/* Header (hidden in fullscreen single mode) */}
      {!(isFullscreen && mode === 'single') && (
        <header className="bg-black/50 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏓</span>
              <div>
                <h1 className="text-xl font-bold text-white">Club de Tenis de Mesa</h1>
                <p className="text-xs text-white/60">Live Scoreboard</p>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-2 bg-black/30 rounded-full p-1">
              <button
                onClick={() => setMode('single')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  mode === 'single' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden md:inline">Partido</span>
              </button>
              <button
                onClick={() => setMode('multi')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  mode === 'multi' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden md:inline">Multi</span>
              </button>
              <button
                onClick={() => setMode('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  mode === 'dashboard' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-xs">{wsConnected ? 'LIVE' : 'Offline'}</span>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full ${soundEnabled ? 'bg-white/20 text-white' : 'text-white/40'}`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* QR Toggle */}
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <Users className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={isFullscreen && mode === 'single' ? 'h-screen' : 'h-[calc(100vh-64px)]'}>
        {mode === 'single' && renderSingleMatch()}
        {mode === 'multi' && renderMultiMatch()}
        {mode === 'dashboard' && renderDashboard()}
      </main>

      {/* QR Overlay */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">📱 Escanea para ver en tu móvil</h2>
            <QRCodeSVG value={currentUrl} size={250} />
            <p className="mt-4 text-gray-600 text-sm max-w-xs">
              Abre la cámara de tu teléfono y escanea el código para seguir los partidos en vivo
            </p>
          </div>
        </div>
      )}

      {/* Exit Fullscreen Button (when in fullscreen single mode) */}
      {isFullscreen && mode === 'single' && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-3 z-50"
        >
          <Minimize2 className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}

// ============== MINI SCOREBOARD COMPONENT ==============

function MiniScoreboard({ match, onClick }) {
  const playerA = match.jugador_a_info || {};
  const playerB = match.jugador_b_info || {};
  
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 hover:from-white/20 hover:to-white/10 transition-all border border-white/10 w-full text-left"
    >
      {/* Match Info */}
      <div className="flex items-center justify-between mb-3">
        {match.mesa && <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">Mesa {match.mesa}</span>}
        {match.estado === 'en_curso' && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            EN VIVO
          </span>
        )}
      </div>

      {/* Players & Score */}
      <div className="space-y-2">
        {/* Player A */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {playerA.foto_url ? (
              <img src={playerA.foto_url} className="w-8 h-8 rounded-full" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {playerA.nombre?.[0] || 'A'}
              </div>
            )}
            <span className="text-white font-semibold">{playerA.apodo || playerA.nombre || 'Jugador A'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white">{match.puntos_jugador_a}</span>
            <span className="text-lg text-blue-400">{match.sets_jugador_a}</span>
          </div>
        </div>

        {/* Player B */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {playerB.foto_url ? (
              <img src={playerB.foto_url} className="w-8 h-8 rounded-full" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                {playerB.nombre?.[0] || 'B'}
              </div>
            )}
            <span className="text-white font-semibold">{playerB.apodo || playerB.nombre || 'Jugador B'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white">{match.puntos_jugador_b}</span>
            <span className="text-lg text-red-400">{match.sets_jugador_b}</span>
          </div>
        </div>
      </div>

      {/* Set Progress */}
      <div className="mt-3 text-xs text-white/40 text-center">
        Set {match.set_actual} • {match.tipo_partido.replace('_', ' ')}
      </div>
    </button>
  );
}

// ============== SPECIAL EVENT OVERLAY ==============

function SpecialEventOverlay({ event }) {
  const { event: eventType, data } = event;
  
  const overlayContent = {
    match_point: {
      bg: 'from-yellow-600 to-orange-600',
      text: '⚡ MATCH POINT',
      subtext: data?.jugador === 'a' ? 'Jugador A' : 'Jugador B'
    },
    set_point: {
      bg: 'from-blue-600 to-purple-600',
      text: '🎯 SET POINT',
      subtext: data?.jugador === 'a' ? 'Jugador A' : 'Jugador B'
    },
    deuce: {
      bg: 'from-purple-600 to-pink-600',
      text: '🔥 DEUCE',
      subtext: 'Empate a 10+'
    },
    set_won: {
      bg: 'from-green-600 to-emerald-600',
      text: '🏆 SET GANADO',
      subtext: data?.ganador === 'a' ? 'Jugador A' : 'Jugador B'
    },
    match_won: {
      bg: 'from-yellow-500 to-yellow-600',
      text: '🎉 PARTIDO TERMINADO',
      subtext: data?.ganador === 'a' ? '¡Jugador A GANA!' : '¡Jugador B GANA!'
    },
    timeout: {
      bg: 'from-gray-600 to-gray-700',
      text: '⏱️ TIEMPO FUERA',
      subtext: `${data?.duracion || 60} segundos`
    },
    match_start: {
      bg: 'from-green-500 to-green-600',
      text: '🏓 ¡COMIENZA EL PARTIDO!',
      subtext: ''
    },
    pause: {
      bg: 'from-gray-600 to-gray-700',
      text: '⏸️ PARTIDO PAUSADO',
      subtext: ''
    }
  };

  const content = overlayContent[eventType] || { bg: 'from-gray-600 to-gray-700', text: eventType, subtext: '' };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className={`bg-gradient-to-r ${content.bg} px-16 py-8 rounded-3xl animate-bounce shadow-2xl`}>
        <div className="text-5xl font-black text-white text-center">{content.text}</div>
        {content.subtext && (
          <div className="text-2xl text-white/80 text-center mt-2">{content.subtext}</div>
        )}
      </div>
    </div>
  );
}
