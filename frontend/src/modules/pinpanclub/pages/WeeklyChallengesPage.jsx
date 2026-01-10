/**
 * Weekly Challenges Page
 * Página dedicada para mostrar todos los retos semanales
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WeeklyChallenges from '../components/WeeklyChallenges';

export default function WeeklyChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.cliente_id || user?.user_id || null;

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
