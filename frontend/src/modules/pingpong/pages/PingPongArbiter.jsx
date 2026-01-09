/**
 * Ping Pong Arbiter Page - Panel de control para árbitros
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import ScoreBoard from '../components/ScoreBoard';
import ArbiterPanel from '../components/ArbiterPanel';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongArbiter() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/pinpanclub/matches/${matchId}`);
      setMatch(response.data);
    } catch (error) {
      toast.error('Error al cargar el partido');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchUpdate = (updatedMatch) => {
    setMatch(updatedMatch);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Partido no encontrado</p>
        <Button onClick={() => navigate('/pingpong')}>Volver al Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/pingpong')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-2xl">🏓</span>
              <h1 className="font-bold text-xl">Panel de Arbitraje</h1>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/pingpong/spectator/${matchId}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Vista Espectador
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arbiter Panel */}
          <ArbiterPanel 
            match={match} 
            onMatchUpdate={handleMatchUpdate}
          />
          
          {/* Live Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Vista Previa (Espectadores)</h2>
            <ScoreBoard 
              match={match} 
              size="medium"
              showStats={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
