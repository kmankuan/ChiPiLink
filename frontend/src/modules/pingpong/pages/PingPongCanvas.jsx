/**
 * Ping Pong Canvas Display - Sistema de widgets arrastrables y redimensionables
 * Permite organizar las mesas de ping pong como bloques en un canvas
 * Los administradores pueden ajustar tamaños para destacar partidos importantes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import { QRCodeSVG } from 'qrcode.react';
import {
  Settings, Save, Lock, Unlock, Maximize2, Minimize2,
  Plus, Trash2, RefreshCw, Wifi, WifiOff, Layout,
  Move, Grid, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-grid-layout/css/styles.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Default layout for new widgets
const DEFAULT_WIDGET_SIZE = { w: 4, h: 3, minW: 2, minH: 2, maxW: 12, maxH: 8 };

export default function PingPongCanvas() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Canvas dimensions
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  
  // Layout state
  const [layout, setLayout] = useState([]);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [currentLayoutId, setCurrentLayoutId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Match data
  const [activeMatches, setActiveMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [widgetMatches, setWidgetMatches] = useState({}); // matchId by widget key
  
  // WebSocket
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const pollingRef = useRef(null);
  
  // Grid settings
  const [cols, setCols] = useState(12);
  const [rowHeight, setRowHeight] = useState(80);
  const [showQR, setShowQR] = useState(true);

  // ============== RESIZE OBSERVER ==============
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // ============== DATA FETCHING ==============
  
  const fetchMatches = useCallback(async () => {
    try {
      // Fetch all active/pending matches
      const response = await fetch(`${API_URL}/api/pingpong/matches?estado=en_curso,pendiente`);
      const data = await response.json();
      setActiveMatches(data.filter(m => m.estado === 'en_curso'));
      setAllMatches(data);
      
      // Update widget matches with player info
      const matchesById = {};
      for (const match of data) {
        matchesById[match.partido_id] = match;
      }
      
      // Fetch player info for each match
      for (const match of data) {
        if (!match.jugador_a_info) {
          const playerA = await fetchPlayer(match.jugador_a_id);
          const playerB = await fetchPlayer(match.jugador_b_id);
          match.jugador_a_info = playerA;
          match.jugador_b_info = playerB;
        }
      }
      
      setAllMatches([...data]);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  }, []);

  const fetchPlayer = async (playerId) => {
    try {
      const response = await fetch(`${API_URL}/api/pingpong/players/${playerId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching player:', error);
    }
    return null;
  };

  const fetchLayouts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pingpong/canvas/layouts`);
      if (response.ok) {
        const data = await response.json();
        setSavedLayouts(data);
        
        // Load default layout if exists
        const defaultLayout = data.find(l => l.is_default);
        if (defaultLayout) {
          loadLayout(defaultLayout);
        }
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
    }
  };

  const saveLayout = async (name = 'Layout sin nombre') => {
    try {
      const layoutData = {
        name,
        layout: layout,
        widget_matches: widgetMatches,
        settings: { cols, rowHeight, showQR }
      };
      
      const response = await fetch(`${API_URL}/api/pingpong/canvas/layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutData)
      });
      
      if (response.ok) {
        fetchLayouts();
      }
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };

  const loadLayout = (layoutData) => {
    setLayout(layoutData.layout || []);
    setWidgetMatches(layoutData.widget_matches || {});
    if (layoutData.settings) {
      setCols(layoutData.settings.cols || 12);
      setRowHeight(layoutData.settings.rowHeight || 80);
      setShowQR(layoutData.settings.showQR !== false);
    }
    setCurrentLayoutId(layoutData.layout_id);
  };

  // ============== WEBSOCKET / POLLING ==============
  
  const connectWebSocket = useCallback(() => {
    const wsUrl = `${WS_URL}/api/pingpong/ws/live?type=tv`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      };
      
      wsRef.current.onclose = () => {
        setWsConnected(false);
        startPolling();
      };
      
      wsRef.current.onerror = () => {
        startPolling();
      };
    } catch (error) {
      startPolling();
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(fetchMatches, 3000);
  }, [fetchMatches]);

  const handleWsMessage = (data) => {
    if (data.type === 'point_scored' || data.type === 'match_state') {
      setAllMatches(prev => prev.map(m => 
        m.partido_id === data.match?.partido_id ? { ...m, ...data.match } : m
      ));
    } else if (data.type === 'active_matches') {
      setActiveMatches(data.matches || []);
    }
  };

  // ============== EFFECTS ==============
  
  useEffect(() => {
    fetchMatches();
    fetchLayouts();
    connectWebSocket();
    
    const interval = setInterval(fetchMatches, 30000); // Refresh every 30s
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [connectWebSocket, fetchMatches]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============== LAYOUT HANDLERS ==============
  
  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const addWidget = (matchId = null) => {
    const newKey = `widget_${Date.now()}`;
    const newItem = {
      i: newKey,
      x: 0,
      y: Infinity, // Places at the bottom
      ...DEFAULT_WIDGET_SIZE
    };
    
    setLayout(prev => [...prev, newItem]);
    
    if (matchId) {
      setWidgetMatches(prev => ({ ...prev, [newKey]: matchId }));
    }
  };

  const removeWidget = (key) => {
    setLayout(prev => prev.filter(item => item.i !== key));
    setWidgetMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[key];
      return newMatches;
    });
  };

  const assignMatchToWidget = (widgetKey, matchId) => {
    setWidgetMatches(prev => ({ ...prev, [widgetKey]: matchId }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Auto-create widgets for active matches if no layout exists
  useEffect(() => {
    if (layout.length === 0 && activeMatches.length > 0 && !currentLayoutId) {
      const newLayout = activeMatches.map((match, index) => ({
        i: `widget_${match.partido_id}`,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 3,
        ...DEFAULT_WIDGET_SIZE
      }));
      
      const newWidgetMatches = {};
      activeMatches.forEach(match => {
        newWidgetMatches[`widget_${match.partido_id}`] = match.partido_id;
      });
      
      setLayout(newLayout);
      setWidgetMatches(newWidgetMatches);
    }
  }, [activeMatches, layout.length, currentLayoutId]);

  // ============== RENDER ==============
  
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Header */}
      {!isFullscreen && (
        <header className="bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🏓</span>
              <div>
                <h1 className="text-xl font-bold text-white">Canvas de Mesas</h1>
                <p className="text-xs text-white/60">
                  {activeMatches.length} partidos en curso • {layout.length} widgets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {wsConnected ? 'LIVE' : 'Polling'}
              </div>

              {/* Edit Mode Toggle */}
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isEditing ? 'Editando' : 'Bloqueado'}
              </Button>

              {/* Add Widget */}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Widget
                </Button>
              )}

              {/* Save Layout */}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = prompt('Nombre del layout:', 'Mi Layout');
                    if (name) saveLayout(name);
                  }}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
              )}

              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-black/80 backdrop-blur px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-6 text-sm text-white">
            <div className="flex items-center gap-2">
              <label>Columnas:</label>
              <input
                type="number"
                value={cols}
                onChange={e => setCols(parseInt(e.target.value))}
                className="w-16 bg-white/10 rounded px-2 py-1"
                min={4}
                max={24}
              />
            </div>
            <div className="flex items-center gap-2">
              <label>Alto de fila:</label>
              <input
                type="number"
                value={rowHeight}
                onChange={e => setRowHeight(parseInt(e.target.value))}
                className="w-16 bg-white/10 rounded px-2 py-1"
                min={40}
                max={200}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showQR}
                onChange={e => setShowQR(e.target.checked)}
                className="rounded"
              />
              Mostrar QR
            </label>
            
            {/* Saved Layouts */}
            <div className="flex items-center gap-2 ml-auto">
              <label>Layout:</label>
              <select
                value={currentLayoutId || ''}
                onChange={e => {
                  const layout = savedLayouts.find(l => l.layout_id === e.target.value);
                  if (layout) loadLayout(layout);
                }}
                className="bg-white/10 rounded px-2 py-1"
              >
                <option value="">Nuevo</option>
                {savedLayouts.map(l => (
                  <option key={l.layout_id} value={l.layout_id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <main 
        ref={containerRef} 
        className="flex-1 p-4 overflow-auto"
        style={{ minHeight: isFullscreen ? '100vh' : 'calc(100vh - 120px)' }}
      >
        <GridLayout
          className="layout"
          layout={layout}
          cols={cols}
          rowHeight={rowHeight}
          width={containerWidth - 32}
          onLayoutChange={onLayoutChange}
          isDraggable={isEditing}
          isResizable={isEditing}
          compactType="vertical"
          preventCollision={false}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {layout.map(item => {
            const matchId = widgetMatches[item.i];
            const match = allMatches.find(m => m.partido_id === matchId);
            
            return (
              <div key={item.i} className="relative">
                <MatchWidget
                  item={item}
                  match={match}
                  allMatches={allMatches}
                  isEditing={isEditing}
                  onRemove={() => removeWidget(item.i)}
                  onAssignMatch={(matchId) => assignMatchToWidget(item.i, matchId)}
                />
              </div>
            );
          })}
        </GridLayout>

        {/* Empty State */}
        {layout.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-white/60">
            <Grid className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Canvas vacío</h2>
            <p className="mb-4">Agrega widgets para mostrar las mesas de ping pong</p>
            <Button onClick={() => addWidget()} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar Widget
            </Button>
          </div>
        )}
      </main>

      {/* QR Code Floating */}
      {showQR && !isEditing && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl p-3 shadow-lg">
          <QRCodeSVG value={currentUrl} size={100} />
          <p className="text-xs text-center mt-1 text-gray-600">Escanea</p>
        </div>
      )}

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
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

// ============== MATCH WIDGET COMPONENT ==============

function MatchWidget({ item, match, allMatches, isEditing, onRemove, onAssignMatch }) {
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  
  // Determine widget size class based on grid size
  const isLarge = item.w >= 6 && item.h >= 4;
  const isMedium = item.w >= 4 && item.h >= 3;
  const isSmall = item.w < 4 || item.h < 3;

  if (!match) {
    return (
      <div className="w-full h-full bg-white/5 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center">
        {isEditing ? (
          <>
            <button
              onClick={() => setShowMatchSelector(true)}
              className="text-white/60 hover:text-white flex flex-col items-center gap-2"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm">Asignar Mesa</span>
            </button>
            
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1 bg-red-500/20 rounded hover:bg-red-500/40"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>

            {/* Match Selector */}
            {showMatchSelector && (
              <div className="absolute inset-0 bg-black/90 rounded-xl p-4 z-10 overflow-auto">
                <h3 className="text-white font-semibold mb-3">Seleccionar Partido</h3>
                <div className="space-y-2">
                  {allMatches.map(m => (
                    <button
                      key={m.partido_id}
                      onClick={() => {
                        onAssignMatch(m.partido_id);
                        setShowMatchSelector(false);
                      }}
                      className="w-full text-left p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white text-sm"
                    >
                      <div className="font-medium">
                        {m.jugador_a_info?.apodo || m.jugador_a_info?.nombre || 'Jugador A'} vs{' '}
                        {m.jugador_b_info?.apodo || m.jugador_b_info?.nombre || 'Jugador B'}
                      </div>
                      <div className="text-xs text-white/60">
                        Mesa {m.mesa || '?'} • {m.estado}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMatchSelector(false)}
                  className="mt-3 w-full p-2 bg-white/10 rounded-lg text-white/60"
                >
                  Cancelar
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="text-white/40 text-sm">Sin partido asignado</span>
        )}
      </div>
    );
  }

  const playerA = match.jugador_a_info || {};
  const playerB = match.jugador_b_info || {};
  const isLive = match.estado === 'en_curso';

  return (
    <div className={`w-full h-full rounded-xl overflow-hidden relative ${
      isLive 
        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/30' 
        : 'bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10'
    }`}>
      {/* Edit Controls */}
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            onClick={() => setShowMatchSelector(true)}
            className="p-1 bg-blue-500/20 rounded hover:bg-blue-500/40"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 bg-red-500/20 rounded hover:bg-red-500/40"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded text-xs text-red-400">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          EN VIVO
        </div>
      )}

      {/* Mesa Number */}
      {match.mesa && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/10 px-2 py-1 rounded text-xs text-white/60">
          Mesa {match.mesa}
        </div>
      )}

      {/* Content - Adaptive based on size */}
      <div className="w-full h-full p-3 flex flex-col justify-center">
        {isLarge ? (
          // Large Widget - Full Details
          <LargeMatchDisplay match={match} playerA={playerA} playerB={playerB} />
        ) : isMedium ? (
          // Medium Widget - Standard View
          <MediumMatchDisplay match={match} playerA={playerA} playerB={playerB} />
        ) : (
          // Small Widget - Compact View
          <SmallMatchDisplay match={match} playerA={playerA} playerB={playerB} />
        )}
      </div>

      {/* Match Selector Overlay */}
      {showMatchSelector && (
        <div className="absolute inset-0 bg-black/90 rounded-xl p-4 z-10 overflow-auto">
          <h3 className="text-white font-semibold mb-3">Cambiar Partido</h3>
          <div className="space-y-2 max-h-48 overflow-auto">
            {allMatches.map(m => (
              <button
                key={m.partido_id}
                onClick={() => {
                  onAssignMatch(m.partido_id);
                  setShowMatchSelector(false);
                }}
                className="w-full text-left p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white text-sm"
              >
                <div className="font-medium truncate">
                  {m.jugador_a_info?.apodo || 'A'} vs {m.jugador_b_info?.apodo || 'B'}
                </div>
                <div className="text-xs text-white/60">
                  Mesa {m.mesa || '?'} • {m.puntos_jugador_a}-{m.puntos_jugador_b}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowMatchSelector(false)}
            className="mt-3 w-full p-2 bg-white/10 rounded-lg text-white/60"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ============== DISPLAY VARIANTS ==============

function LargeMatchDisplay({ match, playerA, playerB }) {
  return (
    <div className="flex items-center justify-between gap-4 h-full">
      {/* Player A */}
      <div className="flex-1 text-center">
        {playerA.foto_url ? (
          <img src={playerA.foto_url} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white/20" alt="" />
        ) : (
          <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-blue-500 flex items-center justify-center text-2xl font-bold text-white">
            {playerA.nombre?.[0] || 'A'}
          </div>
        )}
        <div className="text-lg font-bold text-white truncate">
          {playerA.apodo || playerA.nombre || 'Jugador A'}
        </div>
        <div className="text-xs text-white/60">ELO: {playerA.elo_rating || 1000}</div>
        
        {/* Sets indicators */}
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: match.sets_jugador_a }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-green-500" />
          ))}
          {Array.from({ length: 3 - match.sets_jugador_a }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-white/20" />
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="text-center px-4">
        <div className="flex items-center gap-3">
          <span className={`text-6xl font-black ${match.saque === 'a' ? 'text-yellow-400' : 'text-white'}`}>
            {match.puntos_jugador_a}
          </span>
          <span className="text-2xl text-white/40">:</span>
          <span className={`text-6xl font-black ${match.saque === 'b' ? 'text-yellow-400' : 'text-white'}`}>
            {match.puntos_jugador_b}
          </span>
        </div>
        <div className="text-sm text-white/60 mt-2">
          Set {match.set_actual}
        </div>
        <div className="flex justify-center gap-2 mt-1">
          <span className="text-xl font-bold text-blue-400">{match.sets_jugador_a}</span>
          <span className="text-white/40">-</span>
          <span className="text-xl font-bold text-red-400">{match.sets_jugador_b}</span>
        </div>
      </div>

      {/* Player B */}
      <div className="flex-1 text-center">
        {playerB.foto_url ? (
          <img src={playerB.foto_url} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white/20" alt="" />
        ) : (
          <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-red-500 flex items-center justify-center text-2xl font-bold text-white">
            {playerB.nombre?.[0] || 'B'}
          </div>
        )}
        <div className="text-lg font-bold text-white truncate">
          {playerB.apodo || playerB.nombre || 'Jugador B'}
        </div>
        <div className="text-xs text-white/60">ELO: {playerB.elo_rating || 1000}</div>
        
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: match.sets_jugador_b }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-green-500" />
          ))}
          {Array.from({ length: 3 - match.sets_jugador_b }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-white/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MediumMatchDisplay({ match, playerA, playerB }) {
  return (
    <div className="space-y-2">
      {/* Player A Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            playerA.foto_url ? '' : 'bg-blue-500'
          }`}>
            {playerA.foto_url ? (
              <img src={playerA.foto_url} className="w-full h-full rounded-full" alt="" />
            ) : (
              playerA.nombre?.[0] || 'A'
            )}
          </div>
          <span className="text-white font-medium truncate max-w-[120px]">
            {playerA.apodo || playerA.nombre || 'Jugador A'}
          </span>
          {match.saque === 'a' && <span className="text-yellow-400 text-xs">●</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-white">{match.puntos_jugador_a}</span>
          <span className="text-lg font-bold text-blue-400">{match.sets_jugador_a}</span>
        </div>
      </div>

      {/* Player B Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            playerB.foto_url ? '' : 'bg-red-500'
          }`}>
            {playerB.foto_url ? (
              <img src={playerB.foto_url} className="w-full h-full rounded-full" alt="" />
            ) : (
              playerB.nombre?.[0] || 'B'
            )}
          </div>
          <span className="text-white font-medium truncate max-w-[120px]">
            {playerB.apodo || playerB.nombre || 'Jugador B'}
          </span>
          {match.saque === 'b' && <span className="text-yellow-400 text-xs">●</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-white">{match.puntos_jugador_b}</span>
          <span className="text-lg font-bold text-red-400">{match.sets_jugador_b}</span>
        </div>
      </div>
    </div>
  );
}

function SmallMatchDisplay({ match, playerA, playerB }) {
  return (
    <div className="text-center">
      <div className="text-xs text-white/60 truncate mb-1">
        {playerA.apodo?.[0] || playerA.nombre?.[0] || 'A'} vs {playerB.apodo?.[0] || playerB.nombre?.[0] || 'B'}
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-black text-white">{match.puntos_jugador_a}</span>
        <span className="text-white/40">:</span>
        <span className="text-2xl font-black text-white">{match.puntos_jugador_b}</span>
      </div>
      <div className="text-xs text-white/40">
        {match.sets_jugador_a}-{match.sets_jugador_b}
      </div>
    </div>
  );
}
