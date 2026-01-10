/**
 * Challenges Page
 * Página principal de retos semanales
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import WeeklyChallenges from '../../components/WeeklyChallenges';

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const authData = localStorage.getItem('chipi_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      // Try to find player_id or use user_id
      setCurrentUserId(parsed.user?.player_id || parsed.user?.user_id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/pinpanclub')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <WeeklyChallenges jugadorId={currentUserId} />
      </div>
    </div>
  );
}
