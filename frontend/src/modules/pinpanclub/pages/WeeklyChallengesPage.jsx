/**
 * Weekly Challenges Page
 * Página dedicada para mostrar todos los retos semanales
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import WeeklyChallenges from '../components/WeeklyChallenges';

export default function WeeklyChallengesPage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const authData = localStorage.getItem('chipi_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        setCurrentUserId(parsed.user?.user_id || null);
      } catch (e) {
        console.error('Error parsing auth data:', e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/pinpanclub')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <span className="text-2xl">🎯</span>
              <h1 className="font-bold text-xl">Retos Semanales</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <WeeklyChallenges jugadorId={currentUserId} />
      </main>
    </div>
  );
}
