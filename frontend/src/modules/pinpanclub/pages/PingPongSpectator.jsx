/**
 * Ping Pong Spectator Page - Vista para espectadores
 * Actualización en tiempo real del partido
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Loader2, Maximize2, RefreshCw } from 'lucide-react';
import ScoreBoard from '../components/ScoreBoard';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongSpectator() {
  const { t } = useTranslation();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

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

  useEffect(() => {
    if (matchId) {
      fetchMatch();
      
      // Poll every 2 seconds for live updates
      const interval = setInterval(fetchMatch, 2000);
      return () => clearInterval(interval);
    }
  }, [matchId, fetchMatch]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        <p className="text-muted-foreground">Partido no encontrado</p>
        <Button onClick={() => navigate('/pinpanclub')}>Volver al Dashboard</Button>
      </div>
    );
  }

  // TV Mode (Fullscreen)
  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          <ScoreBoard 
            match={match} 
            size="tv"
            showStats={true}
            className="bg-gray-800/50 backdrop-blur border-gray-700"
          />
          
          {/* Exit fullscreen hint */}
          <div className="text-center mt-4 text-gray-500 text-sm">
            Presiona ESC para salir de pantalla completa
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏓</span>
              <h1 className="font-bold text-xl">Partido en Vivo</h1>
              {match.estado === 'en_curso' && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  EN VIVO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchMatch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Pantalla Completa
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Main Scoreboard */}
        <div className="max-w-4xl mx-auto">
          <ScoreBoard 
            match={match} 
            size="large"
            showStats={true}
          />
          
          {/* Last Update */}
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Última actualización: {lastUpdate?.toLocaleTimeString('es-PA')}
            <span className="mx-2">•</span>
            Actualización automática cada 2 segundos
          </div>
        </div>

        {/* Match Info */}
        {match.ronda && (
          <div className="text-center mt-6">
            <span className="text-lg text-muted-foreground">{match.ronda}</span>
          </div>
        )}
      </main>
    </div>
  );
}
